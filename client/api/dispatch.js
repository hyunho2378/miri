// api/dispatch.js 발령 상태 서버 저장과 도우미 보고(회신 R34: 데이터 저장과 재전송, 도우미별 접근 권한).
// 담당자(시연 세션 필요)
//   POST ?action=save    { state, briefs }  발령 상태 저장, 도우미별 서명 링크 발급
//   GET  ?action=state   저장한 발령 상태와 도우미 보고 목록
//   DELETE               발령 종료 뒤 삭제
// 도우미(서명 링크 토큰 t, 세션 불필요)
//   GET  ?action=helper&t=  본인 배정만 조회
//   POST ?action=report&t=  { key, type: ack|step, ... } 수락, 불가, 단계 보고. key 로 중복 저장 방지
// 훈련 발령만 저장한다(GPT 검토 S5 유지). 저장소(Upstash)가 없으면 503.
import { randomBytes } from 'node:crypto'
import { guard, incr, sameSite, sharedStore } from './_guard.js'
import { HELPER_TTL_SEC, signHelperToken, validDispatchId, validHelperCode, verifyHelperToken } from './_helperToken.js'

const MAX_STATE = 900_000
const MAX_REPORTS = 2000
const STEPS = new Set(['depart', 'arrive', 'board', 'handover', 'fail'])
const ANSWERS = new Set(['accept', 'decline'])
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })
const parse = (b) => { if (typeof b === 'string') { try { return JSON.parse(b) } catch { return null } } return b && typeof b === 'object' ? b : null }
const K = {
  owner: (sid) => `miri:dsp:o:${sid}`,
  state: (d) => `miri:dsp:s:${d}`,
  brief: (d, h) => `miri:dsp:b:${d}:${h}`,
  reports: (d) => `miri:dsp:r:${d}`,
  key: (d, k) => `miri:dsp:k:${d}:${k}`
}

// 도우미 보고 검사. 본인 배정 대상자만, 정해진 값만 받는다
export function cleanReport(body, brief, h) {
  if (!body || typeof body !== 'object') return null
  const key = typeof body.key === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.key) ? body.key : null
  if (!key) return null
  const at = Number.isFinite(Number(body.at)) ? Number(body.at) : Date.now()
  if (body.type === 'ack') {
    if (!ANSWERS.has(body.answer)) return null
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 40) : undefined
    return { key, type: 'ack', helper: h, answer: body.answer, reason, at }
  }
  if (body.type === 'step') {
    if (!STEPS.has(body.step)) return null
    const allowed = new Set((brief?.personCodes) || [])
    if (!allowed.has(body.personCode)) return null
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 40) : undefined
    const memo = typeof body.memo === 'string' ? body.memo.slice(0, 200) : undefined
    return { key, type: 'step', helper: h, personCode: body.personCode, step: body.step, reason, memo, at }
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const r = sharedStore()
  const action = String(req.query?.action || '')
  const helperSide = action === 'helper' || action === 'report'

  if (helperSide) {
    if (!sameSite(req)) return fail(res, 403, 'FORBIDDEN', '미리 화면에서 보낸 요청만 처리합니다')
    const tk = verifyHelperToken(String(req.query?.t || ''))
    if (!tk) return fail(res, 401, 'BAD_LINK', '링크가 맞지 않거나 기한이 지났습니다. 담당자에게 새 링크를 요청해 주십시오')
    if (!r) return fail(res, 503, 'NO_STORE', '보고 저장소에 연결되지 않았습니다. 잠시 뒤 다시 시도해 주십시오')
    const active = parse(await r.get(K.state(tk.d)))
    if (!active || active.status !== 'sent' || active.kind !== 'drill') return fail(res, 404, 'CLOSED', '종료되었거나 전송되지 않은 배정입니다')
    const brief = parse(await r.get(K.brief(tk.d, tk.h)))
    if (!brief) return fail(res, 404, 'NO_ASSIGNMENT', '이 링크의 배정이 종료되었거나 없습니다')
    if (action === 'helper' && req.method === 'GET') {
      const all = (await r.lrange(K.reports(tk.d), 0, -1)) || []
      const mine = all.map(parse).filter((x) => x && x.helper === tk.h)
      return res.status(200).json({ dispatchId: tk.d, helper: tk.h, brief, reports: mine, expiresAt: tk.exp * 1000 })
    }
    if (action === 'report' && req.method === 'POST') {
      if ((await incr(`dsp:h:${tk.d}:${tk.h}`, 60)) > 60) return fail(res, 429, 'RATE_LIMIT', '보고가 너무 잦습니다. 잠시 뒤 다시 보내 주십시오')
      const rep = cleanReport(parse(req.body), brief, tk.h)
      if (!rep) return fail(res, 400, 'BAD_INPUT', '보고 형식이 맞지 않거나 본인 배정 대상자가 아닙니다')
      const fresh = await r.set(K.key(tk.d, rep.key), 1, { nx: true, ex: HELPER_TTL_SEC })
      if (fresh === null) return res.status(200).json({ ok: true, duplicate: true, key: rep.key })
      const n = await r.rpush(K.reports(tk.d), JSON.stringify(rep))
      if (n === 1) await r.expire(K.reports(tk.d), HELPER_TTL_SEC)
      if (n > MAX_REPORTS) await r.ltrim(K.reports(tk.d), -MAX_REPORTS, -1)
      return res.status(200).json({ ok: true, duplicate: false, key: rep.key })
    }
    return fail(res, 405, 'METHOD', '허용되지 않는 요청입니다')
  }

  if (!(await guard(req, res, { requireSession: true }))) return
  if (!r) return fail(res, 503, 'NO_STORE', '발령 저장소에 연결되지 않았습니다. 이 브라우저 안에서만 진행합니다')
  const sid = req.miriSession.id

  if (req.method === 'GET' && action === 'state') {
    const own = await r.get(K.owner(sid))
    if (!own || !validDispatchId(own)) return res.status(200).json({ state: null })
    const saved = await r.get(K.state(own))
    const reports = ((await r.lrange(K.reports(own), 0, -1)) || []).map(parse).filter(Boolean)
    return res.status(200).json({ dispatchId: own, state: saved ? parse(saved) : null, reports })
  }

  if (req.method === 'POST' && action === 'save') {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    if (raw.length > MAX_STATE) return fail(res, 413, 'TOO_LARGE', '발령 상태가 너무 큽니다')
    const body = parse(req.body)
    const state = body?.state
    if (!state || typeof state !== 'object' || state.kind !== 'drill') return fail(res, 400, 'BAD_INPUT', '훈련 발령 상태만 저장합니다')
    let id = await r.get(K.owner(sid))
    if (!validDispatchId(id) || (body.dispatchId && body.dispatchId !== id)) id = null
    if (!id) id = `D${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
    await r.set(K.owner(sid), id, { ex: HELPER_TTL_SEC })
    await r.set(K.state(id), JSON.stringify(state), { ex: HELPER_TTL_SEC })
    const tokens = {}
    const briefs = body.briefs && typeof body.briefs === 'object' ? body.briefs : {}
    for (const [h, b] of Object.entries(briefs).slice(0, 300)) {
      if (!validHelperCode(h) || !b || typeof b !== 'object') continue
      await r.set(K.brief(id, h), JSON.stringify(b), { ex: HELPER_TTL_SEC })
      tokens[h] = signHelperToken(id, h)
    }
    return res.status(200).json({ dispatchId: id, tokens })
  }

  if (req.method === 'DELETE') {
    const own = await r.get(K.owner(sid))
    if (validDispatchId(own)) await r.del(K.state(own), K.reports(own), K.owner(sid))
    return res.status(200).json({ ok: true })
  }
  return fail(res, 405, 'METHOD', '허용되지 않는 요청입니다')
}

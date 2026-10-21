import { cleanPreference } from '../src/lib/helperConsent.js'
// api/dispatch.js 발령 상태 서버 저장과 도우미 보고(회신 R34: 데이터 저장과 재전송, 도우미별 접근 권한).
// 담당자(시연 세션 필요)
//   POST ?action=save    { state, briefs }  발령 상태 저장, 도우미별 서명 링크 발급
//   GET  ?action=state   저장한 발령 상태와 도우미 보고 목록, 도우미 동의 상태(prefs, 발령과 별도 수명)
//   DELETE               발령 종료 뒤 삭제
// 도우미(서명 링크 토큰 t, 세션 불필요)
//   GET  ?action=helper&t=  본인 배정만 조회
//   POST ?action=report&t=  { key, type: ack|step, ... } 수락, 불가, 단계 보고. key 로 중복 저장 방지
// 훈련 발령만 저장한다(GPT 검토 S5 유지). 저장소(Upstash)가 없으면 503.
import { createHash, randomBytes } from 'node:crypto'
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
  assign: (d) => `miri:dsp:a:${d}`, // 현재 배정 전체(도우미별 요약). 저장 때 통째로 바꿔 빠진 도우미의 권한이 남지 않게 함(GPT 5차 H3)
  rev: (d) => `miri:dsp:v:${d}`,
  idOwner: (d) => `miri:dsp:i:${d}`,
  closed: (d) => `miri:dsp:c:${d}`, // 종료 표시. 늦게 도착한 저장 요청을 거부(GPT 5차 H4)
  reports: (d) => `miri:dsp:r:${d}`,
  members: (d) => `miri:dsp:m:${d}`, // 도우미별 현재 배정 대상자(",P-1,P-2,"). 보고 저장 Lua 가 같은 원자 실행 안에서 확인(GPT 6차 H3 경합)
  key: (d, h, k) => `miri:dsp:k:${d}:${h}:${k}`,
  // 도우미 참여 동의와 역할은 발령과 수명이 달라 세션 단위로 따로 둔다. 발령 종료 때 지우지 않는다(GPT 12차)
  pref: (sid) => `miri:pref:${sid}`,
  prefSeq: (sid) => `miri:pref:n:${sid}`
}
export const PREF_TTL_SEC = 30 * 24 * 3600
// 저장값 "순번|JSON". 순번은 서버가 접수 순서대로 매겨, 화면은 이미 반영한 순번보다 큰 것만 적용한다(늦게 도착한 옛 응답이 최신 동의를 덮지 않음)
export function parsePrefs(hash) {
  const out = {}
  for (const [h, raw] of Object.entries(hash || {})) {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const i = str.indexOf('|')
    if (i < 1) continue
    const seq = Number(str.slice(0, i))
    let v = null
    try { v = JSON.parse(str.slice(i + 1)) } catch { v = null }
    const clean = v && cleanPreference(v)
    if (Number.isSafeInteger(seq) && seq > 0 && clean) out[h] = { ...clean, seq, at: Number(v.at) || 0 }
  }
  return out
}

// 인계 기록(회신 R06): 상태 변화 발생 시각, 관찰 내용, 수행한 조치. 소방과 의료진 인계용으로 글자 수를 제한해 받는다
export function cleanCare(care) {
  if (!care || typeof care !== 'object') return null
  const t = typeof care.symptomAt === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(care.symptomAt) ? care.symptomAt : undefined
  const observation = typeof care.observation === 'string' ? care.observation.trim().slice(0, 200) : ''
  const action = typeof care.action === 'string' ? care.action.trim().slice(0, 200) : ''
  if (!t && !observation && !action) return null
  return { symptomAt: t, observation: observation || undefined, action: action || undefined }
}

// GPT 5차 H2: 중복 확인과 보고 추가를 한 번의 원자 연산으로. 같은 key 에 다른 내용이면 충돌로 알린다.
// GPT 6차 H3: 권한 검사와 저장 사이에 도우미 교체가 끼어들 수 있어, 종료 표시와 현재 배정(도우미, 대상자)을 같은 원자 실행 안에서 다시 확인한다.
// KEYS 1 중복키, 2 보고 목록, 3 현재 배정 대상자 해시, 4 종료 표시, 5 동의 상태 해시, 6 동의 순번. ARGV 1 보고, 2 해시, 3 TTL, 4 최대 길이, 5 도우미 코드, 6 대상자 코드(수락과 불가는 빈 값), 7 동의 값(동의 보고가 아니면 빈 값), 8 동의 TTL
// GPT 12차: 동의 보고는 보고 목록 추가와 같은 원자 실행 안에서 동의 상태 해시에도 순번을 붙여 남긴다. 종료 표시 전에 접수된 동의는 종료와 상관없이 남고, 종료 뒤 보고는 거부된다
// 반환 [1, 목록 길이] 새로 저장, [0, 기존 해시] 이미 저장, [0, 'closed'] 종료, [0, 'gone'] 현재 배정에 없음
export const APPEND_LUA = `
if redis.call('EXISTS', KEYS[4]) == 1 then return {0, 'closed'} end
local m = redis.call('HGET', KEYS[3], ARGV[5])
if not m then return {0, 'gone'} end
if ARGV[6] ~= '' and not string.find(m, ',' .. ARGV[6] .. ',', 1, true) then return {0, 'gone'} end
if redis.call('SET', KEYS[1], ARGV[2], 'NX', 'EX', ARGV[3]) then
  local n = redis.call('RPUSH', KEYS[2], ARGV[1])
  if n == 1 then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
  if n > tonumber(ARGV[4]) then redis.call('LTRIM', KEYS[2], -tonumber(ARGV[4]), -1) end
  if ARGV[7] ~= '' then
    local s = redis.call('INCR', KEYS[6])
    redis.call('HSET', KEYS[5], ARGV[5], s .. '|' .. ARGV[7])
    redis.call('EXPIRE', KEYS[5], ARGV[8])
    redis.call('EXPIRE', KEYS[6], ARGV[8])
  end
  return {1, n}
end
return {0, redis.call('GET', KEYS[1])}`
// GPT 5차 H4: 종료 표시, 발령 ID 소유 세션, 저장 순번을 한 번에 검사하고 저장. 반환 [1, 'ok'] 또는 [0, 사유]
// KEYS 7 현재 배정 대상자 해시를 통째로 바꾼다(ARGV 7부터 도우미 코드, ',대상자,' 쌍)
export const SAVE_LUA = `
if redis.call('EXISTS', KEYS[1]) == 1 then return {0, 'closed'} end
local o = redis.call('GET', KEYS[2])
if o and o ~= ARGV[1] then return {0, 'owner'} end
local cur = redis.call('GET', KEYS[3])
if cur and tonumber(cur) >= tonumber(ARGV[2]) then return {0, 'stale'} end
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[6])
redis.call('SET', KEYS[3], ARGV[2], 'EX', ARGV[6])
redis.call('SET', KEYS[4], ARGV[3], 'EX', ARGV[6])
redis.call('SET', KEYS[5], ARGV[4], 'EX', ARGV[6])
redis.call('SET', KEYS[6], ARGV[5], 'EX', ARGV[6])
redis.call('DEL', KEYS[7])
for i = 7, #ARGV - 1, 2 do redis.call('HSET', KEYS[7], ARGV[i], ARGV[i + 1]) end
if #ARGV >= 8 then redis.call('EXPIRE', KEYS[7], ARGV[6]) end
return {1, 'ok'}`
// GPT 12차: 종료 표시와 발령 기록 삭제를 한 번에. 보고 추가 Lua 와 섞이지 않아 조회와 삭제 사이에 접수된 보고를 잃지 않는다
// KEYS 1 종료 표시, 2 상태, 3 배정, 4 대상자 해시, 5 보고 목록, 6 순번. ARGV 1 종료 표시 TTL
export const CLOSE_LUA = `
redis.call('SET', KEYS[1], '1', 'EX', ARGV[1])
redis.call('DEL', KEYS[2], KEYS[3], KEYS[4], KEYS[5], KEYS[6])
return 1`
export const memberValue = (b) => `,${(Array.isArray(b?.personCodes) ? b.personCodes : []).map(String).filter((c) => !c.includes(',')).join(',')},`
const hashOf = (rep) => `h:${createHash('sha256').update(JSON.stringify(rep)).digest('hex').slice(0, 32)}`
const asPair = (v) => (Array.isArray(v) ? [Number(v[0]), v[1]] : [0, null])

// 도우미 보고 검사. 본인 배정 대상자만, 정해진 값만 받는다
export function cleanReport(body, brief, h) {
  if (!body || typeof body !== 'object') return null
  const key = typeof body.key === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.key) ? body.key : null
  if (!key) return null
  const at = Number.isFinite(Number(body.at)) ? Number(body.at) : Date.now()
  if (body.type === 'preference') {
    const value = cleanPreference(body)
    return value ? { key, type: 'preference', helper: h, ...value, at } : null
  }
  if (body.type === 'ack') {
    if (!ANSWERS.has(body.answer)) return null
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 40) : undefined
    const memo = typeof body.memo === 'string' && body.memo.trim() ? body.memo.slice(0, 200) : undefined // GPT 8차 M1
    return { key, type: 'ack', helper: h, answer: body.answer, reason, ...(memo ? { memo } : {}), at }
  }
  if (body.type === 'step') {
    if (!STEPS.has(body.step)) return null
    const allowed = new Set((brief?.personCodes) || [])
    if (!allowed.has(body.personCode)) return null
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 40) : undefined
    const memo = typeof body.memo === 'string' ? body.memo.slice(0, 200) : undefined
    const care = cleanCare(body.care)
    return { key, type: 'step', helper: h, personCode: body.personCode, step: body.step, reason, memo, ...(care ? { care } : {}), at }
  }
  return null
}

// GPT 13차 M: 조회 경로(get, lrange, hgetall, del)의 저장소 예외도 미처리 500 대신 503 STORE_ERROR 로 돌려준다.
// 화면은 503 을 받으면 이전 값을 유지하고 다시 시도한다
export default async function handler(req, res) {
  try {
    return await handle(req, res)
  } catch {
    if (res.headersSent) return
    return fail(res, 503, 'STORE_ERROR', '저장소에 잠시 연결되지 않습니다. 잠시 뒤 다시 시도합니다')
  }
}

async function handle(req, res) {
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
    // 현재 배정 기준으로 다시 확인. 교체되어 빠진 도우미의 링크는 조회와 보고 모두 막힘(GPT 5차 H3)
    const assign = parse(await r.get(K.assign(tk.d)))
    const brief = assign?.briefs?.[tk.h]
    if (!brief) return fail(res, 404, 'NO_ASSIGNMENT', '이 링크의 배정이 종료되었거나 다른 도우미로 바뀌었습니다')
    if (action === 'helper' && req.method === 'GET') {
      const all = (await r.lrange(K.reports(tk.d), 0, -1)) || []
      const mine = all.map(parse).filter((x) => x && x.helper === tk.h)
      return res.status(200).json({ dispatchId: tk.d, helper: tk.h, brief, rev: assign.rev, reports: mine, expiresAt: tk.exp * 1000 })
    }
    if (action === 'report' && req.method === 'POST') {
      if ((await incr(`dsp:h:${tk.d}:${tk.h}`, 60)) > 60) return fail(res, 429, 'RATE_LIMIT', '보고가 너무 잦습니다. 잠시 뒤 다시 보내 주십시오')
      const rep = cleanReport(parse(req.body), brief, tk.h)
      if (!rep) return fail(res, 400, 'BAD_INPUT', '보고 형식이 맞지 않거나 본인 배정 대상자가 아닙니다')
      const h = hashOf(rep)
      // 동의 상태는 발령을 연 담당자 세션 단위로 남긴다
      const sid = String((await r.get(K.idOwner(tk.d))) || '')
      if (rep.type === 'preference' && !sid) return fail(res, 404, 'CLOSED', '종료된 배정입니다')
      const prefValue = rep.type === 'preference' ? JSON.stringify({ consent: rep.consent, roles: rep.roles, at: rep.at }) : ''
      let out
      try {
        out = asPair(await r.eval(APPEND_LUA, [K.key(tk.d, tk.h, rep.key), K.reports(tk.d), K.members(tk.d), K.closed(tk.d), K.pref(sid || '-'), K.prefSeq(sid || '-')],
          [JSON.stringify(rep), h, String(HELPER_TTL_SEC), String(MAX_REPORTS), tk.h, rep.type === 'step' ? rep.personCode : '', prefValue, String(PREF_TTL_SEC)]))
      } catch {
        // 저장 실패는 성공으로 돌려주지 않는다. 휴대폰 대기열에 남아 다시 보냄
        return fail(res, 503, 'STORE_ERROR', '보고를 저장하지 못했습니다. 연결되면 다시 보냅니다')
      }
      if (out[0] === 1) return res.status(200).json({ ok: true, duplicate: false, key: rep.key })
      if (out[1] === 'closed') return fail(res, 404, 'CLOSED', '종료된 배정입니다')
      if (out[1] === 'gone') return fail(res, 404, 'NO_ASSIGNMENT', '이 링크의 배정이 종료되었거나 다른 도우미로 바뀌었습니다')
      if (out[1] !== h) return fail(res, 409, 'KEY_CONFLICT', '같은 보고 번호로 다른 내용이 이미 저장되어 있습니다')
      return res.status(200).json({ ok: true, duplicate: true, key: rep.key })
    }
    return fail(res, 405, 'METHOD', '허용되지 않는 요청입니다')
  }

  if (!(await guard(req, res, { requireSession: true }))) return
  if (!r) return fail(res, 503, 'NO_STORE', '발령 저장소에 연결되지 않았습니다. 이 브라우저 안에서만 진행합니다')
  const sid = req.miriSession.id

  if (req.method === 'GET' && action === 'state') {
    // 도우미 동의 상태는 진행 중인 발령이 없어도 돌려준다(발령 종료 뒤 새로고침 복원, GPT 12차)
    // 동의 상태 조회 실패도 빈 값으로 넘기지 않고 503(화면은 이전 값 유지 뒤 재시도, GPT 13차 재확인)
    const prefs = parsePrefs(await r.hgetall(K.pref(sid)))
    const own = await r.get(K.owner(sid))
    if (!own || !validDispatchId(own) || (await r.get(K.closed(own)))) return res.status(200).json({ state: null, prefs })
    const saved = await r.get(K.state(own))
    const rev = Number(await r.get(K.rev(own))) || 0
    const reports = ((await r.lrange(K.reports(own), 0, -1)) || []).map(parse).filter(Boolean)
    return res.status(200).json({ dispatchId: own, rev, state: saved ? parse(saved) : null, reports, prefs })
  }

  if (req.method === 'POST' && action === 'save') {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    if (raw.length > MAX_STATE) return fail(res, 413, 'TOO_LARGE', '발령 상태가 너무 큽니다')
    const body = parse(req.body)
    const state = body?.state
    if (!state || typeof state !== 'object' || state.kind !== 'drill') return fail(res, 400, 'BAD_INPUT', '훈련 발령 상태만 저장합니다')
    // 발령 ID 는 화면이 발령 개시 때 정한다(늦은 첫 저장이 새 발령을 만들지 않게). 없으면 서버가 만든다(이전 화면과 호환)
    const id = validDispatchId(body.dispatchId) ? body.dispatchId : `D${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
    const rev = Number.isSafeInteger(body.rev) && body.rev > 0 ? body.rev : 1
    const tokens = {}, briefs = {}
    const src = body.briefs && typeof body.briefs === 'object' ? body.briefs : {}
    for (const [h, b] of Object.entries(src).slice(0, 300)) {
      if (!validHelperCode(h) || !b || typeof b !== 'object') continue
      briefs[h] = b
      tokens[h] = signHelperToken(id, h)
    }
    let out
    try {
      const members = Object.entries(briefs).flatMap(([h, b]) => [h, memberValue(b)])
      out = asPair(await r.eval(SAVE_LUA, [K.closed(id), K.idOwner(id), K.rev(id), K.state(id), K.assign(id), K.owner(sid), K.members(id)],
        [sid, String(rev), JSON.stringify(state), JSON.stringify({ rev, briefs }), id, String(HELPER_TTL_SEC), ...members]))
    } catch {
      return fail(res, 503, 'STORE_ERROR', '발령 상태를 저장하지 못했습니다. 이 브라우저 안에서 계속 진행합니다')
    }
    if (out[0] !== 1) {
      const why = { closed: '이미 종료한 발령입니다', owner: '다른 세션의 발령 번호입니다', stale: '더 최근 저장이 이미 반영되었습니다' }[out[1]] || '저장이 거부되었습니다'
      return fail(res, 409, String(out[1] || 'REJECTED').toUpperCase(), why)
    }
    return res.status(200).json({ dispatchId: id, rev, tokens })
  }

  if (req.method === 'DELETE') {
    const q = String(req.query?.dispatchId || '')
    const own = await r.get(K.owner(sid))
    const id = validDispatchId(q) ? q : own
    if (validDispatchId(id)) {
      const o = await r.get(K.idOwner(id))
      if (o && String(o) !== sid) return fail(res, 403, 'OWNER', '다른 세션의 발령입니다')
      // 종료 표시를 먼저 남겨 진행 중이던 저장 요청이 늦게 와도 되살리지 못하게 함(GPT 5차 H4)
      // 종료 표시와 삭제는 한 번의 원자 실행. 도우미 동의 상태(K.pref)는 지우지 않는다(GPT 12차)
      try {
        await r.eval(CLOSE_LUA, [K.closed(id), K.state(id), K.assign(id), K.members(id), K.reports(id), K.rev(id)], [String(HELPER_TTL_SEC)])
      } catch {
        return fail(res, 503, 'STORE_ERROR', '발령 기록을 지우지 못했습니다. 다시 시도합니다')
      }
      if (own === id) await r.del(K.owner(sid))
    }
    return res.status(200).json({ ok: true })
  }
  return fail(res, 405, 'METHOD', '허용되지 않는 요청입니다')
}

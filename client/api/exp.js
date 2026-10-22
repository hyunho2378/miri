// api/exp.js 체험 기록. 열림, 봉사센터 체험 링크(?exp=)로 들어와 동의한 사람의 화면 이동과 버튼 누름만 받는다.
// POST(화면이 보냄): 출처 확인, IP 분당과 전체 하루 상한, 크기 상한, 허용 칸만(src/lib/expSchema.js validateBatch). 체험 번호별 90일 보관.
// GET ?report=1, DELETE ?src=test: 시연 코드 세션(시 관리자)만. 집계 표와 시험 기록 지우기.
// 이름, 연락처, 입력한 글, IP 원문은 저장하지 않는다.
export const config = { maxDuration: 15 }
import { accessLog, clientIpOf, incr, sameSite, sessionOf, sharedStore } from './_guard.js'
import { EXP_LIMITS, aggregate, sessionOf as expSessionOf, validateBatch } from '../src/lib/expSchema.js'

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })
const K = { list: (id) => `miri:exp:b:${id}`, seen: (id) => `miri:exp:seen:${id}`, idx: 'miri:exp:idx' }
const hostOf = (u) => { try { return new URL(u).host } catch { return '' } }

export default async function handler(req, res) {
  const started = Date.now()
  try { return await handle(req, res) } finally { accessLog(req, res, started) }
}

async function readBody(req) {
  let b = req.body
  if (Buffer.isBuffer(b)) b = b.toString('utf8')
  if (b && typeof b === 'object') return { raw: JSON.stringify(b), obj: b }
  if (typeof b !== 'string') return { raw: '', obj: null }
  try { return { raw: b, obj: JSON.parse(b) } } catch { return { raw: b, obj: null } }
}

async function handle(req, res) {
  const m = String(req.method || 'GET').toUpperCase()
  if (m === 'POST') return post(req, res)
  if (m === 'GET' || m === 'DELETE') return admin(req, res, m)
  return fail(res, 405, 'METHOD', 'POST 만 허용')
}

async function post(req, res) {
  const h = req.headers || {}
  if (!(hostOf(h.origin || '') || hostOf(h.referer || '')) || !sameSite(req)) return fail(res, 403, 'FORBIDDEN', '미리 화면에서 보낸 요청만 처리합니다')
  const day = new Date().toISOString().slice(0, 10)
  if ((await incr(`exp:ip:${clientIpOf(req)}`, 60)) > 60 || (await incr(`exp:all:${day}`, 26 * 3600)) > 20000) {
    res.setHeader('Retry-After', '60')
    return fail(res, 429, 'RATE_LIMIT', '요청이 너무 잦습니다')
  }
  const { raw, obj } = await readBody(req)
  if (raw.length > EXP_LIMITS.bodyBytes) return fail(res, 413, 'TOO_LARGE', '기록 묶음이 너무 큼')
  const v = validateBatch(obj)
  if (!v.ok) return fail(res, 400, 'BAD_INPUT', `허용하지 않는 기록(${v.why})`)
  const r = sharedStore()
  if (!r) return fail(res, 503, 'NO_STORE', '기록 저장소 미연결')
  const b = v.batch
  try {
    const n = await r.rpush(K.list(b.id), JSON.stringify({ ...b, at: Date.now() }))
    if (Number(n) > EXP_LIMITS.batchesPerId) { await r.ltrim?.(K.list(b.id), 0, EXP_LIMITS.batchesPerId - 1); return fail(res, 429, 'TOO_MANY', '기록이 너무 많음') }
    await r.expire(K.list(b.id), EXP_LIMITS.ttlSec)
    if ((await r.set(K.seen(b.id), 1, { nx: true, ex: EXP_LIMITS.ttlSec })) === 'OK') await r.rpush(K.idx, `${b.src}:${b.id}`)
    await r.expire(K.idx, EXP_LIMITS.ttlSec)
  } catch {
    return fail(res, 503, 'NO_STORE', '기록 저장소 오류')
  }
  res.status(204)
  return typeof res.end === 'function' ? res.end() : res.send('')
}

// 저장된 체험 번호 전체를 읽어 사람별로 편다
export async function loadSessions(r) {
  const idx = (await r.lrange(K.idx, 0, -1)) || []
  const seen = new Set()
  const out = []
  for (const item of idx) {
    const [src, id] = String(item).split(':')
    if (!id || seen.has(id)) continue
    seen.add(id)
    const rows = ((await r.lrange(K.list(id), 0, -1)) || []).map((x) => (typeof x === 'string' ? JSON.parse(x) : x)).filter(Boolean).sort((a, b) => a.seq - b.seq)
    if (!rows.length) continue
    out.push({ ...expSessionOf(rows), src, firstAt: rows[0].at || null })
  }
  return out
}

async function admin(req, res, m) {
  const s = sessionOf(req)
  if (!s || s.scope !== 'full' || (s.role && s.role !== 'city')) return fail(res, 401, 'NEED_SESSION', '시연 코드가 필요합니다')
  const r = sharedStore()
  if (!r) return fail(res, 503, 'NO_STORE', '기록 저장소 미연결')
  const q = new URL(req.url || '/', 'http://x').searchParams
  if (m === 'DELETE') {
    const src = q.get('src')
    if (src !== 'test') return fail(res, 400, 'BAD_INPUT', '시험 기록(src=test)만 지울 수 있습니다')
    const idx = (await r.lrange(K.idx, 0, -1)) || []
    const keep = []; let removed = 0
    for (const item of idx) {
      const [s2, id] = String(item).split(':')
      if (s2 === 'test') { await r.del(K.list(id), K.seen(id)); removed += 1 } else keep.push(item)
    }
    await r.del(K.idx)
    for (const k of keep) await r.rpush(K.idx, k)
    if (keep.length) await r.expire(K.idx, EXP_LIMITS.ttlSec)
    return res.status(200).json({ removed })
  }
  const sessions = await loadSessions(r)
  const includeTest = q.get('test') === '1'
  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    report: aggregate(sessions, { includeTest }),
    sessions: sessions.filter((x) => includeTest || x.src !== 'test').map((x) => ({ id: x.id.slice(0, 6), src: x.src, dev: x.dev, wb: x.wb, firstAt: x.firstAt, totalSec: Math.round(x.totalMs / 1000), done: x.done, declined: x.declined, lastView: x.lastView, errors: x.errors, views: x.views, dwell: x.dwell, actions: x.actions }))
  })
}

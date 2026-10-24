import { cleanPreference } from '../src/lib/helperConsent.js'
// api/dispatch.js 발령 상태 서버 저장과 도우미 보고(회신 R34: 데이터 저장과 재전송, 도우미별 접근 권한).
// 담당자(시연 세션 필요)
//   POST ?action=save    { state, briefs }  발령 상태 저장, 도우미별 서명 링크 발급
//   GET  ?action=state   저장한 발령 상태와 도우미 보고 목록, 도우미 동의 상태(prefs, 발령과 별도 수명)
//   DELETE               발령 종료 뒤 삭제
// 도우미(서명 링크 토큰 t, 세션 불필요)
//   GET  ?action=helper&t=  본인 배정만 조회
//   POST ?action=report&t=  { key, type: ack|step, ... } 수락, 불가, 단계 보고. key 로 중복 저장 방지
// 훈련 발령만 저장한다. 저장소(Upstash)가 없으면 503.
import { createHash, randomBytes } from 'node:crypto'
import { accessLog, guard, incr, sameSite, sharedStore } from './_guard.js'
import { scopeReports, scopeState } from './_scope.js'
import { HELPER_TTL_SEC, signHelperToken, validDispatchId, validHelperCode, verifyHelperToken } from './_helperToken.js'
import { acceptedOf, cleanLocation } from '../src/lib/locationDisclosure.js'

const MAX_STATE = 900_000
const MAX_STATE_DRILL = 600_000 // 코드 없이 받은 훈련 전용 세션의 상태 크기 상한
const MAX_REPORTS = 2000
const STEPS = new Set(['depart', 'arrive', 'board', 'handover', 'fail'])
const ANSWERS = new Set(['accept', 'decline'])
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })
const parse = (b) => { if (typeof b === 'string') { try { return JSON.parse(b) } catch { return null } } return b && typeof b === 'object' ? b : null }
const K = {
  owner: (sid) => `miri:dsp:o:${sid}`,
  state: (d) => `miri:dsp:s:${d}`,
  assign: (d) => `miri:dsp:a:${d}`, // 현재 배정 전체(도우미별 요약). 저장 때 통째로 바꿔 빠진 도우미의 권한이 남지 않게 함
  rev: (d) => `miri:dsp:v:${d}`,
  idOwner: (d) => `miri:dsp:i:${d}`,
  closed: (d) => `miri:dsp:c:${d}`, // 종료 표시. 늦게 도착한 저장 요청을 거부
  reports: (d) => `miri:dsp:r:${d}`,
  members: (d) => `miri:dsp:m:${d}`, // 도우미별 현재 배정 대상자(",P-1,P-2,"). 보고 저장 Lua 가 같은 원자 실행 안에서 확인
  key: (d, h, k) => `miri:dsp:k:${d}:${h}:${k}`,
  // 도우미 위치 정보 열람 기록(도우미, 시각, 대상자 코드). 위치 값은 담지 않는다. 첫 열람만 남긴다
  locLog: (d) => `miri:dsp:l:${d}`,
  locSeen: (d, h) => `miri:dsp:lv:${d}:${h}`,
  // 도우미 참여 동의와 역할은 발령과 수명이 달라 세션 단위로 따로 둔다. 발령 종료 때 지우지 않는다
  pref: (sid) => `miri:pref:${sid}`,
  prefSeq: (sid) => `miri:pref:n:${sid}`
}
export const PREF_TTL_SEC = 30 * 24 * 3600
// 훈련 전용 세션(drill)은 쿠키가 12시간이라 동의 기록도 같은 수명으로 둔다(아무도 읽지 못하는 기록을 남기지 않음)
export const PREF_TTL_DRILL_SEC = 12 * 3600
export const prefTtlOf = (sid) => (String(sid).startsWith('drill-') ? PREF_TTL_DRILL_SEC : PREF_TTL_SEC)
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

// 중복 확인과 보고 추가를 한 번의 원자 연산으로. 같은 key 에 다른 내용이면 충돌로 알린다.
// 권한 검사와 저장 사이에 도우미 교체가 끼어들 수 있어, 종료 표시와 현재 배정(도우미, 대상자)을 같은 원자 실행 안에서 다시 확인한다.
// KEYS 1 중복키, 2 보고 목록, 3 현재 배정 대상자 해시, 4 종료 표시, 5 동의 상태 해시, 6 동의 순번. ARGV 1 보고, 2 해시, 3 TTL, 4 최대 길이, 5 도우미 코드, 6 대상자 코드(수락과 불가는 빈 값), 7 동의 값(동의 보고가 아니면 빈 값), 8 동의 TTL
// 동의 보고는 보고 목록 추가와 같은 원자 실행 안에서 동의 상태 해시에도 순번을 붙여 남긴다. 종료 표시 전에 접수된 동의는 종료와 상관없이 남고, 종료 뒤 보고는 거부된다
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
// 종료 표시, 발령 ID 소유 세션, 저장 순번을 한 번에 검사하고 저장. 반환 [1, 'ok'] 또는 [0, 사유]
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
// 종료 표시와 발령 기록 삭제를 한 번에. 보고 추가 Lua 와 섞이지 않아 조회와 삭제 사이에 접수된 보고를 잃지 않는다
// KEYS 1 종료 표시, 2 상태, 3 배정, 4 대상자 해시, 5 보고 목록, 6 순번. ARGV 1 종료 표시 TTL
export const CLOSE_LUA = `
redis.call('SET', KEYS[1], '1', 'EX', ARGV[1])
redis.call('DEL', KEYS[2], KEYS[3], KEYS[4], KEYS[5], KEYS[6])
return 1`
// 발령 단계 전이 표(화면 useDispatchStore 의 실제 전이: 대기 → 배정 검토 ↔ 대기(도달 시각 수정), 배정 검토 → 전송, 전송 → 전송).
// 화면은 저장을 묶어 보내므로 중간 단계를 건너뛴 저장(대기 → 전송)도 허용한다. 첫 저장(이전 상태 없음)은 세 단계 모두 허용
export const SAVE_STATUSES = new Set(['standby', 'assigned', 'sent'])
const NEXT = { standby: ['standby', 'assigned', 'sent'], assigned: ['standby', 'assigned', 'sent'], sent: ['sent'] }
export const transitionAllowed = (from, to) => SAVE_STATUSES.has(to) && (!from || !NEXT[from] || NEXT[from].includes(to))
export const memberValue = (b) => `,${(Array.isArray(b?.personCodes) ? b.personCodes : []).map(String).filter((c) => !c.includes(',')).join(',')},`
// 도우미 배정 요약(brief) 서버 쪽 정리. 허용한 칸만, 정해진 길이로 받는다. 이름, 주소, 전화번호 꼴은 지운다
const PHONE_RE = /\d{2,4}[- .]?\d{3,4}[- .]?\d{4}/g
const ADDR_RE = /[가-힣]+(?:로|길)\s?\d+(?:-\d+)?(?:\s?\d+호)?/g
const txt = (v, n) => (typeof v === 'string' ? v.replace(PHONE_RE, '[가림]').replace(ADDR_RE, '[가림]').slice(0, n) : undefined)
const code = (v) => (typeof v === 'string' && /^[A-Za-z0-9-]{1,32}$/.test(v) ? v : undefined)
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined)
const BRIEF_KEYS = new Set(['disaster', 'vehicleCode', 'villages', 'completeBy', 'meetVillage', 'firstDepartAt', 'coHelpers', 'persons'])
export function cleanBrief(b) {
  if (!b || typeof b !== 'object') return null
  const out = {}
  for (const [k, v] of Object.entries(b)) {
    if (!BRIEF_KEYS.has(k)) continue
    if (typeof v === 'string') out[k] = txt(v, 120)
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v
    else if (Array.isArray(v)) out[k] = v.slice(0, 20).map((x) => (typeof x === 'string' ? txt(x, 60) : typeof x === 'number' ? x : undefined)).filter((x) => x !== undefined)
    else if (v && typeof v === 'object') out[k] = Object.fromEntries(Object.entries(v).slice(0, 20).filter(([, x]) => ['string', 'number', 'boolean'].includes(typeof x)).map(([kk, x]) => [kk, typeof x === 'string' ? txt(x, 120) : x]))
  }
  out.notes = Array.isArray(b.notes) ? b.notes.slice(0, 10).map((n) => txt(String(n), 120)) : []
  out.drill = b.drill === true
  out.officerContact = txt(b.officerContact, 60) || '발령 담당자, 문자 회신'
  if (b.clock && typeof b.clock === 'object') out.clock = { realStart: num(b.clock.realStart), vStart: num(b.clock.vStart), speed: num(b.clock.speed) }
  out.trips = (Array.isArray(b.trips) ? b.trips : []).slice(0, 30).map((t) => ({
    index: num(t?.index), village: txt(t?.village, 40), grade: code(t?.grade),
    personCodes: (Array.isArray(t?.personCodes) ? t.personCodes : []).map(code).filter(Boolean).slice(0, 60),
    departAt: num(t?.departAt), finishAt: num(t?.finishAt),
    shelters: (Array.isArray(t?.shelters) ? t.shelters : []).slice(0, 10).map((x) => (typeof x === 'string' ? txt(x, 60) : x && typeof x === 'object' ? { code: code(x.code), name: txt(x.name, 60), count: num(x.count) } : undefined)).filter(Boolean),
    routeCheck: t?.routeCheck === true,
    routeBasis: t?.routeBasis === 'road' ? 'road' : 'line'
  }))
  out.personCodes = (Array.isArray(b.personCodes) ? b.personCodes : []).map(code).filter(Boolean).slice(0, 300)
  return out
}

// 같은 보고 번호의 재전송 판별은 내용으로 한다. 서버가 붙이는 시각(at 보정, receivedAt)은 재전송마다 달라 해시에서 뺀다
const hashOf = (rep) => { const { at, receivedAt, ...body } = rep; return `h:${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 32)}` }
const asPair = (v) => (Array.isArray(v) ? [Number(v[0]), v[1]] : [0, null])

// 도우미 보고 검사. 본인 배정 대상자만, 정해진 값만 받는다
export function cleanReport(body, brief, h) {
  if (!body || typeof body !== 'object') return null
  const key = typeof body.key === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.key) ? body.key : null
  if (!key) return null
  // 보고 시각은 서버 시각을 기준으로 받는다. 휴대폰 대기열에서 늦게 보낸 보고의 화면 시각은 12시간 안에서만 인정하고, 받은 시각을 따로 남긴다
  const now = Date.now()
  const raw = Number(body.at)
  const at = Number.isFinite(raw) && raw <= now + 60_000 && raw >= now - 12 * 3600_000 ? raw : now
  if (body.type === 'preference') {
    const value = cleanPreference(body)
    return value ? { key, type: 'preference', helper: h, ...value, at, receivedAt: now } : null
  }
  if (body.type === 'ack') {
    if (!ANSWERS.has(body.answer)) return null
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 40) : undefined
    const memo = typeof body.memo === 'string' && body.memo.trim() ? body.memo.slice(0, 200) : undefined
    return { key, type: 'ack', helper: h, answer: body.answer, reason, ...(memo ? { memo } : {}), at, receivedAt: now }
  }
  if (body.type === 'step') {
    if (!STEPS.has(body.step)) return null
    const allowed = new Set((brief?.personCodes) || [])
    if (!allowed.has(body.personCode)) return null
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 40) : undefined
    const memo = typeof body.memo === 'string' ? body.memo.slice(0, 200) : undefined
    const care = cleanCare(body.care)
    return { key, type: 'step', helper: h, personCode: body.personCode, step: body.step, reason, memo, ...(care ? { care } : {}), at, receivedAt: now }
  }
  return null
}

// 조회 경로(get, lrange, hgetall, del)의 저장소 예외도 미처리 500 대신 503 STORE_ERROR 로 돌려준다.
// 화면은 503 을 받으면 이전 값을 유지하고 다시 시도한다
export default async function handler(req, res) {
  const started = Date.now()
  try {
    return await handle(req, res)
  } catch {
    if (res.headersSent) return
    return fail(res, 503, 'STORE_ERROR', '저장소에 잠시 연결되지 않습니다. 잠시 뒤 다시 시도합니다')
  } finally {
    accessLog(req, res, started, { action: String(req.query?.action || '') || null })
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
    // 현재 배정 기준으로 다시 확인. 교체되어 빠진 도우미의 링크는 조회와 보고 모두 막힘
    const assign = parse(await r.get(K.assign(tk.d)))
    const brief = assign?.briefs?.[tk.h]
    if (!brief) return fail(res, 404, 'NO_ASSIGNMENT', '이 링크의 배정이 종료되었거나 다른 도우미로 바뀌었습니다')
    if (action === 'helper' && req.method === 'GET') {
      const all = (await r.lrange(K.reports(tk.d), 0, -1)) || []
      const mine = all.map(parse).filter((x) => x && x.helper === tk.h)
      // 위치 정보 최소 공개(개인정보 보호법 제15조 제1항 제5호, 제7호, 제17조 제1항): 본인 배정 대상자이고 서버에 접수된 최신 응답이 수락일 때만.
      // 수락 전, 불가 뒤, 배정에서 빠진 뒤, 발령 종료 뒤(위 404)에는 돌려주지 않는다
      const allowed = new Set(brief.personCodes || [])
      const loc = acceptedOf(mine, tk.h) ? Object.fromEntries(Object.entries(assign?.loc?.[tk.h] || {}).filter(([c]) => allowed.has(c))) : {}
      const body = { dispatchId: tk.d, helper: tk.h, brief, rev: assign.rev, reports: mine, expiresAt: tk.exp * 1000 }
      if (Object.keys(loc).length) {
        body.locations = loc
        try {
          if (await r.set(K.locSeen(tk.d, tk.h), '1', { nx: true, ex: HELPER_TTL_SEC })) {
            await r.rpush(K.locLog(tk.d), JSON.stringify({ helper: tk.h, at: Date.now(), codes: Object.keys(loc) }))
            await r.expire(K.locLog(tk.d), HELPER_TTL_SEC)
          }
        } catch { /* 열람 기록 실패는 응답을 막지 않는다 */ }
      }
      return res.status(200).json(body)
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
          [JSON.stringify(rep), h, String(HELPER_TTL_SEC), String(MAX_REPORTS), tk.h, rep.type === 'step' ? rep.personCode : '', prefValue, String(prefTtlOf(sid))]))
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

  // 담당자 쪽은 시연 코드 세션(full)과 훈련 발령 전용 세션(drill) 모두 받는다. 발령은 세션마다 따로 저장된다
  if (!(await guard(req, res, { requireSession: true, allowDrill: true }))) return
  if (!r) return fail(res, 503, 'NO_STORE', '발령 저장소에 연결되지 않았습니다. 이 브라우저 안에서만 진행합니다')
  const sid = req.miriSession.id
  // 코드 없이 받은 훈련 전용 세션은 저장 횟수를 세션마다 분당 60회로 묶는다(저장소 남용 방지)
  if (req.miriSession.scope === 'drill' && req.method === 'POST' && (await incr(`dsp:save:${sid}`, 60)) > 30) {
    res.setHeader('Retry-After', '60')
    return fail(res, 429, 'RATE_LIMIT', '저장이 너무 잦습니다. 잠시 뒤 다시 저장합니다')
  }

  // 동 담당자 세션은 읽기 전용이다. 저장과 종료는 시 관리자 세션만(동 범위로 걸러 받은 상태를 저장해 시 전체를 덮지 않게)
  const dong = req.miriSession.role === 'dong' ? req.miriSession.dong : null
  if (dong && req.method !== 'GET') return fail(res, 403, 'ROLE_READONLY', '동 담당자 계정은 발령을 보기만 합니다. 저장과 종료는 시 관리자 계정에서 합니다')

  if (req.method === 'GET' && action === 'state') {
    // 도우미 동의 상태는 진행 중인 발령이 없어도 돌려준다(발령 종료 뒤 새로고침 복원)
    // 동의 상태 조회 실패도 빈 값으로 넘기지 않고 503(화면은 이전 값 유지 뒤 재시도)
    const prefs = parsePrefs(await r.hgetall(K.pref(sid)))
    const own = await r.get(K.owner(sid))
    if (!own || !validDispatchId(own) || (await r.get(K.closed(own)))) return res.status(200).json({ state: null, prefs })
    const saved = await r.get(K.state(own))
    const rev = Number(await r.get(K.rev(own))) || 0
    const reports = ((await r.lrange(K.reports(own), 0, -1)) || []).map(parse).filter(Boolean)
    const full = saved ? parse(saved) : null
    if (dong) {
      // 동 담당자에게는 담당 동 마을만 담아 돌려준다(서버 기준 범위)
      const scoped = scopeState(full, dong)
      return res.status(200).json({ dispatchId: own, rev, state: scoped, reports: scopeReports(reports, full, dong), prefs: {}, scope: { role: 'dong', dong } })
    }
    return res.status(200).json({ dispatchId: own, rev, state: full, reports, prefs })
  }

  if (req.method === 'POST' && action === 'save') {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    if (raw.length > (req.miriSession.scope === 'drill' ? MAX_STATE_DRILL : MAX_STATE)) return fail(res, 413, 'TOO_LARGE', '발령 상태가 너무 큽니다')
    const body = parse(req.body)
    const state = body?.state
    if (!state || typeof state !== 'object' || state.kind !== 'drill') return fail(res, 400, 'BAD_INPUT', '훈련 발령 상태만 저장합니다')
    // 저장할 수 있는 발령 단계는 대기, 배정 확정 전 검토, 전송 뿐이다(평시와 종료는 저장하지 않음, 플랫폼 AI 협업 툴 검토 반영)
    if (!SAVE_STATUSES.has(state.status)) return fail(res, 400, 'BAD_STATUS', '저장할 수 없는 발령 단계입니다')
    // 발령 ID 는 화면이 발령 개시 때 정한다(늦은 첫 저장이 새 발령을 만들지 않게). 없으면 서버가 만든다(이전 화면과 호환)
    const id = validDispatchId(body.dispatchId) ? body.dispatchId : `D${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
    const rev = Number.isSafeInteger(body.rev) && body.rev > 0 ? body.rev : 1
    const tokens = {}, briefs = {}
    const src = body.briefs && typeof body.briefs === 'object' ? body.briefs : {}
    for (const [h, b] of Object.entries(src).slice(0, 300)) {
      if (!validHelperCode(h) || !b || typeof b !== 'object') continue
      const cb = cleanBrief(b)
      if (!cb) continue
      briefs[h] = cb
      tokens[h] = signHelperToken(id, h)
    }
    // 도우미별 위치 공개 후보(훈련 발령은 급박성이 없으므로 별도 동의 대상자만, 정해진 네 항목만). 그 도우미의 배정 대상자 코드만 받는다. 수락 여부는 조회 때 다시 본다
    const loc = {}
    const lsrc = body.locations && typeof body.locations === 'object' ? body.locations : {}
    for (const [h, m] of Object.entries(lsrc).slice(0, 300)) {
      if (!briefs[h] || !m || typeof m !== 'object') continue
      const ok = new Set(briefs[h].personCodes || [])
      const one = {}
      for (const [c, x] of Object.entries(m).slice(0, 300)) { const v = ok.has(c) && cleanLocation(x); if (v && (v.basis === 'consent' || state.kind === 'real')) one[c] = v }
      if (Object.keys(one).length) loc[h] = one
    }
    // 단계 전이 검사: 이미 전송한 발령은 전송 상태로만 이어 저장한다(전송 뒤 배정 검토로 되돌리는 저장은 409).
    // 같은 세션의 더 새 순번 저장에만 적용한다. 늦게 온 옛 저장과 남의 발령은 아래 원자 실행이 stale, owner 로 거른다
    try {
      const [o, cur, prev] = [await r.get(K.idOwner(id)), Number(await r.get(K.rev(id))) || 0, await r.get(K.state(id))]
      const was = prev ? parse(prev)?.status : null
      if (String(o || '') === sid && rev > cur && !transitionAllowed(was, state.status)) {
        return fail(res, 409, 'BAD_TRANSITION', `전송한 발령을 ${state.status} 단계로 되돌려 저장할 수 없습니다`)
      }
    } catch {
      return fail(res, 503, 'STORE_ERROR', '발령 상태를 확인하지 못했습니다. 이 브라우저 안에서 계속 진행합니다')
    }
    let out
    try {
      const members = Object.entries(briefs).flatMap(([h, b]) => [h, memberValue(b)])
      out = asPair(await r.eval(SAVE_LUA, [K.closed(id), K.idOwner(id), K.rev(id), K.state(id), K.assign(id), K.owner(sid), K.members(id)],
        [sid, String(rev), JSON.stringify(state), JSON.stringify({ rev, briefs, loc }), id, String(HELPER_TTL_SEC), ...members]))
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
      // 소유 기록이 없는(만료되었거나 없는) 발령 번호는 종료 표시를 남기지 않는다(남의 번호를 미리 막는 일 방지)
      if (!o && own !== id) return res.status(200).json({ ok: true })
      // 종료 표시를 먼저 남겨 진행 중이던 저장 요청이 늦게 와도 되살리지 못하게 함
      // 종료 표시와 삭제는 한 번의 원자 실행. 도우미 동의 상태(K.pref)는 지우지 않는다
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

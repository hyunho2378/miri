// _guard.js 서버 함수 접근 제한.
// 시안 단계의 서버 확인 방식:
//   1. 시연 코드(서버 환경변수 MIRI_DEMO_CODE)를 /api/session 에 내면 서버가 서명 쿠키를 발급한다.
//      쿠키 값은 만료 시각과 HMAC-SHA256 서명(서버 환경변수 MIRI_SESSION_SECRET)이라 서버 비밀값 없이는 만들 수 없다.
//      HttpOnly, Secure, SameSite=Strict 라서 화면 스크립트와 다른 사이트에서 쓰지 못한다.
//   2. 비공개 문서함 조회, 저장, 삭제, 설문 응답 조회와 AI 호출은 이 쿠키가 있어야 처리한다.
//   3. AI 호출은 세션마다, IP마다, 그리고 전체 합계로 분당과 하루 상한을 둔다. 저장소(Upstash Redis 또는 표준 Redis)가 있으면
//      인스턴스 사이에 공유하고, 없으면 인스턴스 안에서만 센다.
// 두 환경변수가 없으면 비공개 기능은 닫힌 채로 둔다(설정 누락이 열림으로 이어지지 않게).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getStore } from './_store.js'

export const COOKIE = 'miri_s'
const TTL_SEC = 12 * 60 * 60

const secret = () => process.env.MIRI_SESSION_SECRET || ''
export const sessionConfigured = () => Boolean(process.env.MIRI_DEMO_CODE && secret().length >= 16)

const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url')

// 세션 범위
//   full: 시연 코드로 받은 세션. AI 판독, 문서함 서버 저장, 발령 저장 모두
//   drill: 코드 없이 받는 훈련 발령 전용 세션. 콘솔과 휴대폰 현장 화면이 같은 브라우저에서 같은 훈련 발령을 보게 한다.
//          AI 호출과 문서함은 열지 않는다. 범위 표시(nonce 앞 drill-)는 서명 안에 있어 바꿀 수 없다
const DRILL = 'drill-'
// 역할 표시(claims): 시 관리자(city) 또는 동 담당자(dong:동코드). 서명 안에 들어가 바꿀 수 없다.
// 토큰은 exp.nonce.claims.mac 4칸. 예전 3칸 토큰(claims 없음)은 시 관리자로 읽는다(하위 호환)
const ROLE_RE = /^(city|dong:[A-Z]{2})$/
export const claimsOf = (role, dong) => (role === 'dong' && /^[A-Z]{2}$/.test(String(dong || '')) ? `dong:${dong}` : 'city')
export function issueToken(now = Date.now(), scope = 'full', { nonce: keep = null, role = 'city', dong = null } = {}) {
  const exp = Math.floor(now / 1000) + TTL_SEC
  let nonce = keep
  if (!nonce) {
    nonce = scope === 'drill' ? `${DRILL}${randomBytes(9).toString('hex')}` : randomBytes(9).toString('base64url')
    while (scope !== 'drill' && nonce.startsWith(DRILL)) nonce = randomBytes(9).toString('base64url')
  }
  const claims = scope === 'drill' ? claimsOf(role, dong) : 'city'
  const payload = `${exp}.${nonce}.${claims}`
  return `${payload}.${sign(payload)}`
}

const safeEq = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

export function verifyToken(token, now = Date.now()) {
  if (!sessionConfigured() || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 && parts.length !== 4) return null
  const [exp, nonce] = parts
  const claims = parts.length === 4 ? parts[2] : 'city'
  const mac = parts[parts.length - 1]
  const payload = parts.length === 4 ? `${exp}.${nonce}.${claims}` : `${exp}.${nonce}`
  if (!/^\d{9,12}$/.test(exp) || !ROLE_RE.test(claims) || !safeEq(mac, sign(payload))) return null
  if (Number(exp) * 1000 < now) return null
  const scope = nonce.startsWith(DRILL) ? 'drill' : 'full'
  const role = scope === 'drill' && claims.startsWith('dong:') ? 'dong' : 'city'
  return { id: nonce, exp: Number(exp), scope, role, dong: role === 'dong' ? claims.slice(5) : null }
}

export const checkCode = (code) => sessionConfigured() && typeof code === 'string' && safeEq(code.trim(), process.env.MIRI_DEMO_CODE)

export function readCookie(req, name = COOKIE) {
  const raw = String(req.headers?.cookie || '')
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

export const sessionOf = (req) => verifyToken(readCookie(req))

export function cookieHeader(token, maxAge = TTL_SEC) {
  return `${COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}

// 다른 사이트에서 보낸 요청 막기(보조 장치). Origin 이나 Referer 가 있으면 요청 host 와 같아야 한다
const hostOf = (u) => { try { return new URL(u).host } catch { return '' } }
export function sameSite(req) {
  const h = req.headers || {}
  const host = h.host || ''
  const from = hostOf(h.origin || '') || hostOf(h.referer || '')
  if (!from) {
    // 출처가 없으면 읽기(GET, HEAD)만 받는다. 브라우저는 같은 사이트 POST, DELETE 에 Origin 을 붙인다
    const m = String(req.method || 'GET').toUpperCase()
    return m === 'GET' || m === 'HEAD'
  }
  if (from === host) return true
  const allow = String(process.env.MIRI_ALLOWED_ORIGINS || '').split(',').map((x) => hostOf(x.trim()) || x.trim()).filter(Boolean)
  return allow.includes(from)
}

// 횟수 세기. Redis 가 있으면 공유 원자 카운터, 없으면 인스턴스 메모리
let storeOverride = null
// 시험에서만 쓰는 저장소 바꿔 끼우기. null 을 넣으면 실제 환경변수 기준으로 돌아간다
export function setStoreForTest(s) { storeOverride = s }
function store() {
  if (storeOverride) return storeOverride
  return getStore() // Upstash REST 또는 표준 Redis(api/_store.js)
}
// 발령 저장(api/dispatch.js)이 같은 저장소를 쓴다
export const sharedStore = () => store()
const mem = new Map()
export function memIncr(key, ttlSec, now = Date.now()) {
  for (const [k, v] of mem) if (v.until < now) mem.delete(k) // 오래된 키 정리
  const b = mem.get(key)
  if (!b || b.until < now) { mem.set(key, { n: 1, until: now + ttlSec * 1000 }); return 1 }
  b.n += 1
  return b.n
}
// 만료 시각을 먼저 붙인 뒤 올린다(SET NX EX 뒤 INCR). INCR 은 남은 만료 시각을 유지하므로
// 올리기와 만료 붙이기 사이에 실패해도 만료 없는 키가 남지 않는다
async function sharedIncr(r, key, ttlSec) {
  const k = `miri:rl:${key}`
  if (typeof r.set === 'function') await r.set(k, 0, { nx: true, ex: ttlSec })
  const n = await r.incr(k)
  if (Number(n) === 1) await r.expire(k, ttlSec) // 두 호출 사이 만료된 드문 경우 보정
  return Number(n)
}
export async function incr(key, ttlSec) {
  const r = store()
  if (!r) return memIncr(key, ttlSec)
  try {
    return await sharedIncr(r, key, ttlSec)
  } catch {
    return memIncr(key, ttlSec)
  }
}

// AI 호출 상한 전용. 공유 저장소가 없거나 오류면 인스턴스 메모리로 돌아가지 않고 실패를 알린다.
// 서버 인스턴스마다 따로 세면 전체 합계 상한이 인스턴스 수만큼 늘어나기 때문이다
export class StoreUnavailable extends Error { constructor(m) { super(m); this.code = 'NO_LIMIT_STORE' } }
export async function incrShared(key, ttlSec) {
  const r = store()
  if (!r) throw new StoreUnavailable('공유 횟수 저장소 미연결')
  try {
    const n = await sharedIncr(r, key, ttlSec)
    if (!Number.isFinite(n)) throw new Error('횟수 값 오류')
    return n
  } catch (e) {
    throw new StoreUnavailable(`공유 횟수 저장소 오류: ${e?.message || e}`)
  }
}

// Vercel 이 붙이는 실제 접속 IP 를 먼저 쓴다. 요청자가 꾸밀 수 있는 첫 번째 X-Forwarded-For 는 쓰지 않는다
export function clientIpOf(req) {
  const h = req.headers || {}
  const real = h['x-real-ip'] || h['x-vercel-forwarded-for']
  if (real) return String(real).split(',')[0].trim()
  const f = String(h['x-forwarded-for'] || '').split(',').map((x) => x.trim()).filter(Boolean)
  return f[f.length - 1] || req.socket?.remoteAddress || 'unknown'
}

// AI 호출 상한. 세션과 IP는 한 사람의 남용을, 전체 합계는 공유 키 비용을 막는다
export const AI_LIMITS = {
  intake: { session: 10, ip: 10, globalMin: 40, globalDay: 400 },
  note: { session: 20, ip: 20, globalMin: 80, globalDay: 800 }
}

export async function aiBudget(req, name, sid) {
  const L = AI_LIMITS[name]
  const day = new Date().toISOString().slice(0, 10)
  const checks = [
    [`${name}:all:${day}`, 26 * 3600, L.globalDay],
    [`${name}:all:min`, 60, L.globalMin],
    [`${name}:s:${sid}`, 60, L.session],
    [`${name}:ip:${clientIpOf(req)}`, 60, L.ip]
  ]
  for (const [key, ttl, max] of checks) {
    if ((await incrShared(key, ttl)) > max) return false
  }
  return true
}

const deny = (res, status, code, message) => { res.status(status).json({ error: { code, message } }); return false }

// requireSession: 서명 쿠키 필요. allowDrill: 훈련 발령 전용 세션도 받음(발령 저장만). ai: AI 호출 이름(횟수 상한 적용)
export async function guard(req, res, { requireSession = true, allowDrill = false, ai = null } = {}) {
  if (!sameSite(req)) return deny(res, 403, 'FORBIDDEN', '미리 화면에서 보낸 요청만 처리합니다')
  if (requireSession) {
    if (!sessionConfigured()) return deny(res, 503, 'NO_SESSION_CONFIG', '시연 코드 설정이 없어 이 기능을 닫아 두었습니다')
    const s = sessionOf(req)
    if (!s) return deny(res, 401, 'NEED_SESSION', allowDrill ? '시연 세션이 없습니다. 계정을 다시 골라 주십시오' : '시연 코드가 필요합니다. 콘솔 로그인 화면에서 시연 코드를 입력해 주십시오')
    if (s.scope === 'drill' && (!allowDrill || ai)) return deny(res, 401, 'NEED_SESSION', '시연 코드가 필요합니다. 콘솔 로그인 화면에서 시연 코드를 입력해 주십시오')
    req.miriSession = s
  }
  let within = true
  if (ai) {
    try {
      within = await aiBudget(req, ai, req.miriSession?.id || 'none')
    } catch (e) {
      if (e instanceof StoreUnavailable) return deny(res, 503, 'NO_LIMIT_STORE', '사용량을 셀 저장소에 연결되지 않아 AI 판독을 잠시 닫아 두었습니다. 잠시 뒤 다시 시도해 주십시오')
      throw e
    }
  }
  if (!within) {
    res.setHeader('Retry-After', '60')
    return deny(res, 429, 'RATE_LIMIT', '요청이 너무 잦거나 오늘 시연 사용량을 넘었습니다. 잠시 뒤 다시 시도해 주십시오')
  }
  return true
}

// 로그인 없이 쓰는 문서 도구(파일 읽기, 한글 변환, 표기 검사, 법령 확인)의 보호.
// 출처 확인(미리 화면에서 보낸 요청만)과 IP별 분당 상한, 전체 하루 상한을 둔다. 세션은 요구하지 않는다(시연 콘솔이 세션 없이 쓴다)
export const TOOL_LIMITS = {
  parse: { ip: 10, day: 500 },
  hwpx: { ip: 30, day: 2000 },
  lint: { ip: 60, day: 5000 },
  law: { ip: 30, day: 1000 }
}
export async function toolGuard(req, res, name) {
  const h = req.headers || {}
  const from = hostOf(h.origin || '') || hostOf(h.referer || '')
  if (!from || !sameSite(req)) return deny(res, 403, 'FORBIDDEN', '미리 화면에서 보낸 요청만 처리합니다')
  const L = TOOL_LIMITS[name]
  const day = new Date().toISOString().slice(0, 10)
  if ((await incr(`tool:${name}:ip:${clientIpOf(req)}`, 60)) > L.ip || (await incr(`tool:${name}:all:${day}`, 26 * 3600)) > L.day) {
    res.setHeader('Retry-After', '60')
    return deny(res, 429, 'RATE_LIMIT', '요청이 너무 잦습니다. 잠시 뒤 다시 시도해 주십시오')
  }
  return true
}

// 접근 기록: 경로, 방법, 상태, 지연, 역할만 남긴다. 본문, 쿼리 값, IP 원문, 쿠키는 남기지 않는다
export function accessLog(req, res, started, extra = {}) {
  try {
    const path = String(req.url || '').split('?')[0]
    const s = req.miriSession
    const line = { t: new Date().toISOString(), path, method: req.method, status: res.statusCode, ms: Date.now() - started, scope: s?.scope || null, role: s?.role || null, ...extra }
    if (process.env.MIRI_ACCESS_LOG !== '0') console.log(JSON.stringify({ miri_access: line }))
    return line
  } catch { return null }
}

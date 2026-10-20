// _guard.js 서버 함수 접근 제한(GPT 검토 S6, S7, 재검토 R1, R2).
// 시안 단계의 서버 확인 방식:
//   1. 시연 코드(서버 환경변수 MIRI_DEMO_CODE)를 /api/session 에 내면 서버가 서명 쿠키를 발급한다.
//      쿠키 값은 만료 시각과 HMAC-SHA256 서명(서버 환경변수 MIRI_SESSION_SECRET)이라 서버 비밀값 없이는 만들 수 없다.
//      HttpOnly, Secure, SameSite=Strict 라서 화면 스크립트와 다른 사이트에서 쓰지 못한다.
//   2. 비공개 문서함 조회, 저장, 삭제, 설문 응답 조회와 AI 호출은 이 쿠키가 있어야 처리한다.
//   3. AI 호출은 세션마다, IP마다, 그리고 전체 합계로 분당과 하루 상한을 둔다. 저장소(Upstash Redis)가 있으면
//      인스턴스 사이에 공유하고, 없으면 인스턴스 안에서만 센다.
// 두 환경변수가 없으면 비공개 기능은 닫힌 채로 둔다(설정 누락이 열림으로 이어지지 않게).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { Redis } from '@upstash/redis'

export const COOKIE = 'miri_s'
const TTL_SEC = 12 * 60 * 60

const secret = () => process.env.MIRI_SESSION_SECRET || ''
export const sessionConfigured = () => Boolean(process.env.MIRI_DEMO_CODE && secret().length >= 16)

const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url')

export function issueToken(now = Date.now()) {
  const exp = Math.floor(now / 1000) + TTL_SEC
  const payload = `${exp}.${randomBytes(9).toString('base64url')}`
  return `${payload}.${sign(payload)}`
}

const safeEq = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

export function verifyToken(token, now = Date.now()) {
  if (!sessionConfigured() || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [exp, nonce, mac] = parts
  if (!/^\d{9,12}$/.test(exp) || !safeEq(mac, sign(`${exp}.${nonce}`))) return null
  if (Number(exp) * 1000 < now) return null
  return { id: nonce, exp: Number(exp) }
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
  if (!from) return true // 서명 쿠키가 SameSite=Strict 라 다른 사이트 요청에는 실리지 않는다
  if (from === host) return true
  const allow = String(process.env.MIRI_ALLOWED_ORIGINS || '').split(',').map((x) => hostOf(x.trim()) || x.trim()).filter(Boolean)
  return allow.includes(from)
}

// 횟수 세기. Redis 가 있으면 공유 원자 카운터, 없으면 인스턴스 메모리
let redis = null
let redisKey = ''
function store() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  if (!redis || redisKey !== `${url}|${token}`) { redis = new Redis({ url, token }); redisKey = `${url}|${token}` }
  return redis
}
const mem = new Map()
export function memIncr(key, ttlSec, now = Date.now()) {
  for (const [k, v] of mem) if (v.until < now) mem.delete(k) // 오래된 키 정리
  const b = mem.get(key)
  if (!b || b.until < now) { mem.set(key, { n: 1, until: now + ttlSec * 1000 }); return 1 }
  b.n += 1
  return b.n
}
export async function incr(key, ttlSec) {
  const r = store()
  if (!r) return memIncr(key, ttlSec)
  try {
    const n = await r.incr(`miri:rl:${key}`)
    if (n === 1) await r.expire(`miri:rl:${key}`, ttlSec)
    return n
  } catch {
    return memIncr(key, ttlSec)
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
    if ((await incr(key, ttl)) > max) return false
  }
  return true
}

const deny = (res, status, code, message) => { res.status(status).json({ error: { code, message } }); return false }

// requireSession: 서명 쿠키 필요. ai: AI 호출 이름(횟수 상한 적용)
export async function guard(req, res, { requireSession = true, ai = null } = {}) {
  if (!sameSite(req)) return deny(res, 403, 'FORBIDDEN', '미리 화면에서 보낸 요청만 처리합니다')
  if (requireSession) {
    if (!sessionConfigured()) return deny(res, 503, 'NO_SESSION_CONFIG', '시연 코드 설정이 없어 이 기능을 닫아 두었습니다')
    const s = sessionOf(req)
    if (!s) return deny(res, 401, 'NEED_SESSION', '시연 코드가 필요합니다. 로그인 화면에서 시연 코드를 입력해 주십시오')
    req.miriSession = s
  }
  if (ai && !(await aiBudget(req, ai, req.miriSession?.id || 'none'))) {
    res.setHeader('Retry-After', '60')
    return deny(res, 429, 'RATE_LIMIT', '요청이 너무 잦거나 오늘 시연 사용량을 넘었습니다. 잠시 뒤 다시 시도해 주십시오')
  }
  return true
}

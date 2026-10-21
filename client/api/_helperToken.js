// _helperToken.js 도우미별 서명 링크(회신 R34: 도우미별 접근 권한).
// 토큰 = 발령 ID . 도우미 코드 . 만료(초) . HMAC-SHA256(서버 비밀값 MIRI_SESSION_SECRET).
// 서버 비밀값 없이는 만들 수 없고, 한 토큰으로는 그 도우미에게 배정된 회차만 조회하고 응답한다.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const HELPER_TTL_SEC = 12 * 60 * 60
const ID_RE = /^D[0-9a-z]{6,20}$/
const HELPER_RE = /^[A-Z]{1,3}-\d{1,4}$/
const secret = () => process.env.MIRI_SESSION_SECRET || ''
const mac = (d, h, exp) => createHmac('sha256', secret()).update(`helper|${d}|${h}|${exp}`).digest('base64url')
const safeEq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y) }

export const validDispatchId = (d) => typeof d === 'string' && ID_RE.test(d)
export const validHelperCode = (h) => typeof h === 'string' && HELPER_RE.test(h)

export function signHelperToken(d, h, now = Date.now(), ttl = HELPER_TTL_SEC) {
  if (secret().length < 16 || !validDispatchId(d) || !validHelperCode(h)) return null
  const exp = Math.floor(now / 1000) + ttl
  return `${d}.${h}.${exp}.${mac(d, h, exp)}`
}

// 맞으면 { d, h, exp }, 위조, 형식 오류, 만료면 null
export function verifyHelperToken(token, now = Date.now()) {
  if (secret().length < 16 || typeof token !== 'string' || token.length > 200) return null
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [d, h, exp, sig] = parts
  if (!validDispatchId(d) || !validHelperCode(h) || !/^\d{9,12}$/.test(exp)) return null
  if (!safeEq(sig, mac(d, h, exp))) return null
  if (Number(exp) * 1000 < now) return null
  return { d, h, exp: Number(exp) }
}

// api/session.js 시연 세션.
// POST { code } → 시연 코드가 맞으면 서명 쿠키 발급(full). POST { demo: 'drill' } → 코드 없이 훈련 발령 전용 쿠키(drill).
// GET → { active(full 여부), drill(훈련 전용 여부) }. DELETE → 쿠키 지움.
// 시연 코드와 서명 비밀값은 서버 환경변수(MIRI_DEMO_CODE, MIRI_SESSION_SECRET)에만 둔다.
import { accessLog, checkCode, claimsOf, clientIpOf, cookieHeader, incr, issueToken, sameSite, sessionConfigured, sessionOf } from './_guard.js'

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

export default async function handler(req, res) {
  const started = Date.now()
  try { return await handle(req, res) } finally { accessLog(req, res, started) }
}

async function handle(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!sameSite(req)) return fail(res, 403, 'FORBIDDEN', '미리 화면에서 보낸 요청만 처리합니다')
  if (req.method === 'GET') {
    const s = sessionOf(req)
    return res.status(200).json({ active: s?.scope === 'full', drill: s?.scope === 'drill', role: s?.role || null, dong: s?.dong || null, configured: sessionConfigured() })
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookieHeader('', 0))
    return res.status(200).json({ active: false })
  }
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'GET, POST, DELETE 만 허용')
  if (!sessionConfigured()) return fail(res, 503, 'NO_SESSION_CONFIG', '시연 코드 설정이 없습니다')
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  // 훈련 발령 전용 세션: 시연 계정을 고르면 화면이 요청한다. 이미 세션이 있으면 바꾸지 않는다(full 을 낮추지 않음)
  if (body && typeof body === 'object' && body.demo === 'drill') {
    // 역할(시 관리자, 동 담당자)과 동 코드는 서명 안에 담는다. 서버는 이 값으로 발령 조회 범위와 저장 권한을 정한다
    const role = body.role === 'dong' ? 'dong' : 'city'
    const dong = role === 'dong' ? String(body.dong || '') : null
    if (role === 'dong' && !/^[A-Z]{2}$/.test(dong)) return fail(res, 400, 'BAD_INPUT', '동 코드 형식 오류')
    const cur = sessionOf(req)
    if (cur?.scope === 'full') return res.status(200).json({ active: true, drill: false, role: 'city', dong: null })
    if (cur?.scope === 'drill') {
      // 같은 브라우저에서 계정을 바꾸면 세션 번호는 그대로 두고 역할만 바꿔 다시 서명한다(같은 훈련 발령을 계속 봄)
      if (claimsOf(cur.role, cur.dong) === claimsOf(role, dong)) return res.status(200).json({ active: false, drill: true, role: cur.role, dong: cur.dong })
      if ((await incr(`session:role:ip:${clientIpOf(req)}`, 60)) > 60) {
        res.setHeader('Retry-After', '60')
        return fail(res, 429, 'RATE_LIMIT', '시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주십시오')
      }
      res.setHeader('Set-Cookie', cookieHeader(issueToken(Date.now(), 'drill', { nonce: cur.id, role, dong })))
      return res.status(200).json({ active: false, drill: true, role, dong })
    }
    const dday = new Date().toISOString().slice(0, 10)
    if ((await incr(`session:drill:ip:${clientIpOf(req)}`, 60)) > 10 || (await incr(`session:drill:all:${dday}`, 26 * 3600)) > 2000) {
      res.setHeader('Retry-After', '60')
      return fail(res, 429, 'RATE_LIMIT', '시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주십시오')
    }
    res.setHeader('Set-Cookie', cookieHeader(issueToken(Date.now(), 'drill', { role, dong })))
    return res.status(200).json({ active: false, drill: true, role, dong })
  }
  // 코드 맞히기 시도 제한: IP마다 분당 10회, 전체 하루 300회
  const day = new Date().toISOString().slice(0, 10)
  if ((await incr(`session:ip:${clientIpOf(req)}`, 60)) > 10 || (await incr(`session:all:${day}`, 26 * 3600)) > 300) {
    res.setHeader('Retry-After', '60')
    return fail(res, 429, 'RATE_LIMIT', '시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주십시오')
  }
  const code = body && typeof body === 'object' ? body.code : null
  if (typeof code !== 'string' || code.length > 100) return fail(res, 400, 'BAD_INPUT', '시연 코드를 입력해 주십시오')
  if (!checkCode(code)) return fail(res, 401, 'BAD_CODE', '시연 코드가 맞지 않습니다')
  res.setHeader('Set-Cookie', cookieHeader(issueToken()))
  return res.status(200).json({ active: true })
}

// api/session.js 시연 세션(GPT 재검토 R1).
// POST { code } → 시연 코드가 맞으면 서명 쿠키 발급. GET → { active }. DELETE → 쿠키 지움.
// 시연 코드와 서명 비밀값은 서버 환경변수(MIRI_DEMO_CODE, MIRI_SESSION_SECRET)에만 둔다.
import { checkCode, clientIpOf, cookieHeader, incr, issueToken, sameSite, sessionConfigured, sessionOf } from './_guard.js'

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!sameSite(req)) return fail(res, 403, 'FORBIDDEN', '미리 화면에서 보낸 요청만 처리합니다')
  if (req.method === 'GET') return res.status(200).json({ active: Boolean(sessionOf(req)), configured: sessionConfigured() })
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookieHeader('', 0))
    return res.status(200).json({ active: false })
  }
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'GET, POST, DELETE 만 허용')
  if (!sessionConfigured()) return fail(res, 503, 'NO_SESSION_CONFIG', '시연 코드 설정이 없습니다')
  // 코드 맞히기 시도 제한: IP마다 분당 10회, 전체 하루 300회
  const day = new Date().toISOString().slice(0, 10)
  if ((await incr(`session:ip:${clientIpOf(req)}`, 60)) > 10 || (await incr(`session:all:${day}`, 26 * 3600)) > 300) {
    res.setHeader('Retry-After', '60')
    return fail(res, 429, 'RATE_LIMIT', '시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주십시오')
  }
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  const code = body && typeof body === 'object' ? body.code : null
  if (typeof code !== 'string' || code.length > 100) return fail(res, 400, 'BAD_INPUT', '시연 코드를 입력해 주십시오')
  if (!checkCode(code)) return fail(res, 401, 'BAD_CODE', '시연 코드가 맞지 않습니다')
  res.setHeader('Set-Cookie', cookieHeader(issueToken()))
  return res.status(200).json({ active: true })
}

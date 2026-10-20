// _guard.js 서버 함수 접근 제한(GPT 검토 S6, S7).
// 지금 시안에는 서버 로그인 세션이 없다. 그래서 운영 전까지의 임시 장치로
// (1) 같은 사이트 화면에서 온 요청만 받고 (2) 처리 비용이 드는 AI 호출은 IP마다 분당 횟수를 제한한다.
// 요청 머리글은 꾸밀 수 있으므로 인증을 대신하지 않는다. 실제 운영 때는 서버 세션 인증과 역할 검사로 바꾼다.

const hostOf = (u) => { try { return new URL(u).host } catch { return '' } }

export function sameSite(req) {
  const h = req.headers || {}
  if (h['sec-fetch-site'] === 'same-origin') return true
  const host = h['x-forwarded-host'] || h.host || ''
  const from = hostOf(h.origin || '') || hostOf(h.referer || '')
  if (!from || !host) return false
  if (from === host) return true
  const allow = String(process.env.MIRI_ALLOWED_ORIGINS || '').split(',').map((x) => hostOf(x.trim()) || x.trim()).filter(Boolean)
  return allow.includes(from)
}

const buckets = new Map()
export function clientIpOf(req) {
  const f = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
  return f || req.socket?.remoteAddress || 'unknown'
}
// 한 서버 인스턴스 안의 분당 제한. 인스턴스가 여러 개면 합산되지 않는다
export function allowLocal(key, perMin, now = Date.now()) {
  const b = buckets.get(key)
  if (!b || now - b.t > 60000) { buckets.set(key, { t: now, n: 1 }); return true }
  b.n += 1
  return b.n <= perMin
}

export function guard(req, res, { perMin = 0, name = 'api' } = {}) {
  if (!sameSite(req)) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: '미리 화면에서 보낸 요청만 처리합니다' } })
    return false
  }
  if (perMin && !allowLocal(`${name}:${clientIpOf(req)}`, perMin)) {
    res.setHeader('Retry-After', '60')
    res.status(429).json({ error: { code: 'RATE_LIMIT', message: '요청이 너무 잦습니다. 1분 뒤 다시 시도해 주세요' } })
    return false
  }
  return true
}

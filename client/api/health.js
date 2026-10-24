// 상태 확인. 세션 없이 열 수 있고, 비밀 값은 돌려주지 않는다.
// 돌려주는 것: 실행 위치 이름(MIRI_RUNTIME, 기본 vercel), 저장소 종류와 응답 여부, 응답 시간
export const config = { maxDuration: 10 }
import { getStore, storeKind } from './_store.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: { code: 'METHOD', message: 'GET 만 허용' } })
  const kind = storeKind()
  let store = { kind: kind || 'none', ok: kind ? false : null, ms: null }
  if (kind) {
    const t = Date.now()
    try {
      const r = getStore()
      // 표준 Redis 는 PING, Upstash 는 없는 키 읽기로 연결만 본다
      if (typeof r.ping === 'function') await r.ping()
      else await r.get('miri:health:probe')
      store = { kind, ok: true, ms: Date.now() - t }
    } catch {
      store = { kind, ok: false, ms: Date.now() - t }
    }
  }
  const ok = store.ok !== false
  return res.status(ok ? 200 : 503).json({ ok, runtime: process.env.MIRI_RUNTIME || 'vercel', store, at: new Date().toISOString() })
}

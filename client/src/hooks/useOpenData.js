// 공공데이터 연계 조회. /api/opendata 서버리스 함수를 부른다. 키가 없거나 실패하면 error 를 돌려준다.
// 자료 종류별 보관 기한을 두고, 화면을 연 채로 있으면 주기적으로, 탭으로 돌아오면 기한이 지난 자료를 다시 읽는다.
import { useCallback, useEffect, useState } from 'react'

const MIN = 60 * 1000
export const TTL = { er: 5 * MIN, alerts: 5 * MIN, warning: 10 * MIN, wind: 30 * MIN, fire: 30 * MIN }
const ttlOf = (kind) => TTL[kind] ?? 60 * MIN
const cache = new Map() // kind -> { s, at }
export const fresh = (kind, now = Date.now()) => { const c = cache.get(kind); return Boolean(c && now - c.at < ttlOf(kind)) }

async function load(kind) {
  const r = await fetch(`/api/opendata?kind=${kind}`)
  const isJson = (r.headers.get('content-type') || '').includes('application/json')
  const j = isJson ? await r.json().catch(() => null) : null
  if (!r.ok || !j || j.error) throw new Error(j?.error?.code || `HTTP ${r.status}`)
  return j
}

export default function useOpenData(kind) {
  const [state, setState] = useState(() => cache.get(kind)?.s || { data: null, error: null, loading: true })
  const refresh = useCallback(async (force = false) => {
    if (!force && fresh(kind)) { setState(cache.get(kind).s); return }
    try {
      const data = await load(kind)
      const s = { data, error: null, loading: false }
      cache.set(kind, { s, at: Date.now() })
      setState(s)
    } catch (e) {
      // 실패해도 이전 자료는 남기고 오류만 알린다
      setState((p) => ({ data: p.data, error: e.message, loading: false }))
    }
  }, [kind])
  useEffect(() => {
    let off = false
    const run = (force) => { if (!off) refresh(force) }
    run(false)
    const iv = setInterval(() => run(false), ttlOf(kind))
    const onVis = () => { if (document.visibilityState === 'visible') run(false) }
    document.addEventListener('visibilitychange', onVis)
    return () => { off = true; clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
  }, [kind, refresh])
  return { ...state, refresh: () => refresh(true) }
}

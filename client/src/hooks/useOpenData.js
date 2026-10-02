// 공공데이터 연계 조회. /api/opendata 서버리스 함수를 부른다. 키가 없거나 실패하면 error 를 돌려준다.
import { useEffect, useState } from 'react'

const cache = new Map()

export default function useOpenData(kind) {
  const [state, setState] = useState(() => cache.get(kind) || { data: null, error: null, loading: true })
  useEffect(() => {
    if (cache.has(kind)) return
    let off = false
    fetch(`/api/opendata?kind=${kind}`)
      .then(async (r) => {
        const isJson = (r.headers.get('content-type') || '').includes('application/json')
        const j = isJson ? await r.json().catch(() => null) : null
        if (!r.ok || !j || j.error) throw new Error(j?.error?.code || `HTTP ${r.status}`)
        return j
      })
      .then((data) => { const s = { data, error: null, loading: false }; cache.set(kind, s); if (!off) setState(s) })
      .catch((e) => { if (!off) setState({ data: null, error: e.message, loading: false }) })
    return () => { off = true }
  }, [kind])
  return state
}

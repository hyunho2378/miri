// 산불위험지수 한 줄. 산림청 국립산림과학원 산불위험예보정보(공공데이터포털, 민관협력 지원 플랫폼 데이터 카탈로그 수록)를
// /api/opendata?kind=fire 로 받아 동해시 값을 보인다. 실패하면 사유를 그대로 적는다(빈 값으로 숨기지 않음).
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Flame } from 'lucide-react'

// 산불위험지수 임계값 51, 66, 86. d2~d4 는 지수 51, 66, 86 이상인 면적 비율(%)이다
// (국립산림과학원, 한국산림과학회지 114권 4호 504쪽, 2025. 12. 31.)
// 개선 기준(위 논문): 다소 높음 = 51 이상 면적 40% 이상, 높음 = 66 이상 면적 60% 이상. 색만 그 기준을 따른다
function toneOf(g) {
  const over66 = (g.d3 || 0) + (g.d4 || 0)
  const over51 = over66 + (g.d2 || 0)
  if (over66 >= 60) return 'text-danger-text bg-danger-soft'
  if (over51 >= 40) return 'text-warning-text bg-warning-soft'
  return 'text-text-sec bg-mute'
}
const fmtAt = (s) => {
  const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})\s*(\d{2})/)
  return m ? `${m[1]}. ${Number(m[2])}. ${Number(m[3])}. ${m[4]}시 분석` : s
}

function useOpenData(kind) {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    let alive = true
    fetch(`/api/opendata?kind=${kind}`)
      .then(async (r) => {
        const j = await r.json().catch(() => null)
        if (!r.ok || !j || j.error) throw new Error(j?.error?.code || `HTTP ${r.status}`)
        return j
      })
      .then((data) => alive && setState({ data }))
      .catch((e) => alive && setState({ error: e.message }))
    return () => { alive = false }
  }, [kind])
  return state
}
export const useFireRisk = () => useOpenData('fire')
export const useWarning = () => useOpenData('warning')
export const useWind = () => useOpenData('wind')

const DIR16 = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서']
export const dirName = (deg) => DIR16[Math.round(((deg % 360) / 22.5)) % 16]

// 기상특보와 바람 한 줄. 기상청 기상특보 조회서비스, 단기예보 조회서비스
export function WeatherLine({ className }) {
  const w = useWarning()
  const v = useWind()
  const h = v.data?.hours?.[0]
  const parts = []
  if (w.data) parts.push(w.data.active.length ? `동해 발효 특보: ${w.data.active.join(', ')}` : '동해 발효 특보 없음')
  else if (w.error) parts.push(`기상특보 불러오지 못함(${w.error})`)
  if (h) parts.push(`바람 ${dirName(h.fromDeg)}풍 ${h.speed}m/s, 습도 ${h.humidity}%`)
  else if (v.error) parts.push(`단기예보 불러오지 못함(${v.error})`)
  if (!parts.length) return null
  const hot = w.data?.related?.length
  return (
    <p className={clsx('type-meta leading-5', hot ? 'text-warning-text' : 'text-text-sec', className)}>
      {parts.join(' / ')}<span className="text-text-meta">, 기상청</span>
    </p>
  )
}

export default function FireRiskStrip({ className, compact = false }) {
  const { loading, data, error } = useFireRisk()
  if (loading) return <p className={clsx('type-meta text-text-meta', className)}>산불위험지수를 불러오는 중입니다.</p>
  if (error) return <p className={clsx('type-meta text-text-meta', className)}>산불위험지수를 불러오지 못했습니다({error}).</p>
  const g = data.grades || {}
  const over51 = (g.d2 || 0) + (g.d3 || 0) + (g.d4 || 0)
  return (
    <p className={clsx('inline-flex flex-wrap items-center gap-x-2 gap-y-1 type-body-sm text-text-pri', className)}>
      <Flame size={16} aria-hidden="true" className="text-warning" />
      <span>동해시 산불위험지수 평균 <strong className="tabular-nums">{data.mean}</strong>, 최고 <strong className="tabular-nums">{data.max}</strong></span>
      <span className={clsx('rounded-xs px-1.5 py-0.5 type-caption', toneOf(g))}>지수 51 이상 면적 {over51}%</span>
      {!compact && <span className="type-meta text-text-meta">산림청 국립산림과학원, {fmtAt(data.analyzedAt)}</span>}
    </p>
  )
}

// PATTERNS.md 4번. 사업계획서 4대 가설 지표 카드.
// 라벨 문구는 i18n admin.dashboard.* 에 있고 사업계획서 지표명과 문자 단위로 같다. 바꾸지 않는다.
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { TONE_TEXT, statusTone } from './StatusPill.jsx'


// 0 에서 값까지 400ms. 최초 1회만. reduced-motion 이면 즉시 최종값
function useCountUp(value, decimals) {
  const [shown, setShown] = useState(value)
  const played = useRef(false)

  useEffect(() => {
    if (played.current) { setShown(value); return undefined }
    played.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return undefined }
    let raf = 0
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 400)
      setShown(value * (1 - (1 - p) ** 3))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    setShown(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return Number(shown).toFixed(decimals)
}

export default function KpiCard({ label, value, decimals = 0, unit, delta, deltaUnit, targetText, status, to, invertDelta = false }) {
  const { t } = useLang()
  const shown = useCountUp(value, decimals)
  // 응대시간처럼 줄어드는 것이 좋은 지표는 색을 뒤집는다
  const up = Number(delta) >= 0
  const good = invertDelta ? !up : up

  return (
    <Link to={to} className="block bg-page rounded-lg shadow-card p-5 lg:p-6 hover:shadow-md transition-shadow duration-fast">
      {/* 8단계. 라벨이 너무 흐려 값과 위계가 안 섰다. text-meta → text-sec 한 단계 진하게 */}
      <p className="type-caption text-text-sec">{label}</p>
      <p className="mt-2 type-kpi text-text-pri">
        {shown}
        {unit && <span className="ml-1 type-h3 text-text-meta">{unit}</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={clsx('inline-flex items-center gap-1 type-caption tabular-nums', good ? 'text-text-sec' : 'text-danger-text')}>
          {up ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}
          {Math.abs(delta)}{deltaUnit ?? unit}
        </span>
        <span className="type-meta text-text-meta">{t('admin.dashboard.vsPrev')}</span>
      </div>
      <p className={clsx('mt-1 type-meta', TONE_TEXT[statusTone(status)])}>{targetText}</p>
    </Link>
  )
}

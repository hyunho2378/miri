// 전역 발령 띠(PATTERNS 37). 발령 진행 중에만. 미이송 예상이 있으면 danger.
import clsx from 'clsx'
import { Siren } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import useNow from '../../hooks/useNow.js'
import { remainText } from '../../lib/time.js'
import useDispatchStore from '../../store/useDispatchStore.js'

export default function DispatchBanner() {
  const d = useDispatchStore()
  const now = useNow()
  const { pathname } = useLocation()
  if (!['standby', 'assigned', 'sent'].includes(d.status)) return null
  const arrivals = Object.values(d.arrivals)
  const earliest = arrivals.length ? Math.min(...arrivals) : now
  const unserved = d.result?.unassigned?.length || 0
  const late = unserved > 0
  return (
    <div role="status" className={clsx('shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 lg:px-8 py-2', late ? 'bg-danger text-text-inverse' : 'bg-text-pri text-text-inverse')}>
      <Siren size={16} aria-hidden="true" />
      <span className="type-caption tabular-nums">{d.kind === 'drill' ? '훈련 발령' : '실제 발령'} 후 {remainText(now - d.vStart).replace(' 경과', '')} 경과</span>
      <span className="type-caption tabular-nums">가장 이른 산불 도달까지 {remainText(earliest - now)}</span>
      {late && <span className="type-caption tabular-nums">미이송 예상 {unserved}명</span>}
      {d.kind === 'drill' && d.speed > 1 && <span className="type-caption">훈련 시뮬레이션 속도 {d.speed}배</span>}
      {pathname !== '/console/dispatch' && (
        <Link to="/console/dispatch" className="ml-auto type-caption underline underline-offset-2 min-h-11 md:min-h-0 inline-flex items-center">발령 운영</Link>
      )}
    </div>
  )
}

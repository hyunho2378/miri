// 숫자 카드. 라벨 caption 600 / 값 kpi 800 (size sm 은 h2 700). 위험 값은 글자만 danger.
import clsx from 'clsx'
import { Link } from 'react-router-dom'

export default function MetricCard({ label, value, unit, sub, tone = 'neutral', to, badge, size = 'md' }) {
  const sm = size === 'sm'
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="type-caption text-text-sec">{label}</p>
        {badge}
      </div>
      <p className={clsx(sm ? 'mt-1 type-h2 tabular-nums' : 'mt-2 type-kpi', tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
        {value}
        {unit && <span className={clsx('ml-1 text-text-meta', sm ? 'type-caption' : 'type-h3')}>{unit}</span>}
      </p>
      {sub && <p className="mt-2 type-meta text-text-meta">{sub}</p>}
    </>
  )
  const cls = clsx('block bg-page rounded-lg shadow-card min-w-0', sm ? 'p-3 lg:p-4' : 'p-5 lg:p-6')
  return to
    ? <Link to={to} className={clsx(cls, 'hover:shadow-md transition-shadow duration-fast')}>{body}</Link>
    : <div className={cls}>{body}</div>
}

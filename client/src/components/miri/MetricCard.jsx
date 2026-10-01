// 숫자 카드(PATTERNS 4 변형). 부족분처럼 위험 값은 글자만 danger.
import clsx from 'clsx'
import { Link } from 'react-router-dom'

export default function MetricCard({ label, value, unit, sub, tone = 'neutral', to, badge }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="type-caption text-text-sec">{label}</p>
        {badge}
      </div>
      <p className={clsx('mt-2 type-kpi', tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
        {value}
        {unit && <span className="ml-1 type-h3 text-text-meta">{unit}</span>}
      </p>
      {sub && <p className="mt-2 type-meta text-text-meta">{sub}</p>}
    </>
  )
  const cls = 'block bg-page rounded-lg shadow-card p-5 lg:p-6 min-w-0'
  return to
    ? <Link to={to} className={clsx(cls, 'hover:shadow-md transition-shadow duration-fast')}>{body}</Link>
    : <div className={cls}>{body}</div>
}

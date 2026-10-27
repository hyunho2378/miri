// 숫자 한 칸. 상자 없이 이름 한 줄과 값 한 줄(숫자와 단위는 같은 크기와 굵기). 위험 값은 글자색만 danger.
// sub 는 문자열 또는 노드(여러 줄 가능, div 로 감싼다).
import clsx from 'clsx'
import { Link } from 'react-router-dom'

export default function MetricCard({ label, value, unit, sub, tone = 'neutral', to, badge, size = 'md' }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="type-caption text-text-sec">{label}</p>
        {badge}
      </div>
      <p className={clsx('mt-0.5 tabular-nums', size === 'sm' ? 'type-strong' : 'type-title', tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
        {value}{unit}
      </p>
      {sub && <div className="mt-0.5 type-meta text-text-sec">{sub}</div>}
    </>
  )
  const cls = 'block min-w-0 py-1'
  return to
    ? <Link to={to} className={clsx(cls, 'hover:underline')}>{body}</Link>
    : <div className={cls}>{body}</div>
}

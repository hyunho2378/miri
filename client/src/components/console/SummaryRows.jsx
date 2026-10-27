// 작은 면 안의 이름-값 행. 이름 왼쪽, 값 오른쪽 끝, 행 높이 36. 값은 숫자와 단위를 같은 크기로 쓴다
// rows: [{ key, label, value, tone('danger'), note }]
import clsx from 'clsx'

export default function SummaryRows({ rows, className }) {
  return (
    <dl className={clsx('min-w-0', className)}>
      {rows.filter(Boolean).map((r) => (
        <div key={r.key ?? r.label} className="flex min-h-9 items-baseline justify-between gap-4 py-1">
          <dt className="shrink-0 type-body-sm text-text-sec">{r.label}</dt>
          <dd className={clsx('min-w-0 break-keep text-right type-body-strong tabular-nums', r.tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
            {r.value}
            {r.note && <span className="block type-meta font-normal text-text-sec">{r.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

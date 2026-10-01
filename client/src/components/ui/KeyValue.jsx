// 라벨과 값 목록(dl). 라벨 caption 600 text-meta, 값 body-sm 400. 값 강조는 strong 항목만 type-strong.
import clsx from 'clsx'

export default function KeyValue({ items = [], className, dense = false }) {
  return (
    <dl className={clsx('grid grid-cols-[auto_1fr] gap-x-4', dense ? 'gap-y-1' : 'gap-y-2', className)}>
      {items.filter(Boolean).map((it) => (
        <div key={it.label} className="contents">
          <dt className="type-caption text-text-meta pt-0.5">{it.label}</dt>
          <dd className={clsx('min-w-0 break-words tabular-nums', it.strong ? 'type-strong text-text-pri' : 'type-body-sm text-text-sec')}>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

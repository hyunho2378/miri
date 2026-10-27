// 지금 상황을 쉬운 문장으로 말하는 줄. 상자 없이 태그와 문장, 오른쪽에 다음 행동. 경보 태그는 여기에만 둔다
import clsx from 'clsx'
import StatusChip from './StatusChip.jsx'

export default function StatusBand({ tag, tone = 'danger', action, children, className, ...rest }) {
  return (
    <section className={clsx('flex flex-wrap items-center gap-x-4 gap-y-3', className)} {...rest}>
      {tag && <StatusChip tone={tone}>{tag}</StatusChip>}
      <p className="min-w-0 flex-1 basis-80 type-title text-text-pri tabular-nums">{children}</p>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </section>
  )
}

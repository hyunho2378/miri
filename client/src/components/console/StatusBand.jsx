// 지금 상황을 쉬운 문장 한 줄로 말하는 띠. 경보 태그는 이 띠에만 둔다. 오른쪽에 다음 행동
import clsx from 'clsx'
import StatusChip from './StatusChip.jsx'

export default function StatusBand({ tag, tone = 'danger', action, children, className, ...rest }) {
  return (
    <section className={clsx('flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-subtle px-5 py-4', className)} {...rest}>
      {tag && <StatusChip tone={tone}>{tag}</StatusChip>}
      <p className="min-w-0 flex-1 basis-80 type-h3 text-text-pri tabular-nums">{children}</p>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </section>
  )
}

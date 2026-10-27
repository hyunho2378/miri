// 면 위에 바로 놓는 섹션: 제목(title/large 22/28) 다음에 내용. 상자 없이 여백으로 나눈다
import clsx from 'clsx'

export default function Section({ title, count, action, id, children, className, tone, dense }) {
  return (
    <section aria-labelledby={id} className={clsx('min-w-0', tone === 'surface' && (dense ? 'rounded-lg bg-subtle p-5' : 'rounded-lg bg-subtle p-6'), className)}>
      <div className={clsx(dense ? 'mb-2' : 'mb-4', 'flex flex-wrap items-center justify-between gap-x-4 gap-y-1')}>
        <h2 id={id} className={clsx('flex items-baseline gap-2 text-text-pri', dense ? 'type-body-strong' : 'type-title')}>
          {title}
          {count != null && <span className={clsx('font-normal tabular-nums text-text-sec', dense ? 'type-body-strong' : 'type-title')}>{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

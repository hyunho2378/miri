// 면 위에 바로 놓는 섹션: 제목(title/large 22/28) 다음에 내용. 상자 없이 여백으로 나눈다
import clsx from 'clsx'

export default function Section({ title, count, action, id, children, className }) {
  return (
    <section aria-labelledby={id} className={clsx('min-w-0', className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="flex items-baseline gap-2 type-title text-text-pri">
          {title}
          {count != null && <span className="type-title tabular-nums text-text-sec">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

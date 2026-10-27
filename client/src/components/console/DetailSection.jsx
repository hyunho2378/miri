// 상세의 한 덩어리. 결론, 할 일, 근거 순. 상자 없이 제목과 여백으로 나눈다
import clsx from 'clsx'

export default function DetailSection({ title, action, children, className }) {
  return (
    <section className={clsx('mt-10 first:mt-0', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="type-title text-text-pri">{title}</h3>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  )
}

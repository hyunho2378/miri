// 상세의 한 덩어리. 결론, 할 일, 근거 순. 상자 없이 제목과 여백으로 나눈다
import clsx from 'clsx'

export default function DetailSection({ title, children, className }) {
  return (
    <section className={clsx('mt-8 first:mt-0', className)}>
      <h3 className="mb-2 type-strong text-text-sec">{title}</h3>
      {children}
    </section>
  )
}

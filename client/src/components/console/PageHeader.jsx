// 화면 이름 한 줄과 오른쪽 주 행동 하나. 날짜 같은 덧붙임은 제목 옆 괄호로 같은 줄에 둔다. 제목 아래 설명 줄은 두지 않는다
import clsx from 'clsx'

export default function PageHeader({ title, meta, action, className }) {
  return (
    <div className={clsx('mb-6 flex flex-wrap items-center justify-between gap-3', className)}>
      <h1 className="type-h2 text-text-pri">
        {title}
        {meta && <span className="ml-2 type-h3 font-normal text-text-sec">({meta})</span>}
      </h1>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

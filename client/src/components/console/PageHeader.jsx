// 화면 이름 하나와 오른쪽 주 행동 하나. 제목 아래 설명 줄은 두지 않는다
import clsx from 'clsx'

export default function PageHeader({ title, action, className }) {
  return (
    <div className={clsx('mb-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <h1 className="type-h2 text-text-pri">{title}</h1>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

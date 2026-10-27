// 화면 이름 한 줄과 오른쪽 주 행동 하나. 날짜는 제목 옆 괄호로 같은 줄에 둔다(meta 를 주지 않으면 오늘 날짜). 제목 아래 설명 줄은 두지 않는다
// meta={null} 이면 괄호를 달지 않는다
import clsx from 'clsx'
import { todayLabel } from '../../lib/todayLabel.js'

export default function PageHeader({ title, meta, action, className }) {
  const shown = meta === undefined ? todayLabel() : meta
  return (
    <div className={clsx('mb-4 flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2', className)}>
      <h1 className="flex min-w-0 items-baseline gap-2 type-h2 text-text-pri">
        <span className="shrink-0">{title}</span>
        {shown && <span className="min-w-0 truncate font-normal text-text-sec">({shown})</span>}
      </h1>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

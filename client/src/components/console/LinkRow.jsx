// 한 줄 이동 행(처리할 일, 부족 마을 등). 높이 48, 이름 왼쪽, 값과 이동 표시 오른쪽. to 가 있으면 이동, onClick 이 있으면 상세 열기
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function LinkRow({ to, onClick, title, sub, value, tone, className }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 items-baseline gap-3">
        <span className="shrink-0 type-body text-text-pri">{title}</span>
        {sub && <span className="min-w-0 truncate type-body-sm text-text-sec tabular-nums">{sub}</span>}
      </span>
      {value != null && <span className={clsx('shrink-0 type-body-strong tabular-nums', tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>{value}</span>}
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-text-sec" />
    </>
  )
  const cls = clsx('flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-subtle', className)
  return to ? <Link to={to} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>
}

// 한 줄 이동 행(처리할 일, 부족 마을 등). 열: 이름, 보조 글(남는 폭), 값, 이동 표시(폭 24). to 가 있으면 이동, onClick 이 있으면 상세 열기
// 값과 이동 표시는 붙여서 오른쪽 끝에 두고, 이름과 보조 글은 왼쪽에 모아 가운데 빈 폭이 보조 글로 채워지게 한다. dense 는 행 높이 40
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function LinkRow({ to, onClick, title, sub, value, tone, dense, className }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 items-baseline gap-x-3">
        <span className="shrink-0 type-body text-text-pri">{title}</span>
        {sub && <span className="min-w-0 truncate type-body-sm text-text-sec tabular-nums">{sub}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {value != null && <span className={clsx('type-body-strong tabular-nums', tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>{value}</span>}
        <ChevronRight size={18} aria-hidden="true" className="w-6 shrink-0 text-text-sec" />
      </span>
    </>
  )
  const cls = clsx('flex w-full items-center gap-2 rounded-lg px-3 text-left hover:bg-subtle', dense ? 'min-h-10 py-0.5' : 'min-h-11 py-1', className)
  return to ? <Link to={to} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>
}

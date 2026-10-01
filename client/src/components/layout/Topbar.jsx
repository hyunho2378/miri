// 담당자 상단바. 타이틀과 actions 는 useTopbar 슬롯. 우측은 발령 상태, 가상 데이터 배지, 이상 탐지.
import { Menu } from 'lucide-react'
import useAdminUi from '../../store/useAdminUi.js'
import IconButton from '../ui/IconButton.jsx'
import AnomalyBell from '../miri/AnomalyBell.jsx'
import DispatchStatusPill from '../miri/DispatchStatusPill.jsx'
import MockDataBadge from '../miri/MockDataBadge.jsx'

export default function Topbar() {
  const topbar = useAdminUi((s) => s.topbar)
  const setSidebarOpen = useAdminUi((s) => s.setSidebarOpen)
  return (
    <header className="sticky top-0 z-nav h-topbar shrink-0 bg-page border-b border-line-sub">
      <div className="mx-auto flex h-full w-full max-w-wide items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton size="lg" className="md:hidden" aria-label="메뉴 열기" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} aria-hidden="true" />
          </IconButton>
          <h1 className="min-w-0 truncate type-h2 text-text-pri">{topbar.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {topbar.actions}
          <span className="hidden sm:inline-flex"><DispatchStatusPill /></span>
          <span className="hidden lg:inline-flex"><MockDataBadge /></span>
          <AnomalyBell />
        </div>
      </div>
    </header>
  )
}

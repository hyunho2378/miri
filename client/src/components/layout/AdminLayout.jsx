// 담당자 레이아웃. lg 240 / md 레일 64 / md 미만 사이드바 숨김 + 햄버거 Drawer.
// 768 미만 진입 시 데스크톱 권장 배너. 발령 진행 중이면 상단바 아래 전역 발령 띠.
import { Suspense, useEffect } from 'react'
import { X } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import useAdminUi from '../../store/useAdminUi.js'
import useMiriStore from '../../store/useMiriStore.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import Drawer from '../ui/Drawer.jsx'
import IconButton from '../ui/IconButton.jsx'
import DispatchBanner from '../miri/DispatchBanner.jsx'
import Sidebar from './Sidebar.jsx'
import SectionTabs from './SectionTabs.jsx'
import Topbar from './Topbar.jsx'

export default function AdminLayout() {
  const sidebarOpen = useAdminUi((s) => s.sidebarOpen)
  const setSidebarOpen = useAdminUi((s) => s.setSidebarOpen)
  const bannerDismissed = useAdminUi((s) => s.desktopBannerDismissed)
  const dismissBanner = useAdminUi((s) => s.dismissDesktopBanner)
  const orgName = useMiriStore((s) => s.settings.orgName)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isRail = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const { pathname } = useLocation()

  useEffect(() => { if (isDesktop) setSidebarOpen(false) }, [isDesktop, setSidebarOpen])

  return (
    <div className="min-h-screen bg-canvas">
      {!isDesktop && !bannerDismissed && (
        <div className="flex items-center gap-2 bg-mute px-4 py-2 text-text-sec">
          <p className="min-w-0 flex-1 type-caption">담당자 화면은 데스크톱 사용 권장. 휴대폰에서는 확인 위주로 사용</p>
          <IconButton size="sm" aria-label="안내 닫기" onClick={dismissBanner} className="text-text-sec">
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
      )}
      <div className="md:grid md:grid-cols-[64px_1fr] lg:grid-cols-[240px_1fr]">
        {isDesktop && (
          <aside className="sticky top-0 h-screen border-r border-line-sub">
            <Sidebar rail={isRail} orgName={orgName} />
          </aside>
        )}
        <div className="flex min-w-0 flex-col">
          <Topbar />
          <SectionTabs />
          <DispatchBanner />
          <main className="min-w-0 flex-1">
            {/* 본문만 경로별로 다시 만든다. 사이드바와 상단바는 유지 */}
            {/* Suspense 는 경계 바깥에 둔다. 경계에 경로 키를 달아도 대기 영역은 유지돼 전환 중 기존 화면이 남는다 */}
            <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
              <ErrorBoundary key={pathname}>
                <Outlet />
              </ErrorBoundary>
            </Suspense>
          </main>
        </div>
      </div>
      <Drawer open={sidebarOpen} side="left" onClose={() => setSidebarOpen(false)} title="담당자 메뉴">
        <Sidebar orgName={orgName} onNavigate={() => setSidebarOpen(false)} />
      </Drawer>
    </div>
  )
}

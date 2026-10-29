// 담당자 레이아웃. 회색 바탕 위에 한 겹의 왼쪽 메뉴(폭 220, 접으면 80), 맨 위 한 줄 상단 띠, 그 아래 둥근 흰 판.
// 1024 이상은 메뉴를 펴 두고, 768~1023은 접어 둔다(상단 띠 버튼으로 편다). 768 미만은 서랍 메뉴.
// 본문은 흰 판 안에서만 스크롤한다. 메뉴와 상단 띠는 움직이지 않는다.
import { Suspense, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import useAdminUi from '../../store/useAdminUi.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import Drawer from '../ui/Drawer.jsx'
import IconButton from '../ui/IconButton.jsx'
import DispatchBanner from '../miri/DispatchBanner.jsx'
import { NavPanel, NAV_WIDTH, NAV_WIDTH_COLLAPSED, SideNav } from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import CoachTour from '../onboarding/CoachTour.jsx'
import GuidePanel from '../onboarding/GuidePanel.jsx'

export default function AdminLayout() {
  const sidebarOpen = useAdminUi((s) => s.sidebarOpen)
  const setSidebarOpen = useAdminUi((s) => s.setSidebarOpen)
  const bannerDismissed = useAdminUi((s) => s.desktopBannerDismissed)
  const dismissBanner = useAdminUi((s) => s.dismissDesktopBanner)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isWide = useMediaQuery('(min-width: 1024px)')
  const { pathname } = useLocation()
  const [panelOpen, setPanelOpen] = useState(isWide)
  const mainRef = useRef(null)

  useEffect(() => { if (isDesktop) setSidebarOpen(false) }, [isDesktop, setSidebarOpen])
  useEffect(() => { setPanelOpen(isWide) }, [isWide])
  // 경로가 바뀌면 본문 스크롤을 맨 위로
  useEffect(() => { mainRef.current?.scrollTo(0, 0) }, [pathname])

  return (
    <div className="flex h-dvh overflow-hidden bg-mute">
      {/* KWCAG 반복 영역 건너뛰기(회신 R14 지침 자체 점검) */}
      <a href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus() }} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-text-pri focus:px-4 focus:py-2 focus:font-bold focus:text-text-inverse">본문 바로가기</a>
      {isDesktop && (
        <aside className="shrink-0" style={{ width: panelOpen ? NAV_WIDTH : NAV_WIDTH_COLLAPSED }}>
          <SideNav collapsed={!panelOpen} />
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar isDesktop={isDesktop} panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((o) => !o)} />
        {!isDesktop && !bannerDismissed && (
          <div className="flex items-center gap-2 px-4 pb-2 text-text-sec">
            <p className="min-w-0 flex-1 type-caption">담당자 화면은 컴퓨터 사용 권장, 휴대폰은 조회 위주</p>
            <IconButton size="sm" aria-label="안내 닫기" onClick={dismissBanner} className="text-text-sec">
              <X size={16} aria-hidden="true" />
            </IconButton>
          </div>
        )}
        <div className="flex min-h-0 flex-1 overflow-hidden bg-page md:mr-2 md:rounded-t-lg md:shadow-sm">
          <div className="flex min-w-0 flex-1 flex-col">
            <DispatchBanner />
            <main id="main" tabIndex={-1} ref={mainRef} className="admin-surface relative min-h-0 flex-1 overflow-y-auto focus:outline-none">
              {/* 본문만 경로별로 다시 만든다. Suspense 는 경계 바깥에 둔다 */}
              <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
                <ErrorBoundary key={pathname}>
                  <Outlet />
                </ErrorBoundary>
              </Suspense>
            </main>
          </div>
        </div>
      </div>
      <CoachTour />
      <GuidePanel />
      <Drawer open={sidebarOpen} side="left" onClose={() => setSidebarOpen(false)} title="담당자 메뉴">
        <NavPanel onNavigate={() => setSidebarOpen(false)} />
      </Drawer>
    </div>
  )
}

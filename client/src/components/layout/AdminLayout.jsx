// 담당자 레이아웃. 레퍼런스(IMG_1531) 구조.
// 회색 바탕 위에 1열 아이콘 레일, 맨 위 한 줄 상단 띠, 그 아래 둥근 흰 판. 흰 판 안에 2열 메뉴 칸과 본문이 들어간다.
// 1024 이상은 메뉴 칸을 펴 두고, 768~1023은 접어 둔다(상단 띠 버튼으로 편다). 768 미만은 레일 없이 서랍 메뉴.
// 본문은 흰 판 안에서만 스크롤한다. 레일, 상단 띠, 메뉴 칸은 움직이지 않는다.
import { Suspense, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import useAdminUi from '../../store/useAdminUi.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import Drawer from '../ui/Drawer.jsx'
import IconButton from '../ui/IconButton.jsx'
import DispatchBanner from '../miri/DispatchBanner.jsx'
import UserMenu from '../nav/UserMenu.jsx'
import { NavPanel, Rail } from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import { groupOf } from './navConfig.js'

export default function AdminLayout() {
  const sidebarOpen = useAdminUi((s) => s.sidebarOpen)
  const setSidebarOpen = useAdminUi((s) => s.setSidebarOpen)
  const bannerDismissed = useAdminUi((s) => s.desktopBannerDismissed)
  const dismissBanner = useAdminUi((s) => s.dismissDesktopBanner)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isWide = useMediaQuery('(min-width: 1024px)')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [group, setGroup] = useState(() => groupOf(pathname))
  const [panelOpen, setPanelOpen] = useState(isWide)
  const mainRef = useRef(null)

  useEffect(() => { if (isDesktop) setSidebarOpen(false) }, [isDesktop, setSidebarOpen])
  useEffect(() => { setPanelOpen(isWide) }, [isWide])
  useEffect(() => { setGroup(groupOf(pathname)) }, [pathname])
  // 경로가 바뀌면 본문 스크롤을 맨 위로
  useEffect(() => { mainRef.current?.scrollTo(0, 0) }, [pathname])

  const onGroup = (key, first) => {
    setGroup(key)
    // 바로 가는 묶음(문서함)은 메뉴 칸 없이 본문 전체
    setPanelOpen(key === 'docs' ? false : true)
    if (key !== 'public' && first && groupOf(pathname) !== key) navigate(first.to)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-mute">
      {/* KWCAG 반복 영역 건너뛰기(회신 R14 지침 자체 점검) */}
      <a href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus() }} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-text-pri focus:px-4 focus:py-2 focus:font-bold focus:text-text-inverse">본문 바로가기</a>
      {isDesktop && <aside className="shrink-0"><Rail group={group} onGroup={onGroup} /></aside>}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar isDesktop={isDesktop} panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((o) => !o)} />
        {!isDesktop && !bannerDismissed && (
          <div className="flex items-center gap-2 px-4 pb-2 text-text-sec">
            <p className="min-w-0 flex-1 type-caption">담당자 화면은 컴퓨터에서 쓰기 좋습니다. 휴대폰에서는 확인 위주로 써 주세요.</p>
            <IconButton size="sm" aria-label="안내 닫기" onClick={dismissBanner} className="text-text-sec">
              <X size={16} aria-hidden="true" />
            </IconButton>
          </div>
        )}
        <div className="flex min-h-0 flex-1 overflow-hidden bg-page md:mr-2 md:rounded-t-lg md:shadow-sm">
          {isDesktop && panelOpen && group !== 'docs' && (
            <aside className="w-56 shrink-0 overflow-y-auto bg-subtle">
              <NavPanel group={group} />
            </aside>
          )}
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
      <Drawer open={sidebarOpen} side="left" onClose={() => setSidebarOpen(false)} title="담당자 메뉴">
        <NavPanel showAll onNavigate={() => setSidebarOpen(false)} />
        <div className="px-3 pb-4"><UserMenu /></div>
      </Drawer>
    </div>
  )
}

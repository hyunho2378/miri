// 모바일 셸 두 묶음. docs/MOBILE_UI.md 4장.
// 도우미(/m/h/demo, /m/h/:token): 탭 없는 단일 흐름(H1 배정 알림 → H3 이송 목록 → H5 단계 보고).
// 현장 담당자(/m/f): 탭 4개(상태, 마을, 도우미, 더보기).
// 이번 단계는 셸과 화면 자리만 둔다. 화면 내용은 다음 작업이 채운다.
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, MapPinned, Users, Menu, ClipboardList } from 'lucide-react'
import { PlatformProvider } from './usePlatform.js'
import { MobileRoot, AppBar, EmptyState, OfflineBanner, BottomNav, DisplaySettings } from './ui.jsx'

export function MobileProviderLayout() {
  return (
    <PlatformProvider>
      <Outlet />
    </PlatformProvider>
  )
}

// 도우미 셸: 상단 바와 본문만. 탭 없음.
export function HelperShell() {
  const { token } = useParams()
  const isDemo = !token || token === 'demo'
  return (
    <MobileRoot>
      <div className="mob-screen">
        <OfflineBanner />
        <Outlet context={{ token: isDemo ? 'demo' : token, isDemo }} />
      </div>
    </MobileRoot>
  )
}

export function HelperHomeSlot() {
  const { token } = useParams()
  const isDemo = !token || token === 'demo'
  return (
    <>
      <AppBar title="배정 알림" large />
      <main id="main" className="mob-content no-nav">
        <EmptyState icon={<ClipboardList size={28} />} title="배정 알림 화면 자리" body={isDemo ? '시연 링크. 화면 내용은 다음 단계에서 연결' : '도우미 링크. 화면 내용은 다음 단계에서 연결'} />
        <DisplaySettings />
      </main>
    </>
  )
}

const FIELD_TABS = [
  { key: 'status', label: '상태', path: '/m/f', icon: Activity },
  { key: 'villages', label: '마을', path: '/m/f/villages', icon: MapPinned },
  { key: 'helpers', label: '도우미', path: '/m/f/helpers', icon: Users },
  { key: 'more', label: '더보기', path: '/m/f/more', icon: Menu }
]

// 현장 담당자 셸: 하단 탭 4개. 탭 이동은 링크(NavLink)로 두어 뒤로 가기와 새로고침에서 위치가 유지됨.
export function FieldShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // 더보기 아래 업무 화면(소방 요청, 대상자, 서류, 소식)은 더보기 탭으로 표시
  const MORE_SUB = ['/m/f/fire', '/m/f/people', '/m/f/intake', '/m/f/note']
  const current = MORE_SUB.some((x) => pathname.startsWith(x)) ? FIELD_TABS[3]
    : FIELD_TABS.slice(1).find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`)) || FIELD_TABS[0]
  return (
    <MobileRoot>
      <div className="mob-screen">
        <OfflineBanner />
        <Outlet />
        <BottomNav label="현장 담당자 화면" items={FIELD_TABS.map((t) => {
          const Icon = t.icon
          return { key: t.key, label: t.label, icon: <Icon size={24} aria-hidden="true" />, onClick: () => navigate(t.path), current: current.key === t.key }
        })} />
      </div>
    </MobileRoot>
  )
}


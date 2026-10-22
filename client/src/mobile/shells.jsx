// 모바일 셸 두 묶음. docs/MOBILE_UI.md 4장.
// 도우미(/m/h/demo, /m/h/:token): 탭 없는 단일 흐름(H1 배정 알림 → H3 이송 목록 → H5 단계 보고).
// 현장 담당자(/m/f): 탭 4개(상태, 마을, 도우미, 더보기).
// 이번 단계는 셸과 화면 자리만 둔다. 화면 내용은 다음 작업이 채운다.
import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, MapPinned, Users, Menu, ClipboardList, Building2, Home, HandHeart } from 'lucide-react'
import { shouldUseFrame } from './devices.js'
import { useReportPathToFrame } from './DeviceFrame.jsx'
import { PlatformProvider } from './usePlatform.js'
import { MobileRoot, AppBar, EmptyState, OfflineBanner, BottomNav, DisplaySettings, TwoPane, List, ListRow, Dialog, Button } from './ui.jsx'
import { expCapture, expConsent, expDecide, expScreen, expSource } from '../lib/expTrack.js'
import { pathKeyOf } from '../lib/expSchema.js'
import { USE_MOCK } from '../lib/api.js'
import useAuthStore, { DEMO_USERS, ROLE_LABEL } from '../store/useAuthStore.js'
import { FieldVillagesPage, FieldPeoplePage } from './field/FieldScreens.jsx'

const DeviceFrameHost = lazy(() => import('./DeviceFrame.jsx'))

// 컴퓨터 창에서 열면 휴대폰 틀 하나를 가운데에 두고(DeviceFrame.jsx), 휴대폰과 틀 안에서는 화면을 그대로 보인다.
function frameDecision() {
  if (typeof window === 'undefined') return false
  let coarse = false
  try { coarse = window.matchMedia('(pointer: coarse)').matches } catch { coarse = false }
  return shouldUseFrame({ inFrame: window.self !== window.top, coarse, width: window.innerWidth, search: window.location.search })
}

export function MobileProviderLayout() {
  // 체험 링크(?exp=)의 출처를 이 탭에 기억한다. 틀(iframe) 안 화면도 같은 탭 저장소를 읽는다
  useState(() => expCapture())
  const [framed] = useState(frameDecision)
  if (framed) return <Suspense fallback={null}><DeviceFrameHost /></Suspense>
  return (
    <PlatformProvider>
      <PathReporter />
      <Outlet />
      <ExpConsent />
    </PlatformProvider>
  )
}
function PathReporter() {
  const loc = useLocation()
  useReportPathToFrame(loc)
  useEffect(() => { const k = pathKeyOf(loc.pathname); if (k) expScreen(k) }, [loc.pathname])
  return null
}

// 체험 링크로 들어온 사람에게 한 번만 묻는다. 거절하면 아무것도 기록하지 않고 그대로 체험한다
function ExpConsent() {
  const [open, setOpen] = useState(() => !!expSource() && !expConsent())
  const decide = (yes) => { expDecide(yes); setOpen(false) }
  if (!open) return null
  return (
    <MobileRoot style={{ height: 0, minHeight: 0 }} data-exp-ignore="">
      <Dialog open title="체험 기록 안내" onClose={() => {}}
        body="더 좋은 화면을 만들려고 어느 화면에서 몇 초 머물렀는지, 어떤 버튼을 눌렀는지만 이름 없이 기록해요. 입력한 글과 연락처는 기록하지 않고, 90일 뒤 지워요."
        actions={<><Button variant="plain" onClick={() => decide(false)}>기록 없이 체험</Button><Button onClick={() => decide(true)}>좋아요, 시작</Button></>} />
    </MobileRoot>
  )
}

// /m 시작 화면. 누가 쓰는 화면인지 먼저 고른다.
export function MobileStart() {
  const navigate = useNavigate()
  return (
    <MobileRoot>
      <div className="mob-screen">
        <AppBar title="미리 휴대폰 화면" large />
        <main id="main" className="mob-content no-nav">
          <p className="mob-t-body mob-pad">누가 쓰는 화면인지 고릅니다.</p>
          <List label="화면 고르기">
            <ListRow lead={<Building2 size={22} />} title="현장 담당자용" subtitle="동 행정복지센터 재난 담당 공무원" chevron onClick={() => navigate('/m/f')} />
            <ListRow lead={<HandHeart size={22} />} title="도우미용" subtitle="문자 링크로 이송을 돕는 이웃과 봉사자" chevron onClick={() => navigate('/m/h/demo')} />
          </List>
          <p className="mob-t-foot mob-pad">마을과 시설은 실제 공개 자료, 대상자 개인은 가상입니다.</p>
        </main>
      </div>
    </MobileRoot>
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
  { key: 'status', label: '홈', path: '/m/f', icon: Home },
  { key: 'villages', label: '마을', path: '/m/f/villages', icon: MapPinned },
  { key: 'helpers', label: '도우미', path: '/m/f/helpers', icon: Users },
  { key: 'more', label: '더보기', path: '/m/f/more', icon: Menu }
]

// 현장 담당자 로그인. 차량, 도우미, 대상자 진행은 담당 공무원만 본다.
// 데모는 콘솔 로그인과 같은 데모 계정 두 개(시 관리자, 동 담당자) 중 하나를 고른다. 실서버는 콘솔 로그인으로 보낸다.
const LOGIN_ROLES = [
  { role: 'city', icon: Building2, desc: '동해시 전체 마을, 차량, 도우미 진행' },
  { role: 'dong', icon: Home, desc: '망상동 마을과 대상자 진행만' }
]
export function FieldLogin() {
  const setDemoUser = useAuthStore((s) => s.setDemoUser)
  return (
    <MobileRoot>
      <div className="mob-screen">
        <AppBar title="계정 고르기" large />
        <main id="main" className="mob-content no-nav">
          <p className="mob-t-callout mob-pad">미리 현장 담당자 화면. 동 행정복지센터와 시 재난부서 공무원이 씁니다.</p>
          <List label="시연 계정 고르기">
            {LOGIN_ROLES.map(({ role, icon: Icon, desc }) => (
              <ListRow key={role} lead={<Icon size={22} />} title={ROLE_LABEL[role]} subtitle={`${DEMO_USERS[role].name}, ${desc}`} chevron onClick={() => setDemoUser(role)} />
            ))}
          </List>
          <p className="mob-t-callout mob-pad">마을과 시설은 실제 공개 자료, 대상자 개인은 가상</p>
        </main>
      </div>
    </MobileRoot>
  )
}

function useFieldSignedIn() {
  const user = useAuthStore((s) => s.user)
  const signedIn = useAuthStore((s) => s.signedIn)
  return USE_MOCK ? signedIn && !!user : !!user
}

// 현장 담당자 셸: 하단 탭 4개. 탭 이동은 링크(NavLink)로 두어 뒤로 가기와 새로고침에서 위치가 유지됨.
export function FieldShell() {
  const ok = useFieldSignedIn()
  const loc = useLocation()
  if (!ok) return USE_MOCK ? <FieldLogin /> : <Navigate to="/console/login" state={{ from: loc }} replace />
  return <FieldShellBody />
}

function FieldShellBody() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // 더보기 아래 업무 화면(소방 요청, 대상자, 서류, 소식)은 더보기 탭으로 표시
  const MORE_SUB = ['/m/f/fire', '/m/f/people']
  const current = MORE_SUB.some((x) => pathname.startsWith(x)) ? FIELD_TABS[3]
    : FIELD_TABS.slice(1).find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`)) || FIELD_TABS[0]
  return (
    <MobileRoot>
      <div className="mob-screen">
        <OfflineBanner />
        <FieldPanes pathname={pathname} />
        <BottomNav label="현장 담당자 화면" items={FIELD_TABS.map((t) => {
          const Icon = t.icon
          return { key: t.key, label: t.label, icon: <Icon size={24} aria-hidden="true" />, onClick: () => navigate(t.path), current: current.key === t.key }
        })} />
      </div>
    </MobileRoot>
  )
}


// 목록과 상세가 있는 화면(마을, 대상자)은 medium 이상과 iPhone Duo 안쪽에서 두 단으로 보인다.
// 같은 경로, 같은 기능, 보이는 양만 다르다. compact 에서는 경로가 가리키는 한 화면만 보인다.
const PANES = [
  { base: '/m/f/villages', List: FieldVillagesPage, empty: '마을을 고르면 진행 상황이 여기에 보임' },
  { base: '/m/f/people', List: FieldPeoplePage, empty: '대상자를 고르면 등급과 상태가 여기에 보임' }
]
function FieldPanes({ pathname }) {
  const pane = PANES.find((x) => pathname === x.base || pathname.startsWith(`${x.base}/`))
  if (!pane) return <Outlet />
  const isDetail = pathname.startsWith(`${pane.base}/`)
  const List = pane.List
  return (
    <TwoPane
      list={isDetail ? <List /> : <Outlet />}
      detail={isDetail ? <Outlet /> : null}
      emptyDetail={<main className="mob-content"><EmptyState title={pane.empty} /></main>}
    />
  )
}

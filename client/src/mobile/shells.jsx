// 모바일 셸 두 묶음. docs/MOBILE_UI.md 4장.
// 도우미(/m/h/demo, /m/h/:token): 탭 없는 단일 흐름(H1 배정 알림 → H3 이송 목록 → H5 단계 보고).
// 현장 담당자(/m/f): 탭 4개(상태, 마을, 도우미, 더보기).
// 이번 단계는 셸과 화면 자리만 둔다. 화면 내용은 다음 작업이 채운다.
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, MapPinned, Users, Menu, ClipboardList, Settings } from 'lucide-react'
import { PlatformProvider } from './usePlatform.js'
import { MobileRoot, AppBar, EmptyState, OfflineBanner, BottomNav, DisplaySettings, List, ListRow } from './ui.jsx'

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
  const current = FIELD_TABS.slice().reverse().find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`)) || FIELD_TABS[0]
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

function FieldSlot({ title, body }) {
  return (
    <>
      <AppBar title={title} large />
      <main id="main" className="mob-content">
        <EmptyState title={`${title} 화면 자리`} body={body} />
      </main>
    </>
  )
}

export const FieldStatusSlot = () => <FieldSlot title="발령 상태" body="발령 종류, 경과 시간, 이송 완료, 미배정, 소방 요청, 자료 기준 시각" />
export const FieldVillagesSlot = () => <FieldSlot title="마을별 진행" body="마을별 기한, 완료, 진행, 미배정, 기한 임박 순" />
export const FieldHelpersSlot = () => <FieldSlot title="도우미 응답" body="수락, 불가, 미응답 묶음과 문자 다시 보내기" />

export function FieldMoreSlot() {
  return (
    <>
      <AppBar title="더보기" large />
      <main id="main" className="mob-content">
        <List label="현장 업무">
          <ListRow title="대상자 확인" subtitle="대상자 번호로 등급과 상태 확인" chevron />
          <ListRow title="서류 사진 판독" subtitle="국내 AI 판독과 원문 대조" chevron />
          <ListRow title="현장 소식 보내기" subtitle="글 또는 음성" chevron />
          <ListRow title="미배정과 소방 지원 요청" subtitle="사유별 인원과 요청 기록" chevron />
        </List>
        <p className="mob-t-label mob-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={16} aria-hidden="true" />화면 설정</p>
        <DisplaySettings />
      </main>
    </>
  )
}

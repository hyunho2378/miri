// 담당자 메뉴 구조. 업무 순서대로 놓는다: 현황 확인 → 서류 읽기(AI) → 명부 → 지도 → 자원 → 발령. 같은 일을 하는 화면은 상단 탭으로 묶는다.
import { Archive, BookOpenText, FileScan, FolderOpen, History, LayoutDashboard, LayoutGrid, MapPinned, Network, Settings, ShieldCheck, Siren, Truck, UsersRound } from 'lucide-react'

export const MAIN_NAV = [
  { key: 'home', to: '/console', end: true, label: '현황판', Icon: LayoutDashboard, match: ['/console'] , exact: true },
  { key: 'intake', to: '/console/intake', label: '서류 읽기', Icon: FileScan, match: ['/console/intake'], queue: true },
  { key: 'people', to: '/console/roster', label: '대상자 명부', Icon: UsersRound, match: ['/console/roster'] },
  { key: 'map', to: '/console/map', label: '상황판', Icon: MapPinned, match: ['/console/map'] },
  { key: 'resources', to: '/console/resources', label: '차량과 도우미', Icon: Truck, match: ['/console/resources'] },
  { key: 'dispatch', to: '/console/shortage', label: '발령 준비', Icon: Siren, match: ['/console/shortage', '/console/dispatch', '/console/handover'] },
  { key: 'workspace', to: '/console/workspace', label: '문서함', Icon: FolderOpen, match: ['/console/workspace'] }
]

export const SUB_NAV = [
  { key: 'records', to: '/console/records', label: '이송 기록', Icon: History, match: ['/console/records'] },
  { key: 'settings', to: '/console/settings', label: '설정', role: 'city', Icon: Settings, match: ['/console/settings'] },
  { key: 'diagrams', href: '/diagrams/index.html', label: '서비스 도식', Icon: Network }
]

// 공개 화면. 담당자 화면 밖에서 열린다
export const PUBLIC_NAV = [
  { key: 'open', to: '/open', label: '개방 API', Icon: BookOpenText },
  { key: 'privacy', to: '/privacy', label: '개인정보 처리방침', Icon: ShieldCheck }
]

// 맨 왼쪽 아이콘 레일. 묶음을 고르면 두 번째 칸에 그 묶음의 메뉴가 나온다(레퍼런스 IMG_1531 구조)
export const RAIL_GROUPS = [
  { key: 'work', label: '담당 업무', Icon: LayoutGrid, items: MAIN_NAV },
  { key: 'admin', label: '기록과 설정', Icon: Archive, items: SUB_NAV },
  { key: 'public', label: '공개 화면', Icon: BookOpenText, items: PUBLIC_NAV }
]

export function groupOf(pathname) {
  if (SUB_NAV.some((m) => m.match?.some((p) => pathname === p || pathname.startsWith(p + '/')))) return 'admin'
  return 'work'
}

// 같은 일을 하는 화면을 한 줄 탭으로 묶는다
export const SECTION_TABS = {
  dispatch: [
    { to: '/console/shortage', label: '부족분 계산' },
    { to: '/console/dispatch', label: '발령 운영' },
    { to: '/console/handover', label: '소방 인계', role: 'city' }
  ]
}

export function sectionOf(pathname) {
  return [...MAIN_NAV, ...SUB_NAV.filter((m) => m.match)].find((m) => (m.exact ? pathname === m.to : m.match.some((p) => pathname === p || pathname.startsWith(p + '/'))))
}

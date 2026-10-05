// 담당자 메뉴 구조. 사이드바는 5개 큰 메뉴만 보이고, 같은 일을 하는 화면은 상단 탭으로 묶는다.
import { FolderOpen, LayoutDashboard, MapPinned, Siren, Truck, UsersRound } from 'lucide-react'

export const MAIN_NAV = [
  { key: 'home', to: '/console', end: true, label: '현황판', Icon: LayoutDashboard, match: ['/console'] , exact: true },
  { key: 'map', to: '/console/map', label: '상황판', Icon: MapPinned, match: ['/console/map'] },
  { key: 'people', to: '/console/roster', label: '대상자', Icon: UsersRound, match: ['/console/roster', '/console/intake'], queue: true },
  { key: 'resources', to: '/console/resources', label: '차량과 도우미', Icon: Truck, match: ['/console/resources'] },
  { key: 'dispatch', to: '/console/shortage', label: '발령 준비', Icon: Siren, match: ['/console/shortage', '/console/dispatch', '/console/handover'] },
  { key: 'workspace', to: '/console/workspace', label: '문서함', Icon: FolderOpen, match: ['/console/workspace'] }
]

export const SUB_NAV = [
  { to: '/console/records', label: '이송 기록' },
  { to: '/console/settings', label: '설정', role: 'city' },
  { href: '/diagrams/index.html', label: '서비스 도식' }
]

// 같은 일을 하는 화면을 한 줄 탭으로 묶는다
export const SECTION_TABS = {
  people: [
    { to: '/console/roster', label: '명부' },
    { to: '/console/intake', label: '서류 읽기', queue: true }
  ],
  dispatch: [
    { to: '/console/shortage', label: '부족분 계산' },
    { to: '/console/dispatch', label: '발령 운영' },
    { to: '/console/handover', label: '소방 인계', role: 'city' }
  ]
}

export function sectionOf(pathname) {
  return MAIN_NAV.find((m) => (m.exact ? pathname === m.to : m.match.some((p) => pathname === p || pathname.startsWith(p + '/'))))
}

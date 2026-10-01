// 담당자 사이드바. IA.md 4절 메뉴 3구획 9개. 240 고정 / md 아이콘 레일 64 / md 미만 Drawer.
import clsx from 'clsx'
import {
  Ambulance, Calculator, History, LayoutDashboard, ScanText, Settings, Siren, Truck, UsersRound
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import Logo from '../nav/Logo.jsx'
import UserMenu from '../nav/UserMenu.jsx'
import Tooltip from '../ui/Tooltip.jsx'

const GROUPS = [
  {
    label: '평시 준비',
    items: [
      { to: '/console', end: true, label: '현황판', Icon: LayoutDashboard },
      { to: '/console/roster', label: '대상자 명부', Icon: UsersRound },
      { to: '/console/intake', label: '서류 판독', Icon: ScanText, queue: true },
      { to: '/console/resources', label: '차량과 도우미', Icon: Truck },
      { to: '/console/shortage', label: '부족분 계산', Icon: Calculator }
    ]
  },
  {
    label: '발령 대응',
    items: [
      { to: '/console/dispatch', label: '발령 운영', Icon: Siren },
      { to: '/console/handover', label: '소방 인계', Icon: Ambulance, role: 'city' }
    ]
  },
  {
    label: '기록 관리',
    items: [
      { to: '/console/records', label: '이송 기록', Icon: History },
      { to: '/console/settings', label: '설정', Icon: Settings, role: 'city' }
    ]
  }
]

export default function Sidebar({ rail = false, orgName = '', onNavigate }) {
  const role = useAuthStore((s) => s.user?.role)
  const pending = useMiriStore((s) => s.persons.filter((p) => p.review === 'pending').length)

  const item = (m) => (
    <NavLink
      key={m.to} to={m.to} end={m.end} onClick={onNavigate}
      className={({ isActive }) => clsx(
        'relative flex items-center min-h-11 rounded-md transition-colors duration-fast',
        rail ? 'justify-center w-11 mx-auto' : 'gap-3 px-3',
        isActive ? 'bg-primary-soft text-primary-text' : 'text-text-sec hover:bg-mute hover:text-text-pri'
      )}
    >
      {({ isActive }) => (
        <>
          <span className="relative inline-flex">
            <m.Icon size={20} aria-hidden="true" className="shrink-0" />
            {rail && m.queue && pending > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 ring-2 ring-canvas type-count text-text-inverse">{pending}</span>
            )}
          </span>
          {!rail && <span className={clsx('min-w-0 flex-1 truncate', isActive ? 'type-strong' : 'type-body-sm')}>{m.label}</span>}
          {!rail && m.queue && pending > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 type-count text-text-inverse" aria-label={`확인 대기 ${pending}건`}>{pending}</span>
          )}
        </>
      )}
    </NavLink>
  )

  return (
    <div className={clsx('flex h-full flex-col bg-canvas', rail ? 'w-rail px-2 py-3' : 'w-full px-3 py-4')}>
      <div className={clsx('shrink-0', rail ? 'flex justify-center' : 'px-1')}>
        <Logo to="/console" compact={rail} />
        {!rail && orgName && <p className="mt-2 type-meta text-text-meta truncate">{orgName} 재난취약자 이송</p>}
      </div>
      <nav aria-label="담당자 메뉴" className={clsx('mt-5 flex-1 min-h-0 overflow-y-auto flex flex-col', rail && 'items-center')}>
        {GROUPS.map((g, gi) => {
          const items = g.items.filter((m) => !m.role || m.role === role)
          return (
            <div key={g.label} className={clsx('w-full', gi > 0 && 'mt-4 pt-4 border-t border-line-sub')}>
              {!rail && <p className="px-3 pb-1.5 type-caption text-text-meta">{g.label}</p>}
              <div className={clsx('flex flex-col gap-1', rail && 'items-center')}>
                {items.map((m) => (rail ? <Tooltip key={m.to} label={m.label} side="right">{item(m)}</Tooltip> : item(m)))}
              </div>
            </div>
          )
        })}
      </nav>
      <div className={clsx('shrink-0 border-t border-line-sub pt-3', rail && 'flex justify-center')}>
        <UserMenu compact={rail} />
      </div>
    </div>
  )
}

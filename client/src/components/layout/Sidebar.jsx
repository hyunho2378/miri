// 관리자 사이드바. 240 고정 / md 아이콘 레일 64 / md 미만은 AdminLayout 이 Drawer 로 띄운다.
// 메뉴 순서와 아이콘은 IA.md 관리자 사이드바 표 그대로. 16개라 3구획으로 나누고 소제목으로 접는다.
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  BarChart3, BookOpen, Building2, CalendarCheck, ChevronDown, Database, FileBarChart,
  LayoutDashboard, ListChecks, MessageSquare, Megaphone, MessagesSquare, Rocket, Settings,
  TrendingUp, UserRoundCheck, Users
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import useAdminUi from '../../store/useAdminUi.js'
import useAuthStore from '../../store/useAuthStore.js'
import Badge from '../ui/Badge.jsx'
import Tooltip from '../ui/Tooltip.jsx'
import Logo from '../nav/Logo.jsx'
import UserMenu from '../nav/UserMenu.jsx'

// 그룹 소제목은 240 레일에서만 보인다. 64 레일은 구분선만으로 나누고 접기도 없다
const GROUPS = [
  {
    key: 'ops',
    label: 'admin.sidebar.groupOps',
    items: [
      { to: '/admin', end: true, key: 'admin.nav.dashboard', Icon: LayoutDashboard },
      { to: '/admin/logs', key: 'admin.nav.logs', Icon: MessageSquare, queue: 'accuracy' },
      { to: '/admin/handoff', key: 'admin.nav.handoff', Icon: UserRoundCheck, queue: 'handoff' },
      { to: '/admin/knowledge', key: 'admin.nav.knowledge', Icon: BookOpen, queue: 'knowledge' },
      { to: '/admin/faq', key: 'admin.nav.faq', Icon: ListChecks },
      { to: '/admin/facilities', key: 'admin.nav.facilities', Icon: Building2 },
      { to: '/admin/notices', key: 'admin.nav.notices', Icon: Megaphone },
      { to: '/admin/reservations', key: 'admin.nav.reservations', Icon: CalendarCheck },
      { to: '/admin/analytics', key: 'admin.nav.analytics', Icon: BarChart3 },
      { to: '/admin/simulator', key: 'admin.nav.simulator', Icon: MessagesSquare }
    ]
  },
  {
    key: 'insight',
    label: 'admin.sidebar.groupInsight',
    items: [
      { to: '/admin/insights', key: 'admin.nav.insights', Icon: Database },
      { to: '/admin/reports', key: 'admin.nav.reports', Icon: FileBarChart },
      { to: '/admin/forecast', key: 'admin.nav.forecast', Icon: TrendingUp }
    ]
  },
  {
    key: 'system',
    label: 'admin.sidebar.groupSystem',
    items: [
      { to: '/admin/onboarding', key: 'admin.nav.onboarding', Icon: Rocket, role: 'admin' },
      { to: '/admin/users', key: 'admin.nav.users', Icon: Users },
      { to: '/admin/settings', key: 'admin.nav.settings', Icon: Settings }
    ]
  }
]

export default function Sidebar({ rail = false, orgName = '', onNavigate }) {
  const { t } = useLang()
  const { pathname } = useLocation()
  const role = useAuthStore((s) => s.user?.role)
  const collapsed = useAdminUi((s) => s.collapsed)
  const toggleGroup = useAdminUi((s) => s.toggleGroup)
  const [queue, setQueue] = useState(null)

  // 화면을 옮길 때마다 다시 센다. 인계 완료나 지식 승인 뒤 배지가 그대로 남으면 안 된다
  useEffect(() => {
    let alive = true
    get('/api/admin/review-queue').then((q) => { if (alive) setQueue(q) }).catch(() => {})
    return () => { alive = false }
  }, [pathname])

  const item = (m) => (
    <NavLink
      key={m.to} to={m.to} end={m.end} onClick={onNavigate}
      className={({ isActive }) => clsx(
        'relative flex items-center min-h-11 rounded-md transition-colors duration-fast',
        rail ? 'justify-center w-11 mx-auto' : 'gap-3 px-3',
        isActive ? 'bg-primary-soft text-primary-text font-medium' : 'text-text-sec hover:bg-mute hover:text-text-pri'
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden="true" className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />}
          <m.Icon size={20} aria-hidden="true" className="shrink-0" />
          {!rail && <span className="min-w-0 flex-1 truncate type-body-sm">{t(m.key)}</span>}
          {!rail && m.queue && queue?.[m.queue] > 0 && (
            <Badge tone="primary" className="tabular-nums">{queue[m.queue]}</Badge>
          )}
        </>
      )}
    </NavLink>
  )

  return (
    <div className={clsx('flex h-full flex-col bg-canvas', rail ? 'w-rail px-2 py-3' : 'w-full px-3 py-4')}>
      <div className={clsx('shrink-0', rail ? 'flex justify-center' : 'px-1')}>
        {rail ? <Logo to="/admin" className="[&>span:last-child]:hidden" /> : <Logo to="/admin" />}
        {!rail && orgName && <p className="mt-2 type-meta text-text-meta truncate">{orgName}</p>}
      </div>

      <nav aria-label={t('admin.sidebar.label')} className={clsx('mt-5 flex-1 min-h-0 overflow-y-auto flex flex-col', rail && 'items-center')}>
        {GROUPS.map((g, gi) => {
          const items = g.items.filter((m) => !m.role || m.role === role)
          if (!items.length) return null
          // 레일에서는 접기가 없다. 아이콘만 있어 접으면 무엇이 사라졌는지 알 수 없다
          const shut = !rail && collapsed[g.key]
          const hasActive = items.some((m) => (m.end ? pathname === m.to : pathname.startsWith(m.to)))
          return (
            <div key={g.key} className={clsx('w-full', gi > 0 && 'mt-4 pt-4 border-t border-line-sub')}>
              {!rail && (
                <button
                  type="button" onClick={() => toggleGroup(g.key)}
                  aria-expanded={!shut}
                  className="flex w-full items-center gap-1 px-3 pb-1.5 type-caption text-text-meta hover:text-text-sec transition-colors duration-fast"
                >
                  <span className="min-w-0 flex-1 truncate text-left">{t(g.label)}</span>
                  {/* 접힌 그룹에 현재 화면이 있으면 점으로 알린다. 접었다고 위치를 잃으면 안 된다 */}
                  {shut && hasActive && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  <ChevronDown
                    size={14} aria-hidden="true"
                    className={clsx('shrink-0 transition-transform duration-fast', shut && '-rotate-90')}
                  />
                </button>
              )}
              {!shut && (
                <div className={clsx('flex flex-col gap-1', rail && 'items-center')}>
                  {items.map((m) => (rail
                    ? <Tooltip key={m.to} label={t(m.key)} side="right">{item(m)}</Tooltip>
                    : item(m)
                  ))}
                </div>
              )}
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

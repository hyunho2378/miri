// 담당자 사이드바. 큰 메뉴 5개만 둔다. 이송 기록과 설정은 아래 작은 링크. 240 고정 / md 아이콘 레일 64 / md 미만 Drawer.
import clsx from 'clsx'
import { NavLink, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import Logo from '../nav/Logo.jsx'
import UserMenu from '../nav/UserMenu.jsx'
import Tooltip from '../ui/Tooltip.jsx'
import { MAIN_NAV, SUB_NAV, sectionOf } from './navConfig.js'

export default function Sidebar({ rail = false, orgName = '', onNavigate }) {
  const role = useAuthStore((s) => s.user?.role)
  const pending = useMiriStore((s) => s.persons.filter((p) => p.review === 'pending').length)
  const { pathname } = useLocation()
  const current = sectionOf(pathname)

  const item = (m) => {
    const active = current?.key === m.key
    return (
      <NavLink
        key={m.key} to={m.to} onClick={onNavigate} aria-current={active ? 'page' : undefined}
        className={clsx(
          'relative flex items-center min-h-11 rounded-md transition-colors duration-fast',
          rail ? 'justify-center w-11 mx-auto' : 'gap-3 px-3',
          active ? 'bg-primary-soft text-primary-text' : 'text-text-sec hover:bg-mute hover:text-text-pri'
        )}
      >
        <span className="relative inline-flex">
          <m.Icon size={20} aria-hidden="true" className="shrink-0" />
          {rail && m.queue && pending > 0 && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 ring-2 ring-canvas type-count text-text-inverse">{pending}</span>
          )}
        </span>
        {!rail && <span className={clsx('min-w-0 flex-1 truncate', active ? 'type-strong' : 'type-body-sm')}>{m.label}</span>}
        {!rail && m.queue && pending > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 type-count text-text-inverse" aria-label={`확인 대기 ${pending}건`}>{pending}</span>
        )}
      </NavLink>
    )
  }

  const subs = SUB_NAV.filter((m) => !m.role || m.role === role)

  return (
    <div className={clsx('flex h-full flex-col bg-canvas', rail ? 'w-rail px-2 py-3' : 'w-full px-3 py-4')}>
      <div className={clsx('shrink-0', rail ? 'flex justify-center' : 'px-1')}>
        <Logo to="/console" compact={rail} />
        {!rail && orgName && <p className="mt-2 type-meta text-text-meta truncate">{orgName} 재난취약자 이송</p>}
      </div>
      <nav aria-label="담당자 메뉴" className={clsx('mt-6 flex-1 min-h-0 overflow-y-auto flex flex-col gap-1', rail && 'items-center')}>
        {MAIN_NAV.map((m) => (rail ? <Tooltip key={m.key} label={m.label} side="right">{item(m)}</Tooltip> : item(m)))}
      </nav>
      {!rail && (
        <div className="shrink-0 mb-2 flex flex-col">
          {subs.map((m) => (m.href ? (
            <a key={m.href} href={m.href} target="_blank" rel="noopener" className="flex min-h-9 items-center rounded-md px-3 type-body-sm text-text-meta transition-colors duration-fast hover:text-text-sec">
              {m.label}<span className="sr-only">(새 창)</span>
            </a>
          ) : (
            <NavLink key={m.to} to={m.to} onClick={onNavigate}
              className={({ isActive }) => clsx('flex min-h-9 items-center rounded-md px-3 type-body-sm transition-colors duration-fast', isActive ? 'text-text-pri type-strong' : 'text-text-meta hover:text-text-sec')}>
              {m.label}
            </NavLink>
          )))}
        </div>
      )}
      <div className={clsx('shrink-0 border-t border-line-sub pt-3', rail && 'flex justify-center')}>
        <UserMenu compact={rail} />
      </div>
    </div>
  )
}

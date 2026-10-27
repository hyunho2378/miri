// 담당자 메뉴. 한 겹의 왼쪽 메뉴. M3 Navigation Rail Expanded(키트 58016:36670, 폭 220)를 기준으로 폭 220, 접으면 아이콘만 80.
// 위에서부터 로고와 알림, 담당 업무, 기록과 설정, 공개 화면, 문서함, 맨 아래 사용자. 발령 준비 아래에는 하위 화면을 들여 쓴다.
import clsx from 'clsx'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Timer } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import AnomalyBell from '../miri/AnomalyBell.jsx'
import UserMenu from '../nav/UserMenu.jsx'
import { RAIL_GROUPS, SECTION_TABS, sectionOf } from './navConfig.js'

export const NAV_WIDTH = 220
export const NAV_WIDTH_COLLAPSED = 80

export function SideNav({ collapsed = false, onNavigate, showHeader = true }) {
  const role = useAuthStore((s) => s.user?.role)
  // 메뉴 배지는 서류와 현장 소식을 더한 값. 내역은 말풍선 이름으로 함께 단다(회신 R34)
  const pendingDocs = useMiriStore((s) => s.persons.filter((p) => p.review === 'pending').length)
  const pendingNotes = useMiriStore((s) => s.fieldNotes.filter((n) => n.status === 'pending').length)
  const pending = pendingDocs + pendingNotes
  const { pathname } = useLocation()
  const current = sectionOf(pathname)

  const row = (m) => {
    if (m.role && m.role !== role) return null
    const active = current?.key === m.key || (m.to && !m.match && pathname === m.to)
    const cls = clsx('relative flex min-h-9 items-center rounded-lg transition-colors duration-fast',
      collapsed ? 'justify-center px-0' : 'gap-2 px-3',
      active ? 'bg-subtle text-text-pri' : 'text-text-sec hover:bg-subtle hover:text-text-pri')
    const badgeLabel = `확인할 서류 ${pendingDocs}건, 현장 소식 ${pendingNotes}건`
    const inner = (
      <>
        <m.Icon size={20} aria-hidden="true" className={clsx('shrink-0', active ? 'text-text-pri' : 'text-text-meta')} />
        {!collapsed && <span className={clsx('min-w-0 flex-1 whitespace-nowrap type-body-sm', active && 'font-bold')}>{m.label}</span>}
        {!collapsed && m.key === 'intake' && <span aria-label="AI 읽기" className="shrink-0 rounded-md bg-mute px-1.5 type-count text-text-pri">AI</span>}
        {m.queue && pending > 0 && (
          <span
            title={badgeLabel} aria-label={badgeLabel}
            className={clsx('inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-text-pri px-1.5 type-count text-text-inverse', collapsed && 'absolute right-2 top-1.5')}
          >{pending}</span>
        )}
      </>
    )
    const subs = !collapsed && current?.key === m.key ? SECTION_TABS[m.key]?.filter((t) => !t.role || t.role === role) : null
    return (
      <li key={m.key}>
        {m.href
          ? <a href={m.href} target="_blank" rel="noopener" title={collapsed ? m.label : undefined} aria-label={collapsed ? `${m.label} (새 창)` : undefined} className={cls}>{inner}{!collapsed && <span className="sr-only">(새 창)</span>}</a>
          : <NavLink to={m.to} end={m.end} onClick={onNavigate} title={collapsed ? m.label : undefined} aria-label={collapsed ? m.label : undefined} aria-current={active ? 'page' : undefined} className={cls}>{inner}</NavLink>}
        {subs && (
          <ul className="mb-0 flex flex-col">
            {subs.map((t) => (
              <li key={t.to}>
                <NavLink to={t.to} onClick={onNavigate}
                  className={({ isActive }) => clsx('flex min-h-7 items-center rounded-lg pl-11 pr-4 type-body-sm transition-colors duration-fast',
                    isActive ? 'font-bold text-text-pri' : 'text-text-sec hover:text-text-pri')}>
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showHeader && (
        <div className={clsx('flex h-14 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between pl-5 pr-4')}>
          <Link to="/console" aria-label="미리 홈" className="inline-flex items-center gap-2 text-text-pri">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-text-inverse"><Timer size={18} aria-hidden="true" /></span>
            {!collapsed && <span className="type-h3">미리</span>}
          </Link>
          {!collapsed && <AnomalyBell />}
        </div>
      )}
      <nav aria-label="담당자 메뉴" className={clsx('min-h-0 flex-1 overflow-y-auto pb-1 pt-2', collapsed ? 'px-2' : 'px-3')}>
        {RAIL_GROUPS.map((g, i) => {
          return (
            <section key={g.key} aria-label={g.label} className={clsx(i > 0 && (collapsed ? 'mt-3' : 'mt-2'))}>
              {!collapsed && <h2 className="mb-0.5 px-3 type-body-sm font-bold text-text-meta">{g.label}</h2>}
              {collapsed && i > 0 && <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-1 rounded-full bg-line-strong" />}
              <ul className="flex flex-col gap-0.5">{g.items.map(row)}</ul>
            </section>
          )
        })}
      </nav>
      <div className={clsx('shrink-0 py-2', collapsed ? 'flex justify-center px-2' : 'px-3')}>
        <UserMenu compact={collapsed} />
      </div>
    </div>
  )
}

// 휴대폰 서랍에서도 같은 메뉴를 쓴다
export function NavPanel({ onNavigate }) {
  return <SideNav onNavigate={onNavigate} showHeader={false} />
}

export default SideNav

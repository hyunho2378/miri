// 담당자 메뉴. 한 겹의 왼쪽 메뉴. M3 Navigation Rail Expanded(키트 58016:36670, 폭 220)를 기준으로 폭 220, 접으면 아이콘만 80.
// 위에서부터 로고와 알림, 담당 업무, 기록과 설정, 공개 화면, 문서함, 맨 아래 사용자. 발령 준비 아래에는 하위 화면을 들여 쓴다.
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Timer } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import AnomalyBell from '../miri/AnomalyBell.jsx'
import UserMenu from '../nav/UserMenu.jsx'
import { RAIL_GROUPS, SECTION_TABS, groupOf, sectionOf } from './navConfig.js'

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
  // 기록과 설정, 공개 화면 묶음은 접이식. 지금 화면이 속한 묶음은 자동으로 펴서 메뉴 전체가 한 화면에 들어오게 한다
  const [folded, setFolded] = useState({ admin: groupOf(pathname) !== 'admin', public: true })
  useEffect(() => { if (groupOf(pathname) === 'admin') setFolded((f) => (f.admin ? { ...f, admin: false } : f)) }, [pathname])

  const row = (m) => {
    if (m.role && m.role !== role) return null
    const active = current?.key === m.key || (m.to && !m.match && pathname === m.to)
    const cls = clsx('relative flex min-h-12 items-center rounded-md transition-colors duration-fast',
      collapsed ? 'justify-center px-0' : 'gap-3 px-4',
      active ? 'bg-subtle text-text-pri' : 'text-text-sec hover:bg-subtle hover:text-text-pri')
    const badgeLabel = `확인할 서류 ${pendingDocs}건, 현장 소식 ${pendingNotes}건`
    const inner = (
      <>
        <m.Icon size={20} aria-hidden="true" className={clsx('shrink-0', active ? 'text-text-pri' : 'text-text-meta')} />
        {!collapsed && <span className={clsx('min-w-0 flex-1 truncate type-body-sm', active && 'font-bold')}>{m.label}</span>}
        {m.queue && pending > 0 && (
          <span
            title={badgeLabel} aria-label={badgeLabel}
            className={clsx('inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-text-pri px-1.5 type-count text-text-inverse', collapsed && 'absolute right-2 top-1.5')}
          >{pending}</span>
        )}
      </>
    )
    const subs = !collapsed ? SECTION_TABS[m.key]?.filter((t) => !t.role || t.role === role) : null
    return (
      <li key={m.key}>
        {m.href
          ? <a href={m.href} target="_blank" rel="noopener" title={collapsed ? m.label : undefined} aria-label={collapsed ? `${m.label} (새 창)` : undefined} className={cls}>{inner}{!collapsed && <span className="sr-only">(새 창)</span>}</a>
          : <NavLink to={m.to} end={m.end} onClick={onNavigate} title={collapsed ? m.label : undefined} aria-label={collapsed ? m.label : undefined} aria-current={active ? 'page' : undefined} className={cls}>{inner}</NavLink>}
        {subs && active && (
          <ul className="mb-1 mt-1 flex flex-col">
            {subs.map((t) => (
              <li key={t.to}>
                <NavLink to={t.to} onClick={onNavigate}
                  className={({ isActive }) => clsx('flex min-h-9 items-center rounded-md pl-12 pr-4 type-body-sm transition-colors duration-fast',
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
        <div className={clsx('flex h-16 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between pl-5 pr-4')}>
          <Link to="/console" aria-label="미리 홈" className="inline-flex items-center gap-2 text-text-pri">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-text-inverse"><Timer size={18} aria-hidden="true" /></span>
            {!collapsed && <span className="type-h3">미리</span>}
          </Link>
          {!collapsed && <AnomalyBell />}
        </div>
      )}
      <nav aria-label="담당자 메뉴" className={clsx('min-h-0 flex-1 overflow-y-auto pb-2 pt-4', collapsed ? 'px-2' : 'px-3')}>
        {RAIL_GROUPS.map((g, i) => {
          const foldable = (g.key === 'public' || g.key === 'admin') && !collapsed
          const isOpen = !folded[g.key]
          const shown = !foldable || isOpen
          return (
            <section key={g.key} aria-label={g.label} className={clsx(i > 0 && (collapsed ? 'mt-3' : 'mt-5'))}>
              {!collapsed && !g.direct && !foldable && <h2 className="mb-2 px-4 text-[14px] font-bold leading-5 text-text-meta">{g.label}</h2>}
              {foldable && (
                <h2 className="mb-2">
                  <button type="button" aria-expanded={isOpen} onClick={() => setFolded((f) => ({ ...f, [g.key]: !f[g.key] }))}
                    className="flex min-h-8 w-full items-center justify-between rounded-md px-4 text-[14px] font-bold leading-5 text-text-meta hover:bg-subtle">
                    {g.label}
                    <ChevronDown size={16} aria-hidden="true" className={clsx('transition-transform duration-fast', isOpen && 'rotate-180')} />
                  </button>
                </h2>
              )}
              {collapsed && i > 0 && <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-1 rounded-full bg-line-strong" />}
              {shown && <ul className="flex flex-col gap-1">{g.items.map(row)}</ul>}
            </section>
          )
        })}
      </nav>
      <div className={clsx('shrink-0 py-4', collapsed ? 'flex justify-center px-2' : 'px-3')}>
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

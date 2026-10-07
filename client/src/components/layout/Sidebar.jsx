// 담당자 메뉴. 레퍼런스(IMG_1531) 구조를 따른다.
// 1열 아이콘 레일: 로고, 묶음 아이콘(담당 업무, 기록과 설정, 공개 화면 | 문서함), 맨 아래 사용자. 문서함은 메뉴 칸 없이 바로 연다.
// 2열 메뉴 칸: 묶음 이름과 알림 종, 그 묶음의 메뉴. 발령 준비 아래에는 하위 화면을 들여 쓴다.
import clsx from 'clsx'
import { Timer } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import AnomalyBell from '../miri/AnomalyBell.jsx'
import UserMenu from '../nav/UserMenu.jsx'
import Tooltip from '../ui/Tooltip.jsx'
import { RAIL_GROUPS, SECTION_TABS, sectionOf } from './navConfig.js'

const firstLink = (g, role) => g.items.find((m) => m.to && (!m.role || m.role === role))

// 1열. 묶음 아이콘만 둔다
export function Rail({ group, onGroup }) {
  const role = useAuthStore((s) => s.user?.role)
  return (
    <div className="flex h-full w-14 flex-col items-center pb-3 pt-2.5">
      <Link to="/console" aria-label="미리 홈" className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-text-inverse">
        <Timer size={18} aria-hidden="true" />
      </Link>
      <nav aria-label="메뉴 묶음" className="mt-6 flex flex-col items-center gap-1">
        {RAIL_GROUPS.map((g) => {
          const active = g.key === group
          return (
            <div key={g.key} className="flex flex-col items-center">
            {/* 문서함은 업무 묶음과 떼어 둔다 */}
            {g.direct && <span aria-hidden="true" className="my-1.5 h-px w-6 bg-line-def" />}
            <Tooltip label={g.label} side="right">
              <button
                type="button" aria-pressed={active} aria-label={g.label}
                onClick={() => onGroup(g.key, firstLink(g, role))}
                className={clsx('inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-fast',
                  active ? 'bg-page text-text-pri shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-text-meta hover:bg-page hover:text-text-pri')}
              >
                <g.Icon size={18} aria-hidden="true" />
              </button>
            </Tooltip>
            </div>
          )
        })}
      </nav>
      <div className="mt-auto">
        <UserMenu compact />
      </div>
    </div>
  )
}

// 2열. 고른 묶음의 메뉴. 휴대폰 서랍에서는 묶음을 모두 펼친다
export function NavPanel({ group = 'work', onNavigate, showAll = false }) {
  const role = useAuthStore((s) => s.user?.role)
  const pending = useMiriStore((s) => s.persons.filter((p) => p.review === 'pending').length)
  const { pathname } = useLocation()
  const current = sectionOf(pathname)
  const groups = showAll ? RAIL_GROUPS : RAIL_GROUPS.filter((g) => g.key === group)

  const row = (m) => {
    if (m.role && m.role !== role) return null
    const active = current?.key === m.key || (m.to && !m.match && pathname === m.to)
    const cls = clsx('flex min-h-10 items-center gap-2.5 rounded-md px-2.5 transition-colors duration-fast',
      active ? 'bg-mute text-text-pri' : 'text-text-sec hover:bg-mute hover:text-text-pri')
    const inner = (
      <>
        <m.Icon size={16} aria-hidden="true" className={clsx('shrink-0', active ? 'text-text-pri' : 'text-text-meta')} />
        <span className={clsx('min-w-0 flex-1 truncate type-body-sm', active && 'font-bold')}>{m.label}</span>
        {m.queue && pending > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-text-pri px-1.5 type-count text-text-inverse" aria-label={`확인 대기 ${pending}건`}>{pending}</span>
        )}
      </>
    )
    const subs = SECTION_TABS[m.key]?.filter((t) => !t.role || t.role === role)
    return (
      <li key={m.key}>
        {m.href
          ? <a href={m.href} target="_blank" rel="noopener" className={cls}>{inner}<span className="sr-only">(새 창)</span></a>
          : <NavLink to={m.to} end={m.end} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={cls}>{inner}</NavLink>}
        {subs && active && (
          <ul className="mb-1 mt-0.5 flex flex-col">
            {subs.map((t) => (
              <li key={t.to}>
                <NavLink to={t.to} onClick={onNavigate}
                  className={({ isActive }) => clsx('flex min-h-9 items-center rounded-md pl-9 pr-2.5 type-meta transition-colors duration-fast',
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
    <div className="flex flex-col px-3 py-4">
      {groups.map((g, i) => (
        <section key={g.key} aria-label={g.label} className={clsx(i > 0 && 'mt-6')}>
          <div className="mb-2 flex min-h-10 items-center justify-between pl-2.5">
            <h2 className="type-strong text-text-pri">{g.label}</h2>
            {i === 0 && <AnomalyBell />}
          </div>
          <ul className="flex flex-col gap-0.5">{g.items.map(row)}</ul>
        </section>
      ))}
    </div>
  )
}

export default NavPanel

// 큰 메뉴 안의 화면 전환 탭. 사이드바 메뉴를 늘리지 않고 같은 일을 하는 화면을 한 줄로 묶는다.
import clsx from 'clsx'
import { NavLink, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import { SECTION_TABS, sectionOf } from './navConfig.js'

export default function SectionTabs() {
  const { pathname } = useLocation()
  const role = useAuthStore((s) => s.user?.role)
  const pending = useMiriStore((s) => s.persons.filter((p) => p.review === 'pending').length)
  const section = sectionOf(pathname)
  const tabs = section && SECTION_TABS[section.key]
  if (!tabs) return null
  const items = tabs.filter((t) => !t.role || t.role === role)
  return (
    <div className="bg-page">
      <nav aria-label="화면 전환" className="mx-auto flex w-full max-w-wide gap-1 px-4 md:px-6 lg:px-8">
        {items.map((t) => (
          <NavLink
            key={t.to} to={t.to}
            className={({ isActive }) => clsx(
              'relative inline-flex h-11 items-center gap-2 px-3 type-strong transition-colors duration-fast',
              isActive ? 'text-text-pri' : 'text-text-meta hover:text-text-sec'
            )}
          >
            {({ isActive }) => (
              <>
                {t.label}
                {t.queue && pending > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 type-count text-text-inverse" aria-label={`확인 대기 ${pending}건`}>{pending}</span>
                )}
                {isActive && <span className="absolute left-3 right-3 bottom-1 h-0.5 rounded-full bg-text-pri" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

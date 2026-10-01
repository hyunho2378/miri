// 소개 면 레이아웃. 상단 내비 + 본문 + 푸터.
import { Link, NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import Logo from '../nav/Logo.jsx'
import MockDataBadge from '../miri/MockDataBadge.jsx'

const MENU = [
  { to: '/console', label: '담당자 화면' },
  { to: '/h/demo', label: '도우미 화면' },
  { to: '/privacy', label: '개인정보 처리' }
]

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-page">
      <header className="sticky top-0 z-nav h-nav-m md:h-nav bg-page border-b border-line-sub">
        <div className="mx-auto flex h-full w-full max-w-page items-center justify-between gap-3 px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16">
          <Logo to="/" />
          <nav aria-label="주요 메뉴" className="flex items-center gap-1">
            {MENU.map((m) => (
              <NavLink
                key={m.to} to={m.to}
                className={({ isActive }) => clsx(
                  'inline-flex items-center min-h-11 md:min-h-0 h-9 px-2 sm:px-3 rounded-md type-body-sm transition-colors duration-fast',
                  m.to === '/privacy' && 'hidden sm:inline-flex',
                  isActive ? 'text-primary-text bg-primary-soft' : 'text-text-sec hover:bg-mute hover:text-text-pri'
                )}
              >
                {m.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <footer className="border-t border-line-sub bg-subtle">
        <div className="mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16 py-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="type-body-sm text-text-sec">미리: 재난취약자 사전 이송 배정</p>
            <p className="mt-1 type-meta text-text-meta">Team 오아시스. 한림대학교 서비스디자인 2026-2 텀과제</p>
          </div>
          <div className="flex items-center gap-3">
            <MockDataBadge />
            <Link to="/privacy" className="type-meta text-text-meta underline underline-offset-2 hover:text-text-sec">개인정보 처리 안내</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// 공개 면 레이아웃(개방 API, 개인정보 처리방침, 404). 머리글 메뉴와 바닥글(라이선스).
import { Link, NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import Logo from '../nav/Logo.jsx'
import { REPO_URL } from '../../lib/links.js'

const NAV = [['/open', '개방 API'], ['/privacy', '개인정보 처리방침']]

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-page">
      <header className="sticky top-0 z-nav h-nav-m md:h-nav bg-page/95 backdrop-blur border-b border-line-sub">
        <div className="mx-auto flex h-full w-full max-w-page items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
          <Logo to="/console" />
          <nav aria-label="공개 메뉴" className="flex items-center gap-1">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => clsx('hidden sm:inline-flex min-h-11 items-center rounded-md px-3 type-body-sm', isActive ? 'text-text-pri' : 'text-text-sec hover:text-text-pri')}>{label}</NavLink>
            ))}
            <Link to="/console" className="ml-1 inline-flex min-h-11 items-center rounded-md bg-primary px-3 type-strong text-text-inverse hover:bg-primary-hover">담당자 화면</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <footer className="border-t border-line-sub bg-subtle">
        <div className="mx-auto flex w-full max-w-page flex-wrap items-center justify-between gap-3 px-4 py-6 type-meta text-text-meta md:px-6 lg:px-8">
          <p>미리, Team 오아시스(한림대학교). 코드 MIT 라이선스, 자료는 각 출처의 이용 조건을 따릅니다.</p>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-text-sec underline">GitHub</a>
        </div>
      </footer>
    </div>
  )
}

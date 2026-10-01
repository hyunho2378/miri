// 공개 면 레이아웃(개인정보 처리 방침, 404). 로고 + 본문만.
import { Link, Outlet } from 'react-router-dom'
import Logo from '../nav/Logo.jsx'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-page">
      <header className="sticky top-0 z-nav h-nav-m md:h-nav bg-page border-b border-line-sub">
        <div className="mx-auto flex h-full w-full max-w-page items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
          <Logo to="/console" />
          <Link to="/console" className="inline-flex min-h-11 items-center px-2 type-body-sm text-text-sec hover:text-text-pri">담당자 화면</Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}

// 도우미 레이아웃. 상단 바 56 + 본문 max 480 중앙. 설치 없는 링크 접속 화면.
import { Outlet, useLocation } from 'react-router-dom'
import Logo from '../nav/Logo.jsx'
import DispatchStatusPill from '../miri/DispatchStatusPill.jsx'

// 상단 발령 상태는 이 브라우저의 시연 발령(/h/demo)에서만 보인다. 서명 링크는 담당자 기기의 상태를 모르므로 숨긴다(본문에 발령 구분 표기)
export const showLocalDispatchPill = (pathname) => /^\/h\/demo\/?$/.test(pathname || '')

export default function HelperLayout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-text-pri focus:px-4 focus:py-2 focus:font-bold focus:text-text-inverse">본문 바로가기</a>
      <header className="sticky top-0 z-nav h-14 bg-page border-b border-line-sub">
        <div className="mx-auto flex h-full w-full max-w-[480px] items-center justify-between gap-3 px-4">
          <Logo linked={false} />
          {showLocalDispatchPill(pathname) && <DispatchStatusPill />}
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[480px] flex-1 flex flex-col focus:outline-none">
        <Outlet />
      </main>
    </div>
  )
}

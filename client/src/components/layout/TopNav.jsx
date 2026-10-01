// 시민 헤더. 헤더도 본문과 같은 컨테이너 클래스를 쓴다(PITFALLS 17. 별도 px 값 금지).
// panelOpen(대화 진입)이면 컨테이너 max-width 를 풀어 좌측 정렬로 넓어진다.
// max-width 애니메이션은 DESIGN.md 가 허용한 레이아웃 속성 예외 1건이다.
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Menu, MessageSquare, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import useChatUi from '../../store/useChatUi.js'
import IconButton from '../ui/IconButton.jsx'
import LangSwitch from '../nav/LangSwitch.jsx'
import Logo from '../nav/Logo.jsx'
import LangSwap from '../../i18n/LangSwap.jsx'

const MENU = [
  { to: '/facilities', key: 'common.nav.facilities' },
  { to: '/notices', key: 'common.nav.notices' },
  { to: '/faq', key: 'common.nav.faq' }
]

export default function TopNav() {
  const { t } = useLang()
  const { pathname } = useLocation()
  const panelOpen = useChatUi((s) => s.panelOpen)
  const conversations = useChatUi((s) => s.conversations)
  const setListOpen = useChatUi((s) => s.setListOpen)
  const [mobileOpen, setMobileOpen] = useState(false)
  // 상담 홈에서 대화가 쌓였을 때만 낸다. 다른 화면에는 열 목록이 없다
  const showList = pathname === '/' && conversations.length > 0

  // 풀스크린 메뉴가 열린 동안 뒤 배경이 스크롤되지 않게 한다
  useEffect(() => {
    if (!mobileOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const link = ({ isActive }) => clsx(
    'inline-flex items-center h-10 px-3 rounded-md type-body-sm font-medium transition-colors duration-fast',
    isActive ? 'text-primary' : 'text-text-sec hover:text-text-pri hover:bg-mute'
  )

  return (
    <header className="sticky top-0 z-nav bg-page border-b border-line-sub">
      <div
        className={clsx(
          'mx-auto flex h-nav-m lg:h-nav w-full items-center gap-3',
          'px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16',
          'transition-[max-width] duration-dur ease-out',
          panelOpen ? 'max-w-none' : 'max-w-page'
        )}
      >
        {/* 좌우 그룹에 같은 flex 기저를 줘 가운데 메뉴가 로고와 언어 전환 사이 중앙에 온다 */}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {/* 모바일 대화 목록. 데스크톱은 대화 화면 좌측 레일이 같은 일을 한다 */}
          {showList && (
            <IconButton
              size="lg" className="md:hidden" aria-label={t('chat.rail.open')}
              onClick={() => setListOpen(true)}
            >
              <MessageSquare size={20} aria-hidden="true" />
            </IconButton>
          )}
          <Logo />
        </div>

        <nav className="hidden md:flex shrink-0 items-center gap-1" aria-label={t('common.nav.menu')}>
          {/* 데스크톱 메뉴는 LangSwap 으로 그린다. t() 로 그리면 언어를 바꿀 때 메뉴가 서로 밀린다 */}
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} className={link}><LangSwap k={m.key} className="text-center" /></NavLink>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
          <LangSwitch />
          <IconButton
            size="lg" className="md:hidden" aria-label={t('common.nav.menu')}
            aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-drawer bg-page md:hidden animate-fade-in" role="dialog" aria-modal="true" aria-label={t('common.nav.menu')}>
          <div className="flex h-nav-m items-center justify-between px-4 border-b border-line-sub">
            <Logo />
            <IconButton size="lg" aria-label={t('common.action.close')} onClick={() => setMobileOpen(false)}>
              <X size={20} aria-hidden="true" />
            </IconButton>
          </div>
          <nav className="p-4 flex flex-col gap-1" aria-label={t('common.nav.menu')}>
            <NavLink to="/" onClick={() => setMobileOpen(false)} className="flex items-center min-h-11 px-3 rounded-md type-h3 text-text-pri hover:bg-mute transition-colors duration-fast">
              {t('common.nav.home')}
            </NavLink>
            {MENU.map((m) => (
              <NavLink
                key={m.to} to={m.to} onClick={() => setMobileOpen(false)}
                className="flex items-center min-h-11 px-3 rounded-md type-h3 text-text-pri hover:bg-mute transition-colors duration-fast"
              >
                {t(m.key)}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

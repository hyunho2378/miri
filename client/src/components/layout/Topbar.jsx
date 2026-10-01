// 관리자 상단바. 타이틀과 actions 는 useTopbar 슬롯(store/useAdminUi)에서 온다.
// actions 는 페이지가 넣은 JSX 를 그대로 그리는 슬롯이다. 자기 상태를 스스로 읽는 컴포넌트를 넣어야 한다.
import { Menu } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import useAdminUi from '../../store/useAdminUi.js'
import IconButton from '../ui/IconButton.jsx'
import NotificationCenter from '../admin/NotificationCenter.jsx'

export default function Topbar() {
  const { t } = useLang()
  const topbar = useAdminUi((s) => s.topbar)
  const setSidebarOpen = useAdminUi((s) => s.setSidebarOpen)

  return (
    <header className="sticky top-0 z-nav h-topbar shrink-0 bg-page border-b border-line-sub">
      <div className="mx-auto flex h-full w-full max-w-wide items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton
            size="lg" className="md:hidden" aria-label={t('admin.topbar.openMenu')}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </IconButton>
          <h1 className="min-w-0 truncate type-h2 text-text-pri">{topbar.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {topbar.actions}
          <NotificationCenter />
        </div>
      </div>
    </header>
  )
}

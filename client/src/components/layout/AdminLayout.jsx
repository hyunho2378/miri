// 관리자 레이아웃. lg 240 / md 레일 64 / md 미만 사이드바 숨김 + 햄버거 Drawer.
// 768 미만 진입 시 데스크톱 편집 권장 배너를 세션 내 한 번만 띄운다(IA.md, COMPONENTS.md).
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { get } from '../../lib/api.js'
import { pickText } from '../../lib/lang.js'
import useAdminUi from '../../store/useAdminUi.js'
import Drawer from '../ui/Drawer.jsx'
import IconButton from '../ui/IconButton.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function AdminLayout() {
  const { t, lang } = useLang()
  const sidebarOpen = useAdminUi((s) => s.sidebarOpen)
  const setSidebarOpen = useAdminUi((s) => s.setSidebarOpen)
  const bannerDismissed = useAdminUi((s) => s.desktopBannerDismissed)
  const dismissBanner = useAdminUi((s) => s.dismissDesktopBanner)
  const [settings, setSettings] = useState(null)

  // md(768) 미만은 레일도 없다. md 이상 lg 미만이 아이콘 레일이다
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isRail = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isNarrow = !isDesktop

  useEffect(() => {
    let alive = true
    get('/api/settings/public').then((s) => { if (alive) setSettings(s) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // 폭이 넓어지면 드로어는 닫는다
  useEffect(() => { if (isDesktop) setSidebarOpen(false) }, [isDesktop, setSidebarOpen])

  const orgName = pickText(settings?.orgName, lang)

  return (
    <div className="min-h-screen bg-canvas">
      {isNarrow && !bannerDismissed && (
        <div className="flex items-center gap-2 bg-mute px-4 py-2 text-text-sec">
          <p className="min-w-0 flex-1 type-caption">{t('admin.desktopBanner')}</p>
          <IconButton size="sm" aria-label={t('common.action.close')} onClick={dismissBanner} className="text-text-sec">
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
      )}

      <div className="md:grid md:grid-cols-[64px_1fr] lg:grid-cols-[240px_1fr]">
        {isDesktop && (
          <aside className="sticky top-0 h-screen border-r border-line-sub">
            <Sidebar rail={isRail} orgName={orgName} />
          </aside>
        )}

        <div className="flex min-w-0 flex-col">
          <Topbar />
          <main className="min-w-0 flex-1">
            <Outlet context={{ settings }} />
          </main>
        </div>
      </div>

      <Drawer
        open={sidebarOpen} side="left" onClose={() => setSidebarOpen(false)}
        title={t('admin.sidebar.label')}
      >
        <Sidebar orgName={orgName} onNavigate={() => setSidebarOpen(false)} />
      </Drawer>
    </div>
  )
}

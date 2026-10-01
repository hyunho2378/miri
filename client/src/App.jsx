// ROUTES.md 그대로. 모든 화면 lazy. 루트는 담당자 콘솔로 이동.
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout.jsx'
import HelperLayout from './components/layout/HelperLayout.jsx'
import PublicLayout from './components/layout/PublicLayout.jsx'
import RequireAuth from './components/layout/RequireAuth.jsx'
import Toast from './components/ui/Toast.jsx'
import { LangProvider } from './i18n/LangContext.jsx'

const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage.jsx'))
const LoginPage = lazy(() => import('./pages/console/LoginPage.jsx'))
const OverviewPage = lazy(() => import('./pages/console/OverviewPage.jsx'))
const RosterPage = lazy(() => import('./pages/console/RosterPage.jsx'))
const IntakePage = lazy(() => import('./pages/console/IntakePage.jsx'))
const ResourcesPage = lazy(() => import('./pages/console/ResourcesPage.jsx'))
const ShortagePage = lazy(() => import('./pages/console/ShortagePage.jsx'))
const DispatchPage = lazy(() => import('./pages/console/DispatchPage.jsx'))
const HandoverPage = lazy(() => import('./pages/console/HandoverPage.jsx'))
const RecordsPage = lazy(() => import('./pages/console/RecordsPage.jsx'))
const RecordDetailPage = lazy(() => import('./pages/console/RecordDetailPage.jsx'))
const SettingsPage = lazy(() => import('./pages/console/SettingsPage.jsx'))
const HelperPage = lazy(() => import('./pages/helper/HelperPage.jsx'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Toast />
        <Suspense fallback={<div className="min-h-screen bg-canvas" aria-busy="true" />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Navigate to="/console" replace />} />
              <Route path="privacy" element={<PrivacyPage />} />
            </Route>
            <Route path="/console/login" element={<LoginPage />} />
            <Route path="/console" element={<RequireAuth />}>
              <Route element={<AdminLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="roster" element={<RosterPage />} />
                <Route path="intake" element={<IntakePage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="shortage" element={<ShortagePage />} />
                <Route path="dispatch" element={<DispatchPage />} />
                <Route path="records" element={<RecordsPage />} />
                <Route path="records/:id" element={<RecordDetailPage />} />
                <Route element={<RequireAuth roles={['city']} />}>
                  <Route path="handover" element={<HandoverPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
            <Route element={<HelperLayout />}>
              <Route path="/h/:token" element={<HelperPage />} />
            </Route>
            <Route element={<PublicLayout />}>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LangProvider>
  )
}

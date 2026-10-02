// ROUTES.md 그대로. 모든 화면 lazy. 루트는 담당자 콘솔로 이동.
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout.jsx'
import HelperLayout from './components/layout/HelperLayout.jsx'
import PublicLayout from './components/layout/PublicLayout.jsx'
import RequireAuth from './components/layout/RequireAuth.jsx'
import ErrorBoundary from './components/layout/ErrorBoundary.jsx'
import Toast from './components/ui/Toast.jsx'
import { LangProvider } from './i18n/LangContext.jsx'

const loaders = {
  Overview: () => import('./pages/console/OverviewPage.jsx'),
  Roster: () => import('./pages/console/RosterPage.jsx'),
  Intake: () => import('./pages/console/IntakePage.jsx'),
  Resources: () => import('./pages/console/ResourcesPage.jsx'),
  Shortage: () => import('./pages/console/ShortagePage.jsx'),
  Dispatch: () => import('./pages/console/DispatchPage.jsx'),
  Handover: () => import('./pages/console/HandoverPage.jsx'),
  Records: () => import('./pages/console/RecordsPage.jsx'),
  RecordDetail: () => import('./pages/console/RecordDetailPage.jsx'),
  Settings: () => import('./pages/console/SettingsPage.jsx'),
  Helper: () => import('./pages/helper/HelperPage.jsx')
}
const PRELOAD = Object.values(loaders)

const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage.jsx'))
const LoginPage = lazy(() => import('./pages/console/LoginPage.jsx'))
const OverviewPage = lazy(loaders.Overview)
const RosterPage = lazy(loaders.Roster)
const IntakePage = lazy(loaders.Intake)
const ResourcesPage = lazy(loaders.Resources)
const ShortagePage = lazy(loaders.Shortage)
const DispatchPage = lazy(loaders.Dispatch)
const HandoverPage = lazy(loaders.Handover)
const RecordsPage = lazy(loaders.Records)
const RecordDetailPage = lazy(loaders.RecordDetail)
const SettingsPage = lazy(loaders.Settings)
const HelperPage = lazy(loaders.Helper)

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// 담당자 화면 코드를 첫 화면이 뜬 뒤 한가할 때 미리 받는다. 메뉴를 눌렀을 때 로딩 대기가 생기지 않게 한다
function usePreloadPages() {
  useEffect(() => {
    const run = () => PRELOAD.forEach((load) => load().catch(() => {}))
    const id = window.requestIdleCallback ? window.requestIdleCallback(run, { timeout: 3000 }) : setTimeout(run, 1200)
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id))
  }, [])
}

export default function App() {
  usePreloadPages()
  return (
    <LangProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <Toast />
        <ErrorBoundary>
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
        </ErrorBoundary>
      </BrowserRouter>
    </LangProvider>
  )
}

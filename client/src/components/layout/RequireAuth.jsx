// ROUTES.md 가드 그대로. 인증은 httpOnly 쿠키, 스토어는 메모리만 본다.
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { USE_MOCK } from '../../lib/api.js'
import useAuthStore from '../../store/useAuthStore.js'
import Skeleton from '../ui/Skeleton.jsx'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-canvas p-6 lg:p-8" aria-busy="true">
      <div className="mx-auto w-full max-w-wide space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="card" />)}
        </div>
      </div>
    </div>
  )
}

export default function RequireAuth({ roles }) {
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  const loc = useLocation()

  // 심사 데모(mock)는 항상 통과시킨다. 백엔드 연동(VITE_USE_MOCK=false)에서는 아래 가드가 그대로 돈다
  if (USE_MOCK) return <Outlet />
  if (!ready) return <LoadingScreen />
  if (!user) return <Navigate to="/admin/login" state={{ from: loc }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/admin" replace />
  return <Outlet />
}

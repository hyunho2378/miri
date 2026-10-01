// ROUTES.md 가드. 데모(mock)는 통과. role 미충족이면 현황판으로.
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { USE_MOCK } from '../../lib/api.js'
import useAuthStore from '../../store/useAuthStore.js'

export default function RequireAuth({ roles }) {
  const user = useAuthStore((s) => s.user)
  const loc = useLocation()
  if (!user) return USE_MOCK ? <Outlet /> : <Navigate to="/console/login" state={{ from: loc }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/console" replace />
  return <Outlet />
}

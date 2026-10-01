// 관리자 로그인. 인증은 httpOnly 쿠키가 전제다. 토큰을 웹스토리지에 넣지 않는다.
// mock 모드는 lib/api.js 가 admin@gchat.dev / gchat1234 를 통과시킨다(ROUTES.md).
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import useAuthStore from '../../store/useAuthStore.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Logo from '../../components/nav/Logo.jsx'

export default function LoginPage() {
  const { t } = useLang()
  const navigate = useNavigate()
  const loc = useLocation()
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  const login = useAuthStore((s) => s.login)

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => { document.title = 'G-Chat' }, [])

  // 쿼리까지 살려야 /admin/analytics?tab=nps 같은 딥링크가 로그인 뒤에도 그대로 열린다
  const target = loc.state?.from
  const from = target ? `${target.pathname}${target.search || ''}` : '/admin'
  if (ready && user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.error?.message || t('admin.login.failed'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page-enter min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-5">
          <img src="/images/illustrations/login.svg" alt="" className="h-16 w-16" />
          <Logo to="/" />
        </div>

        <div className="mt-6 rounded-lg bg-page shadow-card p-6">
          <h1 className="type-h2 text-text-pri">{t('admin.login.title')}</h1>
          <p className="mt-1.5 type-body-sm text-text-meta">{t('admin.login.desc')}</p>

          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            <Input
              label={t('admin.login.email')} type="email" autoComplete="username" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label={t('admin.login.password')} type="password" autoComplete="current-password" value={form.password}
              error={error} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <Button type="submit" className="w-full" loading={sending}>{t('common.action.login')}</Button>
          </form>
        </div>
      </div>
    </div>
  )
}

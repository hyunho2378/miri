// 담당자 로그인(ROUTES /console/login). AdminLayout 밖 단독 화면.
// mock 이면 데모 계정 선택. 실서버용 폼은 mock 이 아닐 때만 표시.
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Logo from '../../components/nav/Logo.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import { USE_MOCK } from '../../lib/api.js'
import useAuthStore, { DEMO_USERS, ROLE_LABEL } from '../../store/useAuthStore.js'

const DEMO = [
  { role: 'city', desc: '전체 화면을 이용합니다. 발령 개시와 종료, 소방 인계, 설정을 처리합니다.' },
  { role: 'dong', desc: '망상동 명부 관리, 서류 읽기, 부족분 계산, 배정 확인을 처리합니다.' }
]

// 시연 코드: AI 판독과 문서함 서버 저장을 쓰려면 서버가 발급하는 서명 쿠키가 필요하다
function DemoCode() {
  const [code, setCode] = useState('')
  const [state, setState] = useState({ active: false, checked: false, error: '' })
  useEffect(() => {
    fetch('/api/session').then((r) => r.json()).then((b) => setState((s) => ({ ...s, active: !!b.active, configured: b.configured, checked: true }))).catch(() => setState((s) => ({ ...s, checked: true })))
  }, [])
  const submit = async (e) => {
    e.preventDefault()
    const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null)
    const b = r ? await r.json().catch(() => null) : null
    if (r?.ok && b?.active) { setState({ active: true, checked: true, error: '' }); setCode('') }
    else setState((s) => ({ ...s, error: b?.error?.message || '시연 코드를 확인하지 못했습니다' }))
  }
  if (!state.checked) return null
  return (
    <form onSubmit={submit} className="mt-6 rounded-md bg-subtle p-4">
      <p className="type-strong text-text-pri">AI 판독과 서버 저장</p>
      {state.active ? (
        <p className="mt-1 type-body-sm text-text-sec" role="status">시연 코드가 확인되었습니다. 12시간 동안 AI 서류 읽기, 현장 소식 읽기, 문서함 서버 저장을 쓸 수 있습니다.</p>
      ) : (
        <>
          <p className="mt-1 type-meta text-text-meta">AI 판독과 문서함 서버 저장은 시연 코드를 받은 분만 씁니다. 코드 없이도 샘플 읽기로 모든 화면을 볼 수 있습니다.</p>
          <div className="mt-3 flex items-end gap-2">
            <Input className="flex-1" label="시연 코드" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} error={state.error || undefined} />
            <Button type="submit" disabled={!code}>확인</Button>
          </div>
        </>
      )}
    </form>
  )
}

export default function LoginPage() {
  useEffect(() => { document.title = '담당자 로그인 | 미리' }, [])
  const setDemoUser = useAuthStore((s) => s.setDemoUser)
  const from = useLocation().state?.from?.pathname || '/console'

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <Logo to="/console" />
        <Card as="div" padding="lg" className="mt-6">
          <h1 className="type-h1 text-text-pri">담당자 로그인</h1>
          <p className="mt-2 type-body-sm text-text-sec">혼자 대피하기 어려운 주민을 보호하기 위해, 옮길 차와 사람이 몇 명분 모자라는지 평소에 확인하는 담당자용 서비스입니다.</p>
          {USE_MOCK && <p className="mt-2 type-body-sm text-text-sec">시연 계정을 선택합니다.</p>}
          {USE_MOCK ? (
            <>
              <ul className="mt-6 space-y-2">
                {DEMO.map(({ role, desc }) => (
                  <li key={role}>
                    <Link
                      to={from} replace
                      onClick={() => setDemoUser(role)}
                      className="pressable flex w-full items-center gap-3 rounded-md bg-subtle px-4 py-3.5 text-left transition-colors duration-fast hover:bg-mute"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block type-h3 text-text-pri">{ROLE_LABEL[role]}</span>
                        <span className="block type-meta text-text-meta">{DEMO_USERS[role].name}</span>
                        <span className="mt-1 block type-body-sm text-text-sec">{desc}</span>
                      </span>
                      <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-text-meta" />
                    </Link>
                  </li>
                ))}
              </ul>
              <DemoCode />
            </>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
              <Input label="이메일" type="email" autoComplete="username" disabled />
              <Input label="비밀번호" type="password" autoComplete="current-password" disabled />
              <Button type="submit" size="lg" className="w-full" disabled>로그인</Button>
            </form>
          )}
        </Card>
        <p className="mt-6 text-center">
          <Link to="/privacy" className="type-body-sm text-text-sec underline underline-offset-2 hover:text-text-pri">개인정보 처리 방침</Link>
        </p>
      </div>
    </div>
  )
}

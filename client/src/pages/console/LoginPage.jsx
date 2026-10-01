// 담당자 로그인(ROUTES /console/login). AdminLayout 밖 단독 화면.
// mock 이면 데모 계정 선택. 실서버용 폼은 mock 이 아닐 때만 표시.
import { Building2, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Logo from '../../components/nav/Logo.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import { USE_MOCK } from '../../lib/api.js'
import useAuthStore, { DEMO_USERS, ROLE_LABEL } from '../../store/useAuthStore.js'

const DEMO = [
  { role: 'city', Icon: Building2, desc: '전 화면. 발령 개시와 종료, 소방 인계, 설정' },
  { role: 'dong', Icon: UserRound, desc: '망상동 명부와 서류 판독, 자원, 부족분 계산, 배정 확인' }
]

export default function LoginPage() {
  const setDemoUser = useAuthStore((s) => s.setDemoUser)
  const from = useLocation().state?.from?.pathname || '/console'

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <Logo to="/console" />
        <Card as="div" padding="lg" className="mt-6">
          <h1 className="type-h1 text-text-pri">담당자 로그인</h1>
          {USE_MOCK ? (
            <>
              <ul className="mt-6 space-y-3">
                {DEMO.map(({ role, Icon, desc }) => (
                  <li key={role}>
                    <Link
                      to={from} replace
                      onClick={() => setDemoUser(role)}
                      className="pressable flex w-full items-start gap-3 rounded-lg bg-subtle p-4 text-left hover:bg-mute"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-text">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block type-h3 text-text-pri">{ROLE_LABEL[role]}</span>
                        <span className="block type-meta text-text-meta">{DEMO_USERS[role].name}</span>
                        <span className="mt-1 block type-body-sm text-text-sec">{desc}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
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

// 담당자 로그인(ROUTES /console/login). AdminLayout 밖 단독 화면.
// mock 이면 데모 계정 선택. 실서버용 폼은 mock 이 아닐 때만 표시.
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

export default function LoginPage() {
  const setDemoUser = useAuthStore((s) => s.setDemoUser)
  const from = useLocation().state?.from?.pathname || '/console'

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <Logo to="/console" />
        <Card as="div" padding="lg" className="mt-6">
          <h1 className="type-h1 text-text-pri">담당자 로그인</h1>
          {USE_MOCK && <p className="mt-2 type-body-sm text-text-sec">시연용 계정을 선택합니다. 마을과 시설은 실제 공개 자료, 대상자 개인은 가상입니다.</p>}
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

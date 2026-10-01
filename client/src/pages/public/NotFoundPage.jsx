// 404. 소개와 담당자 화면 링크.
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center page-enter">
      <img src="/images/illustrations/not-found.svg" alt="" className="h-32 w-32" />
      <h1 className="mt-6 type-h1 text-text-pri">페이지 없음</h1>
      <p className="mt-2 type-body text-text-sec">주소 확인 필요. 아래 화면에서 다시 시작</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button as={Link} to="/" size="lg">소개 화면</Button>
        <Button as={Link} to="/console" size="lg" variant="secondary">담당자 화면</Button>
      </div>
    </div>
  )
}

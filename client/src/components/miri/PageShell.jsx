// 담당자 페이지 공통 골격. 상단바 타이틀 등록 + 콘텐츠 컨테이너 + 진입 애니메이션.
import clsx from 'clsx'
import { useTopbar } from '../../store/useAdminUi.js'

export default function PageShell({ title, actions = null, children, className }) {
  useTopbar({ title, actions })
  return (
    <div className={clsx('mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 page-enter', className)}>
      {children}
    </div>
  )
}

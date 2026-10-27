// 담당자 페이지 공통 골격. 본문은 container query 기준 상자(.cq)라 카드 격자는 cq-md:, cq-xl: 로 본문 폭에 맞춘다. 상단바 경로 등록 + 화면 머리(제목 옆 괄호 날짜 한 줄, 오른쪽 행동) + 콘텐츠 컨테이너.
// 화면 머리는 console/PageHeader 하나로 통일한다: '화면 이름 (10월 27일 화요일)' 한 줄. 본문 폭 제한 없음.
import { useEffect } from 'react'
import clsx from 'clsx'
import { useTopbar } from '../../store/useAdminUi.js'
import PageHeader from '../console/PageHeader.jsx'
import { todayLabel } from '../../lib/todayLabel.js'

export { todayLabel }

export default function PageShell({ title, eyebrow, actions = null, hideHeader = false, children, className }) {
  useTopbar({ title, actions: null })
  // KWCAG 제목 제공: 화면마다 다른 문서 제목
  useEffect(() => { if (title) document.title = `${title} | 미리` }, [title])
  return (
    <div className={clsx('cq w-full px-4 md:px-6 pt-3 pb-6 lg:px-8 lg:pt-4', className)}>
      {!hideHeader && <PageHeader title={title} meta={eyebrow} action={actions} />}
      {children}
    </div>
  )
}

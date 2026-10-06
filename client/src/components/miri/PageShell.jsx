// 담당자 페이지 공통 골격. 본문은 container query 기준 상자(.cq)라 카드 격자는 cq-md:, cq-xl: 로 본문 폭에 맞춘다. 상단바 경로 등록 + 화면 머리(작은 날짜 줄, 굵은 제목, 오른쪽 행동) + 콘텐츠 컨테이너.
// 화면 머리 문법은 사용자 지향 레퍼런스(IMG_1531): "10월 6일 화요일 / 오늘의 업무"와 오른쪽 기간 칩, 진한 알약 버튼.
import clsx from 'clsx'
import { useTopbar } from '../../store/useAdminUi.js'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export const todayLabel = (d = new Date()) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`

export default function PageShell({ title, eyebrow, desc, actions = null, hideHeader = false, children, className }) {
  useTopbar({ title, actions: null })
  // 날짜 줄은 현황판만 넘긴다. 상위 메뉴는 위쪽 경로 표시가 이미 보여 준다
  const kicker = eyebrow ?? null
  return (
    <div className={clsx('cq mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 pt-4 pb-8 lg:pt-6 lg:pb-10', className)}>
      {!hideHeader && (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 lg:mb-6">
          <div className="min-w-0">
            {kicker && <p className="type-body-sm text-text-meta">{kicker}</p>}
            <h1 className="type-h2 text-text-pri">{title}</h1>
            {desc && <p className="mt-1 type-body-sm text-text-sec">{desc}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

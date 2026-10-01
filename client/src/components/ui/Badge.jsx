import clsx from 'clsx'

// StatusPill 과 같은 규칙이다. 연한 tint 배경 + 진한 글자, 점은 두지 않는다(종류 라벨이지 상태가 아니다).
// 9단계. 톤은 중립 주목 위험 셋뿐이다. 초록과 주황은 없다
const TONE = {
  neutral: 'bg-line-def text-text-sec',
  primary: 'bg-primary-soft text-primary-text',
  danger: 'bg-danger-soft text-danger-text'
}

export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span className={clsx('inline-flex items-center h-5 px-1.5 rounded-xs type-caption', TONE[tone], className)}>
      {children}
    </span>
  )
}

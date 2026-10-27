// 상태 태그. 색은 의미 하나만: danger(기한 초과 우려), primary(진행), neutral(나머지). 테두리 없음
import clsx from 'clsx'

const TONE = {
  danger: 'bg-danger text-text-inverse',
  primary: 'bg-primary text-text-inverse',
  neutral: 'bg-mute text-text-pri'
}

export default function StatusChip({ tone = 'neutral', children, className }) {
  return <span className={clsx('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 type-caption tabular-nums', TONE[tone], className)}>{children}</span>
}

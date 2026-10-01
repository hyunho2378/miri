// 상태 문자열 → 색과 라벨 매핑 단일 출처. IA.md 상태 정의 표 기준.
// 다른 파일에서 상태 색 매핑을 다시 정의하지 않는다(PATTERNS.md 절대 금지 패턴).
import clsx from 'clsx'

// 배지는 연한 tint 배경 + 진한 글자 + 작은 정색 점이다(8단계). 글자는 배경 위 4.5:1 을 넘는다.
// 9단계. KRDS 3색 체계. 색이 아니라 의미의 중립/주목/위험 셋이다.
// 초록과 주황은 없다. 정상과 완료는 강조할 것이 아니라 기본이라 무채색이다
// 9-1. 중립 배지 면은 mute 가 아니라 line-def 다. mute 는 canvas 와 대비 1.04 라
// 회색 바탕(관리자 캔버스, subtle 표 헤더) 위에서 칩 형태가 사라진다
const PILL = {
  neutral: 'bg-line-def text-text-sec',
  primary: 'bg-primary-soft text-primary-text',
  danger: 'bg-danger-soft text-danger-text'
}
// 점은 장식이라 aria-hidden 이다. 뜻은 옆 라벨 텍스트가 전한다
const DOT = { neutral: 'bg-text-meta', primary: 'bg-primary', danger: 'bg-danger' }

// 필이 아닌 자리(KPI 목표 문구, 운영시간 표, 예약 셀)도 여기서 색을 받아 간다.
// 상태에서 색으로 가는 길은 이 파일 하나뿐이어야 한다
export const TONE_TEXT = {
  neutral: 'text-text-meta', primary: 'text-primary-text', danger: 'text-danger-text'
}
export const TONE_FILL = {
  neutral: 'bg-mute', primary: 'bg-primary-soft', danger: 'bg-danger-soft'
}

// 상태 → [톤, 한국어 라벨]. 톤은 중립 주목 위험 셋뿐이다.
// 긍정과 기본 상태는 전부 중립이다. 색을 쓰면 그것이 주목해야 할 것이라는 뜻이 된다
export const STATUS = {
  // 시설 운영
  normal: ['neutral', '정상'], maintenance: ['neutral', '유지보수'], closed: ['danger', '휴관'],
  // 예약 가능
  open: ['neutral', '여유'], stable: ['neutral', '안정적'], limited: ['neutral', '제한됨'], full: ['danger', '마감'],
  booked: ['primary', '예약됨'],
  // 상담 처리
  auto: ['neutral', '자동처리'], handoff: ['primary', '인계'], unresolved: ['danger', '미해결'],
  // 인계 진행
  wait: ['neutral', '대기'], progress: ['primary', '처리 중'], done: ['neutral', '완료'],
  // 색인
  indexed: ['neutral', '색인됨'], pending: ['neutral', '대기'], failed: ['danger', '실패'],
  // 리뷰 판정
  correct: ['neutral', '정답'], wrong: ['danger', '오답'], hold: ['neutral', '보류'],
  // KPI 목표
  achieved: ['neutral', '달성'], near: ['neutral', '근접'], missed: ['danger', '미달']
}

// 예약 캘린더 셀처럼 안에 라벨을 넣을 수 없는 자리용. 중립을 명도 두 단계로 나눈다.
// 여유와 유지보수가 같은 중립이라 같은 회색이면 두 상태를 구분할 수 없다.
// 색을 늘리지 않고 명도로 가르므로 3색 체계는 그대로다
const BLOCKED = new Set(['maintenance', 'closed'])

export const statusTone = (status) => STATUS[status]?.[0] || 'neutral'

export const cellFill = (status) => {
  const tone = statusTone(status)
  if (tone !== 'neutral') return TONE_FILL[tone]
  return BLOCKED.has(status) ? 'bg-line-def' : 'bg-mute'
}

export const statusLabel = (status) => STATUS[status]?.[1] || status

export default function StatusPill({ status, label, size = 'md', className }) {
  const tone = statusTone(status)
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 rounded-xs type-caption whitespace-nowrap',
      size === 'sm' ? 'h-5' : 'h-6',
      PILL[tone], className
    )}>
      <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', DOT[tone])} aria-hidden="true" />
      {label || statusLabel(status)}
    </span>
  )
}

// 상태 문자열 → 색과 라벨 매핑 단일 출처. 미리 IA.md 7절 상태 정의 표 기준.
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
  // 판독 확인
  reading: ['primary', '판독 중'], pending: ['primary', '확인 대기'], confirmed: ['neutral', '확인 완료'],
  edited: ['neutral', '담당자 수정'], rejected: ['danger', '반려'],
  // 판독 신뢰도
  high: ['neutral', '신뢰도 상'], mid: ['neutral', '신뢰도 중'], low: ['danger', '신뢰도 하'],
  // 발령
  idle: ['neutral', '평시'], standby: ['primary', '실행대기 발령'], assigned: ['primary', '배정 검토'],
  sent: ['primary', '이송 진행'], closed: ['neutral', '종료'],
  // 도우미 응답
  none: ['neutral', '응답 대기'], accept: ['neutral', '수락'], decline: ['danger', '불가'], noack: ['danger', '무응답'],
  // 이송 단계
  wait: ['neutral', '대기'], depart: ['primary', '출발'], arrive: ['primary', '도착'], board: ['primary', '탑승'],
  handover: ['neutral', '인계 완료'], fail: ['danger', '실패'], handedToFire: ['danger', '소방 인계'], unassigned: ['danger', '미배정'],
  // 차량
  available: ['neutral', '가용'], unavailable: ['neutral', '응급 대기'], expiring: ['danger', '협약 만료 임박'], expired: ['danger', '협약 만료'],
  // 부족분
  noShortage: ['neutral', '부족 없음'], shortage: ['danger', '부족 발생'], provisional: ['primary', '잠정'],
  // 기한
  onTime: ['neutral', '기한 내'], late: ['danger', '기한 초과 예상']
}

// 예약 캘린더 셀처럼 안에 라벨을 넣을 수 없는 자리용. 중립을 명도 두 단계로 나눈다.
// 여유와 유지보수가 같은 중립이라 같은 회색이면 두 상태를 구분할 수 없다.
// 색을 늘리지 않고 명도로 가르므로 3색 체계는 그대로다
const BLOCKED = new Set(['unavailable', 'closed'])

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

// 상태 문자열 → 색과 라벨 매핑 단일 출처. 미리 IA.md 7절 상태 정의 표 기준.
// 다른 파일에서 상태 색 매핑을 다시 정의하지 않는다(PATTERNS.md 절대 금지 패턴).
import clsx from 'clsx'

// 10단계. 심각도 6단계(tokens.js colors 주석 근거). 색 + 점 + 라벨 텍스트를 항상 함께 쓴다.
// critical 은 쨍한 빨강 면에 흰 글자. 나머지는 연한 면 + 진한 글자(4.5:1 이상)
const PILL = {
  neutral: 'bg-line-def text-text-sec',
  primary: 'bg-primary-soft text-primary-text',
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
  critical: 'bg-danger text-text-inverse'
}
// 점은 장식이라 aria-hidden 이다. 뜻은 옆 라벨 텍스트가 전한다
const DOT = { neutral: 'bg-text-meta', primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', critical: 'bg-page' }

// 필이 아닌 자리도 여기서 색을 받아 간다. 상태에서 색으로 가는 길은 이 파일 하나뿐
export const TONE_TEXT = {
  neutral: 'text-text-meta', primary: 'text-primary-text', success: 'text-success-text', warning: 'text-warning-text', danger: 'text-danger-text', critical: 'text-danger-text'
}
export const TONE_FILL = {
  neutral: 'bg-mute', primary: 'bg-primary-soft', success: 'bg-success-soft', warning: 'bg-warning-soft', danger: 'bg-danger-soft', critical: 'bg-danger'
}

// 상태 → [톤, 한국어 라벨]. 톤은 neutral primary success warning danger critical
export const STATUS = {
  // 판독 확인
  reading: ['primary', '판독 중'], pending: ['primary', '확인 대기'], confirmed: ['success', '확인 완료'],
  edited: ['neutral', '담당자 수정'], rejected: ['danger', '반려'],
  // 판독 신뢰도
  high: ['neutral', '확실'], mid: ['neutral', '보통'], low: ['warning', '확인 필요'],
  // 발령
  idle: ['neutral', '평시'], standby: ['primary', '실행대기 발령'], assigned: ['primary', '배정 검토'],
  sent: ['primary', '이송 진행'], closed: ['neutral', '종료'],
  // 도우미 응답
  none: ['neutral', '응답 대기'], accept: ['success', '수락'], decline: ['danger', '불가'], noack: ['danger', '무응답'],
  // 이송 단계
  wait: ['neutral', '대기'], depart: ['primary', '출발'], arrive: ['primary', '도착'], board: ['primary', '탑승'],
  handover: ['success', '인계 완료'], fail: ['critical', '실패'], handedToFire: ['critical', '소방 인계'], unassigned: ['critical', '미배정'],
  // 차량
  available: ['neutral', '가용'], unavailable: ['neutral', '응급 대기'], expiring: ['warning', '협약 만료 임박'], expired: ['danger', '협약 만료'],
  // 부족분
  noShortage: ['success', '부족 없음'], shortage: ['critical', '부족 발생'], provisional: ['primary', '잠정'],
  // 기한
  onTime: ['success', '기한 내'], late: ['warning', '기한 초과 예상']
}

// 예약 캘린더 셀처럼 안에 라벨을 넣을 수 없는 자리용. 중립을 명도 두 단계로 나눈다.
// 여유와 유지보수가 같은 중립이라 같은 회색이면 두 상태를 구분할 수 없다.
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

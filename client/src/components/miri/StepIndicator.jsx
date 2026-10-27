// 발령 단계 표시. 평시 → 실행대기 발령 → 배정 검토 → 이송 진행 → 종료.
// 굵은 진행 막대 하나를 같은 폭 5칸으로 나눈다. 색은 강조 파랑(지난 단계와 현재 단계)과 중립 회색(남은 단계) 둘만 쓴다.
// 번호 원, 체크 원, 얇은 연결선은 쓰지 않는다. 단계 이름은 칸 아래 왼쪽 정렬, 현재 단계만 굵고 진하게.
import clsx from 'clsx'

export const DISPATCH_STEPS = [
  { key: 'idle', label: '발령 전' },
  { key: 'standby', label: '실행대기 발령' },
  { key: 'assigned', label: '배정 검토' },
  { key: 'sent', label: '이송 진행' },
  { key: 'closed', label: '종료' }
]

// 칸 상태: 'done' 지난 단계, 'current' 현재 단계, 'todo' 남은 단계. 시험에서 같은 규칙을 확인한다
export function stepStates(status) {
  const current = Math.max(0, DISPATCH_STEPS.findIndex((s) => s.key === status))
  return DISPATCH_STEPS.map((s, i) => (i < current ? 'done' : i === current ? 'current' : 'todo'))
}

export default function StepIndicator({ status, className }) {
  const states = stepStates(status)
  return (
    <ol aria-label="발령 단계" className={clsx('grid w-full grid-cols-5 gap-2', className)}>
      {DISPATCH_STEPS.map((s, i) => {
        const st = states[i]
        const active = st === 'current'
        return (
          <li key={s.key} className="min-w-0" aria-current={active ? 'step' : undefined}>
            <span aria-hidden="true" className={clsx('block h-2 w-full rounded-full', st === 'todo' ? 'bg-line-strong' : 'bg-primary')} />
            <span className={clsx('mt-2 block break-keep type-caption', active ? 'text-text-pri' : 'font-normal text-text-meta')}>
              {s.label}
              {st === 'done' && <span className="sr-only"> 완료</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// 발령 단계 표시. 평시 → 실행대기 발령 → 배정 검토 → 이송 진행 → 종료.
import clsx from 'clsx'
import { Check } from 'lucide-react'

export const DISPATCH_STEPS = [
  { key: 'idle', label: '평시' },
  { key: 'standby', label: '실행대기 발령' },
  { key: 'assigned', label: '배정 검토' },
  { key: 'sent', label: '이송 진행' },
  { key: 'closed', label: '종료' }
]

export default function StepIndicator({ status, className }) {
  const current = Math.max(0, DISPATCH_STEPS.findIndex((s) => s.key === status))
  return (
    <ol aria-label="발령 단계" className={clsx('flex items-center gap-1 overflow-hidden', className)}>
      {DISPATCH_STEPS.map((s, i) => {
        const done = i < current || status === 'closed'
        const active = i === current
        return (
          <li key={s.key} className={clsx('flex min-w-0 items-center gap-1', active ? 'flex-[2_1_auto] md:flex-1' : 'flex-1')} aria-current={active ? 'step' : undefined}>
            <span
              className={clsx(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full type-caption tabular-nums',
                active ? 'bg-primary text-text-inverse' : done ? 'bg-text-pri text-text-inverse' : 'bg-line-def text-text-sec'
              )}
            >
              {done && !active ? <Check size={14} aria-hidden="true" /> : i + 1}
            </span>
            <span className={clsx('shrink-0 whitespace-nowrap type-caption', active ? 'text-text-pri' : 'text-text-meta', !active && 'hidden md:inline')}>
              {s.label}
            </span>
            {i < DISPATCH_STEPS.length - 1 && <span aria-hidden="true" className="mx-1 h-px min-w-3 flex-1 bg-line-def" />}
          </li>
        )
      })}
    </ol>
  )
}

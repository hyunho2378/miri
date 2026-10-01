import clsx from 'clsx'

// DESIGN_DELTA.md 변경 1 무보더. outline 만 경계를 쓰고 나머지는 면 색으로 상태를 낸다
const VARIANT = {
  outline: 'bg-page text-text-sec ring-1 ring-inset ring-line-def hover:text-text-pri hover:ring-line-strong',
  filled: 'bg-mute text-text-sec hover:bg-line-sub hover:text-text-pri',
  selected: 'bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-line'
}

export default function Chip({ as: As = 'button', variant = 'outline', size = 'sm', className, children, ...rest }) {
  return (
    <As
      className={clsx(
        'pressable inline-flex items-center gap-2 rounded-full px-4 type-body-sm font-medium whitespace-nowrap',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'md' ? 'h-10' : 'h-8',
        'min-h-11 min-w-11 md:min-h-0 md:min-w-0',   // 모바일 터치 타깃 44
        VARIANT[variant], className
      )}
      {...(As === 'button' ? { type: 'button' } : {})}
      {...rest}
    >
      {children}
    </As>
  )
}

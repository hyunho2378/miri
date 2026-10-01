// PATTERNS.md 6번 + DESIGN_DELTA.md 변경 2. secondary 는 border 가 아니라 ring-inset 이다.
// ring 은 box-shadow 라 콘텐츠 폭을 먹지 않아 primary 와 padding height radius font 가 완전히 같다.
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

const BASE = 'pressable inline-flex items-center justify-center gap-2 rounded-md font-medium disabled:opacity-40 disabled:cursor-not-allowed'
// 모바일 터치 타깃 44(플레이북 5.2, DESIGN.md 접근성 절). md 이상은 데스크톱 밀도를 그대로 둔다
const SIZE = {
  sm: 'h-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0 px-3 type-caption',
  md: 'h-10 min-h-11 min-w-11 md:min-h-0 md:min-w-0 px-4 type-body-sm',
  lg: 'h-11 px-5 type-body-sm'
}
const VARIANT = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-hover',
  secondary: 'bg-page text-primary ring-1 ring-inset ring-line-def hover:bg-mute',
  'secondary-primary': 'bg-page text-primary ring-1 ring-inset ring-primary hover:bg-mute',
  ghost: 'bg-transparent text-text-sec hover:bg-mute hover:text-text-pri',
  danger: 'bg-danger text-text-inverse hover:bg-danger-text'
}

export default function Button({
  as: As = 'button', variant = 'primary', size = 'md',
  loading = false, leftIcon, rightIcon, disabled, className, children, ...rest
}) {
  const isButton = As === 'button'
  return (
    <As
      className={clsx(BASE, SIZE[size], VARIANT[variant], !isButton && (disabled || loading) && 'pointer-events-none opacity-40', className)}
      {...(isButton ? { type: rest.type || 'button', disabled: disabled || loading } : {})}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </As>
  )
}

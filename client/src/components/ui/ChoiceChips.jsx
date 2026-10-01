// 단일 선택 칩(radiogroup). 선택 상태는 채움 + 체크 아이콘(색 하나로만 표시하지 않음).
import clsx from 'clsx'
import { Check } from 'lucide-react'

export default function ChoiceChips({ options = [], value, onChange, label, size = 'md', className }) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange?.(o.value)}
            className={clsx('pressable inline-flex items-center gap-1.5 rounded-full px-4 type-strong whitespace-nowrap',
              size === 'lg' ? 'h-12' : 'h-11 md:h-9',
              on ? 'bg-primary-soft text-primary-text' : 'bg-page text-text-sec ring-1 ring-inset ring-line-def hover:text-text-pri hover:ring-line-strong')}
          >
            {on && <Check size={16} aria-hidden="true" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

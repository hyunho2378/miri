// 같은 크기 숫자를 화살표로 이어 한 줄로. 칸마다 이름 한 줄과 조건 한 줄
// items: [{ label, value, unit, note, tone('danger') }]
// cards: 칸마다 회색 면으로 나누고 칸 사이 간격 안에 화살표를 둔다(현황판)
import { Fragment } from 'react'
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'

export default function NumberFlow({ items, label = '숫자 흐름', className, cards = false }) {
  if (cards) {
    return (
      <ol aria-label={label} className={clsx('grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]', className)}>
        {items.map((it, i) => (
          <li key={it.label} className="relative min-w-0 rounded-lg bg-subtle px-6 py-4">
            {i > 0 && <span aria-hidden="true" className="absolute -left-6 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-text-sec"><ChevronRight size={20} /></span>}
            <p className="type-body-sm font-bold text-text-sec">{it.label}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
              <p className={clsx('tabular-nums type-title', it.tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
                {it.value}{it.unit}
              </p>
              {it.note && <p className="type-body-sm text-text-sec">{it.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    )
  }
  return (
    <ol aria-label={label} className={clsx('flex flex-wrap items-stretch gap-y-2 py-0', className)}>
      {items.map((it, i) => (
        <Fragment key={it.label}>
          {i > 0 && <li aria-hidden="true" className="flex w-8 shrink-0 items-center justify-center text-text-sec"><ChevronRight size={22} /></li>}
          <li className="min-w-[9.5rem] flex-1 basis-40">
            <p className="type-body-sm font-bold text-text-sec">{it.label}</p>
            <p className={clsx('tabular-nums type-title', it.tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
              {it.value}{it.unit}
            </p>
            {it.note && <p className="type-body-sm text-text-sec">{it.note}</p>}
          </li>
        </Fragment>
      ))}
    </ol>
  )
}

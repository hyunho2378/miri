// 같은 크기 숫자를 화살표로 이어 한 줄로. 칸마다 이름 한 줄과 조건 한 줄
// items: [{ label, value, unit, note, tone('danger') }]
import { Fragment } from 'react'
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'

export default function NumberFlow({ items, label = '숫자 흐름', className }) {
  return (
    <ol aria-label={label} className={clsx('flex flex-wrap items-stretch gap-y-2 py-0', className)}>
      {items.map((it, i) => (
        <Fragment key={it.label}>
          {i > 0 && <li aria-hidden="true" className="flex w-8 shrink-0 items-center justify-center text-text-sec"><ChevronRight size={22} /></li>}
          <li className="min-w-[9.5rem] flex-1 basis-40">
            <p className="type-body-sm font-bold text-text-sec">{it.label}</p>
            <p className={clsx('tabular-nums type-title mt-1', it.tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
              {it.value}{it.unit}
            </p>
            {it.note && <p className="type-body-sm text-text-sec">{it.note}</p>}
          </li>
        </Fragment>
      ))}
    </ol>
  )
}

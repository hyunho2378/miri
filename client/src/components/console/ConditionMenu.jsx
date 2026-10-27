// 확산 조건 선택 단추. 라벨 '확산 조건'과 현재 값을 한 단추에 두고, 누르면 앱 안 메뉴로 조건 목록과 관련 기능을 연다
// scenarios: [{ id, name }], value: 선택 id, onPick(id), items: [{ key, label, onClick }] 조건 목록 아래에 놓는 기능
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown, Layers } from 'lucide-react'

export default function ConditionMenu({ scenarios = [], value, onPick, items = [], className }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const current = scenarios.find((s) => s.id === value) || scenarios[0]

  useEffect(() => {
    if (!open) return undefined
    const down = (e) => { if (!root.current?.contains(e.target)) setOpen(false) }
    const key = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key) }
  }, [open])

  return (
    <div ref={root} className={clsx('relative', className)}>
      <button
        type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 max-w-full items-center gap-2 rounded-full bg-subtle px-4 type-body-sm text-text-pri hover:bg-mute"
      >
        <Layers size={16} aria-hidden="true" className="shrink-0" />
        <span className="shrink-0 text-text-sec">확산 조건</span>
        <span className="min-w-0 truncate type-label">{current?.name}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-dropdown w-[22rem] max-w-[90vw] rounded-2xl bg-page p-2 shadow-md">
          <p className="px-3 pb-1 pt-2 type-caption text-text-sec">조건 선택</p>
          {scenarios.map((s) => (
            <button key={s.id} type="button" role="menuitemradio" aria-checked={s.id === current?.id}
              onClick={() => { onPick?.(s.id); setOpen(false) }}
              className={clsx('flex h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left type-body-sm hover:bg-subtle', s.id === current?.id && 'bg-subtle')}>
              <span className="truncate">{s.name}</span>
              {s.id === current?.id && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
          {items.length > 0 && <p className="px-3 pb-1 pt-3 type-caption text-text-sec">기능</p>}
          {items.map((it) => (
            <button key={it.key} type="button" role="menuitem" onClick={() => { it.onClick?.(); setOpen(false) }}
              className="flex h-11 w-full items-center rounded-xl px-3 text-left type-body-sm hover:bg-subtle">{it.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// 네이티브 select 금지(PITFALLS 21). 커스텀 listbox.
// DESIGN_DELTA.md 추가 2. 봄내 FieldSelect 디테일 흡수: 옵션 아이콘 + 주 텍스트 + 보조 텍스트,
// compact 변형, 열릴 때 선택 옵션으로 하이라이트 이동, detail 0 키보드 발화 무애니메이션, usePopExit 퇴장.
// options: [{ value, label, icon, secondary }]
import { useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown } from 'lucide-react'
import usePopExit from '../../hooks/usePopExit.js'

export default function Select({
  label, value, onChange, options = [], placeholder = '선택',
  disabled, error, compact = false, id, className
}) {
  const auto = useId()
  const btnId = id || auto
  const [open, setOpen] = useState(false)
  const [instantPop, setInstantPop] = useState(false)
  const { mounted: popMounted, closing: popClosing } = usePopExit(open, instantPop)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const typed = useRef({ s: '', t: 0 })

  const selected = options.find((o) => o.value === value) || null
  // 아이콘은 대문자 변수로 받는다. 소문자 멤버 표현식으로 바로 쓰면 네이티브 태그 금지 grep 에 걸린다
  const SelectedIcon = selected?.icon

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // 열릴 때 선택 옵션으로 하이라이트 이동 + 스크롤 정렬
  useEffect(() => {
    if (!open) return
    const idx = Math.max(0, options.findIndex((o) => o.value === value))
    setHighlight(idx)
    requestAnimationFrame(() => { listRef.current?.children[idx]?.scrollIntoView({ block: 'nearest' }) })
  }, [open, options, value])

  const pick = (i, viaKeyboard = false) => {
    if (!options[i]) return
    onChange?.(options[i].value)
    setInstantPop(viaKeyboard)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const move = (delta) => {
    setHighlight((h) => {
      const next = (h + delta + options.length) % options.length
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
      return next
    })
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'Escape') {
      setInstantPop(true)          // 키보드 개시 닫힘은 무애니메이션
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setInstantPop(true)
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Home') { e.preventDefault(); move(-highlight) }
    else if (e.key === 'End') { e.preventDefault(); move(options.length - 1 - highlight) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(highlight, true) }
    else if (e.key.length === 1) {
      const now = Date.now()
      typed.current.s = now - typed.current.t < 700 ? typed.current.s + e.key : e.key
      typed.current.t = now
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.s.toLowerCase()))
      if (i >= 0) move(i - highlight)
    }
  }

  return (
    <div className={clsx('relative', className)} ref={rootRef} onKeyDown={onKeyDown}>
      {label && !compact && <label htmlFor={btnId} className="block type-caption text-text-sec mb-1.5">{label}</label>}
      <button
        ref={triggerRef} id={btnId} type="button" role="combobox"
        aria-haspopup="listbox" aria-expanded={open}
        aria-invalid={error ? true : undefined} aria-controls={`${btnId}-list`}
        aria-activedescendant={open ? `${btnId}-opt-${highlight}` : undefined}
        aria-label={compact ? label : undefined}
        disabled={disabled}
        onClick={(e) => { setInstantPop(e.detail === 0); setOpen((o) => !o) }}
        className={clsx(
          'flex w-full items-center gap-2 h-11 px-3 rounded-md bg-page transition-colors duration-fast',
          'ring-1 ring-inset disabled:opacity-40 disabled:cursor-not-allowed',
          error ? 'ring-danger' : open ? 'ring-primary ring-2' : 'ring-line-def hover:ring-line-strong',
          compact ? 'justify-between' : 'justify-between'
        )}
      >
        {compact && label && <span className="shrink-0 type-caption text-text-meta">{label}</span>}
        <span className={clsx('flex min-w-0 items-center gap-2', compact && 'justify-end')}>
          {!compact && SelectedIcon && <SelectedIcon size={16} className="shrink-0 text-text-meta" aria-hidden="true" />}
          <span className={clsx('truncate type-body-sm', selected ? 'text-text-pri' : 'text-text-ter')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown size={16} className="shrink-0 text-text-meta" aria-hidden="true" />
        </span>
      </button>

      {popMounted && (
        <ul
          ref={listRef} id={`${btnId}-list`} role="listbox" aria-label={label} tabIndex={-1}
          aria-hidden={popClosing || undefined}
          className={clsx(
            'pop-panel origin-top absolute inset-x-0 top-full mt-1 z-dropdown max-h-[320px] overflow-y-auto',
            'rounded-md bg-page shadow-md p-1',
            instantPop && 'pop-instant',
            popClosing && 'pop-panel-exit'
          )}
        >
          {options.map((o, i) => {
            const Icon = o.icon
            return (
              <li
                key={o.value} id={`${btnId}-opt-${i}`} role="option" aria-selected={o.value === value}
                onMouseEnter={() => setHighlight(i)}
                onClick={(e) => pick(i, e.detail === 0)}
                className={clsx(
                  'flex cursor-pointer items-center gap-3 min-h-11 px-2.5 rounded-xs transition-colors duration-fast',
                  highlight === i || o.value === value ? 'bg-mute text-text-pri' : 'text-text-sec'
                )}
              >
                {Icon && <Icon size={20} className="shrink-0 text-text-meta" aria-hidden="true" />}
                <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                  <span className="truncate type-body-sm">{o.label}</span>
                  {o.secondary && <span className="shrink-0 type-caption text-text-meta">{o.secondary}</span>}
                </span>
                {o.value === value && <Check size={16} className="shrink-0 text-primary" aria-hidden="true" />}
              </li>
            )
          })}
          {!options.length && <li className="min-h-11 px-2.5 flex items-center type-body-sm text-text-ter">항목 없음</li>}
        </ul>
      )}
      {error && !compact && <p className="mt-1 type-caption text-danger-text">{error}</p>}
    </div>
  )
}

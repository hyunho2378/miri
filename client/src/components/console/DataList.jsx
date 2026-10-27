// 한 면 위 목록(표 모양 행). 머리 줄은 정렬 단추, 행 사이는 선이 아니라 선택과 호버 면으로만 나눈다. 머리 고정 + 목록 안에서만 스크롤
// columns: [{ key, label, title, sortable, sortValue, render(row), className }], grid: grid-template-columns 값
// rowKey(row), selectedKey, onSelect(key), label(접근성 이름), pageStep(한 번에 보이는 행 수, 나머지는 '다음 n건 보기'), footer
import { useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import EmptyState from '../ui/EmptyState.jsx'

function Pager({ page, pages, total, step, onPage }) {
  // 번호는 현재 쪽 앞뒤 2개와 처음, 끝만 보인다
  const nums = []
  for (let i = 0; i < pages; i++) if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 2) nums.push(i)
  const items = []
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) items.push('gap' + n); items.push(n) })
  const btn = 'inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2 type-body-sm tabular-nums transition-colors duration-fast'
  return (
    <nav aria-label="쪽 이동" className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
      <span className="type-body-sm text-text-sec tabular-nums">{page * step + 1}-{Math.min(total, (page + 1) * step)} / {total.toLocaleString('ko-KR')}</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className={clsx(btn, 'text-text-pri hover:bg-subtle disabled:text-text-ter disabled:hover:bg-transparent')}>이전</button>
        {items.map((n) => typeof n === 'string'
          ? <span key={n} aria-hidden="true" className="px-1 text-text-sec">...</span>
          : <button key={n} type="button" aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)} className={clsx(btn, n === page ? 'bg-mute font-bold text-text-pri' : 'text-text-sec hover:bg-subtle')}>{n + 1}</button>)}
        <button type="button" disabled={page === pages - 1} onClick={() => onPage(page + 1)} className={clsx(btn, 'text-text-pri hover:bg-subtle disabled:text-text-ter disabled:hover:bg-transparent')}>다음</button>
      </div>
    </nav>
  )
}

export default function DataList({ columns, rows, rowKey, selectedKey, onSelect, label, grid, pageStep = 10, emptyTitle, emptyDesc, footer, className }) {
  const [sort, setSort] = useState(null)   // { key, dir }
  const [page, setPage] = useState(0)
  const refs = useRef({})

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const value = col?.sortValue || ((r) => r[sort.key])
    return [...rows].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      if (x === y) return 0
      const n = x > y ? 1 : -1
      return sort.dir === 'asc' ? n : -n
    })
  }, [rows, sort, columns])

  const pages = Math.max(1, Math.ceil(sorted.length / pageStep))
  const cur = Math.min(page, pages - 1)
  const shown = sorted.slice(cur * pageStep, (cur + 1) * pageStep)
  const activeKey = shown.some((r) => rowKey(r) === selectedKey) ? selectedKey : (shown[0] ? rowKey(shown[0]) : null)

  const toggleSort = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))
  const move = (i) => {
    const t = shown[Math.max(0, Math.min(shown.length - 1, i))]
    if (!t) return
    onSelect(rowKey(t))
    refs.current[rowKey(t)]?.focus()
  }
  const keys = (i) => (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(shown.length - 1) }
  }

  if (!rows.length) return <EmptyState compact title={emptyTitle || '조건에 맞는 항목 없음'} desc={emptyDesc} />

  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <div style={{ gridTemplateColumns: grid }} className="grid shrink-0 items-center gap-x-3 px-4 pb-1 pr-5 type-caption text-text-sec">
        {columns.map((c) => {
          const active = sort?.key === c.key
          const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown
          return (
            <span key={c.key} title={c.title} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="min-w-0 whitespace-nowrap">
              {c.sortable ? (
                <button type="button" onClick={() => toggleSort(c.key)} aria-label={`${c.label} 정렬`} className={clsx('inline-flex min-h-8 items-center gap-1 hover:text-text-pri', active && 'text-text-pri')}>
                  {c.label}<Icon size={12} aria-hidden="true" />
                </button>
              ) : c.label}
            </span>
          )
        })}
      </div>
      <ul role="listbox" aria-label={label} style={pages > 1 ? { minHeight: `${pageStep * 46}px` } : undefined} className="min-h-0 flex-1 space-y-0.5 pr-1">
        {shown.map((r, i) => {
          const k = rowKey(r)
          const on = k === selectedKey
          return (
            <li key={k} role="presentation">
              <button
                ref={(el) => { refs.current[k] = el }} type="button" role="option" aria-selected={on} tabIndex={k === activeKey ? 0 : -1}
                onClick={() => onSelect(k)} onKeyDown={keys(i)} style={{ gridTemplateColumns: grid }}
                className={clsx('grid h-11 w-full items-center gap-x-3 rounded-xl px-4 text-left type-body text-text-pri transition-colors duration-fast', on ? 'bg-mute' : 'hover:bg-subtle')}
              >
                {columns.map((c) => <span key={c.key} className={clsx('flex min-w-0 items-center overflow-hidden whitespace-nowrap tabular-nums', c.className)}>{c.render ? c.render(r) : r[c.key]}</span>)}
              </button>
            </li>
          )
        })}
      </ul>
      {pages > 1 && <Pager page={cur} pages={pages} total={sorted.length} step={pageStep} onPage={setPage} />}
      {footer}
    </div>
  )
}

// 한 면을 둘로 나눈 왼쪽 목록과 오른쪽 상세(상자 없음). 840 이상은 두 칸(5:7), 좁으면 위아래. 키보드: 위아래 화살표, Home, End
// items: [{ id, icon, title, sub, chip, trailing }], selectedId, onSelect(id), listLabel, children = 상세
import { useRef } from 'react'
import ListItem from './ListItem.jsx'

export default function ListDetail({ items, selectedId, onSelect, listLabel, listTitle, children }) {
  const refs = useRef({})
  const move = (i) => {
    const t = items[Math.max(0, Math.min(items.length - 1, i))]
    if (!t) return
    onSelect(t.id)
    refs.current[t.id]?.focus()
  }
  const keys = (i) => (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(items.length - 1) }
  }
  const activeId = items.some((x) => x.id === selectedId) ? selectedId : items[0]?.id
  return (
    <div className="grid min-w-0 gap-10 cq-xl:grid-cols-[5fr_7fr] cq-xl:items-start cq-xl:gap-12">
      <div className="min-w-0">
        {listTitle && <h2 className="mb-4 type-title text-text-pri">{listTitle}</h2>}
        <ul role="listbox" aria-label={listLabel} className="flex flex-col gap-1">
          {items.map((it, i) => (
            <ListItem
              key={it.id} {...it} selected={it.id === activeId} tabIndex={it.id === activeId ? 0 : -1}
              itemRef={(el) => { refs.current[it.id] = el }} onSelect={() => onSelect(it.id)} onKeyDown={keys(i)}
            />
          ))}
        </ul>
      </div>
      <div className="min-w-0 px-2 pt-1" aria-live="polite">{children}</div>
    </div>
  )
}

// 목록 한 줄. 앞 아이콘, 제목, 보조 글, 끝 값과 상태 칩. 선택은 무채색 면 하나(모서리 16, 키트 List item Selected=True)로만 보인다. 높이 72(M3 두 줄 목록 규격, 키트 Middle-aligned 80보다 낮춤)
import clsx from 'clsx'

export default function ListItem({ id, icon, title, sub, chip, trailing, selected, onSelect, onKeyDown, tabIndex = -1, itemRef }) {
  return (
    <li role="presentation">
      <button
        ref={itemRef} id={id} type="button" role="option" aria-selected={!!selected} tabIndex={tabIndex} onClick={onSelect} onKeyDown={onKeyDown}
        className={clsx('flex min-h-[72px] w-full items-center gap-4 rounded-2xl px-4 py-2 text-left transition-colors duration-fast',
          selected ? 'bg-mute' : 'hover:bg-subtle')}
      >
        {icon && <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mute text-text-sec">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className={clsx('block truncate type-body text-text-pri', selected && 'font-bold')}>{title}</span>
          {sub && <span className="block truncate type-body-sm text-text-sec tabular-nums">{sub}</span>}
        </span>
        {trailing && <span className="shrink-0 type-body-strong text-text-pri tabular-nums">{trailing}</span>}
        {chip}
      </button>
    </li>
  )
}

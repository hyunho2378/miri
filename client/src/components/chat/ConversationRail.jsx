// 이번 세션 대화 목록. 좌측 56 레일이고 펼치면 240 패널이 그 위에 겹친다.
// 폭을 애니메이션하지 않는다. 레일 폭이 변하면 대화 열이 다시 흐르고 MessageList 의 앵커와
// 스페이서 계산이 흔들린다(PITFALLS 2·4). 그래서 펼침은 레이아웃이 아니라 겹치는 패널이다.
// 목록은 메모리다. 새로고침하면 사라지는 것이 정상이다(웹스토리지 금지).
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { MessageSquare, SquarePen, X } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import { formatDate } from '../../lib/format.js'
import IconButton from '../ui/IconButton.jsx'

function List({ items, activeId, onPick, onClose }) {
  const { t } = useLang()

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-3 pb-2">
        <p className="min-w-0 truncate type-caption text-text-meta">{t('chat.rail.title')}</p>
        {onClose && (
          <IconButton size="sm" aria-label={t('chat.rail.close')} onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-3 type-body-sm text-text-meta">{t('chat.rail.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-1 px-2">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button" onClick={() => onPick(c.id)}
                aria-current={c.id === activeId ? 'true' : undefined}
                className={clsx(
                  'flex w-full flex-col items-start gap-0.5 min-h-11 px-3 py-2 rounded-md text-left transition-colors duration-fast',
                  c.id === activeId ? 'bg-primary-soft text-primary-text' : 'text-text-sec hover:bg-mute hover:text-text-pri'
                )}
              >
                <span className="w-full truncate type-body-sm font-medium">
                  {c.title || t('chat.rail.untitled')}
                </span>
                <span className="type-meta text-text-meta tabular-nums">{formatDate(c.at, 'time')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function ConversationRail({ items = [], activeId, onPick, onNew }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  // 바깥을 누르거나 Esc 를 누르면 닫는다. 겹치는 패널이라 스스로 닫힐 길이 있어야 한다
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (id) => { onPick(id); setOpen(false) }

  return (
    <div
      ref={rootRef}
      className="relative hidden md:block w-chat-rail shrink-0 border-r border-line-sub"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex flex-col items-center gap-2 pt-4">
        <IconButton size="lg" aria-label={t('chat.newChat')} onClick={onNew}>
          <SquarePen size={20} aria-hidden="true" />
        </IconButton>
        <IconButton
          size="lg" aria-label={t('chat.rail.open')} aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <MessageSquare size={20} aria-hidden="true" />
        </IconButton>
      </div>

      {open && (
        <div
          className="pop-panel origin-top-left absolute left-0 top-0 z-dropdown h-full w-60 bg-page shadow-float pt-4 pb-4 overflow-y-auto"
          role="group" aria-label={t('chat.rail.title')}
        >
          <div className="flex items-center gap-1 px-2 pb-3">
            <IconButton size="lg" aria-label={t('chat.newChat')} onClick={() => { onNew(); setOpen(false) }}>
              <SquarePen size={20} aria-hidden="true" />
            </IconButton>
            <span className="min-w-0 truncate type-body-sm font-medium text-text-pri">{t('chat.newChat')}</span>
          </div>
          <List items={items} activeId={activeId} onPick={pick} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

// 모바일용. Drawer 안에 같은 목록을 그린다. TopNav 는 담당 파일이 아니라
// 대화 화면 안에서 연다(5-F 기록)
export function ConversationList({ items, activeId, onPick, onNew }) {
  const { t } = useLang()
  return (
    <div className="py-2">
      <button
        type="button" onClick={onNew}
        className="flex w-full items-center gap-2 min-h-11 px-3 mb-2 rounded-md type-body-sm font-medium text-text-pri hover:bg-mute transition-colors duration-fast"
      >
        <SquarePen size={16} aria-hidden="true" />
        {t('chat.newChat')}
      </button>
      <List items={items} activeId={activeId} onPick={onPick} />
    </div>
  )
}

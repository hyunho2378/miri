// PATTERNS.md 14번. side right 기본. 포커스 트랩, Esc, body 스크롤 락.
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import useBodyScrollLock from '../../hooks/useBodyScrollLock.js'
import useFocusTrap from '../../hooks/useFocusTrap.js'
import IconButton from './IconButton.jsx'

export default function Drawer({ open, onClose, title, footer, side = 'right', children }) {
  const { t } = useLang()
  const trapRef = useFocusTrap(open, onClose)
  useBodyScrollLock(open)
  if (!open) return null
  const isLeft = side === 'left'
  return (
    <div className="fixed inset-0 z-drawer">
      <div className="absolute inset-0 bg-text-pri/40 animate-fade-in-sheet" onClick={onClose} />
      <aside
        ref={trapRef} role="dialog" aria-modal="true" aria-label={title}
        className={clsx(
          'absolute top-0 h-full w-[clamp(360px,40vw,560px)] max-w-full bg-page shadow-float flex flex-col',
          isLeft ? 'left-0 animate-slide-in-left' : 'right-0 animate-slide-in-right'
        )}
      >
        <header className="h-14 shrink-0 px-5 flex items-center justify-between border-b border-line-sub">
          <h2 className="type-h2 text-text-pri">{title}</h2>
          <IconButton aria-label={t('common.action.close')} size="sm" onClick={onClose}><X size={20} /></IconButton>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="p-4 border-t border-line-sub flex justify-end gap-2">{footer}</footer>}
      </aside>
    </div>
  )
}

// 봄내 LangMenu 이식. 3언어에서 4언어로. Globe 트리거 + 자기 표기 목록.
// 현재 언어는 primary 와 Check 로 표시한다. 국기 이모지 금지(DESIGN.md 절대 금지).
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, Globe } from 'lucide-react'
import { LANGS, useLang } from '../../i18n/LangContext.jsx'
import usePopExit from '../../hooks/usePopExit.js'
import IconButton from '../ui/IconButton.jsx'

export default function LangSwitch({ className }) {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)
  const [instantPop, setInstantPop] = useState(false)
  const { mounted: popMounted, closing: popClosing } = usePopExit(open, instantPop)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const pick = (code, viaKeyboard = false) => {
    setLang(code)
    setInstantPop(viaKeyboard)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setInstantPop(true)
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % LANGS.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h + LANGS.length - 1) % LANGS.length) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(LANGS[highlight], true) }
  }

  return (
    <div ref={rootRef} className={clsx('relative', className)} onKeyDown={onKeyDown}>
      <IconButton
        ref={triggerRef} size="lg" aria-label={t('common.language')} title={t('common.language')}
        aria-haspopup="listbox" aria-expanded={open}
        onClick={(e) => {
          setInstantPop(e.detail === 0)
          if (open) setOpen(false)
          else { setHighlight(LANGS.indexOf(lang)); setOpen(true) }
        }}
      >
        <Globe size={20} aria-hidden="true" />
      </IconButton>

      {popMounted && (
        <ul
          role="listbox" aria-label={t('common.language')} aria-hidden={popClosing || undefined}
          style={{ width: 'max-content' }}
          className={clsx(
            'pop-panel origin-top-right absolute right-0 top-full mt-2 z-dropdown flex min-w-[160px] flex-col',
            'rounded-md bg-page shadow-md p-1',
            instantPop && 'pop-instant',
            popClosing && 'pop-panel-exit'
          )}
        >
          {LANGS.map((code, i) => (
            <li
              key={code} role="option" aria-selected={lang === code}
              onMouseEnter={() => setHighlight(i)}
              onClick={(e) => pick(code, e.detail === 0)}
              className={clsx(
                'flex cursor-pointer items-center justify-between gap-4 min-h-11 px-3 rounded-xs type-body-sm font-medium transition-colors duration-fast',
                lang === code ? 'text-primary' : 'text-text-pri',
                highlight === i && 'bg-mute'
              )}
            >
              {/* 자기 표기는 언어와 무관하게 같은 문자열이라 전환해도 폭이 안 바뀐다 */}
              <span>{t(`common.lang.${code}`)}</span>
              {lang === code && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

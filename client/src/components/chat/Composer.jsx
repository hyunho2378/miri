// PATTERNS.md 8번. 대형 입력창.
// PITFALLS 7 한글 조합 중 Enter 전송 금지, 9 스트리밍 중 잠금, 10 답변 후 재포커스.
import { forwardRef, useEffect } from 'react'
import clsx from 'clsx'
import { ArrowUp } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'

const MAX_H = 200

const Composer = forwardRef(function Composer(
  { value, onChange, onSubmit, disabled = false, placeholder, meta, autoFocus = false }, ref
) {
  const { t } = useLang()

  // 입력이 늘어나면 scrollHeight 만큼 키운다. 상한을 넘으면 내부 스크롤
  useEffect(() => {
    const el = ref?.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_H)}px`
  }, [value, ref])

  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    if (e.nativeEvent.isComposing || e.keyCode === 229) return   // PITFALLS 7
    e.preventDefault()
    if (!disabled && value.trim()) onSubmit()
  }

  const ready = value.trim() && !disabled

  return (
    <div>
      <div className="flex items-center gap-3 p-3 pl-4 rounded-xl bg-page border border-line-def focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-line transition-colors duration-fast">
        <textarea
          ref={ref} rows={2} value={value} autoFocus={autoFocus}
          aria-label={t('chat.ariaInput')}
          placeholder={placeholder || t('chat.placeholder')}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 resize-none bg-transparent outline-none py-2 min-h-14 max-h-[200px] overflow-y-auto type-body text-text-pri placeholder:text-text-ter disabled:cursor-not-allowed"
        />
        <button
          type="button" aria-label={t('chat.send')} disabled={!ready} onClick={onSubmit}
          className={clsx(
            'pressable w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full',
            ready ? 'bg-primary text-text-inverse hover:bg-primary-hover' : 'bg-primary-soft text-primary cursor-not-allowed'
          )}
        >
          <ArrowUp size={20} aria-hidden="true" />
        </button>
      </div>
      {meta && <p className="mt-2 px-1 type-meta text-text-meta">{meta}</p>}
    </div>
  )
})

export default Composer

// 답변 하단 액션. 담당자 연결은 신뢰도와 무관하게 항상 보인다(DESIGN.md 담당자 연결 절).
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Check, Copy, ThumbsDown, ThumbsUp, UserRoundCheck } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import useToast from '../../hooks/useToast.js'
import IconButton from '../ui/IconButton.jsx'

export default function ActionBar({ text, messageId, onVote, onHandoff, handoffOpen, className }) {
  const { t } = useLang()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState(null)

  useEffect(() => {
    if (!copied) return undefined
    const id = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text || '')
      setCopied(true)
    } catch {
      toast(t('common.error.network'), 'danger')
    }
  }

  const cast = (v) => {
    if (vote) return
    setVote(v)
    onVote?.(messageId, v)
    toast(t('chat.answer.thanks'), 'primary')
  }

  return (
    <div className={clsx('mt-4 flex flex-wrap items-center gap-1', className)}>
      <IconButton size="md" aria-label={copied ? t('common.action.copied') : t('common.action.copy')} onClick={copy}>
        {copied
          ? <Check size={16} aria-hidden="true" className="text-primary" />
          : <Copy size={16} aria-hidden="true" />}
      </IconButton>

      <button
        type="button" onClick={onHandoff} aria-expanded={handoffOpen}
        className="pressable inline-flex items-center gap-2 h-10 px-3 rounded-md type-body-sm font-medium text-text-sec hover:bg-mute hover:text-text-pri"
      >
        <UserRoundCheck size={16} aria-hidden="true" />
        {t('chat.answer.handoff')}
      </button>

      <span className="mx-1 h-4 w-px bg-line-sub" aria-hidden="true" />

      <IconButton
        size="md" aria-label={t('chat.answer.helpful')} onClick={() => cast('up')} disabled={!!vote}
        className={clsx(vote === 'up' && 'text-primary')}
      >
        <ThumbsUp size={16} aria-hidden="true" />
      </IconButton>
      <IconButton
        size="md" aria-label={t('chat.answer.notHelpful')} onClick={() => cast('down')} disabled={!!vote}
        className={clsx(vote === 'down' && 'text-primary')}
      >
        <ThumbsDown size={16} aria-hidden="true" />
      </IconButton>
    </div>
  )
}

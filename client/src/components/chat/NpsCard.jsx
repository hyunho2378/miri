// 세션 만족도. 사업계획서 4대 가설 H2(이용자 만족도 NPS, 목표 +20p)의 원천 데이터다.
// 대시보드 NPS 카드와 분석 nps 탭이 이 점수를 먹는다. 답변 좋아요와 별개로 대화 단위 평가다.
// 대화당 한 번만 뜨고, 스트리밍 중에는 부르는 쪽이 렌더하지 않는다.
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2 } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import { post } from '../../lib/api.js'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const THANKS_MS = 2500      // 감사 문구를 두는 시간
const FADE_MS = 280         // tokens.motion.duration.dur

export default function NpsCard({ sessionId, conversationId, onDone, className }) {
  const { t } = useLang()
  const [score, setScore] = useState(null)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  const [fading, setFading] = useState(false)
  const [gone, setGone] = useState(false)

  // 감사 문구는 접히는 게 아니라 사라진다. 2.5초 뒤 흐려지고 그다음 트리에서 빠진다.
  // 움직임을 줄이는 설정이면 페이드 없이 바로 없앤다
  useEffect(() => {
    if (!sent) return undefined
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const fade = setTimeout(() => setFading(true), THANKS_MS)
    const remove = setTimeout(() => setGone(true), THANKS_MS + (reduce ? 0 : FADE_MS))
    return () => { clearTimeout(fade); clearTimeout(remove) }
  }, [sent])

  const submit = () => {
    post('/api/chat/nps', { sessionId, conversationId, score, comment: comment.trim() || null }).catch(() => {})
    setSent(true)
    onDone?.(conversationId)
  }

  if (gone) return null

  if (sent) {
    return (
      <section
        className={clsx(
          'mt-4 rounded-lg bg-subtle p-3 transition-opacity duration-dur ease-out',
          fading && 'opacity-0', className
        )}
      >
        <p className="inline-flex items-center gap-2 type-body-sm text-text-sec">
          <CheckCircle2 size={16} aria-hidden="true" className="text-primary" />
          {t('chat.nps.done')}
        </p>
      </section>
    )
  }

  return (
    <section
      className={clsx('mt-4 bg-page rounded-lg shadow-card p-4 lg:p-5 animate-flow-down-late', className)}
      aria-label={t('chat.nps.title')}
    >
      <h3 className="type-h3 text-text-pri">{t('chat.nps.title')}</h3>
      <p className="mt-1 type-body-sm text-text-meta">{t('chat.nps.desc')}</p>

      <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('chat.nps.title')}>
        {SCORES.map((n) => (
          <button
            key={n} type="button" role="radio" aria-checked={score === n}
            aria-label={t('chat.nps.score', { n })}
            onClick={() => setScore(n)}
            className={clsx(
              'pressable h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-md type-body-sm font-medium tabular-nums transition-colors duration-fast',
              score === n
                ? 'bg-primary text-text-inverse'
                : 'bg-mute text-text-sec hover:bg-line-sub hover:text-text-pri'
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-2 flex justify-between gap-4">
        <span className="type-meta text-text-meta">{t('chat.nps.low')}</span>
        <span className="type-meta text-text-meta">{t('chat.nps.high')}</span>
      </div>

      {/* 점수를 고른 뒤에만 코멘트를 묻는다. 처음부터 보이면 입력을 요구하는 것처럼 보인다 */}
      {score !== null && (
        <div className="mt-4 animate-flow-down">
          <Input
            label={t('chat.nps.comment')} hint={t('chat.nps.commentHint')}
            value={comment} onChange={(e) => setComment(e.target.value)}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={submit} disabled={score === null}>{t('chat.nps.submit')}</Button>
        <Button variant="ghost" onClick={() => { setSent(true); onDone?.(conversationId) }}>
          {t('chat.nps.skip')}
        </Button>
      </div>
    </section>
  )
}

// 답변 대기 표시. 문구는 2.2초마다 돈다. 스켈레톤은 DESIGN.md 가 허용한 유일한 무한 반복이다.
import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LangContext.jsx'

const PHRASES = ['chat.skeleton.searching', 'chat.skeleton.checking', 'chat.skeleton.composing']

export default function AnswerSkeleton() {
  const { t } = useLang()
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % PHRASES.length), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div aria-label={t('chat.ariaAnswerLoading')} aria-busy="true">
      <p className="type-caption text-text-meta">{t(PHRASES[i])}</p>
      <div className="mt-3 space-y-2" aria-hidden="true">
        <div className="h-3 w-full rounded-xs skeleton-bar" />
        <div className="h-3 w-11/12 rounded-xs skeleton-bar skeleton-bar-2" />
        <div className="h-3 w-2/3 rounded-xs skeleton-bar skeleton-bar-3" />
      </div>
    </div>
  )
}

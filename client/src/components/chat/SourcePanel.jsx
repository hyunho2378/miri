// PATTERNS.md 11번. 근거 카드 목록. 3개까지 보이고 나머지는 더 보기.
// kind 는 계약상 코드(manual notice faq reservation regulation)지만 mock 은 한국어 라벨을 보낸다.
// 코드면 사전으로, 아니면 받은 문자열 그대로 보인다.
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import { formatDate, isStale } from '../../lib/format.js'
import Badge from '../ui/Badge.jsx'

const KIND_KEY = {
  manual: 'admin.kind.manual', notice: 'admin.kind.notice', faq: 'admin.kind.faq',
  reservation: 'admin.kind.reservation', regulation: 'admin.kind.regulation'
}
const VISIBLE = 3

export default function SourcePanel({ sources = [] }) {
  const { t } = useLang()
  const [expanded, setExpanded] = useState(false)
  if (!sources.length) return null

  const shown = expanded ? sources : sources.slice(0, VISIBLE)

  return (
    <section aria-label={t('chat.answer.sources')}>
      <p className="type-caption text-text-meta">{t('chat.answer.sourceCount', { n: sources.length })}</p>
      <ul className="mt-2 space-y-2">
        {shown.map((s, i) => (
          <li key={s.id} className="animate-flow-down-late" style={{ animationDelay: `${80 + i * 70}ms` }}>
            <a
              href={s.url} target="_blank" rel="noreferrer"
              className="group block rounded-lg bg-subtle hover:bg-mute transition-colors duration-fast p-3"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {/* 9단계. 문서 종류는 상태가 아니라 라벨이다. 색으로 나누지 않고 글자로 나눈다 */}
                  <Badge>
                    {KIND_KEY[s.kind] ? t(KIND_KEY[s.kind]) : s.kind}
                  </Badge>
                  <p className="mt-1.5 type-h3 text-text-pri line-clamp-1">{s.title}</p>
                  <p className="mt-0.5 type-meta text-text-meta">
                    {t('common.meta.updatedAt')} {formatDate(s.updatedAt)}
                    {isStale(s.updatedAt) && <span className="ml-2 font-medium text-text-sec">{t('chat.answer.stale')}</span>}
                  </p>
                </div>
                <span className="shrink-0 self-center w-7 h-7 inline-flex items-center justify-center rounded-full bg-primary-soft text-primary group-hover:bg-primary group-hover:text-text-inverse transition-colors duration-fast">
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
      {sources.length > VISIBLE && (
        <button
          type="button" onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center min-h-11 type-caption text-primary hover:text-primary-hover transition-colors duration-fast"
        >
          {expanded ? t('chat.answer.showLess') : t('chat.answer.showMore')}
        </button>
      )}
    </section>
  )
}

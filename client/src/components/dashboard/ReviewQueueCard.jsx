// 검토 대기 요약. 세 줄 각각이 해당 화면 링크다(IA.md 대시보드 하단 우측).
import { ArrowRight, BookOpen, MessageSquare, UserRoundCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import Badge from '../ui/Badge.jsx'

const ROWS = [
  { key: 'accuracy', labelKey: 'admin.dashboard.queueAccuracy', to: '/admin/logs?review=1', Icon: MessageSquare },
  { key: 'handoff', labelKey: 'admin.dashboard.queueHandoff', to: '/admin/handoff?tab=wait', Icon: UserRoundCheck },
  { key: 'knowledge', labelKey: 'admin.dashboard.queueKnowledge', to: '/admin/knowledge?tab=pending', Icon: BookOpen }
]

export default function ReviewQueueCard({ queue }) {
  const { t } = useLang()

  return (
    <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
      <h2 className="type-h3 text-text-pri">{t('admin.dashboard.reviewQueue')}</h2>
      <ul className="mt-3">
        {ROWS.map((r) => (
          <li key={r.key} className="border-t border-line-sub first:border-t-0">
            <Link
              to={r.to}
              className="group flex items-center gap-3 min-h-14 px-2 -mx-2 rounded-md hover:bg-mute transition-colors duration-fast"
            >
              <r.Icon size={20} aria-hidden="true" className="shrink-0 text-text-meta" />
              <span className="min-w-0 flex-1 type-body-sm text-text-sec">{t(r.labelKey)}</span>
              {/* 9단계. 남은 건수가 지금 봐야 할 것이라 주색, 0 이면 중립이다 */}
              <Badge tone={queue?.[r.key] > 0 ? 'primary' : 'neutral'} className="tabular-nums">
                {queue?.[r.key] ?? 0}
              </Badge>
              <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-text-ter group-hover:text-text-sec transition-colors duration-fast" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

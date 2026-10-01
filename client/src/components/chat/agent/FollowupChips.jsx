// 후속 질문 칩. 답변이 끝난 뒤에만 보인다(IA_PHASE5 시민 경험 규칙).
// 스트리밍 중에는 MessageList 가 아예 렌더하지 않는다.
import { CornerDownRight } from 'lucide-react'
import { useLang } from '../../../i18n/LangContext.jsx'
import Chip from '../../ui/Chip.jsx'

export default function FollowupChips({ items = [], onPick, disabled }) {
  const { t } = useLang()
  if (!items.length) return null

  return (
    <div className="mt-4 animate-flow-down-late">
      <p className="type-caption text-text-meta">{t('chat.agent.followupTitle')}</p>
      <div className="mt-2 flex flex-wrap gap-2" aria-label={t('chat.agent.followupTitle')}>
        {items.map((q) => (
          <Chip key={q} disabled={disabled} onClick={() => onPick(q)} className="max-w-full">
            <CornerDownRight size={14} aria-hidden="true" className="shrink-0 text-text-meta" />
            <span className="truncate">{q}</span>
          </Chip>
        ))}
      </div>
    </div>
  )
}

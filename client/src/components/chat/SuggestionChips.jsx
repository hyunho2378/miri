// 추천 질문. 데스크톱 한 줄, 모바일 2열. 스트리밍 중 잠금(PITFALLS 9).
// 아이콘은 칩이 iconName 으로 정한다. 순서로 돌리면 뜻과 아이콘이 어긋난다(6단계에서 고침).
import { CalendarCheck, Clock, CreditCard, HelpCircle, MapPin } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import Chip from '../ui/Chip.jsx'

const ICONS = { hours: Clock, fee: CreditCard, reserve: CalendarCheck, place: MapPin, ask: HelpCircle }
const FALLBACK = [Clock, CreditCard, CalendarCheck, MapPin]

export default function SuggestionChips({ items = [], onPick, disabled = false }) {
  const { t } = useLang()
  if (!items.length) return null

  return (
    <div aria-label={t('chat.suggestionsLabel')} className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-center">
      {items.map((it, i) => {
        const Icon = ICONS[it.iconName] || FALLBACK[i % FALLBACK.length]
        return (
          <Chip
            key={it.label} size="md" disabled={disabled}
            onClick={() => onPick(it.question)}
            className="justify-center md:justify-start"
          >
            <Icon size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
            <span className="truncate">{it.label}</span>
          </Chip>
        )
      })}
    </div>
  )
}

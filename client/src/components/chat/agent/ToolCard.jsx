// 도구 호출 카드. 에이전트가 무엇을 하고 있는지 사용자가 본다.
// 모션은 진행 스피너와 펼침뿐이다(DESIGN.md 모션 허용 목록). 색은 tokens 만 쓴다.
import { useState } from 'react'
import clsx from 'clsx'
import {
  BookOpen, CalendarCheck, ChevronDown, Calculator, Languages,
  Loader2, MapPin, TriangleAlert, UserRoundCheck
} from 'lucide-react'
import { useLang } from '../../../i18n/LangContext.jsx'
import StatusPill from '../../dashboard/StatusPill.jsx'
import { DETAIL } from './ToolDetails.jsx'

// 도구 6종 아이콘. 계획서 2-2 AI Service 층과 1:1 이다
const ICON = {
  knowledge: BookOpen,
  reservation: CalendarCheck,
  location: MapPin,
  fee: Calculator,
  handoff: UserRoundCheck,
  translate: Languages
}

// 결과가 비어 있으면 펼칠 것이 없다
const hasDetail = (node) => {
  const r = node.result
  if (!r) return false
  if (node.tool === 'knowledge') return (r.sources || []).length > 0
  if (node.tool === 'reservation') return (r.slots || []).length > 0
  if (node.tool === 'fee') return (r.items || []).length > 0
  return Boolean(r.address || r.department || r.detected)
}

export default function ToolCard({ node, defaultOpen = false }) {
  const { t } = useLang()
  const [open, setOpen] = useState(defaultOpen)

  const Icon = ICON[node.tool] || BookOpen
  const running = node.phase === 'running'
  const failed = node.phase === 'error'
  const Detail = DETAIL[node.tool]
  const expandable = !running && !failed && hasDetail(node)
  // 서버가 라벨을 보내면 그것을 쓰고, 없으면 도구 이름 사전으로 채운다
  const label = node.label || t(`chat.tool.${node.tool}`)
  const summary = failed ? node.message : (node.summary || node.detail)

  const head = (
    <>
      <span
        aria-hidden="true"
        className={clsx(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          failed ? 'bg-danger-soft text-danger-text' : running ? 'bg-primary-soft text-primary' : 'bg-mute text-text-sec'
        )}
      >
        {running
          ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
          : failed ? <TriangleAlert size={16} /> : <Icon size={16} />}
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span className="block type-body-sm font-medium text-text-pri truncate">{label}</span>
        {summary && <span className="block type-meta text-text-meta truncate">{summary}</span>}
      </span>

      {running
        ? <StatusPill size="sm" status="progress" label={t('chat.agent.running')} />
        : failed
          ? <StatusPill size="sm" status="failed" label={t('chat.agent.error')} />
          : null}

      {expandable && (
        <ChevronDown
          size={16} aria-hidden="true"
          className={clsx('shrink-0 text-text-meta transition-transform duration-fast', open && 'rotate-180')}
        />
      )}
    </>
  )

  return (
    <div className="rounded-md bg-subtle">
      {expandable ? (
        <button
          type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="flex w-full items-center gap-3 min-h-11 px-3 py-2 rounded-md hover:bg-mute transition-colors duration-fast"
        >
          {head}
        </button>
      ) : (
        <div className="flex items-center gap-3 min-h-11 px-3 py-2">{head}</div>
      )}

      {expandable && open && Detail && (
        <div className="px-3 pb-3 pt-1 animate-flow-down">
          <Detail result={node.result} />
        </div>
      )}
    </div>
  )
}

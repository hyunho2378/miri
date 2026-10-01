// 한 답변 안의 도구 카드 묶음.
// 스트리밍 중에는 진행 중 최신 하나만 펼쳐 보인다. 답변이 끝나면 전부 접어 요약 한 줄로 둔다.
import { useState } from 'react'
import { ChevronDown, Wrench } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../../i18n/LangContext.jsx'
import ToolCard from './ToolCard.jsx'

const FOLD_FROM = 2   // 도구가 이보다 많으면 요약 행으로 접는다

export default function ToolTimeline({ nodes = [], streaming = false, className }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  if (!nodes.length) return null

  // 스트리밍 중에는 마지막 하나만. 카드가 쌓이면 답변 텍스트가 화면 밖으로 밀린다
  if (streaming) {
    const last = nodes[nodes.length - 1]
    return (
      <div className={clsx('space-y-2', className)}>
        <ToolCard key={last.id} node={last} defaultOpen={false} />
      </div>
    )
  }

  if (nodes.length >= FOLD_FROM && !open) {
    return (
      <div className={className}>
        <button
          type="button" onClick={() => setOpen(true)} aria-expanded={false}
          className="flex w-full items-center gap-3 min-h-11 px-3 py-2 rounded-md bg-subtle hover:bg-mute transition-colors duration-fast"
        >
          <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-mute text-text-sec">
            <Wrench size={16} />
          </span>
          <span className="min-w-0 flex-1 text-left type-body-sm text-text-sec truncate">
            {t('chat.agent.toolCount', { n: nodes.length })}
          </span>
          <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
        </button>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-2', className)}>
      {nodes.map((n) => <ToolCard key={n.id} node={n} />)}
      {nodes.length >= FOLD_FROM && (
        <button
          type="button" onClick={() => setOpen(false)} aria-expanded
          className="inline-flex items-center gap-1 min-h-11 px-1 type-caption text-text-meta hover:text-text-sec transition-colors duration-fast"
        >
          {t('chat.agent.collapse')}
          <ChevronDown size={14} aria-hidden="true" className="rotate-180" />
        </button>
      )}
    </div>
  )
}

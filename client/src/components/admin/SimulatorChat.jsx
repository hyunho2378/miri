// 관리자 시뮬레이터의 대화 부분. ChatHero 는 5-F 담당 파일이라 손대지 않고
// chat/ 하위 컴포넌트와 agent/ 카드를 조합해 관리자 전용으로 다시 짰다.
// 시민 화면과 다른 점 둘이다. 쓰기 액션을 실제로 실행하지 않고, 답변마다 검토 패널이 붙는다.
import { useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useLang } from '../../i18n/LangContext.jsx'
import useChat from '../../hooks/useChat.js'
import { stripMarkdown } from '../../lib/stripMarkdown.js'
import AnswerSkeleton from '../chat/AnswerSkeleton.jsx'
import AnswerText from '../chat/AnswerText.jsx'
import Composer from '../chat/Composer.jsx'
import SourcePanel from '../chat/SourcePanel.jsx'
import SuggestionChips from '../chat/SuggestionChips.jsx'
import UserBubble from '../chat/UserBubble.jsx'
import ToolTimeline from '../chat/agent/ToolTimeline.jsx'
import Badge from '../ui/Badge.jsx'

const ANCHOR_GAP = 16

// MessageList 와 같은 규칙. 연속한 도구는 한 묶음이다
function groupTimeline(timeline) {
  const out = []
  for (const node of timeline) {
    if (node.kind === 'tool') {
      const last = out[out.length - 1]
      if (last?.kind === 'tools') last.nodes.push(node)
      else out.push({ kind: 'tools', nodes: [node] })
      continue
    }
    if (node.kind === 'text') out.push(node)
    if (node.kind === 'action') out.push(node)
  }
  return out
}

export default function SimulatorChat({ samples = [], lang = 'ko', facilityId, compact = false, renderReview }) {
  const { t } = useLang()
  const { messages, streaming, send } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const lastQRef = useRef(null)
  const taRef = useRef(null)

  // PITFALLS 3. 스트리밍 중 바닥을 따라가지 않는다. 새 질문만 위로 붙인다
  useLayoutEffect(() => {
    const c = scrollRef.current
    const q = lastQRef.current
    if (!c || !q) return
    c.scrollTo({ top: Math.max(0, q.offsetTop - ANCHOR_GAP) })
  }, [messages.filter((m) => m.role === 'user').length])

  const submit = () => {
    const q = input.trim()
    if (!q || streaming) return
    setInput('')
    send(q, { facilityId, lang })
  }
  const pick = (q) => { if (!streaming) { setInput(''); send(q, { facilityId, lang }) } }
  const lastIndex = messages.length - 1

  return (
    <div className={clsx('flex flex-col rounded-lg bg-page', compact ? 'h-[420px]' : 'h-[560px]')}>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4" aria-label={t('chat.ariaConversation')}>
        {messages.length === 0 ? (
          <div className="pt-2">
            <SuggestionChips items={samples} onPick={pick} disabled={streaming} />
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m, i) => {
              if (m.role === 'user') {
                const isLastQ = i === messages.length - 2 || i === lastIndex
                return <div key={m.id} ref={isLastQ ? lastQRef : null}><UserBubble content={m.content} /></div>
              }
              const isLast = i === lastIndex
              const streamingThis = streaming && isLast
              const groups = groupTimeline(m.timeline || [])
              const lastText = groups.reduce((acc, g, gi) => (g.kind === 'text' ? gi : acc), -1)

              return (
                <div key={m.id} className="animate-flow-down">
                  <div aria-live="polite" aria-atomic="false" aria-busy={streamingThis || undefined}>
                    {groups.length === 0
                      ? (m.content === '' ? <AnswerSkeleton /> : <AnswerText text={stripMarkdown(m.content)} caret={streamingThis} />)
                      : groups.map((g, gi) => {
                        if (g.kind === 'tools') {
                          return <div key={`t${gi}`} className={gi === 0 ? '' : 'mt-3'}><ToolTimeline nodes={g.nodes} streaming={streamingThis} /></div>
                        }
                        if (g.kind === 'text') {
                          return <div key={`x${gi}`} className={gi === 0 ? '' : 'mt-3'}><AnswerText text={stripMarkdown(g.text)} caret={streamingThis && gi === lastText} /></div>
                        }
                        // 쓰기 확인 카드는 시뮬레이터에서 버튼 없이 내용만 보여 준다.
                        // 관리자가 시험하다가 실제 예약이나 티켓을 만들면 안 된다
                        return (
                          <section key={`a${g.id}`} className="mt-4 rounded-lg bg-subtle p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge>{t('admin.simulator.simBadge')}</Badge>
                              <span className="min-w-0 type-body-sm font-medium text-text-pri truncate">{g.title}</span>
                            </div>
                            {g.lines?.length > 0 && (
                              <ul className="mt-2 space-y-0.5">
                                {g.lines.map((l) => <li key={l} className="type-meta text-text-meta tabular-nums">{l}</li>)}
                              </ul>
                            )}
                            <p className="mt-2 type-meta text-text-meta">{t('admin.simulator.simNote')}</p>
                          </section>
                        )
                      })}
                  </div>

                  {!streamingThis && (m.sources || []).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-line-sub">
                      <SourcePanel sources={m.sources} />
                    </div>
                  )}

                  {/* FAQ 후보를 만들려면 답변만이 아니라 직전 질문이 필요하다 */}
                  {!streamingThis && m.content !== '' && renderReview?.(m, messages[i - 1]?.content || '')}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line-sub p-3">
        <Composer ref={taRef} value={input} onChange={setInput} onSubmit={submit} disabled={streaming} />
      </div>
    </div>
  )
}

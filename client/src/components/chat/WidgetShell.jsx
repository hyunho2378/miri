// 임베드 위젯. 우하단 원형 버튼을 누르면 패널이 열린다(동해사이 SovereignChat 패턴).
// 공단 홈페이지에 iframe 으로 붙는다. 부모 문서가 iframe 크기를 바꿔야 하므로 열고 닫을 때 postMessage 를 보낸다.
//
// 패널은 420 안쪽이라 대화를 단일 열로 그린다. MessageList 는 lg 뷰포트에서 근거를 우측 320 열로 빼는데
// iframe 밖에서 직접 열면 뷰포트가 데스크톱이라 그 열이 패널 안에 들어와 본문이 뭉개진다.
// 그래서 위젯은 같은 agent 컴포넌트를 쓰되 배치만 단일 열로 다시 짠다(agent/ 는 수정하지 않는다).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { MessagesSquare, X } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import useChat from '../../hooks/useChat.js'
import { localizeSuggestion, pickText } from '../../lib/lang.js'
import { stripMarkdown } from '../../lib/stripMarkdown.js'
import IconButton from '../ui/IconButton.jsx'
import ActionBar from './ActionBar.jsx'
import AnswerSkeleton from './AnswerSkeleton.jsx'
import AnswerText from './AnswerText.jsx'
import Composer from './Composer.jsx'
import SourcePanel from './SourcePanel.jsx'
import SuggestionChips from './SuggestionChips.jsx'
import UserBubble from './UserBubble.jsx'
import ActionCard from './agent/ActionCard.jsx'
import FollowupChips from './agent/FollowupChips.jsx'
import ResultCard from './agent/ResultCard.jsx'
import ToolTimeline from './agent/ToolTimeline.jsx'

const ANCHOR_GAP = 16

// MessageList 와 같은 규칙으로 타임라인을 묶는다. 연속한 도구는 한 묶음, 결과는 그 도구 뒤
function groupTimeline(timeline) {
  const out = []
  for (const node of timeline) {
    if (node.kind === 'tool') {
      const last = out[out.length - 1]
      if (last?.kind === 'tools') last.nodes.push(node)
      else out.push({ kind: 'tools', nodes: [node] })
      if (node.result?.reservation || node.result?.ticket) out.push({ kind: 'result', result: node.result, id: node.id })
      continue
    }
    out.push(node)
  }
  return out
}

export default function WidgetShell({ settings, lang }) {
  const { t } = useLang()
  const { messages, streaming, send, vote, approveAction } = useChat()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const lastQRef = useRef(null)
  const taRef = useRef(null)

  const orgName = pickText(settings?.orgName, lang)

  // 부모 문서에 알린다. 임베드한 쪽이 iframe 높이를 바꿀 수 있어야 한다
  useEffect(() => {
    if (window.parent === window) return
    window.parent.postMessage({ source: 'g-chat-widget', type: open ? 'open' : 'close' }, '*')
  }, [open])

  // PITFALLS 3. 스트리밍 중 바닥을 따라가지 않는다. 새 질문만 위로 붙인다
  useLayoutEffect(() => {
    const c = scrollRef.current
    const q = lastQRef.current
    if (!c || !q) return
    c.scrollTo({ top: Math.max(0, q.offsetTop - ANCHOR_GAP) })
  }, [messages.filter((m) => m.role === 'user').length])

  useEffect(() => { if (open && !streaming) taRef.current?.focus() }, [open, streaming])

  const submit = () => {
    const q = input.trim()
    if (!q || streaming) return
    setInput('')
    send(q, { lang })
  }
  const pick = (q) => { if (!streaming) { setInput(''); send(q, { lang }) } }

  const suggestions = (settings?.suggestions || []).slice(0, 4).map((s) => localizeSuggestion(s, t))
  const lastIndex = messages.length - 1

  return (
    <>
      {open && (
        <section
          className={clsx(
            'fixed z-modal flex flex-col overflow-hidden bg-page shadow-float',
            // 모바일은 전체 화면, 데스크톱은 우하단 패널
            'inset-0 rounded-none',
            'md:inset-auto md:bottom-4 md:right-4 md:rounded-xl',
            'md:w-[clamp(360px,30vw,420px)] md:h-[clamp(480px,70vh,640px)]'
          )}
          aria-label={t('chat.widget.header', { org: orgName })}
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line-sub px-4">
            <p className="min-w-0 truncate type-h3 text-text-pri">{t('chat.widget.header', { org: orgName })}</p>
            <IconButton size="sm" aria-label={t('chat.widget.close')} onClick={() => setOpen(false)}>
              <X size={20} aria-hidden="true" />
            </IconButton>
          </header>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4" aria-label={t('chat.ariaConversation')}>
            {messages.length === 0 ? (
              <div className="pt-4">
                <p className="type-h2 text-text-pri break-keep">{t('chat.widget.greeting')}</p>
                <p className="mt-2 type-body-sm text-text-meta break-keep">{t('chat.widget.greetingSub')}</p>
                <div className="mt-5">
                  <SuggestionChips items={suggestions} onPick={pick} disabled={streaming} />
                </div>
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
                  const show = !streamingThis                      // PITFALLS 8
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
                            if (g.kind === 'result') return <ResultCard key={`r${g.id}`} result={g.result} />
                            if (g.kind === 'action') {
                              return (
                                <ActionCard
                                  key={`a${g.id}`} action={g} disabled={streaming}
                                  onResolve={(approve, args, altPrompt) => {
                                    if (altPrompt) { pick(altPrompt); return }
                                    approveAction(m.id, g.id, approve, args)
                                  }}
                                />
                              )
                            }
                            return null
                          })}
                      </div>

                      {/* 패널은 좁아서 근거를 답변 아래 단일 열로 둔다 */}
                      {show && (m.sources || []).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-line-sub">
                          <SourcePanel sources={m.sources} />
                        </div>
                      )}

                      {!streamingThis && m.content !== '' && (
                        <ActionBar className="animate-flow-down-late" text={m.content} messageId={m.messageId} onVote={vote} />
                      )}

                      {show && isLast && <FollowupChips items={m.followups || []} onPick={pick} disabled={streaming} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-line-sub p-3">
            <Composer ref={taRef} value={input} onChange={setInput} onSubmit={submit} disabled={streaming} />
          </div>
        </section>
      )}

      {/* 닫혀 있을 때만 원형 버튼. 열리면 패널 헤더의 닫기가 그 자리를 대신한다 */}
      {!open && (
        <button
          type="button" onClick={() => setOpen(true)} aria-label={t('chat.widget.open')}
          className="pressable fixed bottom-4 right-4 z-modal inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-text-inverse shadow-float hover:bg-primary-hover"
        >
          <MessagesSquare size={24} aria-hidden="true" />
        </button>
      )}
    </>
  )
}

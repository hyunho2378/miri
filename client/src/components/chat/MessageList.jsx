// 대화 스크롤 영역. 앵커와 스페이서와 아래로 가기 버튼이 전부 여기 있다.
// PITFALLS 1~8 대응. 이 파일의 스크롤 규칙은 동해사이 7차 검증분이다. 임의 변형 금지.
//  1 근거 열은 근거가 없어도 항상 렌더한다. 나중에 생기면 본문 폭이 340 줄어 점프한다
//  2 scrollIntoView smooth 대신 컨테이너 scrollTo 직접 호출. rAF 뒤 한 번, 450ms 뒤 재확정
//  3 스트리밍 중 바닥 추적 금지. 새 질문만 상단 앵커
//  4 고정 스페이서 금지. 스트리밍 중 동적, 완료 후 min(needed, 24vh, 160)
//  5 스페이서를 줄이면 브라우저가 scrollTop 을 clamp 한다. 다음 프레임에 재보정
//  6 아래로 가기 감지는 컨테이너 바닥이 아니라 마지막 메시지 요소 기준
//  8 근거 카드와 인라인 카드는 스트리밍이 끝난 뒤에만
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { ArrowDown } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import { stripMarkdown } from '../../lib/stripMarkdown.js'
import IconButton from '../ui/IconButton.jsx'
import ActionBar from './ActionBar.jsx'
import AnswerSkeleton from './AnswerSkeleton.jsx'
import AnswerText from './AnswerText.jsx'
import FacilityStatusCard from './FacilityStatusCard.jsx'
import HandoffCard from './HandoffCard.jsx'
import NoticeCard from './NoticeCard.jsx'
import SourcePanel from './SourcePanel.jsx'
import UserBubble from './UserBubble.jsx'
import ActionCard from './agent/ActionCard.jsx'
import FollowupChips from './agent/FollowupChips.jsx'
import ResultCard from './agent/ResultCard.jsx'
import ToolTimeline from './agent/ToolTimeline.jsx'

// 타임라인을 그리기 단위로 묶는다. 연속한 도구는 한 묶음, 실행 결과는 그 도구 바로 뒤에 온다.
// 순서는 서버가 보낸 순서 그대로다. 도구가 텍스트 사이에 끼면 텍스트도 그 지점에서 나뉜다
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

const ANCHOR_GAP = 24
const DOWN_THRESHOLD = 120
const TAIL_MAX = 160

export default function MessageList({ messages, streaming, onVote, facilityId, onAction, onFollowup }) {
  const { t } = useLang()
  const containerRef = useRef(null)
  const lastQRef = useRef(null)
  const lastARef = useRef(null)
  const justFinished = useRef(false)
  const [spacer, setSpacer] = useState(0)
  const [showDown, setShowDown] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(() => new Set())

  const userCount = messages.filter((m) => m.role === 'user').length
  const lastIndex = messages.length - 1

  const anchorTop = () => Math.max(0, (lastQRef.current?.offsetTop || 0) - ANCHOR_GAP)

  // PITFALLS 2. 새 질문이 생기면 그 질문을 상단에 붙인다
  useEffect(() => {
    const c = containerRef.current
    if (!c || !userCount) return undefined
    const go = () => c.scrollTo({ top: anchorTop() })
    const raf = requestAnimationFrame(go)
    const timer = setTimeout(() => c.scrollTo({ top: anchorTop(), behavior: 'auto' }), 450)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [userCount])

  // PITFALLS 4. paint 전에 스페이서를 확정한다
  useLayoutEffect(() => {
    const c = containerRef.current
    const q = lastQRef.current
    if (!c || !q) { setSpacer(0); return }
    const qTop = q.offsetTop
    const a = lastARef.current
    const aBottom = a ? a.offsetTop + a.offsetHeight : qTop + q.offsetHeight
    const need = Math.max(0, c.clientHeight - (aBottom - qTop) - ANCHOR_GAP)
    const next = streaming ? need : Math.min(need, window.innerHeight * 0.24, TAIL_MAX)
    setSpacer((prev) => (Math.abs(prev - next) > 1 ? next : prev))
  }, [messages, streaming])

  // PITFALLS 5. 완료 직후 스페이서가 줄면 scrollTop 이 clamp 된다. 두 프레임 뒤 재보정
  useEffect(() => {
    if (streaming) { justFinished.current = true; return undefined }
    if (!justFinished.current) return undefined
    justFinished.current = false
    const c = containerRef.current
    if (!c) return undefined
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const max = Math.max(0, c.scrollHeight - c.clientHeight)
        c.scrollTop = Math.min(anchorTop(), max)
      })
    })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [streaming])

  // PITFALLS 6. 마지막 메시지 요소 기준으로만 판단한다
  const syncDown = useCallback(() => {
    const c = containerRef.current
    const a = lastARef.current || lastQRef.current
    if (!c || !a) { setShowDown(false); return }
    const bottom = a.offsetTop + a.offsetHeight
    setShowDown(bottom - (c.scrollTop + c.clientHeight) > DOWN_THRESHOLD)
  }, [])

  useEffect(() => { syncDown() }, [messages, spacer, syncDown])

  const toDown = () => {
    const c = containerRef.current
    const a = lastARef.current || lastQRef.current
    if (!c || !a) return
    c.scrollTo({ top: Math.max(0, a.offsetTop + a.offsetHeight - c.clientHeight + ANCHOR_GAP) })
  }

  const toggleHandoff = (id) => {
    setHandoffOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef} onScroll={syncDown}
        className="relative h-full overflow-y-auto"
        aria-label={t('chat.ariaConversation')}
      >
        <div className="mx-auto w-full max-w-chat px-4 md:px-6 lg:px-8 py-6 space-y-6">
          {messages.map((m, i) => {
            if (m.role === 'user') {
              const isLastQ = i === messages.length - 2 || i === lastIndex
              // 질문도 답변과 같은 그리드에 둔다. 본문 열 오른쪽 끝에 맞아야 근거 열 위로 뜨지 않는다
              return (
                <div
                  key={m.id} ref={isLastQ ? lastQRef : null}
                  className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-8"
                >
                  <div className="min-w-0"><UserBubble content={m.content} /></div>
                  <div className="hidden lg:block" aria-hidden="true" />
                </div>
              )
            }

            const isLast = i === lastIndex
            const streamingThis = streaming && isLast
            const groups = groupTimeline(m.timeline || [])
            const lastTextIndex = groups.reduce((acc, g, gi) => (g.kind === 'text' ? gi : acc), -1)
            const show = !streamingThis                       // PITFALLS 8
            const cards = show ? (m.cards || []) : []
            const sources = show ? (m.sources || []) : []
            const showHandoff = handoffOpen.has(m.id) || cards.some((c) => c.type === 'handoff')
            const cardFacilityId = cards.find((c) => c.type === 'facility')?.facilityId || facilityId

            return (
              <div
                key={m.id} ref={isLast ? lastARef : null}
                className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start animate-flow-down"
              >
                <div className="min-w-0">
                  <div aria-live="polite" aria-atomic="false" aria-busy={streamingThis || undefined}>
                    {groups.length === 0
                      // 도구도 텍스트도 아직 없다. 스켈레톤은 도구 카드가 없을 때만 뜬다
                      ? (m.content === '' ? <AnswerSkeleton /> : <AnswerText text={stripMarkdown(m.content)} caret={streamingThis} />)
                      : groups.map((g, gi) => {
                        if (g.kind === 'tools') {
                          return (
                            <div key={`t${gi}`} className={gi === 0 ? '' : 'mt-4'}>
                              <ToolTimeline nodes={g.nodes} streaming={streamingThis} />
                            </div>
                          )
                        }
                        if (g.kind === 'text') {
                          return (
                            <div key={`x${gi}`} className={gi === 0 ? '' : 'mt-4'}>
                              <AnswerText text={stripMarkdown(g.text)} caret={streamingThis && gi === lastTextIndex} />
                            </div>
                          )
                        }
                        if (g.kind === 'result') return <ResultCard key={`r${g.id}`} result={g.result} />
                        if (g.kind === 'action') {
                          return (
                            <ActionCard
                              key={`a${g.id}`} action={g} disabled={streaming}
                              onResolve={(approve, args, altPrompt) => {
                                if (altPrompt) { onFollowup?.(altPrompt); return }
                                onAction?.(m.id, g.id, approve, args)
                              }}
                            />
                          )
                        }
                        return null
                      })}
                  </div>

                  {cards.map((c, k) => {
                    if (c.type === 'facility') return <FacilityStatusCard key={k} facilityId={c.facilityId} />
                    if (c.type === 'notice') return <NoticeCard key={k} noticeId={c.noticeId} />
                    return null
                  })}
                  {showHandoff && <HandoffCard facilityId={cardFacilityId} messageId={m.messageId} />}

                  {/* 근거는 모바일에서 답변 아래에 붙는다 */}
                  {sources.length > 0 && (
                    <div className="lg:hidden mt-4 pt-4 border-t border-line-sub">
                      <SourcePanel sources={sources} />
                    </div>
                  )}

                  {!streamingThis && m.content !== '' && (
                    <ActionBar className="animate-flow-down-late"
                      text={m.content} messageId={m.messageId} onVote={onVote}
                      handoffOpen={showHandoff} onHandoff={() => toggleHandoff(m.id)}
                    />
                  )}

                  {/* 후속 질문은 답변 완료 후에만. 스트리밍 중 금지 */}
                  {show && isLast && (
                    <FollowupChips items={m.followups || []} onPick={onFollowup} disabled={streaming} />
                  )}
                </div>

                {/* PITFALLS 1. 근거가 없어도 우측 트랙은 항상 예약한다 */}
                <div className="hidden lg:block min-w-0">
                  {sources.length > 0 && <SourcePanel sources={sources} />}
                </div>
              </div>
            )
          })}

          <div style={{ height: spacer }} aria-hidden="true" />
        </div>
      </div>

      <div className={clsx(
        'pointer-events-none absolute inset-x-0 bottom-4 z-raised flex justify-center transition-opacity duration-fast',
        showDown ? 'opacity-100' : 'opacity-0'
      )}>
        <IconButton
          size="lg" variant="soft" aria-label={t('chat.scrollDown')} onClick={toDown}
          tabIndex={showDown ? 0 : -1}
          className={clsx('shadow-md', showDown && 'pointer-events-auto')}
        >
          <ArrowDown size={20} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}

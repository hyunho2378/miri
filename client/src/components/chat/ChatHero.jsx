// 상담 홈 컨테이너. idle → leaving(인트로 소멸) → chat 3상태.
// 스트리밍 로직은 hooks/useChat.js(1단계) 소유다. 여기는 UI 만 그린다.
// PITFALLS 9 스트리밍 중 Composer 와 칩 잠금, 10 답변 완료 후 재포커스.
//
// 5-F 에서 대화 목록 레일과 QR 진입과 NPS 카드를 얹었다. 스트리밍 로직 부위는 손대지 않았다.
// 대화 하나가 이 컴포넌트 하나다. ChatPage 가 대화별로 이 컴포넌트를 마운트해 상태를 나눈다.
import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { SquarePen } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import useChat from '../../hooks/useChat.js'
import { facilityName, localizeSuggestion, pickText } from '../../lib/lang.js'
import useChatUi from '../../store/useChatUi.js'
import Drawer from '../ui/Drawer.jsx'
import IconButton from '../ui/IconButton.jsx'
import Composer from './Composer.jsx'
import ConversationRail, { ConversationList } from './ConversationRail.jsx'
import MessageList from './MessageList.jsx'
import NpsCard from './NpsCard.jsx'
import SuggestionChips from './SuggestionChips.jsx'

const LEAVE_MS = 280
const NPS_AFTER = 3          // 답변 3회를 마친 대화에만 만족도를 묻는다

export default function ChatHero({
  settings, facility, initialQuestion, fromQr = false,
  active = true, conversations = [], activeId, onPick, onNew, onMeta,
  npsFor, onNpsDone
}) {
  const { t, lang } = useLang()
  const { messages, streaming, send, reset, vote, approveAction, sessionId } = useChat()
  const setPanelOpen = useChatUi((s) => s.setPanelOpen)
  const listOpen = useChatUi((s) => s.listOpen)
  const setListOpen = useChatUi((s) => s.setListOpen)
  const [phase, setPhase] = useState('idle')
  const [input, setInput] = useState(initialQuestion || '')
  const taRef = useRef(null)

  const orgName = pickText(settings?.orgName, lang)
  const facilityId = facility?.id
  const facName = facilityName(facility, lang)

  // 이 대화가 화면에 없으면 헤더 폭을 건드리지 않는다
  useEffect(() => { if (active) setPanelOpen(phase === 'chat') }, [active, phase, setPanelOpen])
  useEffect(() => () => setPanelOpen(false), [setPanelOpen])

  // 대화 제목과 답변 수를 목록으로 올린다. 제목은 첫 질문 24자다.
  // onMeta 는 의존성에 넣지 않는다. 부모가 매 렌더 새 함수를 주면 무한 루프가 난다(useTopbar 와 같은 이유)
  const firstQuestion = messages.find((m) => m.role === 'user')?.content || ''
  const answered = messages.filter((m) => m.role === 'assistant' && m.done).length
  const metaRef = useRef(onMeta)
  metaRef.current = onMeta
  useEffect(() => {
    metaRef.current?.(activeId, { title: firstQuestion.slice(0, 24), answers: answered })
  }, [activeId, firstQuestion, answered])

  // PITFALLS 10. 첫 전환은 textarea 리마운트라 이 효과가 포커스를 잡는다
  useEffect(() => {
    if (phase === 'chat' && !streaming) taRef.current?.focus()
  }, [phase, streaming])

  const submit = () => {
    const question = input.trim()
    if (!question || streaming) return
    if (phase === 'idle') {
      setPhase('leaving')
      setTimeout(() => setPhase('chat'), LEAVE_MS)
    }
    setInput('')
    send(question, { facilityId, lang })
  }

  const pick = (question) => {
    if (streaming) return
    if (phase === 'idle') {
      setPhase('leaving')
      setTimeout(() => setPhase('chat'), LEAVE_MS)
    }
    setInput('')
    send(question, { facilityId, lang })
  }

  const newChat = () => {
    if (onNew) { onNew(); return }      // 목록이 있으면 부모가 대화를 새로 연다
    reset()
    setInput('')
    setPhase('idle')
  }

  // 현장 QR 로 들어오면 그 시설에 딱 붙은 칩 4개를 준다.
  // 질문에 시설명을 넣어야 mock 과 백엔드가 같은 시설로 매칭한다
  const qr = fromQr && facility
  const suggestions = useMemo(() => {
    if (qr) {
      return [
        { label: t('chat.qr.chipHours'), question: `${facName} ${t('chat.suggestion.hoursQuestion')}`, iconName: 'hours' },
        { label: t('chat.qr.chipReserve'), question: `${facName} ${t('chat.suggestion.reserveQuestion')}`, iconName: 'reserve' },
        { label: t('chat.qr.chipFee'), question: `${facName} ${t('chat.suggestion.feeQuestion')}`, iconName: 'fee' },
        { label: t('chat.qr.chipParking'), question: `${facName} ${t('chat.suggestion.wayQuestion')}`, iconName: 'place' }
      ]
    }
    // 시설 컨텍스트가 있으면 같은 주제를 그 시설로 좁혀 보낸다.
    // 라벨과 질문은 현재 언어로 낸다. 시설명도 그 언어 이름을 붙여야 답변이 같은 언어로 온다
    return (settings?.suggestions || []).map((s) => {
      const it = localizeSuggestion(s, t)
      return { ...it, question: facility ? `${facName} ${it.question}` : it.question }
    })
  }, [qr, facility, facName, settings, t])

  const trustLine = orgName ? t('chat.trustLine', { org: orgName }) : ''

  if (phase !== 'chat') {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-page flex-col items-center justify-center px-4 md:px-6 lg:px-8 py-10">
          <div className={clsx(
            'w-full max-w-composer transition-[opacity,transform] duration-dur ease-out',
            phase === 'leaving' && 'opacity-0 -translate-y-2'
          )}>
            <h1 className="type-display text-text-pri text-center break-keep">
              {qr
                ? t('chat.qr.headline', { facility: facName })
                : facility ? t('chat.headlineFacility', { facility: facName }) : t('chat.headline', { org: orgName })}
            </h1>
            <p className="mt-4 type-body text-text-meta text-center">{qr ? t('chat.qr.sub') : t('chat.sub')}</p>

            <div className="mt-10 lg:mt-12">
              <Composer
                ref={taRef} value={input} onChange={setInput} onSubmit={submit}
                disabled={streaming} autoFocus
              />
            </div>

            <div className="mt-5">
              <SuggestionChips items={suggestions} onPick={pick} disabled={streaming} />
            </div>

            {/* 새 대화를 열 때 직전 대화가 답변을 받았으면 여기서 한 번 묻는다 */}
            {npsFor && (
              <NpsCard sessionId={sessionId} conversationId={npsFor} onDone={onNpsDone} className="mt-8" />
            )}

            {trustLine && <p className="mt-12 lg:mt-14 type-meta text-text-meta text-center">{trustLine}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex">
      {conversations.length > 0 ? (
        <ConversationRail items={conversations} activeId={activeId} onPick={onPick} onNew={newChat} />
      ) : (
        <aside className="hidden md:flex w-chat-rail shrink-0 flex-col items-center gap-2 border-r border-line-sub pt-4">
          <IconButton size="lg" aria-label={t('chat.newChat')} onClick={newChat}>
            <SquarePen size={20} aria-hidden="true" />
          </IconButton>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 숨은 대화는 clientHeight 가 0 이라 스페이서 계산이 어긋난다.
            다시 보일 때 key 를 바꿔 마운트해 앵커와 스페이서를 새로 잡는다(PITFALLS 4·5) */}
        <MessageList
          key={active ? 'on' : 'off'}
          messages={messages} streaming={streaming} onVote={vote} facilityId={facilityId}
          onAction={approveAction} onFollowup={pick}
        />

        {/* 답변 3회를 마치면 대화 아래에 한 번 묻는다. 스트리밍 중에는 띄우지 않는다 */}
        {!streaming && answered >= NPS_AFTER && (
          <div className="shrink-0 mx-auto w-full max-w-chat px-4 md:px-6 lg:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <div className="min-w-0 pb-2">
              <NpsCard
                sessionId={sessionId} conversationId={activeId || 'c1'}
                onDone={() => onNpsDone?.(activeId)}
              />
            </div>
            <div className="hidden lg:block" aria-hidden="true" />
          </div>
        )}

        <div className="shrink-0 border-t border-line-sub bg-page">
          <div className="mx-auto w-full max-w-chat px-4 md:px-6 lg:px-8 py-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <div className="min-w-0">
              {/* 모바일 대화 목록은 TopNav 좌측 아이콘이 연다(6단계). 여기는 새 대화만 둔다 */}
              <div className="md:hidden mb-2 flex items-center gap-1">
                <button
                  type="button" onClick={newChat}
                  className="inline-flex items-center gap-1.5 min-h-11 pr-3 type-body-sm font-medium text-text-sec hover:text-text-pri transition-colors duration-fast"
                >
                  <SquarePen size={16} aria-hidden="true" />
                  {t('chat.newChat')}
                </button>
              </div>
              <Composer
                ref={taRef} value={input} onChange={setInput} onSubmit={submit}
                disabled={streaming} meta={trustLine}
              />
            </div>
            <div className="hidden lg:block" aria-hidden="true" />
          </div>
        </div>
      </div>

      <Drawer open={listOpen} onClose={() => setListOpen(false)} title={t('chat.rail.title')} side="left">
        <ConversationList
          items={conversations} activeId={activeId}
          onPick={(id) => { onPick?.(id); setListOpen(false) }}
          onNew={() => { newChat(); setListOpen(false) }}
        />
      </Drawer>
    </div>
  )
}

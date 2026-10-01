// 상담 홈. 쿼리 ?facility=id 로 시설 컨텍스트, ?q= 로 질문 프리필(ROUTES.md), ?src=qr 로 현장 진입.
//
// 이번 세션의 대화 목록을 여기서 들고 있다. useChat 은 한 대화만 아는 훅이라(수정 금지 파일)
// 대화 하나에 ChatHero 하나를 마운트하고 활성 대화만 보인다. 숨긴 대화도 마운트를 유지해야
// 다시 열었을 때 답변과 도구 카드가 그대로 있다. 목록은 메모리이고 새로고침하면 사라진다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import ChatHero from '../../components/chat/ChatHero.jsx'
import useChatUi from '../../store/useChatUi.js'
import { get } from '../../lib/api.js'

const newId = () => `c-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
const newConv = () => ({ id: newId(), title: '', at: new Date().toISOString(), answers: 0 })

export default function ChatPage() {
  const { settings } = useOutletContext() || {}
  const [params] = useSearchParams()
  const facilityId = params.get('facility')
  const initialQuestion = params.get('q') || ''
  const fromQr = params.get('src') === 'qr'
  const [facility, setFacility] = useState(null)

  const [convs, setConvs] = useState(() => [newConv()])
  const [activeId, setActiveId] = useState(null)
  const [npsFor, setNpsFor] = useState(null)
  const rated = useRef(new Set())

  const current = activeId || convs[0].id

  useEffect(() => {
    if (!facilityId) { setFacility(null); return undefined }
    let alive = true
    get(`/api/facilities/${facilityId}`).then((f) => { if (alive) setFacility(f) }).catch(() => {})
    return () => { alive = false }
  }, [facilityId])

  // 값이 그대로면 상태를 바꾸지 않는다. 매 렌더 새 배열을 만들면 목록이 계속 다시 그려진다
  const setMeta = useCallback((id, meta) => {
    setConvs((prev) => {
      const c = prev.find((x) => x.id === id)
      if (!c || (c.title === meta.title && c.answers === meta.answers)) return prev
      return prev.map((x) => (x.id === id ? { ...x, ...meta } : x))
    })
  }, [])

  // 새 대화. 직전 대화가 답변을 하나라도 받았고 아직 평가 전이면 만족도를 한 번 묻는다
  const newChat = useCallback(() => {
    const leaving = convs.find((c) => c.id === current)
    if (leaving && leaving.answers >= 1 && !rated.current.has(leaving.id)) setNpsFor(leaving.id)
    const next = newConv()
    setConvs((prev) => [...prev, next])
    setActiveId(next.id)
  }, [convs, current])

  // 제출해도 카드를 지우지 않는다. NpsCard 가 감사 문구로 접혀 사용자가 결과를 본다
  const npsDone = useCallback((id) => { rated.current.add(id) }, [])

  // 목록에 올릴 것은 질문을 한 번이라도 한 대화다. 빈 새 대화는 목록에 넣지 않는다.
  // 매 렌더 새 배열을 만들면 스토어가 계속 갱신되어 TopNav 가 헛돈다
  const items = useMemo(() => convs.filter((c) => c.title), [convs])

  // TopNav 가 모바일 목록을 열려면 목록과 조작 핸들이 필요하다. 형제 컴포넌트라 스토어로 넘긴다
  const setConversations = useChatUi((s) => s.setConversations)
  const setStoreActive = useChatUi((s) => s.setActiveId)
  const setHandlers = useChatUi((s) => s.setHandlers)
  useEffect(() => { setConversations(items) }, [items, setConversations])
  useEffect(() => { setStoreActive(current) }, [current, setStoreActive])
  useEffect(() => { setHandlers({ pick: setActiveId, create: newChat }) }, [newChat, setHandlers])
  useEffect(() => () => setConversations([]), [setConversations])

  return (
    <>
      {convs.map((c) => {
        const isActive = c.id === current
        return (
          <div key={c.id} className={clsx('flex-1 min-h-0 flex', !isActive && 'hidden')}>
            <ChatHero
              settings={settings}
              facility={facility}
              initialQuestion={isActive ? initialQuestion : ''}
              fromQr={fromQr}
              active={isActive}
              conversations={items}
              activeId={c.id}
              onPick={setActiveId}
              onNew={newChat}
              onMeta={setMeta}
              npsFor={isActive ? npsFor : null}
              onNpsDone={npsDone}
            />
          </div>
        )
      })}
    </>
  )
}

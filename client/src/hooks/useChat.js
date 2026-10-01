// useChat.js 동해사이 useSovereignChat 스트리밍 로직 이식. PITFALLS 7·9·14·15·16 대응.
// mock 과 실서버가 같은 코드 경로다. api.chatStream 이 어느 쪽이든 Response 를 돌려준다.
//
// 5-1 에서 도구 타임라인을 얹었다. 기존 읽기 루프와 토큰 처리는 한 줄도 바꾸지 않았고
// processLine 의 이벤트 분기와 approveAction 만 추가했다. content 문자열도 그대로 쌓는다(복사·렌더 호환).
import { useCallback, useRef, useState } from 'react'
import { chatStream, actionStream, post } from '../lib/api.js'

const HISTORY = 8

const emptyAssistant = () => ({
  id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  role: 'assistant',
  content: '',
  sources: [],
  cards: [],
  timeline: [],        // {kind:'tool'|'action'|'text'|'result', ...} 온 순서 그대로
  followups: [],
  messageId: null,
  done: false
})

// knowledge 도구의 done 결과가 근거 목록이다. sources 이벤트만 오는 백엔드도 같은 모양으로 받는다
const sourcesOf = (evt) => evt.result?.sources || evt.sources || []

export default function useChat() {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(null)
  if (!sessionId.current) sessionId.current = crypto.randomUUID()

  // 마지막 assistant 메시지만 갱신한다
  const patchLast = useCallback((patch) => {
    setMessages((prev) => {
      const next = [...prev]
      const i = next.length - 1
      next[i] = typeof patch === 'function' ? patch(next[i]) : { ...next[i], ...patch }
      return next
    })
  }, [])

  // id 로 지정한 메시지를 갱신한다. 허용 응답은 마지막 메시지가 아닐 수 있다
  const patchById = useCallback((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id
      ? (typeof patch === 'function' ? patch(m) : { ...m, ...patch })
      : m)))
  }, [])

  // 한 줄(NDJSON)을 메시지 하나에 적용한다. send 와 approveAction 이 같은 파서를 쓴다
  const applyEvent = useCallback((evt, patch) => {
    if (evt.type === 'token') {
      setLoading(false)
      patch((m) => {
        const tl = [...m.timeline]
        const last = tl[tl.length - 1]
        // 연속 토큰은 같은 text 조각에 이어 붙인다. 도구 카드가 끼면 새 조각이 시작된다
        if (last?.kind === 'text') tl[tl.length - 1] = { ...last, text: last.text + evt.token }
        else tl.push({ kind: 'text', text: evt.token })
        return { ...m, content: m.content + evt.token, timeline: tl }
      })
      return
    }

    if (evt.type === 'tool') {
      const { type, ...fields } = evt
      patch((m) => {
        const tl = [...m.timeline]
        const i = tl.findIndex((x) => x.kind === 'tool' && x.id === evt.id)
        // 같은 id 가 다시 오면 갱신이다(running → done). label 과 tool 은 첫 이벤트 것을 유지한다
        const merged = i >= 0 ? { ...tl[i], ...fields } : { kind: 'tool', phase: 'running', ...fields }
        if (i >= 0) tl[i] = merged
        else tl.push(merged)
        const next = { ...m, timeline: tl }
        // knowledge 결과는 우측 근거 열에도 그대로 간다(PITFALLS 1 의 예약된 트랙)
        if (merged.tool === 'knowledge') {
          const s = sourcesOf(evt)
          if (s.length) next.sources = s
        }
        return next
      })
      return
    }

    if (evt.type === 'action') {
      // 허용 대기 상태로 타임라인에 꽂는다. 사용자가 누르기 전에는 아무것도 실행되지 않는다
      const { type, ...fields } = evt
      patch((m) => ({ ...m, timeline: [...m.timeline, { kind: 'action', status: 'awaiting', ...fields }] }))
      return
    }

    if (evt.type === 'sources') {
      // 후방 호환. sources 만 오면 knowledge 도구가 done 된 것으로 본다
      patch((m) => {
        const has = m.timeline.some((x) => x.kind === 'tool' && x.tool === 'knowledge')
        const tl = has ? m.timeline : [...m.timeline, {
          kind: 'tool', id: `k-${m.id}`, tool: 'knowledge', phase: 'done', result: { sources: evt.sources || [] }
        }]
        return { ...m, sources: evt.sources || [], timeline: tl }
      })
      return
    }

    if (evt.type === 'cards') { patch({ cards: evt.cards || [] }); return }
    if (evt.type === 'followups') { patch({ followups: evt.items || [] }); return }
    if (evt.type === 'done') {
      patch((m) => ({
        ...m,
        messageId: evt.messageId || m.messageId,
        autoResolved: evt.autoResolved ?? m.autoResolved,
        confidence: evt.confidence ?? m.confidence,
        done: true
      }))
    }
  }, [])

  // 스트림 하나를 끝까지 읽는다. PITFALLS 14 15 를 여기서 지킨다
  const consume = useCallback(async (res, patch) => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const processLine = (line) => {
      const t = line.trim()
      if (!t) return
      let evt
      try { evt = JSON.parse(t) } catch { return }
      applyEvent(evt, patch)
    }

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })   // PITFALL 14 한글 바이트 분할
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) processLine(line)
    }
    buffer += decoder.decode()          // EOF flush
    processLine(buffer)                 // PITFALL 15 마지막 줄
  }, [applyEvent])

  const send = useCallback(async (raw, opts = {}) => {
    const message = (raw || '').trim()
    if (!message || streaming) return   // PITFALL 9 스트리밍 중 중복 전송 금지

    const history = messages
      .filter((m) => m.content.trim())
      .slice(-HISTORY)
      .map((m) => ({ role: m.role, content: m.content }))   // PITFALL 16 후속 질문 맥락

    setMessages((prev) => [
      ...prev,
      { id: `q-${Date.now()}`, role: 'user', content: message },
      emptyAssistant()
    ])
    setStreaming(true)
    setLoading(true)

    try {
      const res = await chatStream({
        message,
        history,
        facilityId: opts.facilityId,
        lang: opts.lang,
        sessionId: sessionId.current
      })
      await consume(res, patchLast)
    } catch (e) {
      patchLast({ content: e.error?.message || '답변을 불러오지 못했습니다.', done: true })
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }, [messages, streaming, patchLast, consume])

  // 실행 확인 카드의 허용과 거부. 허용해야만 쓰기가 실행된다(API_CONTRACT 백엔드 책임).
  // 응답은 새 말풍선이 아니라 그 답변의 타임라인 뒤에 이어 붙는다
  const approveAction = useCallback(async (messageKey, actionId, approve, args) => {
    if (streaming) return
    const target = messages.find((m) => m.id === messageKey)
    if (!target) return
    const action = target.timeline.find((x) => x.kind === 'action' && x.id === actionId)
    if (!action || action.status !== 'awaiting') return   // 두 번 실행 금지

    const patch = (p) => patchById(messageKey, p)
    const setStatus = (status) => patch((m) => ({
      ...m,
      timeline: m.timeline.map((x) => (x.kind === 'action' && x.id === actionId ? { ...x, status } : x))
    }))

    if (!approve) { setStatus('declined'); return }

    setStatus('approved')
    setStreaming(true)
    try {
      const res = await actionStream({
        actionId, messageId: target.messageId, approve: true, args, sessionId: sessionId.current
      })
      await consume(res, patch)
    } catch (e) {
      setStatus('awaiting')
      patch((m) => ({ ...m, content: m.content + `\n\n${e.error?.message || '요청을 처리하지 못했습니다.'}` }))
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming, patchById, consume])

  const reset = useCallback(() => {
    setMessages([])
    sessionId.current = crypto.randomUUID()
  }, [])

  const vote = useCallback((messageId, v) => {
    if (!messageId) return
    post('/api/chat/feedback', { messageId, vote: v }).catch(() => {})
  }, [])

  const sendNps = useCallback((score) => {
    post('/api/chat/nps', { sessionId: sessionId.current, score }).catch(() => {})
  }, [])

  return { messages, streaming, loading, send, reset, vote, approveAction, sendNps, sessionId: sessionId.current }
}

// reportQueue.js 도우미 보고 전송 대기열(회신 R34: 통신이 끊겨도 보고를 잃지 않게).
// 보고마다 고유 key 를 붙여 휴대폰 저장소(localStorage)에 넣고, 보내기에 성공한 것만 지운다.
// 서버는 같은 key 를 한 번만 저장하므로 다시 보내도 중복으로 쌓이지 않는다.
const PREFIX = 'miri.reportQueue.'

export const newKey = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
const defaultStorage = () => (typeof localStorage !== 'undefined' ? localStorage : memStore())

export function readQueue(scope, storage = defaultStorage()) {
  try { const v = JSON.parse(storage.getItem(PREFIX + scope) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
function writeQueue(scope, items, storage) {
  if (items.length) storage.setItem(PREFIX + scope, JSON.stringify(items))
  else storage.removeItem(PREFIX + scope)
}

// 같은 key 는 한 번만 넣는다
export function enqueue(scope, item, storage = defaultStorage()) {
  const q = readQueue(scope, storage)
  const it = { ...item, key: item.key || newKey(), at: item.at || Date.now() }
  if (!q.some((x) => x.key === it.key)) q.push(it)
  writeQueue(scope, q, storage)
  return it
}

// send(item) 가 true 를 돌려주면 성공으로 보고 지운다. 실패(오류, false)면 남겨 두고 멈춘다(순서 유지).
// GPT 5차 검토 H1: 같은 대기열의 전송은 한 번에 하나만 돌리고(뒤 요청은 앞 전송이 끝난 뒤 이어서 실행),
// 성공하면 저장소를 다시 읽어 보낸 key 만 지운다. 전송 중에 새로 넣은 보고가 지워지지 않는다.
// 여러 탭이 같은 대기열을 동시에 보내는 경우는 서버의 key 중복 방지(원자 처리)가 막는다.
const running = new WeakMap()
async function flushOnce(scope, send, storage) {
  let sent = 0
  for (let i = 0; i < 1000; i++) {
    const head = readQueue(scope, storage)[0]
    if (!head) break
    let ok = false
    try { ok = await send(head) } catch { ok = false }
    if (!ok) break
    writeQueue(scope, readQueue(scope, storage).filter((x) => x.key !== head.key), storage)
    sent += 1
  }
  return { sent, left: readQueue(scope, storage).length }
}
export function flush(scope, send, storage = defaultStorage()) {
  let m = running.get(storage)
  if (!m) { m = new Map(); running.set(storage, m) }
  const run = (m.get(scope) || Promise.resolve()).then(() => flushOnce(scope, send, storage))
  const tail = run.catch(() => {})
  m.set(scope, tail)
  tail.then(() => { if (m.get(scope) === tail) m.delete(scope) })
  return run
}

// 서버 보고 목록을 발령 상태(ackOverride, events)에 합친다. 같은 대상의 보고는 나중 것이 이긴다
export function mergeReports(state, reports = []) {
  const ackOverride = { ...state.ackOverride }
  const events = { ...state.events }
  const sorted = [...reports].filter(Boolean).sort((a, b) => (a.at || 0) - (b.at || 0))
  for (const r of sorted) {
    // GPT 5차 검토 M1: 수락과 불가도 더 늦은 기록만 덮는다. 원격 보고의 at 은 도우미 화면이 발령 가상 시각(brief.clock)으로 맞춰 보낸다
    if (r.type === 'ack' && r.helper) { const cur = ackOverride[r.helper]; if (!cur || !(cur.at > r.at)) ackOverride[r.helper] = { answer: r.answer, reason: r.reason, at: r.at, remote: true } }
    if (r.type === 'step' && r.personCode) {
      const cur = events[r.personCode]
      if (cur?.step === 'handedToFire') continue
      if (!cur || !(cur.at > r.at)) events[r.personCode] = { step: r.step, reason: r.reason, memo: r.memo, ...(r.care ? { care: r.care } : {}), at: r.at, remote: true }
    }
  }
  return { ackOverride, events }
}

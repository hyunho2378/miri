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

// send(item) 가 true 를 돌려주면 성공으로 보고 지운다. 실패(오류, false)면 남겨 두고 멈춘다(순서 유지)
export async function flush(scope, send, storage = defaultStorage()) {
  const q = readQueue(scope, storage)
  let sent = 0
  while (q.length) {
    let ok = false
    try { ok = await send(q[0]) } catch { ok = false }
    if (!ok) break
    q.shift(); sent += 1
    writeQueue(scope, q, storage)
  }
  return { sent, left: q.length }
}

// 서버 보고 목록을 발령 상태(ackOverride, events)에 합친다. 같은 대상의 보고는 나중 것이 이긴다
export function mergeReports(state, reports = []) {
  const ackOverride = { ...state.ackOverride }
  const events = { ...state.events }
  const sorted = [...reports].filter(Boolean).sort((a, b) => (a.at || 0) - (b.at || 0))
  for (const r of sorted) {
    if (r.type === 'ack' && r.helper) ackOverride[r.helper] = { answer: r.answer, reason: r.reason, at: r.at, remote: true }
    if (r.type === 'step' && r.personCode) {
      const cur = events[r.personCode]
      if (cur?.step === 'handedToFire') continue
      if (!cur || !(cur.at > r.at)) events[r.personCode] = { step: r.step, reason: r.reason, memo: r.memo, ...(r.care ? { care: r.care } : {}), at: r.at, remote: true }
    }
  }
  return { ackOverride, events }
}

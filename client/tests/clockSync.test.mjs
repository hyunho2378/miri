// node tests/clockSync.test.mjs 실서버 확인(2026. 10. 21.): 다른 화면이 같은 발령을 저장해 순번이 앞서면 콘솔의 배속 변경이 서버에 남지 않던 문제
import assert from 'node:assert/strict'
const g = globalThis
// 자동 저장 구독이 등록되도록 브라우저 전역을 먼저 둔다
g.window = { location: { pathname: '/console/dispatch' } }
g.localStorage = g.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} }
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const T0 = Date.UTC(2026, 9, 21, 5, 0)

await ok('S4 복원과 주기 조회 반영은 자동 저장을 걸지 않고, 순번 충돌(STALE)이면 서버 순번을 받아 한 번 다시 저장한다', async () => {
  const realFetch = globalThis.fetch; const realNow = Date.now
  let serverRev = 5; const saves = []
  const snap = { status: 'sent', kind: 'drill', speed: 60, realStart: T0, vStart: T0, issuedAt: T0, arrivals: {}, result: { assignments: [], unassigned: [] }, events: {}, ackOverride: {}, handovers: {}, fireRequests: [] }
  g.fetch = async (url, init = {}) => {
    const u = String(url)
    const body = init.body ? JSON.parse(init.body) : null
    const res = (status, j) => ({ ok: status < 300, status, json: async () => j })
    if (/action=state/.test(u) && (!init.method || init.method === 'GET')) return res(200, { dispatchId: 'Dtest', rev: serverRev, state: snap, reports: [] })
    if (body && body.rev != null) {
      saves.push(body.rev)
      if (body.rev <= serverRev) return res(409, { error: { code: 'STALE', message: 'stale' } })
      serverRev = body.rev; return res(200, { dispatchId: 'Dtest', tokens: {} })
    }
    return res(200, {})
  }
  try {
    const { useDispatchStore } = await import('../src/store/useDispatchStore.js')
    useDispatchStore.setState({ status: 'idle' })
    assert.equal(await useDispatchStore.getState().restoreRemote(), true)
    await new Promise((r) => setTimeout(r, 1700))
    assert.equal(saves.length, 0, '복원 직후 자동 저장 없음')
    // 복원 뒤 이 화면에서 배속을 바꾸면 자동 저장이 걸린다
    useDispatchStore.getState().setSpeed(1)
    await new Promise((r) => setTimeout(r, 1700))
    assert.deepEqual(saves, [6], '배속 변경은 자동 저장됨')
    saves.length = 0
    serverRev = 9 // 다른 화면이 먼저 저장해 순번이 앞섬
    const r = await useDispatchStore.getState().syncSave()
    assert.ok(r, 'STALE 뒤 재시도로 저장 성공')
    assert.deepEqual(saves, [7, 10])
  } finally { g.fetch = realFetch; Date.now = realNow }
})

console.log(`\n${n}개 시험 통과`)

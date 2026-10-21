// node tests/consentRestore.test.mjs 도우미 참여 동의와 철회는 발령과 별도 수명으로 서버에 남고,
// 종료 직전 접수된 철회를 잃지 않으며, 늦게 도착한 옛 응답이 최신 동의를 되돌리지 못해야 한다
import assert from 'node:assert/strict'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
const g = globalThis
g.window = { location: { pathname: '/console/roster' } }
g.localStorage = g.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} }
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const T0 = Date.UTC(2026, 9, 21, 5, 0)

const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
const { default: handler, parsePrefs } = await import('../api/dispatch.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')
const { useMiriStore } = await import('../src/store/useMiriStore.js')
const { useDispatchStore, applyPrefs } = await import('../src/store/useDispatchStore.js')
const { crewEligible } = await import('../src/lib/assign.js')

const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const call = async (req) => { const res = mkRes(); await handler({ headers: { host: 'miri.test', ...(req.headers || {}) }, ...req }, res); return res }
const sent = { status: 'sent', kind: 'drill', speed: 60, realStart: T0, vStart: T0, issuedAt: T0, arrivals: {}, result: { assignments: [], unassigned: [] }, events: {}, ackOverride: {}, handovers: [], fireRequests: [] }
const helperOf = (code) => useMiriStore.getState().helpers.find((h) => h.code === code)
const seedHelpers = useMiriStore.getState().helpers.map((h) => ({ ...h }))
const resetRoster = () => useMiriStore.setState({ helpers: seedHelpers.map((h) => ({ ...h })) }) // 새로고침과 같은 시드 명부 재초기화
const [A, B] = useMiriStore.getState().helpers.filter((h) => crewEligible(h)).map((h) => h.code)

// 서버(api/dispatch)를 가짜 저장소 위에서 그대로 부르는 fetch. 화면 store 의 loadRemote, clearRemote 가 이 경로를 탄다
async function server(dispatchId = 'Dconsent01') {
  const store = fakeRedis()
  setStoreForTest(store)
  const cookie = `${COOKIE}=${issueToken()}`
  const saved = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId, rev: 1, briefs: { [A]: { personCodes: ['P-1'] }, [B]: { personCodes: ['P-2'] } } } })
  assert.equal(saved.code, 200)
  const report = (h, body) => call({ method: 'POST', query: { action: 'report', t: saved.body.tokens[h] }, body })
  const fetch = async (url, init = {}) => {
    const u = new URL(String(url), 'http://miri.test')
    const res = await call({ method: init.method || 'GET', query: Object.fromEntries(u.searchParams), headers: { cookie }, body: init.body })
    return { ok: res.code < 300, status: res.code, json: async () => res.body }
  }
  return { store, cookie, report, fetch, dispatchId }
}
const pref = (key, consent, roles, at) => ({ key, type: 'preference', consent, roles, at })

await ok('후보 도우미 두 명이 시드에 있다', async () => { assert.ok(A && B) })

await ok('서버: 동의 보고는 발령 보고와 같은 원자 실행에서 동의 상태(순번 포함)로도 남는다', async () => {
  const s = await server()
  assert.equal((await s.report(A, pref('kpref00001', false, [], T0 + 1))).code, 200)
  assert.equal((await s.report(A, pref('kpref00002', true, ['ride'], T0 + 2))).code, 200)
  const st = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie: s.cookie } })
  assert.deepEqual(st.body.prefs[A].roles, ['ride'])
  assert.equal(st.body.prefs[A].consent, true)
  assert.equal(st.body.prefs[A].seq, 2, '서버 접수 순번')
})

await ok('재현 1: 종료 직전 철회. 주기 조회 없이 종료해도 철회가 서버에 남고, 종료 뒤 받아 명부에 반영된다', async () => {
  resetRoster()
  const s = await server('Dconsent02')
  const realFetch = g.fetch
  g.fetch = s.fetch
  try {
    useDispatchStore.setState({ status: 'sent', kind: 'drill', remote: { state: 'saved', dispatchId: s.dispatchId, rev: 1 }, realStart: T0, vStart: T0, speed: 1, result: { assignments: [], unassigned: [] }, events: {}, scopeCodes: [] })
    assert.equal((await s.report(A, pref('kpref00010', false, [], T0 + 5))).code, 200) // 마지막 주기 조회 뒤 접수
    useDispatchStore.getState().close()
    await new Promise((r) => setTimeout(r, 30))
    assert.ok(s.store.kv.has(`miri:dsp:c:${s.dispatchId}`), '종료 표시')
    assert.equal(s.store.lists.has(`miri:dsp:r:${s.dispatchId}`), false, '발령 보고는 삭제')
    assert.equal(helperOf(A).consent, false, '종료 뒤 철회 반영')
    assert.equal(crewEligible(helperOf(A)), false, '다음 발령 후보 제외')
  } finally { g.fetch = realFetch }
})

await ok('재현 1b: 종료 뒤 새로고침(시드 명부 재초기화)해도 서버의 철회를 복원한다', async () => {
  const s = await server('Dconsent03')
  assert.equal((await s.report(B, pref('kpref00020', false, [], T0 + 6))).code, 200)
  assert.equal((await call({ method: 'DELETE', query: { dispatchId: s.dispatchId }, headers: { cookie: s.cookie } })).code, 200)
  resetRoster()
  assert.notEqual(helperOf(B).consent, false, '재초기화 직후에는 시드 값')
  const realFetch = g.fetch
  g.fetch = s.fetch
  try {
    useDispatchStore.setState({ status: 'idle' })
    assert.equal(await useDispatchStore.getState().restoreRemote(), false, '진행 중 발령은 없음')
    assert.equal(helperOf(B).consent, false, '발령 없이도 철회 복원')
  } finally { g.fetch = realFetch }
})

await ok('재현 2: 종료와 보고가 겹쳐도 유실 없음. 종료 전에 접수된 철회는 남고, 종료 뒤 보고는 거부된다', async () => {
  const s = await server('Dconsent04')
  let release; const hold = new Promise((r) => { release = r })
  let reached; const atLua = new Promise((r) => { reached = r })
  s.store.fail.beforeAppend = async () => { reached(); await hold }
  const pending = s.report(A, pref('kpref00030', false, [], T0 + 7))
  await atLua
  s.store.fail.beforeAppend = null
  assert.equal((await call({ method: 'DELETE', query: { dispatchId: s.dispatchId }, headers: { cookie: s.cookie } })).code, 200)
  release()
  const late = await pending
  assert.equal(late.code, 404, '종료 뒤 도착한 보고는 거부(휴대폰에 거부로 표시)')
  // 종료 전에 접수된 보고는 남는다
  const s2 = await server('Dconsent05')
  assert.equal((await s2.report(A, pref('kpref00031', false, [], T0 + 8))).code, 200)
  assert.equal((await call({ method: 'DELETE', query: { dispatchId: s2.dispatchId }, headers: { cookie: s2.cookie } })).code, 200)
  const st = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie: s2.cookie } })
  assert.equal(st.body.state, null)
  assert.equal(st.body.prefs[A].consent, false, '종료 뒤에도 동의 상태 보존')
})

await ok('재현 2b: 종료 요청 저장소 오류는 성공으로 돌려주지 않는다(화면이 다시 시도)', async () => {
  const s = await server('Dconsent06')
  s.store.fail.close = true
  const del = await call({ method: 'DELETE', query: { dispatchId: s.dispatchId }, headers: { cookie: s.cookie } })
  assert.equal(del.code, 503)
})

await ok('재현 3: 순서가 뒤바뀐 응답 두 개. 최신(순번 큼)을 먼저 반영한 뒤 옛 응답이 와도 되돌리지 않는다', async () => {
  resetRoster()
  const newer = { [A]: { consent: true, roles: ['ride'], at: T0 + 200, seq: 7 } }
  const older = { [A]: { consent: false, roles: [], at: T0 + 100, seq: 6 } }
  assert.equal(applyPrefs(newer), 1)
  assert.equal(applyPrefs(older), 0, '옛 응답 무시')
  assert.equal(helperOf(A).consent, true)
  assert.deepEqual(helperOf(A).roles, ['ride'])
  assert.equal(applyPrefs(newer), 0, '같은 순번은 다시 적용하지 않음')
})

await ok('parsePrefs: 형식이 맞지 않는 값은 버린다', async () => {
  const out = parsePrefs({ [A]: '3|{"consent":false,"roles":[],"at":5}', X: 'bad', Y: '0|{"consent":true,"roles":["ride"]}', Z: '4|{"consent":true,"roles":["nope"]}' })
  assert.deepEqual(Object.keys(out), [A])
  assert.equal(out[A].seq, 3)
})

console.log(`\n${n}개 시험 통과`)
process.exit(0)

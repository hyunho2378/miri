// node tests/ncpStore.test.mjs  네이버 클라우드 이전 준비: 표준 Redis 어댑터와 독립 서버가 Vercel(Upstash)과 같게 동작해야 한다.
// 실제 Redis 서버 대신 ioredis-mock(Lua 실행 포함)으로 표준 Redis 경로를 돌린다
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
process.env.MIRI_ACCESS_LOG = '0'
const g = globalThis
g.window = { location: { pathname: '/console/roster' } }
g.localStorage = g.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} }
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }

const require = createRequire(import.meta.url)
const Mock = require('ioredis-mock')
const S = await import('../api/_store.js')
const { StandardStore, storeKind, parseValue } = S
const mockStore = () => new StandardStore({}, new Mock())

await ok('저장소 고르기: REDIS_URL 이 있으면 표준 Redis, Upstash 만 있으면 Upstash, 강제 지정 우선', async () => {
  assert.equal(storeKind({}), null)
  assert.equal(storeKind({ REDIS_URL: 'redis://x' }), 'redis')
  assert.equal(storeKind({ UPSTASH_REDIS_REST_URL: 'https://u', UPSTASH_REDIS_REST_TOKEN: 't' }), 'upstash')
  assert.equal(storeKind({ REDIS_URL: 'redis://x', UPSTASH_REDIS_REST_URL: 'https://u', UPSTASH_REDIS_REST_TOKEN: 't', MIRI_STORE: 'upstash' }), 'upstash')
  assert.equal(storeKind({ MIRI_STORE: 'redis' }), null, '강제 지정해도 주소가 없으면 저장소 없음')
})

await ok('값 해석이 Upstash 와 같다: JSON 은 해석, 큰 정수와 일반 문자열은 문자열', async () => {
  assert.equal(parseValue('12'), 12)
  assert.equal(parseValue('12345678901234567890'), '12345678901234567890')
  assert.equal(parseValue('D20261024ab'), 'D20261024ab')
  assert.deepEqual(parseValue('{"a":[1,2]}'), { a: [1, 2] })
  assert.deepEqual(parseValue(['1', 'x', '{"b":true}']), [1, 'x', { b: true }])
})

await ok('표준 Redis 명령: set NX EX, get 객체 왕복, mget, incr, rpush와 lrange, hgetall 빈 해시 null, del', async () => {
  const r = mockStore()
  assert.equal(await r.set('k1', { kind: 'doc', n: 1 }), 'OK')
  assert.deepEqual(await r.get('k1'), { kind: 'doc', n: 1 })
  assert.equal(await r.set('k1', 'x', { nx: true }), null, 'NX 실패는 null')
  assert.equal(await r.set('k2', 0, { nx: true, ex: 60 }), 'OK')
  assert.ok((await r.ttl('k2')) > 0)
  assert.equal(await r.incr('k2'), 1)
  assert.deepEqual(await r.mget('k1', 'none'), [{ kind: 'doc', n: 1 }, null])
  assert.equal(await r.rpush('L', JSON.stringify({ a: 1 }), 'plain'), 2)
  assert.deepEqual(await r.lrange('L', 0, -1), [{ a: 1 }, 'plain'])
  assert.equal(await r.hgetall('H'), null)
  assert.equal(await r.del('k1', 'k2', 'L'), 3)
  assert.equal(await r.get('k1'), null)
})

// 발령 저장, 조회, 도우미 보고(중복 포함), 종료가 표준 Redis 위에서 Lua 스크립트 그대로 동작
const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
const { default: dispatch } = await import('../api/dispatch.js')
const { useMiriStore } = await import('../src/store/useMiriStore.js')
const { crewEligible } = await import('../src/lib/assign.js')
const [A] = useMiriStore.getState().helpers.filter((h) => crewEligible(h)).map((h) => h.code)
const T0 = Date.UTC(2026, 9, 24, 5, 0)
const sent = { status: 'sent', kind: 'drill', speed: 60, realStart: T0, vStart: T0, issuedAt: T0, arrivals: {}, result: { assignments: [], unassigned: [] }, events: {}, ackOverride: {}, handovers: [], fireRequests: [] }
const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const call = async (req) => { const res = mkRes(); await dispatch({ ...req, headers: { host: 'miri.test', origin: 'https://miri.test', ...(req.headers || {}) } }, res); return res }

await ok('발령 흐름(저장, 조회, 보고, 중복 보고, 종료)이 표준 Redis 어댑터에서 Upstash 와 같은 결과', async () => {
  setStoreForTest(mockStore())
  const cookie = `${COOKIE}=${issueToken()}`
  const saved = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId: 'Dncp000001', rev: 1, briefs: { [A]: { personCodes: ['P-1'] } } } })
  assert.equal(saved.code, 200, JSON.stringify(saved.body))
  assert.equal(saved.body.rev, 1)
  const stale = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId: 'Dncp000001', rev: 1, briefs: {} } })
  assert.equal(stale.code, 409, '같은 판 번호 재저장은 거부')
  const st = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
  assert.equal(st.code, 200)
  assert.equal(st.body.state.status, 'sent')
  assert.equal(st.body.rev, 1)
  const body = { key: 'kncp000001', type: 'preference', consent: true, roles: ['ride'], at: T0 + 1 }
  const r1 = await call({ method: 'POST', query: { action: 'report', t: saved.body.tokens[A] }, body })
  assert.equal(r1.code, 200); assert.equal(r1.body.duplicate, false)
  const r2 = await call({ method: 'POST', query: { action: 'report', t: saved.body.tokens[A] }, body })
  assert.equal(r2.code, 200); assert.equal(r2.body.duplicate, true)
  const st2 = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
  assert.equal(st2.body.prefs[A].consent, true)
  assert.equal(st2.body.prefs[A].seq, 1)
  const del = await call({ method: 'DELETE', query: {}, headers: { cookie } })
  assert.equal(del.code, 200)
  const st3 = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
  assert.equal(st3.body.state, null)
  const late = await call({ method: 'POST', query: { action: 'report', t: saved.body.tokens[A] }, body: { ...body, key: 'kncp000002' } })
  assert.notEqual(late.code, 200, '종료 뒤 보고는 받지 않음')
  setStoreForTest(null)
})

// 독립 서버(server/index.mjs): 같은 핸들러를 /api/<이름> 으로 열고, 상태 확인과 쿠키 세션, 발령 저장이 동작
await ok('독립 서버: 상태 확인, 시연 코드 세션, 발령 저장과 조회, 없는 주소와 공용 파일 차단', async () => {
  StandardStore.IORedis = class extends Mock { constructor(a, b) { super(typeof a === 'object' ? a : b) } }
  process.env.MIRI_STORE = 'redis'
  process.env.REDIS_URL = 'redis://mock'
  process.env.MIRI_RUNTIME = 'ncp-test'
  const { createApiServer } = await import('../../server/index.mjs')
  const server = createApiServer()
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const H = { origin: base, 'content-type': 'application/json' }
  try {
    const h = await fetch(`${base}/api/health`).then((x) => x.json())
    assert.equal(h.ok, true); assert.equal(h.runtime, 'ncp-test'); assert.equal(h.store.kind, 'redis'); assert.equal(h.store.ok, true)
    assert.equal((await fetch(`${base}/api/_guard`)).status, 404)
    assert.equal((await fetch(`${base}/api/..%2Fsrc`)).status, 404)
    assert.equal((await fetch(`${base}/nothing`)).status, 404)
    const bad = await fetch(`${base}/api/session`, { method: 'POST', headers: H, body: JSON.stringify({ code: 'wrong' }) })
    assert.equal(bad.status, 401)
    const login = await fetch(`${base}/api/session`, { method: 'POST', headers: H, body: JSON.stringify({ code: 'demo-code' }) })
    assert.equal(login.status, 200)
    const cookie = String(login.headers.get('set-cookie') || '').split(';')[0]
    assert.ok(cookie.startsWith(`${COOKIE}=`))
    const saved = await fetch(`${base}/api/dispatch?action=save`, { method: 'POST', headers: { ...H, cookie }, body: JSON.stringify({ state: sent, dispatchId: 'Dncp000002', rev: 1, briefs: { [A]: { personCodes: ['P-1'] } } }) })
    assert.equal(saved.status, 200)
    const st = await fetch(`${base}/api/dispatch?action=state`, { headers: { cookie } }).then((x) => x.json())
    assert.equal(st.state.status, 'sent')
    const cross = await fetch(`${base}/api/dispatch?action=save`, { method: 'POST', headers: { ...H, origin: 'https://evil.example', cookie }, body: '{}' })
    assert.equal(cross.status, 403, '다른 사이트 요청 차단 유지')
    const closed = await fetch(`${base}/api/dispatch`, { method: 'DELETE', headers: { origin: base, cookie } })
    assert.equal(closed.status, 200)
  } finally {
    await new Promise((r) => server.close(r))
    await S.closeStore()
  }
})

console.log(`ncpStore: ${n}개 통과`)

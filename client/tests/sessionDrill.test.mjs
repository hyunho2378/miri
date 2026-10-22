// node tests/sessionDrill.test.mjs 휴대폰 현장 화면 시연 로그인 뒤 서버 발령 조회
// 시연 계정을 고른 브라우저는 코드 없이 훈련 발령 전용 세션(drill)을 받아 콘솔과 같은 서버 발령을 본다.
// drill 세션은 발령 저장만 열고 AI 판독과 문서함은 시연 코드 세션(full)에서만 연다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }

const { setStoreForTest, issueToken, verifyToken, COOKIE, guard } = await import('../api/_guard.js')
const { default: dispatch } = await import('../api/dispatch.js')
const { default: session } = await import('../api/session.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')
const { ensureDemoSession, resetDemoSessionForTest } = await import('../src/lib/demoSession.js')
const { scopeDispatch } = await import('../src/mobile/field/fieldModel.js')

const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const run = async (h, req) => { const res = mkRes(); await h({ ...req, headers: { host: 'miri.test', origin: 'https://miri.test', ...(req.headers || {}) } }, res); return res }
const cookieOf = (res) => { const m = /miri_s=([^;]*)/.exec(String(res.headers['Set-Cookie'] || '')); return m ? m[1] : null }
const withCookie = (t) => ({ cookie: `${COOKIE}=${t}` })

setStoreForTest(fakeRedis())

await ok('세션 없이 발령 조회는 401 NEED_SESSION(시연 코드 입력 칸을 가리키지 않음)', async () => {
  const res = await run(dispatch, { method: 'GET', query: { action: 'state' } })
  assert.equal(res.code, 401)
  assert.equal(res.body.error.code, 'NEED_SESSION')
  assert.ok(!/로그인 화면에서 시연 코드를 입력/.test(res.body.error.message) || /콘솔/.test(res.body.error.message))
})

let drill = null
await ok('코드 없이 POST { demo: drill } 는 훈련 전용 쿠키 발급', async () => {
  const res = await run(session, { method: 'POST', body: { demo: 'drill' } })
  assert.equal(res.code, 200)
  assert.equal(res.body.drill, true)
  assert.equal(res.body.active, false)
  drill = cookieOf(res)
  assert.ok(drill)
  assert.equal(verifyToken(drill).scope, 'drill')
  assert.match(String(res.headers['Set-Cookie']), /HttpOnly; Secure; SameSite=Strict/)
})

await ok('휴대폰 로그인 뒤(drill 쿠키) 발령 조회는 200', async () => {
  const res = await run(dispatch, { method: 'GET', query: { action: 'state' }, headers: withCookie(drill) })
  assert.equal(res.code, 200)
  assert.equal(res.body.state, null)
})

await ok('같은 브라우저(같은 쿠키): 콘솔이 저장한 훈련 발령을 휴대폰이 조회', async () => {
  const state = { status: 'sent', kind: 'drill', result: null, events: {} }
  const save = await run(dispatch, { method: 'POST', query: { action: 'save' }, headers: withCookie(drill), body: { dispatchId: 'Dtest0001', rev: 1, state, briefs: {} } })
  assert.equal(save.code, 200)
  const res = await run(dispatch, { method: 'GET', query: { action: 'state' }, headers: withCookie(drill) })
  assert.equal(res.code, 200)
  assert.equal(res.body.dispatchId, 'Dtest0001')
  assert.equal(res.body.state.status, 'sent')
})

await ok('다른 브라우저(다른 drill 세션)는 남의 발령을 보지 못함', async () => {
  const other = issueToken(Date.now(), 'drill')
  const res = await run(dispatch, { method: 'GET', query: { action: 'state' }, headers: withCookie(other) })
  assert.equal(res.code, 200)
  assert.equal(res.body.state, null)
})

await ok('drill 세션은 AI 판독과 문서함에 쓰지 못함(401)', async () => {
  for (const opts of [{ requireSession: true }, { requireSession: true, allowDrill: true, ai: 'intake' }]) {
    const res = mkRes()
    const pass = await guard({ headers: { host: 'miri.test', origin: 'https://miri.test', ...withCookie(drill) } }, res, opts)
    assert.equal(pass, false)
    assert.equal(res.code, 401)
  }
  const full = mkRes()
  assert.equal(await guard({ headers: { host: 'miri.test', origin: 'https://miri.test', ...withCookie(issueToken()) } }, full, { requireSession: true }), true)
})

await ok('범위 표시는 서명 안: drill 토큰의 nonce 를 바꾸면 무효', async () => {
  const [exp, nonce, mac] = drill.split('.')
  assert.equal(verifyToken(`${exp}.${nonce.replace('drill-', 'xxxxx-')}.${mac}`), null)
})

await ok('이미 시연 코드 세션(full)이 있으면 drill 요청이 낮추지 않음', async () => {
  const res = await run(session, { method: 'POST', body: { demo: 'drill' }, headers: withCookie(issueToken()) })
  assert.equal(res.code, 200)
  assert.equal(res.body.active, true)
  assert.equal(res.headers['Set-Cookie'], undefined)
})

await ok('GET /api/session: drill 은 active 가 아님(콘솔의 코드 확인 표시와 구분)', async () => {
  const res = await run(session, { method: 'GET', headers: withCookie(drill) })
  assert.deepEqual([res.body.active, res.body.drill], [false, true])
})

await ok('drill 세션 저장은 분당 60회까지', async () => {
  const t = issueToken(Date.now(), 'drill')
  let last = 0
  for (let i = 1; i <= 61; i += 1) {
    const res = await run(dispatch, { method: 'POST', query: { action: 'save' }, headers: withCookie(t), body: { dispatchId: 'Drate0001', rev: i, state: { kind: 'drill' }, briefs: {} } })
    last = res.code
  }
  assert.equal(last, 429)
})

await ok('화면: ensureDemoSession 은 세션이 없을 때만 drill 을 요청', async () => {
  const calls = []
  const fake = async (url, o = {}) => {
    calls.push(o.method || 'GET')
    if (!o.method) return { ok: true, json: async () => ({ active: false, drill: false, configured: true }) }
    return { ok: true, json: async () => ({ drill: true }) }
  }
  resetDemoSessionForTest()
  assert.equal(await ensureDemoSession(fake), true)
  assert.deepEqual(calls, ['GET', 'POST'])
  resetDemoSessionForTest()
  const calls2 = []
  assert.equal(await ensureDemoSession(async (u, o = {}) => { calls2.push(o.method || 'GET'); return { ok: true, json: async () => ({ active: true }) } }), true)
  assert.deepEqual(calls2, ['GET'])
})

await ok('화면 연결: 401 이면 세션을 받아 한 번 다시 보냄, 로그인 고를 때 세션 요청', async () => {
  const sync = readFileSync(new URL('../src/lib/dispatchSync.js', import.meta.url), 'utf8')
  assert.match(sync, /r\.status === 401 && j\?\.error\?\.code === 'NEED_SESSION'\) \|\| roleMismatch\) && !retried/)
  const auth = readFileSync(new URL('../src/store/useAuthStore.js', import.meta.url), 'utf8')
  assert.match(auth, /setSessionRecover\(\(\) => \{ forgetDemoRole\(\); return ensureDemoSession\(undefined, whoOf\(/)
  assert.match(auth, /setRoleAlign\(\(\) => ensureDemoSession\(undefined, whoOf\(/)
  assert.match(auth, /setDemoUser: .*ensureDemoSession\(undefined, whoOf\(DEMO_USERS\[role\]\)\)/)
  const fs = readFileSync(new URL('../src/mobile/field/FieldScreens.jsx', import.meta.url), 'utf8')
  assert.ok(!fs.includes('서버 저장은 콘솔 로그인 뒤'))
  assert.match(fs, /title="다시 로그인"/)
})

await ok('동 담당자 범위는 그대로(서버 발령을 받아도 화면에서 자기 동만)', async () => {
  const persons = [{ code: 'P1', villageCode: 'A1' }, { code: 'P2', villageCode: 'B1' }]
  const d = { status: 'sent', kind: 'drill', arrivals: { A1: 1, B1: 2 }, events: {}, ackOverride: {}, ackPlan: {}, failPlan: {}, smsLog: [],
    result: { assignments: [{ vehicleCode: 'V-1', helperCodes: ['H-1'], trips: [{ village: 'A1', personCodes: ['P1'] }] }, { vehicleCode: 'V-2', helperCodes: ['H-2'], trips: [{ village: 'B1', personCodes: ['P2'] }] }], unassigned: [] } }
  const sc = scopeDispatch(d, persons, new Set(['A1']))
  assert.deepEqual(sc.persons.map((p) => p.code), ['P1'])
})

setStoreForTest(null)
console.log(`sessionDrill ${n}개 통과`)

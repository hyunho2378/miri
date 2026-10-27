// backendHarden.test.mjs 점검(공모전/점검/백엔드_크리틱_20261022.md, 코드점검_20261022.md) 반영 시험
import assert from 'node:assert/strict'
import { test } from 'node:test'
process.env.MIRI_DEMO_CODE = 'test-code-1234'
process.env.MIRI_SESSION_SECRET = 'x'.repeat(32)
process.env.MIRI_ACCESS_LOG = '0'
const G = await import('../api/_guard.js')
const { default: dispatch, cleanBrief, cleanReport, prefTtlOf } = await import('../api/dispatch.js')
const { default: session } = await import('../api/session.js')
const { scopeState, scopeReports } = await import('../api/_scope.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')

const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; r.send = (b) => { r.body = b; return r }; return r }
const H = { host: 'miri.test', origin: 'https://miri.test' }
const run = async (h, req) => { const res = mkRes(); await h({ ...req, headers: { ...H, ...(req.headers || {}) } }, res); return res }
const cookieOf = (res) => /miri_s=([^;]*)/.exec(String(res.headers['Set-Cookie'] || ''))?.[1]

test('토큰: 역할과 동 코드가 서명 안에 담기고 바꾸면 무효', () => {
  const t = G.issueToken(Date.now(), 'drill', { role: 'dong', dong: 'MS' })
  const v = G.verifyToken(t)
  assert.equal(v.scope, 'drill'); assert.equal(v.role, 'dong'); assert.equal(v.dong, 'MS')
  const forged = t.replace('dong:MS', 'city')
  assert.equal(G.verifyToken(forged), null)
  const city = G.verifyToken(G.issueToken())
  assert.equal(city.role, 'city'); assert.equal(city.scope, 'full')
})

test('세션: 같은 브라우저에서 역할을 바꾸면 세션 번호는 그대로', async () => {
  G.setStoreForTest(fakeRedis())
  const a = await run(session, { method: 'POST', body: { demo: 'drill', role: 'city' }, headers: { 'x-real-ip': '7.7.7.1' } })
  const ca = cookieOf(a)
  const b = await run(session, { method: 'POST', body: { demo: 'drill', role: 'dong', dong: 'MS' }, headers: { cookie: `miri_s=${ca}`, 'x-real-ip': '7.7.7.1' } })
  const cb = cookieOf(b)
  assert.equal(G.verifyToken(ca).id, G.verifyToken(cb).id)
  assert.equal(G.verifyToken(cb).role, 'dong')
  const bad = await run(session, { method: 'POST', body: { demo: 'drill', role: 'dong', dong: 'ms;x' }, headers: { 'x-real-ip': '7.7.7.2' } })
  assert.equal(bad.code, 400)
})

test('발령 조회: 동 담당자 세션은 서버가 담당 동만 돌려주고 저장과 종료는 403', async () => {
  G.setStoreForTest(fakeRedis())
  const nonce = 'drill-abc123abc123abc123'
  const city = G.issueToken(Date.now(), 'drill', { nonce, role: 'city' })
  const dong = G.issueToken(Date.now(), 'drill', { nonce, role: 'dong', dong: 'MS' })
  const state = { status: 'sent', kind: 'drill', result: { assignments: [{ vehicleCode: 'V-1', helperCodes: ['H-001'], trips: [{ village: 'MS-04', personCodes: ['MS-04-001'] }] }, { vehicleCode: 'V-2', helperCodes: ['H-002'], trips: [{ village: 'BH-01', personCodes: ['BH-01-001'] }] }], unassigned: [{ personCode: 'MS-01-001' }, { personCode: 'BH-01-009' }] }, arrivals: { 'MS-04': 1, 'BH-01': 2 } }
  const save = await run(dispatch, { method: 'POST', query: { action: 'save' }, headers: { cookie: `miri_s=${city}` }, body: { dispatchId: 'Dbh0001', rev: 1, state, briefs: { 'H-001': { personCodes: ['MS-04-001'] } } } })
  assert.equal(save.code, 200)
  const r = await run(dispatch, { method: 'GET', query: { action: 'state' }, headers: { cookie: `miri_s=${dong}` } })
  assert.equal(r.code, 200)
  assert.deepEqual(r.body.state.result.assignments.map((a) => a.vehicleCode), ['V-1'])
  assert.deepEqual(r.body.state.result.unassigned.map((u) => u.personCode), ['MS-01-001'])
  assert.deepEqual(Object.keys(r.body.state.arrivals), ['MS-04'])
  const w = await run(dispatch, { method: 'POST', query: { action: 'save' }, headers: { cookie: `miri_s=${dong}` }, body: { dispatchId: 'Dbh0001', rev: 2, state, briefs: {} } })
  assert.equal(w.code, 403); assert.equal(w.body.error.code, 'ROLE_READONLY')
  const c = await run(dispatch, { method: 'GET', query: { action: 'state' }, headers: { cookie: `miri_s=${city}` } })
  assert.equal(c.body.state.result.assignments.length, 2)
})

test('범위 함수: 보고는 담당 동 대상자와 도우미만', () => {
  const st = { result: { assignments: [{ helperCodes: ['H-1'], trips: [{ village: 'MS-01' }] }, { helperCodes: ['H-2'], trips: [{ village: 'BH-01' }] }] } }
  const reps = [{ personCode: 'MS-01-001' }, { personCode: 'BH-01-001' }, { helper: 'H-1', type: 'ack' }, { helper: 'H-2', type: 'ack' }]
  assert.equal(scopeReports(reps, st, 'MS').length, 2)
  assert.equal(scopeState(null, 'MS'), null)
})

test('문서 도구: 출처 없으면 403, IP 분당 상한 넘으면 429', async () => {
  G.setStoreForTest(fakeRedis())
  const res = mkRes()
  assert.equal(await G.toolGuard({ method: 'POST', headers: { host: 'miri.test' } }, res, 'parse'), false)
  assert.equal(res.code, 403)
  let last
  for (let i = 0; i <= G.TOOL_LIMITS.parse.ip; i += 1) { last = mkRes(); await G.toolGuard({ method: 'POST', headers: { ...H, 'x-real-ip': '8.8.8.8' } }, last, 'parse') }
  assert.equal(last.code, 429)
  for (const name of ['parse', 'hwpx', 'lint', 'law']) {
    const { default: h } = await import(`../api/${name}.js`)
    const r2 = await run(h, { method: 'POST', headers: { origin: 'https://evil.example', 'x-real-ip': '9.0.0.1' }, body: {} })
    assert.equal(r2.code, 403, name)
  }
})

test('계수: 만료 시각을 먼저 붙인 뒤 올림(SET NX EX 다음 INCR)', async () => {
  const calls = []
  const store = { async set(k, v, o) { calls.push(['set', o]); return 'OK' }, async incr() { calls.push(['incr']); return 2 }, async expire() { calls.push(['expire']); return 1 } }
  G.setStoreForTest(store)
  assert.equal(await G.incr('x', 60), 2)
  assert.deepEqual(calls[0], ['set', { nx: true, ex: 60 }])
  assert.equal(calls[1][0], 'incr')
  G.setStoreForTest(null)
})

test('도우미 배정 요약: 허용 칸만, 전화번호와 도로명 주소는 가림', () => {
  const b = cleanBrief({ disaster: '산불', villages: ['괴란동'], meetVillage: '괴란동', name: '홍길동', address: '동해시 괴란길 50', officerContact: '010-1234-5678', trips: [{ index: 1, village: '괴란동 괴란길 50', personCodes: ['MS-04-001', 'bad code!'] }], personCodes: ['MS-04-001'] })
  assert.equal(b.name, undefined); assert.equal(b.address, undefined)
  assert.ok(!/010-1234-5678/.test(b.officerContact))
  assert.ok(!/괴란길 50/.test(b.trips[0].village))
  assert.deepEqual(b.trips[0].personCodes, ['MS-04-001'])
})

test('보고 시각: 12시간 밖이나 미래 값은 서버 시각, 받은 시각을 따로 남김', () => {
  const now = Date.now()
  const r1 = cleanReport({ key: 'kkkkkkk01', type: 'ack', answer: 'accept', at: 5 }, null, 'H-1')
  assert.ok(Math.abs(r1.at - now) < 5000); assert.ok(r1.receivedAt >= now)
  const r2 = cleanReport({ key: 'kkkkkkk02', type: 'ack', answer: 'accept', at: now - 60_000 }, null, 'H-1')
  assert.equal(r2.at, now - 60_000)
})

test('동의 기록 수명: 훈련 전용 세션은 12시간, 시연 코드 세션은 30일', () => {
  assert.equal(prefTtlOf('drill-abc'), 12 * 3600)
  assert.equal(prefTtlOf('Abc123'), 30 * 24 * 3600)
})

test('출처 없는 요청: 읽기만 받고 쓰기는 막음', () => {
  assert.equal(G.sameSite({ method: 'GET', headers: { host: 'a' } }), true)
  assert.equal(G.sameSite({ method: 'POST', headers: { host: 'a' } }), false)
  assert.equal(G.sameSite({ method: 'POST', headers: { host: 'a', origin: 'https://a' } }), true)
})

test('종료: 소유 기록이 없는 발령 번호에는 종료 표시를 남기지 않음', async () => {
  const store = fakeRedis(); G.setStoreForTest(store)
  const tok = G.issueToken(Date.now(), 'drill', { role: 'city' })
  const r = await run(dispatch, { method: 'DELETE', query: { dispatchId: 'Dnotmine01' }, headers: { cookie: `miri_s=${tok}` } })
  assert.equal(r.code, 200)
  assert.equal(store.kv.has('miri:dsp:c:Dnotmine01'), false)
})

test('접근 기록: 본문과 쿼리 값, IP 는 남기지 않음', () => {
  const line = G.accessLog({ url: '/api/dispatch?action=state&t=SECRET', method: 'GET', headers: { 'x-real-ip': '1.2.3.4' }, body: { a: 1 } }, { statusCode: 200 }, Date.now())
  const s = JSON.stringify(line)
  assert.ok(!s.includes('SECRET')); assert.ok(!s.includes('1.2.3.4')); assert.equal(line.path, '/api/dispatch')
})

test('시나리오 저장 한도: 기본 시나리오는 세지 않음', async () => {
  const { buildSeed } = await import('../src/mock/seed.js')
  const seed = buildSeed()
  assert.ok(seed.scenarios.length >= 5)
  assert.ok(seed.scenarios.every((s) => s.builtin))
  const src = (await import('node:fs')).readFileSync(new URL('../src/pages/console/ShortagePage.jsx', import.meta.url), 'utf8')
  assert.match(src, /userScenarioCount\(scenarios\) >= MAX_SCENARIOS/)
})

test('기기 이름: 별칭은 정식 이름으로, 모르는 이름은 null', async () => {
  const { resolveDevice } = await import('../src/mobile/devices.js')
  assert.equal(resolveDevice('fold_in'), 'fold')
  assert.equal(resolveDevice('duo_out'), 'duo')
  assert.equal(resolveDevice('iphone18'), 'iphone')
  assert.equal(resolveDevice('galaxy'), 'galaxy')
  assert.equal(resolveDevice('nokia'), null)
})

test('문서함: 목록과 소유가 세션별 키', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../api/workspace.js', import.meta.url), 'utf8')
  assert.match(src, /KEY_INDEX = \(sid\) =>/)
  assert.match(src, /smembers\(KEY_INDEX\(sid\)\)/)
  assert.match(src, /if \(owner && owner !== sid\) return fail\(res, 403, 'OWNER'/)
})

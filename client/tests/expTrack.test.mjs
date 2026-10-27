// expTrack.test.mjs 체험 기록(열림, 봉사센터 체험 링크 ?exp=) 시험: 체험 모드면 항상 기록, 체험 아님이면 기록 0, 허용 칸 밖과 개인정보 꼴 거부, 집계
import assert from 'node:assert/strict'
import { test } from 'node:test'
process.env.MIRI_DEMO_CODE = 'test-code-1234'
process.env.MIRI_SESSION_SECRET = 'x'.repeat(32)
process.env.MIRI_ACCESS_LOG = '0'
const G = await import('../api/_guard.js')
const { default: exp } = await import('../api/exp.js')
const S = await import('../src/lib/expSchema.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')

const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; r.send = (b) => { r.body = b; return r }; return r }
const H = { host: 'miri.test', origin: 'https://miri.test' }
const run = async (req) => { const res = mkRes(); await exp({ ...req, headers: { ...H, ...(req.headers || {}) } }, res); return res }
const batch = (o = {}) => ({ id: 'abcdefghijkl0001', src: 'yeollim', dev: 'ios', wb: 's', seq: 0, ev: [{ y: 'v', s: 'start', t: 0 }, { y: 'a', k: 'start_helper', s: 'start', t: 4000 }, { y: 'v', s: 'idle', t: 4100 }], ...o })

// 브라우저 흉내: sessionStorage, 문서 이벤트, fetch 기록
function fakeBrowser(search) {
  const store = new Map(); const sent = []; const listeners = {}
  globalThis.window = { location: { search }, sessionStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) }, crypto: globalThis.crypto, innerWidth: 390, addEventListener: (t, f) => { listeners[t] = f } }
  globalThis.document = { visibilityState: 'visible', addEventListener: (t, f) => { listeners[`doc:${t}`] = f } }
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'iPhone', sendBeacon: (u, b) => { sent.push({ u, beacon: true }); return true } }, configurable: true })
  globalThis.fetch = async (u, o) => { sent.push({ u, body: o?.body }); return { ok: true } }
  return { sent, listeners }
}

test('체험 링크가 아니면 화면을 옮겨도 아무것도 보내지 않음', async () => {
  const b = fakeBrowser('')
  const T = await import('../src/lib/expTrack.js?a=1')
  T.expCapture('')
  T.expScreen('start'); T.expScreen('idle')
  assert.equal(T.flush(), false)
  assert.equal(b.sent.length, 0)
  assert.equal(T.expActive(), false)
  T._expReset()
})

test('체험 모드면 동의 화면 없이 항상 기록: 화면 키와 시각만 묶어 보내고 허용 형식을 통과', async () => {
  const b = fakeBrowser('?exp=bongsa')
  const T = await import('../src/lib/expTrack.js?a=3')
  assert.equal(T.expCapture(), 'bongsa')
  T.expScreen('start')
  T.expScreen('H1')
  assert.equal(T.expActive(), true)
  assert.equal(T.flush(), true)
  assert.equal(b.sent.length, 1)
  const body = JSON.parse(b.sent[0].body)
  assert.deepEqual(Object.keys(body).sort(), ['dev', 'ev', 'id', 'seq', 'src', 'wb'])
  assert.equal(body.src, 'bongsa'); assert.equal(body.dev, 'ios'); assert.equal(body.wb, 's')
  assert.deepEqual(body.ev.map((e) => e.s), ['start', 'H1'])
  assert.equal(S.validateBatch(body).ok, true)
  assert.match(T.EXP_NOTICE, /이름 없이 기록/)
  T._expReset()
})

test('버튼 문구는 정해진 키로만 바뀌고 모르는 문구는 other', () => {
  assert.equal(S.actionKeyOf('수락'), 'accept')
  assert.equal(S.actionKeyOf('출발 완료'), 'depart')
  assert.equal(S.actionKeyOf('확인 후 출발'), 'depart_confirm')
  assert.equal(S.actionKeyOf('불가 보내기'), 'decline_send')
  assert.equal(S.actionKeyOf('홍길동 010-1234-5678'), 'other')
  assert.equal(S.pathKeyOf('/m'), 'start')
  assert.equal(S.pathKeyOf('/m/f/villages/MS-01'), 'f.village')
  assert.equal(S.pathKeyOf('/m/h/demo'), null)
  assert.equal(S.helperKeyOf({ base: 'H3', current: 'MS-01-001', steps: { 'MS-01-001': 'depart' } }), 'H5.depart')
})

test('서버: 허용 칸 밖, 개인정보 꼴, 출처 없음, 너무 큰 묶음은 거부하고 저장하지 않음', async () => {
  const r = fakeRedis(); G.setStoreForTest(r)
  const bad = [
    batch({ name: '홍길동' }),
    batch({ ev: [{ y: 'v', s: 'start', t: 0, text: '안녕하세요' }] }),
    batch({ ev: [{ y: 'v', s: 'p01012345678', t: 0 }] }),
    batch({ ev: [{ y: 'a', k: 'a@b', t: 0 }] }),
    batch({ id: 'short' }),
    batch({ dev: 'Mozilla/5.0' })
  ]
  for (const b of bad) assert.equal((await run({ method: 'POST', body: JSON.stringify(b), headers: { 'x-real-ip': '9.9.9.1' } })).code, 400)
  assert.equal((await run({ method: 'POST', body: JSON.stringify(batch()), headers: { origin: '', referer: '', 'x-real-ip': '9.9.9.1' } })).code, 403)
  assert.equal((await run({ method: 'POST', body: JSON.stringify(batch()), headers: { origin: 'https://evil.test', 'x-real-ip': '9.9.9.1' } })).code, 403)
  const big = batch({ ev: Array.from({ length: 199 }, (_, i) => ({ y: 'a', k: 'other', s: 'H5.board', t: i * 1000 + 1000000 })) })
  assert.equal((await run({ method: 'POST', body: JSON.stringify(big) + ' '.repeat(16000), headers: { 'x-real-ip': '9.9.9.1' } })).code, 413)
  assert.equal([...r.lists.keys()].filter((k) => k.startsWith('miri:exp:')).length, 0)
  G.setStoreForTest(null)
})

test('서버: 바른 묶음은 204, 체험 번호별 목록과 색인에 쌓이고 집계는 시연 코드 세션만', async () => {
  const r = fakeRedis(); G.setStoreForTest(r)
  const ok = await run({ method: 'POST', body: JSON.stringify(batch()), headers: { 'x-real-ip': '9.9.9.2' } })
  assert.equal(ok.code, 204)
  await run({ method: 'POST', body: JSON.stringify(batch({ seq: 1, ev: [{ y: 'v', s: 'H1', t: 9000 }, { y: 'a', k: 'accept', s: 'H1', t: 15000 }, { y: 'v', s: 'H5.wait', t: 15100 }, { y: 'v', s: 'H9', t: 60000 }] })), headers: { 'x-real-ip': '9.9.9.2' } })
  await run({ method: 'POST', body: JSON.stringify(batch({ id: 'testtesttest0001', src: 'test' })), headers: { 'x-real-ip': '9.9.9.2' } })
  assert.equal(r.lists.get('miri:exp:idx').length, 2)
  assert.equal((await run({ method: 'GET', url: '/api/exp?report=1' })).code, 401)
  const drill = G.issueToken(Date.now(), 'drill')
  assert.equal((await run({ method: 'GET', url: '/api/exp?report=1', headers: { cookie: `miri_s=${drill}` } })).code, 401)
  const full = G.issueToken()
  const rep = await run({ method: 'GET', url: '/api/exp?report=1', headers: { cookie: `miri_s=${full}` } })
  assert.equal(rep.code, 200)
  const all = rep.body.report['전체']
  assert.equal(all.participants, 1) // 시험 출처는 빼고 셈
  assert.equal(all.completed, 1)
  assert.equal(all.funnel.find((f) => f.key === 'accept').reached, 1)
  assert.equal(rep.body.report.yeollim.dwell.find((d) => d.screen === 'H1').medianSec, 6.1)
  const del = await run({ method: 'DELETE', url: '/api/exp?src=test', headers: { cookie: `miri_s=${full}` } })
  assert.equal(del.body.removed, 1)
  assert.deepEqual(r.lists.get('miri:exp:idx'), ['yeollim:abcdefghijkl0001'])
  assert.equal((await run({ method: 'DELETE', url: '/api/exp?src=yeollim', headers: { cookie: `miri_s=${full}` } })).code, 400)
  G.setStoreForTest(null)
})

test('집계: 기록이 하나도 없어도 동작하고, 화면을 숨겼다 돌아온 시간은 머문 시간에서 뺌', () => {
  const empty = S.aggregate([])
  assert.equal(empty['전체'].participants, 0)
  assert.equal(empty['전체'].funnel.length, S.FUNNEL.length)
  const s = S.sessionOf([{ id: 'x', src: 'bongsa', ev: [{ y: 'v', s: 'H1', t: 0 }, { y: 'h', t: 5000 }, { y: 'r', t: 65000 }, { y: 'v', s: 'H5.wait', t: 70000 }] }])
  assert.deepEqual(s.dwell.map((d) => [d.s, d.ms]), [['H1', 5000], ['H1', 5000]])
  assert.equal(s.done, false); assert.equal(s.lastView, 'H5.wait')
  const a = S.aggregate([s])
  assert.equal(a.bongsa.dropoff[0].screen, 'H5.wait')
})

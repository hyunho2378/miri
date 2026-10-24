// 플랫폼 AI 협업 툴 개발 셀(33, 34, 37) 검토 반영 시험: 발령 단계 전이, 전송 전 확인, 역할 값, 그래픽 대비
import assert from 'node:assert/strict'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
const { default: dispatch, transitionAllowed } = await import('../api/dispatch.js')
const { default: session } = await import('../api/session.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')

let n = 0
const t = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const call = async (h, req) => { const res = mkRes(); await h({ ...req, headers: { host: 'miri.test', origin: 'https://miri.test', ...(req.headers || {}) } }, res); return res }

await t('셀 33: 전이 표(대기, 배정 검토, 전송)', async () => {
  for (const to of ['standby', 'assigned', 'sent']) assert.equal(transitionAllowed(null, to), true)
  assert.equal(transitionAllowed('standby', 'sent'), true)
  assert.equal(transitionAllowed('assigned', 'standby'), true)
  assert.equal(transitionAllowed('sent', 'sent'), true)
  assert.equal(transitionAllowed('sent', 'assigned'), false)
  assert.equal(transitionAllowed('sent', 'standby'), false)
  assert.equal(transitionAllowed('standby', 'idle'), false)
})

await t('셀 33: 서버는 평시와 종료 단계 저장을 400, 전송 뒤 되돌림을 409 로 거절하고 정상 흐름은 저장', async () => {
  setStoreForTest(fakeRedis())
  const cookie = `${COOKIE}=${issueToken()}`
  const save = (rev, status) => call(dispatch, { method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: { kind: 'drill', status }, briefs: {}, dispatchId: 'Dplat33abc', rev } })
  assert.equal((await save(1, 'idle')).code, 400)
  assert.equal((await save(1, 'standby')).code, 200)
  assert.equal((await save(2, 'assigned')).code, 200)
  assert.equal((await save(3, 'standby')).code, 200)
  assert.equal((await save(4, 'assigned')).code, 200)
  assert.equal((await save(5, 'sent')).code, 200)
  const back = await save(6, 'assigned')
  assert.equal(back.code, 409)
  assert.equal(back.body.error.code, 'BAD_TRANSITION')
  assert.equal((await save(6, 'sent')).code, 200)
  // 늦게 온 옛 순번은 전이 검사보다 순번 검사(STALE)가 먼저
  assert.equal((await save(2, 'assigned')).body.error.code, 'STALE')
})

await t('셀 33: 전송 전 확인(배정 검토 단계와 배정 결과가 있을 때만 전송)', async () => {
  const { default: D } = await import('../src/store/useDispatchStore.js')
  D.getState().reset?.()
  assert.equal(D.getState().confirmAndSend(), false)
  assert.notEqual(D.getState().status, 'sent')
  D.getState().start({ kind: 'drill', speed: 60 })
  assert.equal(D.getState().confirmAndSend(), false)
  assert.equal(D.getState().status, 'standby')
  D.getState().runAssign()
  assert.equal(D.getState().confirmAndSend(), true)
  assert.equal(D.getState().status, 'sent')
  assert.equal(D.getState().confirmAndSend(), false)
})

await t('셀 34: 세션 역할 값은 city, dong 만(없으면 city), 그 밖은 400', async () => {
  setStoreForTest(fakeRedis())
  assert.equal((await call(session, { method: 'POST', body: { demo: 'drill' }, headers: { 'x-real-ip': '9.9.9.1' } })).body.role, 'city')
  assert.equal((await call(session, { method: 'POST', body: { demo: 'drill', role: 'dong', dong: 'MS' }, headers: { 'x-real-ip': '9.9.9.2' } })).body.role, 'dong')
  const bad = await call(session, { method: 'POST', body: { demo: 'drill', role: 'admin' }, headers: { 'x-real-ip': '9.9.9.3' } })
  assert.equal(bad.code, 400)
  assert.equal(bad.body.error.code, 'BAD_ROLE')
})

await t('셀 37: 경고와 완료 그래픽 색은 흰 면과 회색 면에서 3:1 이상', async () => {
  const { colors: color } = await import('../src/tokens.js')
  const L = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const cr = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  for (const fg of [color.warning.DEFAULT, color.success.DEFAULT]) for (const bg of ['#FFFFFF', '#F2F2F7', '#E5E5EA']) assert.ok(cr(fg, bg) >= 3, `${fg} on ${bg}`)
})

console.log(`platformReview ${n}개 통과`)

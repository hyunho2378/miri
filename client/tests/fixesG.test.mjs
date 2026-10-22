// 재현 시험: 권한 검사 뒤 저장 직전에 도우미 교체가 끝나면 예전 도우미의 보고를 저장하지 않는다
import assert from 'node:assert/strict'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
const { default: handler } = await import('../api/dispatch.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')

let n = 0
const t = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const call = async (req) => { const res = mkRes(); await handler({ ...req, headers: { host: 'miri.test', origin: 'https://miri.test', ...(req.headers || {}) } }, res); return res }
const sent = { kind: 'drill', status: 'sent' }

async function setup() {
  const store = fakeRedis()
  setStoreForTest(store)
  const cookie = `${COOKIE}=${issueToken()}`
  const save = (rev, briefs) => call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, briefs, dispatchId: 'Dtestg3abc', rev } })
  const first = await save(1, { 'H-001': { personCodes: ['P-1'] } })
  assert.equal(first.code, 200)
  return { store, cookie, save, oldToken: first.body.tokens['H-001'] }
}

await t('H3 경합: 권한 검사 뒤 저장 직전에 H-001을 빼고 H-002로 바꾸면 예전 H-001 보고는 404이고 저장되지 않는다', async () => {
  const { store, save, oldToken } = await setup()
  let release; const hold = new Promise((r) => { release = r })
  let reached; const atLua = new Promise((r) => { reached = r })
  store.fail.beforeAppend = async () => { reached(); await hold }
  const pending = call({ method: 'POST', query: { action: 'report', t: oldToken }, body: { key: 'kg3000001', type: 'step', personCode: 'P-1', step: 'board', at: 5 } })
  await atLua
  store.fail.beforeAppend = null
  const swap = await save(2, { 'H-002': { personCodes: ['P-1'] } })
  assert.equal(swap.code, 200)
  release()
  const late = await pending
  assert.equal(late.code, 404)
  assert.equal(late.body.error.code, 'NO_ASSIGNMENT')
  assert.equal((store.lists.get('miri:dsp:r:Dtestg3abc') || []).length, 0)
})

await t('H3 경합: 같은 도우미라도 빠진 대상자에 대한 늦은 보고는 저장하지 않는다', async () => {
  const { store, save, oldToken } = await setup()
  let release; const hold = new Promise((r) => { release = r })
  let reached; const atLua = new Promise((r) => { reached = r })
  store.fail.beforeAppend = async () => { reached(); await hold }
  const pending = call({ method: 'POST', query: { action: 'report', t: oldToken }, body: { key: 'kg3000002', type: 'step', personCode: 'P-1', step: 'depart', at: 5 } })
  await atLua
  store.fail.beforeAppend = null
  assert.equal((await save(2, { 'H-001': { personCodes: ['P-9'] } })).code, 200)
  release()
  const late = await pending
  assert.equal(late.code, 404)
  assert.equal((store.lists.get('miri:dsp:r:Dtestg3abc') || []).length, 0)
})

await t('H3 경합: 저장 직전에 발령이 종료되면 보고는 404 CLOSED이고 저장되지 않는다', async () => {
  const { store, cookie, oldToken } = await setup()
  let release; const hold = new Promise((r) => { release = r })
  let reached; const atLua = new Promise((r) => { reached = r })
  store.fail.beforeAppend = async () => { reached(); await hold }
  const pending = call({ method: 'POST', query: { action: 'report', t: oldToken }, body: { key: 'kg3000003', type: 'ack', answer: 'accept', at: 5 } })
  await atLua
  store.fail.beforeAppend = null
  assert.equal((await call({ method: 'DELETE', query: { dispatchId: 'Dtestg3abc' }, headers: { cookie } })).code, 200)
  release()
  const late = await pending
  assert.equal(late.code, 404)
  assert.equal(late.body.error.code, 'CLOSED')
  assert.equal((store.lists.get('miri:dsp:r:Dtestg3abc') || []).length, 0)
})

await t('정상 경로: 현재 배정 도우미의 보고는 저장되고 같은 보고 재전송은 중복 200', async () => {
  const { store, oldToken } = await setup()
  const body = { key: 'kg3000004', type: 'step', personCode: 'P-1', step: 'depart', at: 5 }
  const a = await call({ method: 'POST', query: { action: 'report', t: oldToken }, body })
  assert.equal(a.code, 200); assert.equal(a.body.duplicate, false)
  const b = await call({ method: 'POST', query: { action: 'report', t: oldToken }, body })
  assert.equal(b.code, 200); assert.equal(b.body.duplicate, true)
  assert.equal(store.lists.get('miri:dsp:r:Dtestg3abc').length, 1)
})

console.log(`\n${n}개 시험 통과`)

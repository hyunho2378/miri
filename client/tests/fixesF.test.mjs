// GPT 5차 검토(2026. 10. 21.) 재현 시험: H1~H4 병합 차단 4건과 M1, M2, M4
import assert from 'node:assert/strict'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
const { default: handler } = await import('../api/dispatch.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')
const { enqueue, flush, readQueue, mergeReports } = await import('../src/lib/reportQueue.js')
const { clockNow, newDispatchId } = await import('../src/lib/dispatchSync.js')
const { freshness } = await import('../src/lib/freshness.js')
const { alertRows, parseAlerts } = await import('../api/opendata.js')

let n = 0
const t = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const call = async (req) => { const res = mkRes(); await handler({ headers: { host: 'miri.test', ...(req.headers || {}) }, ...req }, res); return res }
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) } }
const sent = { kind: 'drill', status: 'sent' }

await t('H1 대기열: 전송 중에 넣은 보고가 지워지지 않고, 겹친 전송도 한 번씩만 보낸다', async () => {
  const st = memStorage()
  let open; const gate = new Promise((r) => { open = r })
  const log = []
  const send = async (it) => { log.push(it.key); if (it.key === 'kA0000001') await gate; return true }
  enqueue('s1', { key: 'kA0000001', type: 'ack', answer: 'accept' }, st)
  const p1 = flush('s1', send, st)
  await Promise.resolve()
  enqueue('s1', { key: 'kB0000001', type: 'step', step: 'depart' }, st)
  const p2 = flush('s1', send, st)
  open()
  await Promise.all([p1, p2])
  assert.deepEqual(log, ['kA0000001', 'kB0000001'])
  assert.equal(readQueue('s1', st).length, 0)
  // 전송 실패면 남는다
  enqueue('s1', { key: 'kC0000001', type: 'step', step: 'arrive' }, st)
  const r = await flush('s1', async () => false, st)
  assert.deepEqual(r, { sent: 0, left: 1 })
})

async function saved(store, briefs, extra = {}) {
  setStoreForTest(store)
  const cookie = `${COOKIE}=${issueToken()}`
  const res = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, briefs, ...extra } })
  return { cookie, res }
}

await t('H2 보고 저장: 저장소 실패는 성공으로 돌려주지 않고, 다시 보내면 저장된다', async () => {
  const store = fakeRedis()
  const { res } = await saved(store, { 'H-084': { personCodes: ['P-1'] } }, { dispatchId: 'Dtesth2abc', rev: 1 })
  const tk = res.body.tokens['H-084']
  const body = { key: 'kh2000001', type: 'step', personCode: 'P-1', step: 'depart', at: 5 }
  store.fail.eval = true
  const a = await call({ method: 'POST', query: { action: 'report', t: tk }, body })
  assert.equal(a.code, 503)
  store.fail.eval = false
  const b = await call({ method: 'POST', query: { action: 'report', t: tk }, body })
  assert.equal(b.code, 200); assert.equal(b.body.duplicate, false)
  assert.equal(store.lists.get('miri:dsp:r:Dtesth2abc').length, 1)
  const c = await call({ method: 'POST', query: { action: 'report', t: tk }, body })
  assert.equal(c.body.duplicate, true)
  const d = await call({ method: 'POST', query: { action: 'report', t: tk }, body: { ...body, step: 'arrive' } })
  assert.equal(d.code, 409)
  assert.equal(store.lists.get('miri:dsp:r:Dtesth2abc').length, 1)
  setStoreForTest(null)
})

await t('H3 교체: 빠진 도우미의 예전 링크는 조회와 보고가 막히고 새 도우미 링크는 된다', async () => {
  const store = fakeRedis()
  const { cookie, res } = await saved(store, { 'H-001': { personCodes: ['P-1'] } }, { dispatchId: 'Dtesth3abc', rev: 1 })
  const old = res.body.tokens['H-001']
  const r2 = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId: 'Dtesth3abc', rev: 2, briefs: { 'H-002': { personCodes: ['P-1'] } } } })
  assert.equal(r2.code, 200)
  const g = await call({ method: 'GET', query: { action: 'helper', t: old } })
  assert.equal(g.code, 404)
  const p = await call({ method: 'POST', query: { action: 'report', t: old }, body: { key: 'kh3000001', type: 'step', personCode: 'P-1', step: 'depart' } })
  assert.equal(p.code, 404)
  const neu = await call({ method: 'GET', query: { action: 'helper', t: r2.body.tokens['H-002'] } })
  assert.equal(neu.code, 200); assert.deepEqual(neu.body.brief.personCodes, ['P-1'])
  setStoreForTest(null)
})

await t('H4 종료: 늦게 도착한 저장이 종료한 발령을 되살리지 못하고, 옛 순번 저장과 남의 발령 번호는 거부', async () => {
  const store = fakeRedis()
  const { cookie } = await saved(store, { 'H-001': { personCodes: ['P-1'] } }, { dispatchId: 'Dtesth4abc', rev: 1 })
  const late = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId: 'Dtesth4abc', rev: 3, briefs: {} } })
  assert.equal(late.code, 200)
  const stale = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: { ...sent, marker: 'old' }, dispatchId: 'Dtesth4abc', rev: 2, briefs: {} } })
  assert.equal(stale.code, 409); assert.equal(stale.body.error.code, 'STALE')
  const other = `${COOKIE}=${issueToken()}`
  const steal = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie: other }, body: { state: sent, dispatchId: 'Dtesth4abc', rev: 9, briefs: {} } })
  assert.equal(steal.code, 409); assert.equal(steal.body.error.code, 'OWNER')
  const del = await call({ method: 'DELETE', query: { dispatchId: 'Dtesth4abc' }, headers: { cookie } })
  assert.equal(del.code, 200)
  const revive = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId: 'Dtesth4abc', rev: 4, briefs: {} } })
  assert.equal(revive.code, 409); assert.equal(revive.body.error.code, 'CLOSED')
  const back = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
  assert.equal(back.body.state, null)
  // 새 발령은 새 번호로 저장된다
  const fresh = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId: newDispatchId(), rev: 1, briefs: {} } })
  assert.equal(fresh.code, 200)
  setStoreForTest(null)
})

await t('M1 합치기: 더 이른 원격 수락이 늦은 불가를 덮지 않고, 도우미 보고 시각은 발령 가상 시계 기준', () => {
  const out = mergeReports({ ackOverride: { 'H-001': { answer: 'decline', at: 1000 } }, events: {} }, [{ type: 'ack', helper: 'H-001', answer: 'accept', at: 1 }])
  assert.equal(out.ackOverride['H-001'].answer, 'decline')
  const clock = { realStart: 1_000_000, vStart: 5_000_000, speed: 60 }
  assert.equal(clockNow(clock, 1_000_000 + 60_000), 5_000_000 + 3_600_000)
  assert.equal(clockNow(null, 42), 42)
  assert.match(newDispatchId(), /^D[0-9a-z]{6,20}$/)
})

await t('M2 기준 시각: 없거나 미래면 정상으로 보지 않고, 응급실은 병원별로 지연을 센다', () => {
  const now = Date.parse('2026-10-21T05:00:00Z')
  assert.equal(freshness('fire', { asOf: null, fetchedAt: '2026-10-21T05:00:00Z' }, now).state, 'unknown')
  assert.equal(freshness('fire', { asOf: '2026-10-22T05:00:00Z', fetchedAt: '2026-10-21T05:00:00Z' }, now).state, 'unknown')
  const er = { asOf: '2026-10-21T00:00:00Z', asOfBasis: '가장 오래된 기관 입력 시각', list: [{ asOf: '2026-10-21T00:00:00Z' }, { asOf: '2026-10-21T04:50:00Z' }] }
  const f = freshness('er', er, now)
  assert.equal(f.state, 'stale'); assert.equal(f.late, 1)
  assert.equal(freshness('er', { ...er, asOf: '2026-10-21T04:00:00Z', list: [{ asOf: '2026-10-21T04:00:00Z' }] }, now).state, 'ok')
})

await t('M4 재난문자: 구조가 다르면 오류, 범위 밖 문자는 빼고 시각 모르는 문자는 뒤로', () => {
  assert.throws(() => alertRows({ body: { foo: 1 } }))
  assert.throws(() => alertRows({}))
  assert.deepEqual(alertRows({ body: [] }), [])
  assert.throws(() => parseAlerts([{ RCPTN_RGN_NM: '강원특별자치도 동해시', MSG_CN: 'x' }]))
  const now = Date.parse('2026-10-21T05:00:00Z')
  const rows = [
    { SN: '1', CRT_DT: '2026/10/20 10:00:00', RCPTN_RGN_NM: '강원특별자치도 동해시', MSG_CN: 'a' },
    { SN: '2', CRT_DT: '2026/10/01 10:00:00', RCPTN_RGN_NM: '강원특별자치도 동해시', MSG_CN: 'old' },
    { SN: '3', CRT_DT: '', RCPTN_RGN_NM: '강원특별자치도 동해시', MSG_CN: 'no time' },
    { SN: '4', CRT_DT: '2026/10/21 09:00:00', RCPTN_RGN_NM: '강원특별자치도 동해시', MSG_CN: 'b' }
  ]
  const out = parseAlerts(rows, '동해시', now)
  assert.deepEqual(out.map((x) => x.id), ['4', '1', '3'])
  assert.equal(out[2].atUnknown, true)
})

console.log(`\n${n}개 시험 통과`)

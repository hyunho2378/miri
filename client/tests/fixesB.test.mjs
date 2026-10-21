// 회신 R34 반영 B: 도우미 서명 링크, 발령 서버 저장과 복원, 보고 재전송 대기열, 소방 지원 요청
import assert from 'node:assert/strict'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
const { signHelperToken, verifyHelperToken } = await import('../api/_helperToken.js')
const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
const { default: handler, cleanReport } = await import('../api/dispatch.js')
const { enqueue, flush, readQueue, mergeReports } = await import('../src/lib/reportQueue.js')
const { restoreSnapshot, snapshotOf } = await import('../src/lib/dispatchSync.js')

let n = 0
const t = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }

// Upstash 대신 쓰는 메모리 저장소(Lua 원자 처리 흉내 포함, GPT 5차 H2와 H4 반영 뒤 공용)
const { fakeRedis } = await import('./_fakeRedis.mjs')
const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const call = async (req) => { const res = mkRes(); await handler({ headers: { host: 'miri.test', ...(req.headers || {}) }, ...req }, res); return res }

await t('토큰: 위조, 다른 도우미, 형식 오류를 거부한다', () => {
  const tk = signHelperToken('Dabc12345', 'H-084')
  assert.ok(verifyHelperToken(tk))
  const [d, h, exp, mac] = tk.split('.')
  assert.equal(verifyHelperToken(`${d}.H-001.${exp}.${mac}`), null)
  assert.equal(verifyHelperToken(`${d}.${h}.${Number(exp) + 60}.${mac}`), null)
  assert.equal(verifyHelperToken(`${d}.${h}.${exp}.${mac.slice(0, -2)}xx`), null)
  assert.equal(verifyHelperToken('demo'), null)
})

await t('토큰: 만료되면 거부한다', () => {
  const past = Date.now() - 13 * 3600 * 1000
  const tk = signHelperToken('Dabc12345', 'H-084', past)
  assert.equal(verifyHelperToken(tk), null)
})

await t('보고: 본인 배정 대상자와 정해진 값만 받는다', () => {
  const brief = { personCodes: ['P-1', 'P-2'] }
  assert.ok(cleanReport({ key: 'k12345678', type: 'step', personCode: 'P-1', step: 'depart' }, brief, 'H-084'))
  assert.equal(cleanReport({ key: 'k12345678', type: 'step', personCode: 'P-9', step: 'depart' }, brief, 'H-084'), null)
  assert.equal(cleanReport({ key: 'k12345678', type: 'step', personCode: 'P-1', step: 'handedToFire' }, brief, 'H-084'), null)
  assert.equal(cleanReport({ key: 'short', type: 'ack', answer: 'accept' }, brief, 'H-084'), null)
})

await t('저장과 복원: 세션으로 저장한 발령을 다시 읽고, 링크로는 본인 배정만 조회한다', async () => {
  setStoreForTest(fakeRedis())
  const cookie = `${COOKIE}=${issueToken()}`
  const state = { status: 'sent', kind: 'drill', ackPlan: { 'H-002': { answer: 'none', at: null } }, events: {}, ackOverride: {} }
  const briefs = { 'H-084': { disaster: '산불', personCodes: ['P-1'] }, 'H-002': { disaster: '산불', personCodes: ['P-2'] } }
  const noSession = await call({ method: 'POST', query: { action: 'save' }, body: { state, briefs } })
  assert.equal(noSession.code, 401)
  const real = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: { ...state, kind: 'real' }, briefs } })
  assert.equal(real.code, 400)
  const saved = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state, briefs } })
  assert.equal(saved.code, 200)
  const tk = saved.body.tokens['H-084']
  const mine = await call({ method: 'GET', query: { action: 'helper', t: tk } })
  assert.equal(mine.code, 200)
  assert.deepEqual(mine.body.brief.personCodes, ['P-1'])
  const other = await call({ method: 'POST', query: { action: 'report', t: tk }, body: { key: 'k00000001', type: 'step', personCode: 'P-2', step: 'depart' } })
  assert.equal(other.code, 400)
  const back = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
  assert.equal(back.body.state.status, 'sent')
  assert.equal(restoreSnapshot(back.body.state).ackPlan['H-002'].at, Infinity)
})

await t('재전송: 같은 key 보고는 한 번만 저장된다', async () => {
  setStoreForTest(fakeRedis())
  const cookie = `${COOKIE}=${issueToken()}`
  const saved = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: { kind: 'drill', status: 'sent' }, briefs: { 'H-084': { personCodes: ['P-1'] } } } })
  const tk = saved.body.tokens['H-084']
  const body = { key: 'kdup00001', type: 'step', personCode: 'P-1', step: 'depart', at: 1 }
  const a = await call({ method: 'POST', query: { action: 'report', t: tk }, body })
  const b = await call({ method: 'POST', query: { action: 'report', t: tk }, body })
  assert.equal(a.body.duplicate, false)
  assert.equal(b.body.duplicate, true)
  const back = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
  assert.equal(back.body.reports.length, 1)
  setStoreForTest(null)
})

await t('대기열: 보내기 실패면 남기고, 연결되면 순서대로 보내고 지운다', async () => {
  const m = new Map()
  const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }
  enqueue('s', { key: 'a1', type: 'ack', answer: 'accept' }, st)
  enqueue('s', { key: 'a1', type: 'ack', answer: 'accept' }, st)
  enqueue('s', { key: 'a2', type: 'step', step: 'depart' }, st)
  assert.equal(readQueue('s', st).length, 2)
  let r = await flush('s', async () => false, st)
  assert.deepEqual(r, { sent: 0, left: 2 })
  const sent = []
  r = await flush('s', async (it) => { sent.push(it.key); return true }, st)
  assert.deepEqual(r, { sent: 2, left: 0 })
  assert.deepEqual(sent, ['a1', 'a2'])
})

await t('합치기: 서버 보고가 담당자 화면 상태에 반영되고 소방 인계는 덮어쓰지 않는다', () => {
  const base = { ackOverride: {}, events: { 'P-3': { step: 'handedToFire', at: 5 } } }
  const out = mergeReports(base, [
    { type: 'ack', helper: 'H-084', answer: 'accept', at: 1 },
    { type: 'step', personCode: 'P-1', step: 'depart', at: 2 },
    { type: 'step', personCode: 'P-1', step: 'arrive', at: 3 },
    { type: 'step', personCode: 'P-3', step: 'depart', at: 9 }
  ])
  assert.equal(out.ackOverride['H-084'].answer, 'accept')
  assert.equal(out.events['P-1'].step, 'arrive')
  assert.equal(out.events['P-3'].step, 'handedToFire')
  assert.ok(Object.keys(snapshotOf({ status: 'sent' })).includes('fireRequests'))
})

await t('소방 지원 요청: 미배정자를 사유별로 묶어 한 번만 넘긴다', async () => {
  const { useDispatchStore } = await import('../src/store/useDispatchStore.js')
  useDispatchStore.setState({ status: 'sent', kind: 'drill', speed: 60, realStart: Date.now(), vStart: Date.now(), events: {}, handovers: [], fireRequests: [],
    result: { assignments: [], unassigned: [{ personCode: 'P-1', reason: 'capacity' }, { personCode: 'P-2', reason: 'helper' }] } })
  const q = useDispatchStore.getState().requestFireSupport()
  assert.equal(q.count, 2)
  assert.deepEqual(q.reasons, { capacity: 1, helper: 1 })
  assert.equal(useDispatchStore.getState().events['P-1'].step, 'handedToFire')
  assert.equal(useDispatchStore.getState().handovers.at(-1).kind, 'support')
  assert.equal(useDispatchStore.getState().requestFireSupport(), null)
})

console.log(`\n${n}개 시험 통과`)

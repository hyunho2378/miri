// node tests/fixes3.test.mjs 호출 상한, 목적지, 불가 응답, 빈 판독 회귀 시험. 외부 호출은 모두 모의 fetch
import assert from 'node:assert/strict'

// 이 파일은 실시간 판독 경로(외부 호출을 흉내 냄)를 시험하므로 스위치를 켠다. 공개 배포 기본값은 꺼짐(aiLiveOff.test.mjs)
process.env.AI_LIVE = '1'
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const mockRes = () => { const r = { status(c) { r.code = c; return r }, json(j) { r.body = j; return r }, setHeader(k, v) { (r.headers = r.headers || {})[k] = v } }; return r }
for (const k of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) delete process.env[k]
process.env.MIRI_DEMO_CODE = 'test-code-1234'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'

const fakeRedis = () => { const m = new Map(); return { incr: async (k) => { m.set(k, (m.get(k) || 0) + 1); return m.get(k) }, expire: async () => 1 } }

await ok('R2 공유 저장소가 없으면 AI 호출을 503으로 막는다(인스턴스 메모리로 돌아가지 않음)', async () => {
  // 서로 다른 서버 인스턴스를 모듈 두 벌로 흉내 낸다
  const A = await import('../api/_guard.js?inst=a')
  const B = await import('../api/_guard.js?inst=b')
  const tok = A.issueToken()
  for (const M of [A, B]) {
    const res = mockRes()
    assert.equal(await M.guard({ headers: { host: 'a', cookie: `miri_s=${tok}`, 'x-real-ip': '7.7.7.7' } }, res, { ai: 'intake' }), false)
    assert.equal(res.code, 503); assert.equal(res.body.error.code, 'NO_LIMIT_STORE')
  }
  // AI 가 아닌 기능은 그대로 열린다
  const res = mockRes()
  assert.equal(await A.guard({ headers: { host: 'a', cookie: `miri_s=${tok}` } }, res), true)
})

await ok('R2 저장소 오류도 막고, 공유 저장소를 쓰면 인스턴스가 둘이어도 전체 상한을 넘지 않는다', async () => {
  const A = await import('../api/_guard.js?inst=c')
  const B = await import('../api/_guard.js?inst=d')
  const broken = { incr: async () => { throw new Error('down') }, expire: async () => 1 }
  A.setStoreForTest(broken)
  await assert.rejects(A.aiBudget({ headers: { 'x-real-ip': '1.1.1.1' } }, 'intake', 's'), (e) => e.code === 'NO_LIMIT_STORE')
  const shared = fakeRedis()
  A.setStoreForTest(shared); B.setStoreForTest(shared)
  const max = A.AI_LIMITS.intake.globalMin
  Object.assign(A.AI_LIMITS.intake, { session: 1000, ip: 1000 }); Object.assign(B.AI_LIMITS.intake, { session: 1000, ip: 1000 })
  let allowed = 0
  for (let i = 0; i < max; i += 1) {
    if (await A.aiBudget({ headers: { 'x-real-ip': `10.0.0.${i}` } }, 'intake', `a${i}`)) allowed += 1
    if (await B.aiBudget({ headers: { 'x-real-ip': `10.0.1.${i}` } }, 'intake', `b${i}`)) allowed += 1
  }
  assert.equal(allowed, max)
})

const { resolveVillages } = await import('../src/lib/scenario.js')
const { planDispatch, personDest, reassignBlock, helperDeclined } = await import('../src/lib/assign.js')
const { useDispatchStore: D } = await import('../src/store/useDispatchStore.js')
const { useMiriStore: M } = await import('../src/store/useMiriStore.js')
const t0 = Date.UTC(2026, 3, 5, 0, 0)

// 발령 저장소에 작은 가상 상황을 넣는다. 가상 시계는 t0 에 멈춰 둔다
function load({ persons, villages, shelters, vehicles, helpers, settings = { boardingMinutes: 20 } }) {
  const r = resolveVillages({ villages, persons, scenario: { affected: villages.map((v) => v.code) }, shelters, settings })
  const result = planDispatch({ persons, villages: r.villages, vehicles, helpers, t0, arrivals: Object.fromEntries(villages.map((v) => [v.code, t0 + 8 * 3600000])) })
  M.setState({ persons, helpers })
  D.setState({ status: 'sent', kind: 'drill', speed: 0, realStart: Date.now(), vStart: t0, result, ackPlan: {}, ackOverride: {}, events: {}, failPlan: {} })
  return result
}

await ok('R6 대피소 자리가 없어 뺀 사람은 재배정해도 배정되지 않고, 목적지 없는 회차를 만들지 않는다', () => {
  const r = load({
    persons: ['a', 'b', 'c'].map((c) => ({ code: c, villageCode: 'V', grade: 'walk' })),
    villages: [{ code: 'V', shelterCode: 'S1', drive: [['S1', 1, 1], ['S2', 50, 40]] }],
    shelters: [{ code: 'S1', capacity: 1, villageCode: 'X' }, { code: 'S2', capacity: 1, villageCode: 'Y' }],
    vehicles: [{ code: 'C', type: 'car' }, { code: 'C2', type: 'car' }],
    helpers: [{ code: 'H1', grades: ['walk'], villages: [] }, { code: 'H2', grades: ['walk'], villages: [] }]
  })
  const left = r.unassigned.find((u) => u.reason === 'noShelterRoom')
  assert.ok(left)
  assert.equal(reassignBlock(left.personCode, r.ctx), 'noShelterRoom')
  assert.equal(D.getState().reassign(left.personCode), false)
  assert.ok(D.getState().result.unassigned.some((u) => u.personCode === left.personCode))
  const trips = D.getState().result.assignments.flatMap((a) => a.trips)
  assert.ok(trips.length > 0)
  assert.ok(trips.every((t) => t.shelters.length > 0))
  assert.ok(!trips.some((t) => t.personCodes.includes(left.personCode)))
})

await ok('R6 자리를 받은 사람의 재배정 회차와 사람별 안내는 배정 때 정한 목적지와 같다', () => {
  const r = load({
    persons: ['a', 'b'].map((c) => ({ code: c, villageCode: 'V', grade: 'walk' })),
    villages: [{ code: 'V', shelterCode: 'S1', drive: [['S1', 1, 1], ['S2', 50, 40]] }],
    shelters: [{ code: 'S1', capacity: 1, villageCode: 'X' }, { code: 'S2', capacity: 1, villageCode: 'Y' }],
    vehicles: [{ code: 'C', type: 'car' }, { code: 'C2', type: 'car' }],
    helpers: [{ code: 'H1', grades: ['walk'], villages: [] }, { code: 'H2', grades: ['walk'], villages: [] }]
  })
  for (const a of r.assignments) for (const tr of a.trips) for (const code of tr.personCodes) assert.equal(personDest(code, tr, r.ctx), r.ctx.dest[code])
  const code = 'b'
  const want = r.ctx.dest[code]
  assert.ok(D.getState().reassign(code))
  const tr = D.getState().result.assignments.flatMap((a) => a.trips).find((t) => t.added && t.personCodes.includes(code))
  assert.deepEqual(tr.shelters, [want])
  assert.equal(personDest(code, tr, D.getState().result.ctx), want)
  // 나눠 보낸 회차라도 사람별 안내는 회차 첫 시설이 아니라 그 사람의 목적지다
  assert.equal(personDest('x', { shelters: ['S1', 'S2'], village: 'V' }, { dest: { x: 'S2' } }), 'S2')
})

await ok('R7 불가로 답한 도우미가 탄 차량과 불가 도우미는 재배정 후보에서 빠진다', () => {
  const villages = [{ code: 'V', shelterCode: 'S', drive: [['S', 5, 5]] }]
  const shelters = [{ code: 'S', capacity: 50, villageCode: 'X' }]
  const persons = [{ code: 'p', villageCode: 'V', grade: 'assist' }, { code: 'q', villageCode: 'V', grade: 'assist' }]
  const helpers = [{ code: 'H', grades: ['assist'], villages: [] }]
  const r = load({ persons, villages, shelters, vehicles: [{ code: 'C', type: 'car' }], helpers })
  const a = r.assignments.find((x) => x.helperCodes.includes('H'))
  assert.ok(a)
  const code = a.trips[0].personCodes[0]
  D.setState({ ackOverride: { H: { answer: 'decline', reason: 'health', at: t0 } } })
  assert.equal(helperDeclined('H', D.getState().ackOverride, {}), true)
  assert.equal(D.getState().reassign(code), false)
  // 훈련 응답 계획의 불가도 같게 본다
  D.setState({ ackOverride: {}, ackPlan: { H: { answer: 'decline', at: t0 } } })
  assert.equal(D.getState().reassign(code), false)
  // 불가가 아니면 같은 차량으로 재배정된다
  D.setState({ ackPlan: {} })
  assert.equal(D.getState().reassign(code), 'C')
  D.getState().reset()
})

const G = await import('../api/_guard.js')
G.setStoreForTest(fakeRedis())
const I = await import('../api/intake.js')

await ok('R9 읽은 내용이 없으면 성공이 아니라 확인 필요(422)로 돌려준다', async () => {
  const tok = G.issueToken()
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex').toString('base64')
  process.env.NCP_OCR_INVOKE_URL = 'https://ocr.example'; process.env.NCP_OCR_SECRET = 'x'; process.env.NCP_CLOVASTUDIO_KEY = 'y'
  const orig = globalThis.fetch
  const base = { method: 'POST', headers: { host: 'a', cookie: `miri_s=${tok}`, 'x-real-ip': '5.5.5.5' }, body: { mimeType: 'image/png', data: png, virtualOnly: true } }
  // 1) 글자는 읽었지만 모델이 대상자를 하나도 내지 않음
  globalThis.fetch = async (url) => /clovastudio/.test(String(url))
    ? { ok: true, status: 200, json: async () => ({ status: { code: '20000' }, result: { message: { content: '{"items":[]}' } } }) }
    : { ok: true, status: 200, json: async () => ({ images: [{ inferResult: 'SUCCESS', fields: [{ inferText: '글자를 읽었습니다', lineBreak: true }] }] }) }
  try {
    let res = mockRes(); await I.default(base, res)
    assert.equal(res.code, 422); assert.equal(res.body.error.code, 'EMPTY_RESULT')
    // 2) OCR 이 글자를 하나도 못 읽음
    const calls = []
    globalThis.fetch = async (url) => { calls.push(String(url)); return { ok: true, status: 200, json: async () => ({ images: [{ inferResult: 'SUCCESS', fields: [] }] }) } }
    res = mockRes(); await I.default(base, res)
    assert.equal(res.code, 422); assert.equal(res.body.error.code, 'EMPTY_RESULT')
    assert.equal(calls.filter((u) => /clovastudio/.test(u)).length, 0)
  } finally { globalThis.fetch = orig }
  // 화면 쪽도 200 이지만 비어 있는 응답을 확인 요청으로 바꾼다
  const { readDocument } = await import('../src/lib/intake.js')
  globalThis.FileReader = class { readAsDataURL() { this.result = 'data:image/png;base64,AAAA'; this.onload() } }
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ transcript: '글자', persons: [] }) })
  try {
    await assert.rejects(readDocument({ type: 'image/png' }), (e) => e.code === 'EMPTY_RESULT')
  } finally { globalThis.fetch = orig; delete globalThis.FileReader }
})

console.log(`\n${n}개 시험 통과`)

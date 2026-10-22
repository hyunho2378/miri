// node tests/review13.test.mjs 동 담당자 화면 범위를 상태, 도우미, 소방 화면까지 적용, 저장소 조회 예외를 503 으로
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }

const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
const { default: handler } = await import('../api/dispatch.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')
const { scopeDispatch, fieldSummary, helperResponses, unservedByReason } = await import('../src/mobile/field/fieldModel.js')

const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const call = async (req) => { const res = mkRes(); await handler({ ...req, headers: { host: 'miri.test', origin: 'https://miri.test', ...(req.headers || {}) } }, res); return res }

await ok('M: 담당자 상태 조회에서 저장소 get 예외는 503 STORE_ERROR', async () => {
  setStoreForTest(fakeRedis({ get: true }))
  const res = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie: `${COOKIE}=${issueToken()}` } })
  assert.equal(res.code, 503)
  assert.equal(res.body.error.code, 'STORE_ERROR')
})

await ok('M: 종료 요청의 선행 조회 예외도 503', async () => {
  setStoreForTest(fakeRedis({ get: true }))
  const res = await call({ method: 'DELETE', query: { dispatchId: 'Dabc0001' }, headers: { cookie: `${COOKIE}=${issueToken()}` } })
  assert.equal(res.code, 503)
})

const persons = [
  { code: 'P1', villageCode: 'A1' }, { code: 'P2', villageCode: 'A1' }, { code: 'P3', villageCode: 'B1' }, { code: 'P4', villageCode: 'B1' }
]
const d = {
  status: 'sent', kind: 'drill', realStart: 0, vStart: 0, issuedAt: 0, arrivals: { A1: 10, B1: 20 }, events: {}, ackOverride: {}, smsLog: [], ackPlan: {}, failPlan: {},
  result: {
    assignments: [
      { vehicleCode: 'V-1', helperCodes: ['H-1'], trips: [{ village: 'A1', personCodes: ['P1'], departAt: 1, finishAt: 2 }] },
      { vehicleCode: 'V-2', helperCodes: ['H-2'], trips: [{ village: 'B1', personCodes: ['P3'], departAt: 1, finishAt: 2 }] }
    ],
    unassigned: [{ personCode: 'P2', reason: 'vehicle' }, { personCode: 'P4', reason: 'vehicle' }]
  }
}

await ok('H: 시 관리자(범위 없음)는 전체', async () => {
  const sc = scopeDispatch(d, persons, null)
  assert.equal(sc.persons.length, 4)
  assert.equal(unservedByReason(sc.d).total, 2)
  const g = helperResponses(sc.d, 0)
  assert.equal(g.none.length + g.accept.length + g.decline.length, 2)
})

await ok('H: 동 담당자는 자기 동 마을의 대상자, 도우미, 미배정만', async () => {
  const sc = scopeDispatch(d, persons, new Set(['A1']))
  assert.deepEqual(sc.persons.map((p) => p.code), ['P1', 'P2'])
  assert.equal(unservedByReason(sc.d).total, 1)
  const g = helperResponses(sc.d, 0)
  assert.deepEqual([...g.none, ...g.accept, ...g.decline].map((h) => h.code), ['H-1'])
  assert.deepEqual(Object.keys(sc.d.arrivals), ['A1'])
  assert.equal(fieldSummary(sc.d, sc.persons, [], 0).total, 2)
  assert.equal(d.result.unassigned.length, 2, '원래 발령 상태는 바꾸지 않음')
})

await ok('H: 현장 화면의 상태, 도우미, 소방, 더보기 화면이 같은 범위 함수를 거친다. 동 담당자는 소방 요청 버튼 대신 안내', async () => {
  const src = readFileSync(new URL('../src/mobile/field/FieldScreens.jsx', import.meta.url), 'utf8')
  for (const fn of ['FieldStatusPage', 'FieldHelpersPage', 'FieldFirePage', 'FieldMorePage']) {
    const body = src.slice(src.indexOf(`export function ${fn}`), src.indexOf('\nexport function', src.indexOf(`export function ${fn}`) + 10))
    assert.ok(body.includes('scopeDispatch'), `${fn} 범위 적용`)
  }
  assert.ok(src.includes('시 관리자 계정에서 시 전체 미배정 인원으로 보냄'))
})

await ok('재확인: 동의 상태 조회(hgetall) 예외도 503', async () => {
  setStoreForTest(fakeRedis({ hgetall: true }))
  const res = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie: `${COOKIE}=${issueToken()}` } })
  assert.equal(res.code, 503)
})

await ok('재확인: 여러 마을 차량은 담당 동 회차만, 소방 요청 기록도 담당 동 인원만', async () => {
  const d2 = { ...d, fireRequests: [{ at: 1, count: 3, villages: { A1: 1, B1: 2 } }, { at: 2, count: 1, villages: { B1: 1 } }],
    result: { ...d.result, assignments: [{ vehicleCode: 'V-3', helperCodes: ['H-3'], trips: [{ village: 'A1', personCodes: ['P1'] }, { village: 'B1', personCodes: ['P3'] }] }] } }
  const sc = scopeDispatch(d2, persons, new Set(['A1']))
  assert.equal(sc.d.result.assignments[0].trips.length, 1)
  assert.deepEqual(sc.d.fireRequests, [{ at: 1, count: 1, villages: { A1: 1 } }])
})

await ok('재확인: 서류 판독 마을 선택과 소식 대상자 조회도 담당 범위', async () => {
  const src = readFileSync(new URL('../src/mobile/field/FieldScreens.jsx', import.meta.url), 'utf8')
  assert.ok(src.includes('villages={data.villages.filter((v) => scope.inScope(v.code))}'))
  assert.ok(src.includes('scope.inScope(p.villageCode))\n') || src.includes('&& scope.inScope(p.villageCode))'))
  assert.ok(src.includes('sc.d.fireRequests.map'))
})

console.log(`review13 ${n}개 통과`)

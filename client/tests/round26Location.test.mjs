// 26회차: 도우미 위치 정보 최소 공개(개인정보 보호법 제15조 제1항 제5호, 제7호, 제17조 제1항, 제2항)
import assert from 'node:assert/strict'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
const { default: handler } = await import('../api/dispatch.js')
const { canDisclose, locationsForHelpers, cleanLocation, acceptedOf, locationRows, LOCATION_CONSENT_NOTICE } = await import('../src/lib/locationDisclosure.js')
const { fakeRedis } = await import('./_fakeRedis.mjs')

let n = 0
const t = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
const call = async (req) => { const res = mkRes(); await handler({ ...req, headers: { host: 'miri.test', origin: 'https://miri.test', ...(req.headers || {}) } }, res); return res }

await t('공개 조건: 수락한 본인 배정 대상자이고 근거가 있을 때만', () => {
  const base = { assigned: true, accepted: true, closed: false }
  assert.equal(canDisclose({ ...base, kind: 'drill', consent: true }), 'consent')
  assert.equal(canDisclose({ ...base, kind: 'real', consent: false }), 'urgent')
  assert.equal(canDisclose({ ...base, kind: 'drill', consent: false }), null, '미동의 훈련')
  assert.equal(canDisclose({ ...base, accepted: false, kind: 'real', consent: true }), null, '수락 전')
  assert.equal(canDisclose({ ...base, assigned: false, kind: 'real', consent: true }), null, '다른 도우미의 대상자')
  assert.equal(canDisclose({ ...base, closed: true, kind: 'real', consent: true }), null, '발령 종료 뒤')
})

await t('최신 응답 기준: 수락 뒤 불가면 공개하지 않는다', () => {
  assert.equal(acceptedOf([{ type: 'ack', helper: 'H-1', answer: 'accept', at: 1 }], 'H-1'), true)
  assert.equal(acceptedOf([{ type: 'ack', helper: 'H-1', answer: 'accept', at: 1 }, { type: 'ack', helper: 'H-1', answer: 'decline', at: 2 }], 'H-1'), false)
  assert.equal(acceptedOf([], 'H-1'), false)
})

await t('최소 항목: 이름과 건강 정보 칸은 받지 않는다', () => {
  const c = cleanLocation({ address: '동해시 가상로 1', unit: '101동 201호', floor: '2층', elevator: '있음', guardianPhone: '010-0000-1234', name: '홍길동', tags: ['oxygen'] })
  assert.deepEqual(Object.keys(c).sort(), ['address', 'basis', 'elevator', 'floor', 'guardianPhone', 'unit'])
  assert.equal(cleanLocation({ name: '홍길동' }), null)
  assert.equal(LOCATION_CONSENT_NOTICE.length, 5, '제17조 제2항 고지 다섯 가지')
  assert.ok(locationRows(c).place.includes('동해시'))
})

await t('훈련 발령 후보: 별도 동의 대상자만', () => {
  const persons = [{ code: 'P-1', locConsent: true, access: { floor: '2층', stairs: '엘리베이터 있음' } }, { code: 'P-2', locConsent: false, access: {} }]
  const privateInfo = { 'P-1': { address: '동해시 가상로 1', guardianPhone: '010-0000-1111', unit: '가상 101동 201호' }, 'P-2': { address: '동해시 가상로 2', guardianPhone: '010-0000-2222' } }
  const out = locationsForHelpers({ kind: 'drill', briefs: { 'H-1': { personCodes: ['P-1', 'P-2'] } }, persons, privateInfo })
  assert.deepEqual(Object.keys(out['H-1']), ['P-1'])
  assert.equal(out['H-1']['P-1'].unit, '101동 201호')
})

await t('서버: 수락 전, 다른 도우미, 불가 뒤, 종료 뒤에는 위치를 돌려주지 않고 수락 뒤에만 돌려주며 열람 기록을 남긴다', async () => {
  const store = fakeRedis()
  setStoreForTest(store)
  const cookie = `${COOKIE}=${issueToken()}`
  const state = { status: 'sent', kind: 'drill', ackPlan: {}, events: {}, ackOverride: {} }
  const briefs = { 'H-084': { disaster: '산불', personCodes: ['P-1'] }, 'H-002': { disaster: '산불', personCodes: ['P-2'] } }
  const loc = { address: '동해시 가상로 1', unit: '101동 201호', floor: '2층', elevator: '있음', guardianPhone: '010-0000-1234', basis: 'consent' }
  const locations = { 'H-084': { 'P-1': loc, 'P-2': loc }, 'H-002': { 'P-2': { ...loc, basis: 'urgent' } } }
  const saved = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state, briefs, locations } })
  assert.equal(saved.code, 200)
  const tk = saved.body.tokens['H-084']
  const before = await call({ method: 'GET', query: { action: 'helper', t: tk } })
  assert.equal(before.code, 200)
  assert.equal(before.body.locations, undefined, '수락 전')
  const ack = await call({ method: 'POST', query: { action: 'report', t: tk }, body: { key: 'k00000101', type: 'ack', answer: 'accept' } })
  assert.equal(ack.code, 200)
  const after = await call({ method: 'GET', query: { action: 'helper', t: tk } })
  assert.deepEqual(Object.keys(after.body.locations), ['P-1'], '본인 배정 대상자만(P-2 는 다른 도우미)')
  assert.equal(after.body.locations['P-1'].guardianPhone, '010-0000-1234')
  // 훈련 발령의 urgent 근거는 저장하지 않는다
  const tk2 = saved.body.tokens['H-002']
  await call({ method: 'POST', query: { action: 'report', t: tk2 }, body: { key: 'k00000201', type: 'ack', answer: 'accept' } })
  const other = await call({ method: 'GET', query: { action: 'helper', t: tk2 } })
  assert.equal(other.body.locations, undefined, '훈련 발령 미동의(급박 근거) 대상자')
  // 열람 기록: 위치 값 없이 도우미, 시각, 대상자 코드만, 첫 열람만
  await call({ method: 'GET', query: { action: 'helper', t: tk } })
  const logs = []
  for (const [k, v] of store.lists) if (String(k).startsWith('miri:dsp:l:')) logs.push(...v)
  {
    assert.equal(logs.length, 1)
    const e = JSON.parse(logs[0])
    assert.equal(e.helper, 'H-084'); assert.deepEqual(e.codes, ['P-1']); assert.equal(e.address, undefined)
  }
  // 불가로 바꾸면 더 내주지 않음
  await call({ method: 'POST', query: { action: 'report', t: tk }, body: { key: 'k00000102', type: 'ack', answer: 'decline', reason: '이동 불가' } })
  const declined = await call({ method: 'GET', query: { action: 'helper', t: tk } })
  assert.equal(declined.body.locations, undefined, '불가 뒤')
  // 종료 뒤에는 조회 자체가 막힘
  await call({ method: 'DELETE', query: {}, headers: { cookie } })
  const closed = await call({ method: 'GET', query: { action: 'helper', t: tk } })
  assert.equal(closed.code, 404)
  assert.equal(closed.body.locations, undefined)
})

console.log(`round26Location: ${n}개 통과`)

await t('화면 문구: 엘리베이터 표기를 쉬운 말로', () => {
  assert.equal(locationRows({ address: '동해시 가상로 1', floor: '1층', elevator: '해당 없음(계단 없음)' }).detail, '1층, 계단 없음')
  assert.equal(locationRows({ address: '동해시 가상로 1', floor: '3층', elevator: '없음(계단만)' }).detail, '3층, 엘리베이터 없음, 계단만')
  assert.equal(locationRows(null), null)
})

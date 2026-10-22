// node tests/fixes2.test.mjs 서버 요청 검사 회귀 시험. 외부 호출은 모두 모의 fetch
import assert from 'node:assert/strict'

// 이 파일은 실시간 판독 경로(외부 호출을 흉내 냄)를 시험하므로 스위치를 켠다. 공개 배포 기본값은 꺼짐(aiLiveOff.test.mjs)
process.env.AI_LIVE = '1'
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const mockRes = () => { const r = { status(c) { r.code = c; return r }, json(j) { r.body = j; return r }, setHeader(k, v) { (r.headers = r.headers || {})[k] = v } }; return r }
for (const k of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) delete process.env[k]

const G = await import('../api/_guard.js')
// 공유 횟수 저장소(Upstash) 모의. 실제 배포는 Redis 원자 카운터를 쓴다
export const fakeRedis = () => { const m = new Map(); return { incr: async (k) => { m.set(k, (m.get(k) || 0) + 1); return m.get(k) }, expire: async () => 1 } }
G.setStoreForTest(fakeRedis())
const { routeKind } = await import('../api/workspace.js')

await ok('R1 시연 코드 설정이 없으면 비공개 기능을 닫는다', async () => {
  delete process.env.MIRI_DEMO_CODE; delete process.env.MIRI_SESSION_SECRET
  const res = mockRes()
  assert.equal(await G.guard({ headers: { host: 'a' } }, res), false)
  assert.equal(res.code, 503)
})

process.env.MIRI_DEMO_CODE = 'test-code-1234'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'

await ok('R1 서명 쿠키가 없거나 위조되면 401, 머리글만 꾸며서는 통과하지 못한다', async () => {
  const forged = { headers: { host: 'a', 'sec-fetch-site': 'same-origin', 'x-forwarded-host': 'evil.example', origin: 'https://evil.example' } }
  let res = mockRes(); assert.equal(await G.guard(forged, res), false); assert.ok([401, 403].includes(res.code))
  res = mockRes(); assert.equal(await G.guard({ headers: { host: 'a', 'sec-fetch-site': 'same-origin' } }, res), false); assert.equal(res.code, 401)
  const tok = G.issueToken()
  const bad = tok.slice(0, -2) + (tok.endsWith('AA') ? 'BB' : 'AA')
  res = mockRes(); assert.equal(await G.guard({ headers: { host: 'a', cookie: `miri_s=${bad}` } }, res), false); assert.equal(res.code, 401)
  const expired = G.issueToken(Date.now() - 13 * 3600 * 1000)
  res = mockRes(); assert.equal(await G.guard({ headers: { host: 'a', cookie: `miri_s=${expired}` } }, res), false)
  res = mockRes(); assert.equal(await G.guard({ headers: { host: 'a', cookie: `miri_s=${tok}` } }, res), true)
  // 다른 사이트에서 온 요청은 쿠키가 있어도 막는다
  res = mockRes(); assert.equal(await G.guard({ headers: { host: 'a', origin: 'https://evil.example', cookie: `miri_s=${tok}` } }, res), false); assert.equal(res.code, 403)
})

await ok('R1 공개 설문 경로에 action=responses 를 붙여도 비공개로 판정', () => {
  assert.equal(routeKind('GET', { public: '1', id: 'f1', action: 'responses' }), 'private')
  assert.equal(routeKind('GET', { public: '1', id: 'f1' }), 'publicForm')
  assert.equal(routeKind('POST', { action: 'submit', id: 'f1' }), 'publicSubmit')
  assert.equal(routeKind('GET', {}), 'private')
  assert.equal(routeKind('DELETE', { public: '1', id: 'f1' }), 'private')
})

await ok('R1 시연 코드 발급: 틀린 코드는 401, 맞는 코드는 서명 쿠키', async () => {
  const h = (await import('../api/session.js')).default
  let res = mockRes(); await h({ method: 'POST', headers: { host: 'a', 'x-real-ip': '1.1.1.1' }, body: { code: 'nope' } }, res); assert.equal(res.code, 401)
  res = mockRes(); await h({ method: 'POST', headers: { host: 'a', 'x-real-ip': '1.1.1.2' }, body: { code: 'test-code-1234' } }, res)
  assert.equal(res.code, 200)
  const cookie = res.headers['Set-Cookie']
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Secure/)
  const tok = cookie.split(';')[0].split('=')[1]
  assert.ok(G.verifyToken(tok))
})

await ok('R2 AI 호출은 IP나 세션을 바꿔도 전체 합계 상한에서 막힌다', async () => {
  const save = { ...G.AI_LIMITS.intake }
  Object.assign(G.AI_LIMITS.intake, { session: 100, ip: 100, globalMin: 3, globalDay: 100 })
  const results = []
  for (let i = 0; i < 5; i += 1) results.push(await G.aiBudget({ headers: { 'x-real-ip': `9.9.9.${i}` } }, 'intake', `s${i}`))
  Object.assign(G.AI_LIMITS.intake, save)
  assert.deepEqual(results, [true, true, true, false, false])
  // 요청자가 꾸밀 수 있는 첫 번째 X-Forwarded-For 대신 플랫폼 값을 쓴다
  assert.equal(G.clientIpOf({ headers: { 'x-forwarded-for': '6.6.6.6, 2.2.2.2' } }), '2.2.2.2')
  assert.equal(G.clientIpOf({ headers: { 'x-real-ip': '3.3.3.3', 'x-forwarded-for': '6.6.6.6' } }), '3.3.3.3')
})

const I = await import('../api/intake.js')
const N = await import('../api/note.js')
const ncp = await import('../api/_ncp.js')
const { verifyResult } = await import('../src/lib/intake.js')

await ok('R3 원문에 없는 근거 문구는 원문으로 바꾸지 않고 실패로 표시해 확인으로 넘긴다', () => {
  const r = I.judge({ id: 'S1', grade: 'bed', confidence: 'high', quote: '전혀 없는 허구 문구', tags: [] }, '혼자 걷습니다', '순번 1', null)
  assert.equal(r.grade, 'unknown'); assert.equal(r.confidence, 'low'); assert.equal(r.quoteMismatch, true)
  assert.equal(r.proposedGrade, 'bed'); assert.equal(r.quote, '전혀 없는 허구 문구')
  const v = verifyResult('혼자 걷습니다', r)
  assert.equal(v.quoteMatched, false); assert.equal(v.confidence, 'low')
  const good = I.judge({ id: 'S1', grade: 'walk', confidence: 'high', quote: '혼자 걷습니다', tags: [] }, '혼자 걷습니다', '순번 1', null)
  assert.equal(good.grade, 'walk'); assert.equal(good.confidence, 'high')
  const nb = N.judgeNote({ changed: true, grade: 'bed', quote: '없는 말', confidence: 'high' }, '오늘 산책을 다녀오셨습니다')
  assert.equal(nb.grade, 'unknown'); assert.equal(nb.quoteMismatch, true); assert.equal(nb.proposedGrade, 'bed')
})

await ok('R4 줄 나뉜 값, 날짜, 주소, 이름+님, 13자리 번호를 가리고 남으면 멈춘다', () => {
  const m = ncp.maskLines(['성명', '김가상', '생년월일', '1940.01.01', '주소: 강원특별자치도 동해시 가상로 123', '김가상님이 휠체어를 쓰십니다.', '8001011234567', '이장님이 오셨습니다'])
  const joined = m.join(' ')
  for (const leak of ['김가상', '1940', '가상로', '8001011234567']) assert.ok(!joined.includes(leak), leak)
  assert.ok(joined.includes('이장님'))
  assert.deepEqual(ncp.residualPII(m), [])
  assert.ok(ncp.residualPII(['연락 kim@test.co.kr 로 주세요']).length > 0)
  assert.ok(ncp.residualPII(['성명: 홍길동']).length > 0)
})

await ok('R4 가상 자료 확인이 없거나 개인정보가 남으면 언어 모델을 부르지 않는다', async () => {
  const tok = G.issueToken()
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex').toString('base64')
  process.env.NCP_OCR_INVOKE_URL = 'https://ocr.example'; process.env.NCP_OCR_SECRET = 'x'; process.env.NCP_CLOVASTUDIO_KEY = 'y'
  const calls = []
  const orig = globalThis.fetch
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    return { ok: true, status: 200, json: async () => ({ images: [{ inferResult: 'SUCCESS', fields: [{ inferText: '거동 상태 혼자 걷습니다', lineBreak: true }, { inferText: '연락 kim@test.co.kr', lineBreak: true }] }] }) }
  }
  try {
    const base = { method: 'POST', headers: { host: 'a', cookie: `miri_s=${tok}`, 'x-real-ip': '4.4.4.4' } }
    let res = mockRes(); await I.default({ ...base, body: { mimeType: 'image/png', data: png } }, res)
    assert.equal(res.code, 400); assert.equal(res.body.error.code, 'VIRTUAL_ONLY'); assert.equal(calls.length, 0)
    res = mockRes(); await I.default({ ...base, body: { mimeType: 'image/png', data: png, virtualOnly: true } }, res)
    assert.equal(res.code, 422); assert.equal(res.body.error.code, 'PII_REMAINS')
    assert.equal(calls.filter((u) => /clovastudio/.test(u)).length, 0)
    res = mockRes(); await N.default({ ...base, body: { text: '김가상님 연락처 kim@test.co.kr', virtualOnly: true } }, res)
    assert.equal(res.code, 422)
    assert.equal(calls.filter((u) => /clovastudio/.test(u)).length, 0)
  } finally { globalThis.fetch = orig }
})

const { resolveVillages } = await import('../src/lib/scenario.js')
const { buildContext, runBaseline, planDispatch, helperQualifies } = await import('../src/lib/assign.js')
const t0 = Date.UTC(2026, 3, 5, 0, 0)

await ok('R6 정원 0 시설로는 보내지 않고, 자리 없는 인원은 배정하지 않는다', () => {
  const villages = [{ code: 'V', shelterCode: 'S', drive: [['S', 1, 1]] }]
  const persons = ['a', 'b', 'c'].map((c) => ({ code: c, villageCode: 'V', grade: 'walk' }))
  const r = resolveVillages({ villages, persons, scenario: { affected: ['V'] }, shelters: [{ code: 'S', capacity: 0, villageCode: 'X' }] })
  assert.equal(r.villages[0].shelterNote, 'overflow'); assert.equal(r.villages[0].roundTripMin, null)
  assert.ok(!(r.shelterLoad.S > 0))
  const plan = runBaseline(buildContext({ persons, villages: r.villages, vehicles: [{ code: 'B', type: 'bus' }], t0 }))
  assert.equal(plan.unserved.length, 3)
})

await ok('R6 나눠 보낼 때 남는 인원은 정원이 찬 시설에 넣지 않고, 회차마다 목적지를 단다', () => {
  const shelters = [{ code: 'S1', capacity: 1, villageCode: 'X' }, { code: 'S2', capacity: 1, villageCode: 'Y' }]
  const villages = [{ code: 'V', shelterCode: 'S1', drive: [['S1', 1, 1], ['S2', 50, 40]] }]
  const persons = ['a', 'b', 'c'].map((c) => ({ code: c, villageCode: 'V', grade: 'walk' }))
  const r = resolveVillages({ villages, persons, scenario: { affected: ['V'] }, shelters, settings: { boardingMinutes: 20 } })
  assert.equal(r.villages[0].shelterCap, 2)
  assert.deepEqual(r.shelterLoad, { S1: 1, S2: 1 })
  const ctx = buildContext({ persons, villages: r.villages, vehicles: [{ code: 'C', type: 'car' }], helpers: [{ code: 'H', grades: ['walk'], villages: [] }], t0, arrivals: { V: t0 + 8 * 3600000 } })
  const plan = runBaseline(ctx)
  assert.equal(plan.unserved.length, 1); assert.equal(plan.unserved[0].reason, 'noShelterRoom')
  const shelterSet = new Set(plan.trips.flatMap((t) => t.shelters))
  assert.deepEqual([...shelterSet].sort(), ['S1', 'S2'])
})

await ok('R7 교체 도우미는 활성 상태이고 회차의 모든 등급을 지원해야 한다', async () => {
  assert.equal(helperQualifies({ active: false, grades: ['assist', 'walk'] }, ['assist']), false)
  assert.equal(helperQualifies({ grades: ['walk'] }, ['assist', 'walk']), false)
  assert.equal(helperQualifies({ grades: ['assist', 'walk'] }, ['assist', 'walk']), true)
  const { useDispatchStore } = await import('../src/store/useDispatchStore.js')
  const { useMiriStore } = await import('../src/store/useMiriStore.js')
  const D = useDispatchStore
  D.getState().start({ kind: 'drill', speed: 60 })
  D.getState().runAssign()
  D.getState().confirmAndSend()
  const a = D.getState().result.assignments.find((x) => x.helperCodes.length && x.trips.some((t) => t.grade === 'assist'))
  const grades = [...new Set(a.trips.map((t) => t.grade))]
  const bad = { code: 'H-000', villages: [], grades: ['walk'], active: false }
  useMiriStore.setState((s) => ({ helpers: [bad, ...s.helpers] }))
  const next = D.getState().replaceHelper(a.helperCodes[0])
  assert.notEqual(next, 'H-000')
  if (next) assert.ok(helperQualifies(useMiriStore.getState().helpers.find((h) => h.code === next), grades.filter((g) => g !== 'bed')))
  D.getState().reset()
})

await ok('R9 요청과 AI 응답 형식 검사', async () => {
  assert.equal(I.validateRequest({ mimeType: 'image/png', data: 123, virtualOnly: true }).code, 'BAD_INPUT')
  assert.equal(I.validateRequest({ mimeType: 'image/png', data: '!!!', virtualOnly: true }).code, 'BAD_INPUT')
  assert.equal(I.validateRequest({ mimeType: 'image/png', data: Buffer.from('%PDF-1').toString('base64'), virtualOnly: true }).code, 'BAD_INPUT')
  assert.equal(I.validateRequest(null).code, 'BAD_JSON')
  assert.throws(() => I.itemsOf(null)); assert.throws(() => I.itemsOf({ items: 'x' })); assert.throws(() => I.itemsOf(5))
  assert.deepEqual(I.itemsOf({ items: [null, 3, { id: 'S1', grade: 'zzz', confidence: 'high', quote: 'q' }] }).map((x) => x.grade), [null])
  assert.throws(() => N.judgeNote({ changed: 'false', grade: 'wheelchair', quote: '휠체어' }, '휠체어'))
  assert.equal(N.validateRequest({ text: '안녕', current: { grade: 'zzz' }, virtualOnly: true }).code, 'BAD_INPUT')
  assert.equal(N.validateRequest({ text: '안녕', current: { grade: 'walk', tags: 'x' }, virtualOnly: true }).code, 'BAD_INPUT')
  assert.deepEqual(N.validateRequest({ text: '안녕', current: { grade: 'walk', tags: ['oxygen', 'zz'] }, virtualOnly: true }).current, { grade: 'walk', tags: ['oxygen'] })
  // 모델이 JSON 이지만 객체가 아닌 값을 내면 형식 오류
  process.env.NCP_CLOVASTUDIO_KEY = 'y'
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: { code: '20000' }, result: { message: { content: 'null' } } }) })
  try { await assert.rejects(ncp.hcxJson('s', 'u'), (e) => e.code === 'PARSE') } finally { globalThis.fetch = orig }
  // 화면 쪽: 성공 응답이어도 형식이 틀리면 빈 결과로 넘기지 않는다
  const { readNote } = await import('../src/lib/notes.js')
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ hello: 1 }) })
  try { await assert.rejects(readNote({ text: '안녕', current: { grade: 'walk', tags: [] } }), (e) => e.code === 'BAD_RESPONSE') } finally { globalThis.fetch = orig }
})

console.log(`\n${n}개 시험 통과`)

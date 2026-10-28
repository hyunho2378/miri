// 회신 반영 D묶음 회귀 시험: 자료 기준 시각과 갱신 지연 판정, 재난문자 파서와 승인 대기.
import assert from 'node:assert/strict'
import { freshness, MAX_LAG_MIN } from '../src/lib/freshness.js'

let passed = 0
const t = async (name, fn) => { await fn(); passed++; console.log('ok', name) }
const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
process.env.DATA_GO_KR_KEY = 'TEST'
delete process.env.SAFETYDATA_KEY
const mod = await import('../api/opendata.js')
const call = async (kind, impl) => { globalThis.fetch = impl; const res = mkRes(); await mod.default({ method: 'GET', query: { kind } }, res); return res }
const textRes = (text) => ({ ok: true, status: 200, text: async () => text })
const jsonRes = (j) => ({ ok: true, status: 200, json: async () => j })

await t('응급실 응답에 기관 입력 시각이 asOf 로 붙는다', async () => {
  const res = await call('er', async () => textRes('<response><header><resultCode>00</resultCode></header><body><items><item><dutyName>동해병원</dutyName><hvec>5</hvec><hvidate>20261021113000</hvidate></item></items></body></response>'))
  assert.equal(res.code, 200)
  assert.equal(res.body.asOf, '2026-10-21T02:30:00.000Z')
  assert.equal(res.body.asOfBasis, '가장 오래된 기관 입력 시각')
  assert.equal(res.body.empty, false)
})

await t('응급실 0건은 empty 로 표시되고 판정이 누락 가능으로 나온다', async () => {
  const res = await call('er', async () => textRes('<response><header><resultCode>00</resultCode></header><body><items></items></body></response>'))
  assert.equal(res.body.empty, true)
  assert.equal(freshness('er', res.body).state, 'empty')
})

await t('허용 지연을 넘으면 갱신 지연, 안이면 정상', async () => {
  const asOf = '2026-10-21T00:00:00.000Z'
  const base = Date.parse(asOf)
  const stale = freshness('er', { asOf, asOfBasis: '기관 입력 시각', fetchedAt: asOf }, base + (MAX_LAG_MIN.er.min + 1) * 60000)
  assert.equal(stale.state, 'stale')
  assert.match(stale.label, /갱신 지연/)
  assert.equal(freshness('er', { asOf, fetchedAt: asOf }, base + 60 * 60000).state, 'ok')
})

await t('특보 발표 시각은 기상청 YYYYMMDDHHmm 을 한국 시간으로 읽는다', async () => {
  const res = await call('warning', async () => jsonRes({ response: { body: { items: { item: [{ tmFc: '202610211200', t6: 'o 건조주의보 : 강원도(동해시)' }] } } } }))
  assert.equal(res.body.asOf, '2026-10-21T03:00:00.000Z')
  assert.equal(res.body.asOfBasis, '발표 시각')
})

await t('등록 목록형 자료는 지연 판정 없이 조회 시각만', async () => {
  assert.equal(freshness('access', { fetchedAt: '2026-10-21T00:00:00.000Z', list: [{}], empty: false }).state, 'static')
})

await t('재난문자: 키가 없으면 승인 대기와 신청일, 공공데이터 키 없이도 응답', async () => {
  delete process.env.DATA_GO_KR_KEY
  const res = await call('alerts', async () => { throw new Error('호출하면 안 됨') })
  process.env.DATA_GO_KR_KEY = 'TEST'
  assert.equal(res.code, 200)
  assert.equal(res.body.status, 'pending')
  assert.equal(res.body.appliedAt, '2026. 10. 20.')
  assert.equal(freshness('alerts', res.body).state, 'pending')
})

await t('재난문자 파서: 동해시 수신만, 일련번호 중복 제거, 공식 단계 그대로, 최신순', async () => {
  const rows = [
    { SN: '1', CRT_DT: '2026/10/20 09:00:00', MSG_CN: '산불 발생', RCPTN_RGN_NM: '강원특별자치도 동해시', EMRG_STEP_NM: '긴급재난', DST_SE_NM: '산불' },
    { SN: '1', CRT_DT: '2026/10/20 09:00:00', MSG_CN: '중복', RCPTN_RGN_NM: '강원특별자치도 동해시', EMRG_STEP_NM: '긴급재난', DST_SE_NM: '산불' },
    { SN: '2', CRT_DT: '2026-10-21 08:00:00', MSG_CN: '건조', RCPTN_RGN_NM: '강원특별자치도 동해시, 강원특별자치도 삼척시', EMRG_STEP_NM: '안전안내', DST_SE_NM: '건조' },
    { SN: '3', CRT_DT: '2026-10-21 10:00:00', MSG_CN: '다른 지역', RCPTN_RGN_NM: '강원특별자치도 강릉시', EMRG_STEP_NM: '긴급재난', DST_SE_NM: '산불' }
  ]
  const out = mod.parseAlerts(rows, '동해시', Date.parse('2026-10-22T00:00:00.000Z'))
  assert.deepEqual(out.map((m) => m.id), ['2', '1'])
  assert.equal(out[1].step, '긴급재난')
  assert.equal(out[0].at, '2026-10-20T23:00:00.000Z')
})

await t('재난문자: 키가 있으면 동해시로 조회하고 결과코드 오류는 502', async () => {
  process.env.SAFETYDATA_KEY = 'K'
  const recentKst = new Date(Date.now() - 3600 * 1000 + 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  let url = ''
  const ok = await call('alerts', async (u) => { url = decodeURIComponent(u); return jsonRes({ header: { resultCode: '00' }, body: [{ SN: '9', CRT_DT: recentKst, MSG_CN: 'x', RCPTN_RGN_NM: '강원특별자치도 동해시', EMRG_STEP_NM: '안전안내', DST_SE_NM: '기타' }] }) })
  assert.match(url, /DSSP-IF-00247/)
  assert.match(url, /rgnNm=동해시/)
  assert.equal(ok.body.status, 'ok')
  assert.equal(ok.body.list.length, 1)
  assert.equal(ok.body.asOfBasis, '최근 문자 발송 시각')
  const bad = await call('alerts', async () => jsonRes({ header: { resultCode: '30' } }))
  assert.equal(bad.code, 502)
  delete process.env.SAFETYDATA_KEY
})

console.log(`\n${passed}개 시험 통과`)

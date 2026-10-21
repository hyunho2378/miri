// 공공데이터 추가 연계 회귀 시험. 실제 키 없이 fetch 를 바꿔 끼워 응답 해석만 확인한다.
import assert from 'node:assert/strict'
import { FOREST_FIRE_ROWS } from '../src/data/forestFireHistory.js'

let passed = 0
const t = async (name, fn) => { await fn(); passed++; console.log('ok', name) }
const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
process.env.DATA_GO_KR_KEY = 'TEST'
const { default: handler } = await import('../api/opendata.js')
const call = async (kind, impl) => { globalThis.fetch = impl; const res = mkRes(); await handler({ method: 'GET', query: { kind } }, res); return res }
const textRes = (text, ok = true) => ({ ok, status: ok ? 200 : 500, text: async () => text })

await t('응급실: 강원특별자치도로 비면 강원도로 다시 묻고 병상과 기관 입력 시각을 돌려준다', async () => {
  const seen = []
  const res = await call('er', async (url) => {
    seen.push(decodeURIComponent(url))
    if (seen.length === 1) return textRes('<response><header><resultCode>00</resultCode></header><body><items></items></body></response>')
    return textRes('<response><header><resultCode>00</resultCode></header><body><items><item><dutyName>동해병원</dutyName><hvec>5</hvec><hvidate>20261020213000</hvidate></item></items></body></response>')
  })
  assert.equal(res.code, 200)
  assert.ok(seen[0].includes('STAGE1=강원특별자치도') && seen[1].includes('STAGE1=강원도'))
  assert.deepEqual(res.body.list[0], { name: '동해병원', erBeds: 5, tel: null, updatedAt: '20261020213000', asOf: '2026-10-20T12:30:00.000Z' })
})

await t('응급실: 결과코드가 정상이 아니면 502 와 사유를 돌려준다(빈 성공으로 숨기지 않음)', async () => {
  const res = await call('er', async () => textRes('<response><header><resultCode>30</resultCode></header></response>'))
  assert.equal(res.code, 502)
  assert.match(res.body.error.message, /결과코드 30/)
})

await t('장애인편의시설: servList 항목을 읽고 좌표를 숫자로 바꾼다', async () => {
  const res = await call('access', async () => textRes('<response><resultCode>0</resultCode><servList><faclNm>동해시청</faclNm><wfcltId>A1</wfcltId><faclLat>37.52</faclLat><faclLng>129.11</faclLng><lcMnad>동해시 천곡로 77</lcMnad></servList></response>'))
  assert.equal(res.code, 200)
  assert.equal(res.body.count, 1)
  assert.equal(res.body.list[0].lat, 37.52)
})

await t('산불 이력 스냅샷은 원자료 값과 같다', async () => {
  const ok = FOREST_FIRE_ROWS.find((r) => r.start === '2022-03-05 01:08')
  assert.equal(ok.areaHa, 4190.38)
  assert.equal(FOREST_FIRE_ROWS.filter((r) => r.place.startsWith('동해')).length, 3)
})

console.log(`\n${passed}개 시험 통과`)

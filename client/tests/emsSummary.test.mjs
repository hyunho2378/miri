import test from 'node:test'
import assert from 'node:assert/strict'
import { emsSummary } from '../api/opendata.js'

test('구급통계 요약은 집, 70세 이상, 80세 이상 비율과 병력 상위를 계산한다', () => {
  const s = emsSummary({ 집: 60, 도로: 40 }, { '60~69세': 30, '70~79세': 30, '80세 이상': 40 }, { 고혈압: 50, 당뇨: 30, 없음: 99, 기타: 80, 암: 10, 폐질환: 5 })
  assert.equal(s.total, 100)
  assert.deepEqual(s.home, { count: 60, share: 60 })
  assert.deepEqual(s.age80, { count: 40, share: 40 })
  assert.deepEqual(s.age70, { count: 70, share: 70 })
  assert.deepEqual(s.historyTop.map((x) => x.name), ['고혈압', '당뇨', '암'])
})

test('이송환자가 0명이면 비율은 0이다', () => {
  const s = emsSummary({}, {}, {})
  assert.equal(s.total, 0)
  assert.equal(s.home.share, 0)
})

import { platformSummary } from '../api/opendata.js'
test('플랫폼 집계 요약은 총 건수와 증상 상위 세 개를 돌려준다', () => {
  const s = platformSummary(7190, { items: [{ seasnNm: '여름', rowCount: 10 }, { seasnNm: '봄', rowCount: 5 }] }, { items: [{ ptnSymSeNm: '호흡곤란', rowCount: 210 }, { ptnSymSeNm: '기타', rowCount: 999 }, { ptnSymSeNm: '흉통', rowCount: 88 }, { ptnSymSeNm: '타박상', rowCount: 115 }, { ptnSymSeNm: '화상', rowCount: 9 }] })
  assert.equal(s.total, 7190)
  assert.deepEqual(s.symptomsTop.map((x) => x.name), ['호흡곤란', '타박상', '흉통'])
  assert.equal(s.seasons.length, 2)
})

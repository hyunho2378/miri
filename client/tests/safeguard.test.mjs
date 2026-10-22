// 낮게 판정 막는 사후 검사, 띄어쓰기 무시 원문 대조, 표 머리줄 판정(공모전/AI검증/오류분석_20261022.md)
import test from 'node:test'
import assert from 'node:assert/strict'
import { cueOf, upgradePerson, applySafeguard, personChunks } from '../src/lib/safeguard.js'
import { quoteIn } from '../src/lib/quote.js'
import { segment, detectedPersonCount } from '../api/intake.js'

test('단서: 걷지 못함 계열은 휠체어, 누운 채는 침상', () => {
  assert.equal(cueOf('발을 디뎌 걷는 것이 안 됨.').grade, 'wheelchair')
  assert.equal(cueOf('들것에 눕힌 채 운송 필요').grade, 'bed')
  assert.equal(cueOf('침대 밖에 앉힐 수 없는 상태').grade, 'bed')
})
test('단서: 부정과 보조 표현은 올리지 않음', () => {
  assert.equal(cueOf('휠체어나 보행기는 쓰지 않음, 혼자 집 밖으로 나옴'), null)
  assert.equal(cueOf('보행기 없이는 걷지 못하며 짧은 거리만 걸음').grade, 'assist')
  assert.equal(cueOf('가끔 휠체어를 빌려 쓰지만 차 앞까지 혼자 걸었고'), null)
  assert.equal(cueOf('인공호흡기 사용, 혼자 걸음'), null)
})
test('사람: 높은 단서면 올리고 이유를 남김, 내리지 않음', () => {
  const p = upgradePerson({ grade: 'walk', quote: '발을 디뎌 걷는 것이 안 됨.' }, '발을 디뎌 걷는 것이 안 됨.')
  assert.equal(p.grade, 'wheelchair'); assert.equal(p.reason, 'cueUpgrade'); assert.equal(p.modelGrade, 'walk')
  assert.equal(upgradePerson({ grade: 'bed', quote: '혼자 걸음' }, '보행기').grade, 'bed')
  assert.equal(upgradePerson({ grade: 'unknown', quote: '' }, '보행 불가').grade, 'unknown')
})
test('문서: 번호 단위로 맞으면 그 사람 글로 검사', () => {
  const t = '1 [이름 가림] 혼자 걸음. 2 [이름 가림] 등을 세우지 못하고 앉을 수 없음. 들것에 눕힌 채 운송 필요.'
  assert.equal(personChunks(t).length, 2)
  const out = applySafeguard([{ grade: 'walk', quote: '혼자 걸음.' }, { grade: 'unknown', quote: '' }], t)
  assert.equal(out[0].grade, 'walk'); assert.equal(out[1].grade, 'bed')
})
test('원문 대조: 줄바꿈 띄어쓰기와 말줄임만 무시', () => {
  assert.ok(quoteIn('휠체어 에 앉은 채 리프트 차량으로 이동 가 능.', '휠체어에 앉은 채 리프트 차량으로 이동 가능'))
  assert.ok(quoteIn('다만 보행기를 밀 어야 짧은 거리라도 걸을 수 있음.', '…보행기를 밀어야 짧은 거리라도 걸을 수 있음.'))
  assert.ok(!quoteIn('보행기를 밀어야 걸음', '휠체어 필요'))
  assert.ok(!quoteIn('아무 글', 'x'))
})
test('표 머리줄: 열 이름이 따로 줄에 있어도 빈칸 대상자로 만들지 않음', () => {
  const m = ['번호', '인적사항 / 연락처', '거동 상태', '1', '[이름 가림]', '앉기 불가', '2', '[이름 가림]', '혼자 걸음']
  assert.equal(segment(m).length, 0)
  assert.equal(detectedPersonCount(m), 2)
})
import { verifyDims } from '../src/lib/rubric.js'
test('판정 기준표: 점수 방향 모순이면 그 차원을 비움', () => {
  const v = verifyDims({ D1: { score: 1, quote: '발을 디뎌 걷는 것이 안 됨.' }, D3: { score: 4, quote: '휠체어 필요' } }, '발을 디뎌 걷는 것이 안 됨. 휠체어 필요')
  assert.equal(v.D1.score, null); assert.equal(v.D1.reason, 'directionConflict'); assert.equal(v.D3.score, 4)
})

// 회신 R36: 등급 미확정은 낮은 쪽이 아니라 휠체어와 확인 필요로
import assert from 'node:assert/strict'
import { verifyResult, planningGrade } from '../src/lib/intake.js'
let n = 0
const t = (name, fn) => { fn(); n++; console.log('ok', name) }
t('판독 불가(unknown)는 휠체어와 확인 필요', () => {
  const v = verifyResult('거동 상태: 판독 불가', { grade: 'unknown', quote: '판독 불가', confidence: 'low' })
  assert.equal(v.grade, 'wheelchair'); assert.equal(v.gradeUncertain, true); assert.equal(v.aiGrade, 'unknown')
})
t('근거가 원문에 없는 부축 판정은 휠체어와 확인 필요', () => {
  const v = verifyResult('거동 상태: 거동 불편', { grade: 'assist', quote: '보행기 사용', confidence: 'high' })
  assert.equal(v.confidence, 'low'); assert.equal(v.grade, 'wheelchair'); assert.equal(v.gradeUncertain, true)
})
t('근거가 분명한 부축은 그대로', () => {
  const v = verifyResult('거동 상태: 보행기를 쓰면 걸을 수 있음', { grade: 'assist', quote: '보행기를 쓰면 걸을 수 있음', confidence: 'high' })
  assert.equal(v.grade, 'assist'); assert.equal(v.gradeUncertain, false)
})
t('휠체어와 침상 판정은 확신이 낮아도 내리지 않음', () => {
  assert.deepEqual(planningGrade({ grade: 'bed', confidence: 'low' }), { grade: 'bed', uncertain: false })
  assert.deepEqual(planningGrade({ grade: 'wheelchair', confidence: 'low' }), { grade: 'wheelchair', uncertain: false })
})
t('두 번 검증해도 처음 AI 판정을 기준으로 계산', () => {
  const once = verifyResult('거동 상태: 가끔 휠체어', { grade: 'assist', quote: '가끔 휠체어', confidence: 'low' })
  const twice = verifyResult('거동 상태: 가끔 휠체어', once)
  assert.equal(twice.aiGrade, 'assist'); assert.equal(twice.grade, 'wheelchair')
})
console.log(`\n${n}개 시험 통과`)

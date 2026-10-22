// 모델 비교 하네스(tools/model-bench) 지표와 기준선 단위 시험
import test from 'node:test'
import assert from 'node:assert/strict'
import { finalGrade, score, repro, quoteMatchRate } from '../../tools/model-bench/metrics.mjs'
import { ruleGrade } from '../../tools/model-bench/adapters/rule.mjs'
import { trainNB } from '../../tools/model-bench/adapters/clf.mjs'
import { makeSet } from '../../tools/model-bench/synth.mjs'
import { fromGradeOut } from '../../tools/model-bench/adapters/llm.mjs'

test('최종 등급: 판독 불가와 근거 약한 도보, 부축은 휠체어', () => {
  assert.equal(finalGrade('unknown', 'high'), 'wheelchair')
  assert.equal(finalGrade('walk', 'low'), 'wheelchair')
  assert.equal(finalGrade('assist', 'low'), 'wheelchair')
  assert.equal(finalGrade('assist', 'mid'), 'assist')
  assert.equal(finalGrade('bed', 'low'), 'bed')
})

test('지표: 낮게, 높게, 보류를 나눠 센다', () => {
  const s = score([
    { truth: 'bed', det: true, pred: 'wheelchair', conf: 'mid' },
    { truth: 'walk', det: true, pred: 'assist', conf: 'mid' },
    { truth: 'assist', det: true, pred: 'assist', conf: 'high' },
    { truth: 'assist', det: true, pred: 'unknown', conf: 'low' },
    { truth: 'wheelchair', det: false, pred: 'unknown', conf: 'low' }
  ])
  assert.equal(s.nDet, 4)
  assert.equal(s.final.exact, 1)
  assert.equal(s.final.under, 1)
  assert.equal(s.final.over, 2)
  assert.equal(s.raw.abstain, 1)
  assert.equal(s.nondet.deferred, 1)
})

test('지표: 서비스가 실제로 정한 최종 등급이 있으면 그것을 쓴다', () => {
  const s = score([{ truth: 'walk', det: true, pred: 'walk', conf: 'high', final: 'wheelchair' }])
  assert.equal(s.final.over, 1)
})

test('재현: 모든 반복이 같은 항목 비율', () => {
  assert.deepEqual(repro([['a', 'b', 'c'], ['a', 'b', 'x']]), { items: 3, runs: 2, allSame: 2, allSamePct: 66.7 })
})

test('근거 원문 일치: 공백 차이는 무시, 빈 근거는 불일치', () => {
  const q = quoteMatchRate([{ text: '지팡이를  짚고 걸음', quote: '지팡이를 짚고' }, { text: '휠체어', quote: '' }])
  assert.equal(q.matched, 1)
  assert.equal(q.n, 2)
})

test('규칙 기준선: 여러 등급 낱말이면 높은 쪽, 근거 약함', () => {
  assert.deepEqual(ruleGrade('부축 또는 휠체어').pred, 'wheelchair')
  assert.equal(ruleGrade('부축 또는 휠체어').conf, 'low')
  assert.equal(ruleGrade('다른 사람을 붙잡지 않고 혼자 걸어 나옴').pred, 'walk')
  assert.equal(ruleGrade('판독 불가').pred, 'unknown')
  assert.equal(ruleGrade('').pred, 'unknown')
})

test('가상 묶음: 시드가 같으면 같은 문장, 학습과 시험 문장이 겹치지 않음', () => {
  const a = makeSet('train', 50, 3), b = makeSet('train', 50, 3)
  assert.deepEqual(a, b)
  const train = new Set(makeSet('train', 400, 3).map((x) => x.text))
  const overlap = makeSet('test', 120, 7).filter((x) => train.has(x.text))
  assert.equal(overlap.length, 0)
})

test('작은 분류기: 결정적이고 빈 글은 보류', () => {
  const m = trainNB(makeSet('train', 400, 3))
  assert.deepEqual(m.predict('휠체어에 앉은 채로 이동'), m.predict('휠체어에 앉은 채로 이동'))
  assert.equal(m.predict('').pred, 'unknown')
})

test('LLM 출력 해석: items 배열과 단일 객체 모두, 모르는 등급은 판독 불가', () => {
  assert.equal(fromGradeOut({ items: [{ grade: 'bed', confidence: 'high', quote: '와상' }] }).pred, 'bed')
  assert.equal(fromGradeOut({ grade: 'assist', confidence: 'mid' }).pred, 'assist')
  assert.equal(fromGradeOut({ items: [{ grade: 'stretcher' }] }).pred, 'unknown')
  assert.equal(fromGradeOut(null).parseError, true)
})

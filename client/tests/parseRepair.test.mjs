// 루브릭 출력에서 관찰된 닫는 괄호 누락(재현성 시험 C 55/75, D 69/75)을 서버 해석기가 짝만 맞춰 읽는지
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseModelJson } from '../api/_ncp.js'

test('닫는 괄호가 빠진 객체를 짝만 맞춰 읽음', () => {
  const v = parseModelJson('{"persons":[{"id":"S1","dims":{"D1":{"score":2,"quote":"부축"}}}]')
  assert.equal(v.persons[0].dims.D1.score, 2)
})
test('정상 JSON 은 그대로', () => {
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 })
})
test('문자열 안 괄호는 세지 않음', () => {
  const v = parseModelJson('{"q":"원문 {괄호] 포함","n":1')
  assert.equal(v.q, '원문 {괄호] 포함')
})
test('닫는 괄호 종류가 어긋나면 빠진 괄호만 넣어 읽음(판정 기준표 v0.1 출력 "}}]}" 관찰)', () => {
  assert.deepEqual(parseModelJson('{"a":[1,2}'), { a: [1, 2] })
  assert.deepEqual(parseModelJson('{"items":[{"id":"P1","dims":{"D1":{"score":5,"quote":"x"}}]}').items[0].dims.D1.score, 5)
})
test('여는 괄호가 없는 닫는 괄호는 실패', () => {
  assert.throws(() => parseModelJson('"a"]}'))
})

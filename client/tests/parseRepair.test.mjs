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
test('짝이 어긋난 글은 보정하지 않고 실패', () => {
  assert.throws(() => parseModelJson('{"a":[1,2}'))
})

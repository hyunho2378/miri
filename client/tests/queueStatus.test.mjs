// 셀 47 검토 반영: 도우미 전송 대기 요약
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { queueSummary, queueRowSubtitle } from '../src/lib/queueStatus.js'

const t0 = new Date(2026, 9, 24, 20, 5).getTime()

test('보일 것이 없으면 null', () => {
  assert.equal(queueSummary({ pending: 0, rejected: [] }), null)
})

test('대기 0, 서버가 받지 않은 보고만 있어도 표시', () => {
  const s = queueSummary({ pending: 0, rejected: [{ key: 'a' }] })
  assert.equal(s.title, '보내지 못한 보고 1건')
  assert.match(s.subtitle, /담당자에게 전화로 알림/)
})

test('대기 보고는 마지막 연결 시각 함께', () => {
  assert.match(queueSummary({ pending: 2, rejected: [], lastOk: t0 }).subtitle, /마지막 연결 20:05/)
  assert.match(queueSummary({ pending: 2, rejected: [] }).subtitle, /아직 연결 기록 없음/)
  assert.equal(queueSummary({ pending: 1, rejected: [{ key: 'b' }], lastOk: t0 }).title, '전송 대기 1건, 보내지 못한 보고 1건')
})

test('대기 목록 한 줄에 보관 시각', () => {
  assert.equal(queueRowSubtitle({ at: t0 }), '전송 대기, 20:05 보관')
  assert.equal(queueRowSubtitle({}), '전송 대기')
})

test('도우미 화면이 요약 함수를 씀', () => {
  const src = readFileSync(new URL('../src/mobile/helper/HelperScreens.jsx', import.meta.url), 'utf8')
  assert.ok(!src.includes('m.pending > 0 &&'))
  assert.equal((src.match(/queueSummary\(m\)/g) || []).length, 3) // 목록, 끝, 지금 차례(14회차)
  assert.ok(src.includes('subtitle={queueRowSubtitle(q)}'))
})

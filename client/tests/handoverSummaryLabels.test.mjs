// 소방 인계 화면: 같은 이름이 다른 숫자를 가리키지 않게 나눈 이름(2026. 11. 1.)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8')

test('소방 인계 요약 줄은 인계 대기와 소방 인계 완료, 표 제목만 소방 인계 대상(전체)', () => {
  const h = src('pages/console/HandoverPage.jsx')
  assert.ok(h.includes('>인계 대기</dt>') && h.includes('>소방 인계 완료</dt>'))
  assert.ok(!h.includes('>소방 인계 대상</dt>'))
  assert.ok(h.includes('title="소방 인계 대상"'))
})

// 발령 단계 표시: 굵은 막대 5칸 균등, 색 둘(파랑, 회색), 번호 원과 얇은 선 없음(사용자 피드백 2026. 10. 23.)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../src/components/miri/StepIndicator.jsx', import.meta.url), 'utf8')

test('단계 표시: 같은 폭 5칸, 굵은 막대, 얇은 연결선과 번호 원 없음', () => {
  assert.match(src, /grid-cols-5/)
  assert.match(src, /h-2 w-full rounded-full/)
  assert.ok(!src.includes('h-px'))
  assert.ok(!src.includes('lucide-react'))
  assert.ok(!/h-7 w-7/.test(src))
  assert.ok(!src.includes('border'))
})

test('단계 표시: 색은 bg-primary 와 bg-line-strong 둘뿐', () => {
  const bg = [...new Set(src.match(/bg-[a-z-]+/g))].sort()
  assert.deepEqual(bg, ['bg-line-strong', 'bg-primary'])
})

test('단계 상태: 지난 단계와 현재는 채움, 남은 단계는 회색', async () => {
  const body = src.split('export default')[0].replace(/^import .*$/gm, '').replace(/export /g, '')
  const fn = new Function(body + '; return stepStates')()
  assert.deepEqual(fn('idle'), ['current', 'todo', 'todo', 'todo', 'todo'])
  assert.deepEqual(fn('assigned'), ['done', 'done', 'current', 'todo', 'todo'])
  assert.deepEqual(fn('sent'), ['done', 'done', 'done', 'current', 'todo'])
  assert.deepEqual(fn('closed'), ['done', 'done', 'done', 'done', 'current'])
})

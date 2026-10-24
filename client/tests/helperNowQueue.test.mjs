// 도우미 지금 차례 화면 전송 대기 표시 시험(14회차 로컬 화면 검수).
// 끊김 상태를 실제로 만들어 보니 대기 보고 3건이 있어도 지금 차례 화면에는 표시가 없어, 도우미가 보낸 줄로 알 수 있었다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const src = readFileSync(new URL('../src/mobile/helper/HelperScreens.jsx', import.meta.url), 'utf8')
const body = (name) => {
  const i = src.indexOf(`function ${name}(`)
  assert.ok(i >= 0, name)
  const j = src.indexOf('\nfunction ', i + 10)
  return src.slice(i, j < 0 ? undefined : j)
}

test('지금 차례 화면은 전송 대기 요약을 계산하고 보여 줌', () => {
  const s = body('TransportScreen')
  assert.ok(/const nowQs = queueSummary\(m\)/.test(s))
  assert.ok(/nowQs && <List label="전송 대기">/.test(s))
})

test('전송 대기 줄을 누르면 전송 대기 목록으로 감', () => {
  const s = body('TransportScreen')
  assert.ok(/nowQs\.subtitle\} chevron onClick=\{\(\) => go\(\{ name: 'H8' \}\)\}/.test(s))
})

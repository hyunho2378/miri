// 발령 운영 화면 배치 시험: 전송 확인 창은 배정 검토 단계 화면(AssignedPanel) 안에만 있어야 한다.
// 6회차 로컬 화면 검수에서 확인 창이 평시 화면(StartPanel)에 들어가 발령 운영 화면이 열리지 않던 문제를 막는다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const src = readFileSync(new URL('../src/pages/console/DispatchPage.jsx', import.meta.url), 'utf8')
const body = (name) => {
  const i = src.indexOf(`function ${name}(`)
  assert.ok(i >= 0, name)
  const j = src.indexOf('\nfunction ', i + 10)
  return src.slice(i, j < 0 ? undefined : j)
}

test('평시 화면에는 전송 확인 창 상태를 쓰지 않음', () => {
  const s = body('StartPanel')
  assert.ok(!/sendOpen|setSendOpen|confirmAndSend/.test(s))
})

test('배정 검토 화면은 전송 확인 창 상태를 선언하고 씀', () => {
  const s = body('AssignedPanel')
  assert.ok(/const \[sendOpen, setSendOpen\] = useState\(false\)/.test(s))
  assert.ok(/open=\{sendOpen\}/.test(s))
  assert.ok(/sendConfirmLines\(result\)/.test(s))
})

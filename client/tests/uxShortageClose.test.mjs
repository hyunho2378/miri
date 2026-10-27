// 부족분 계산 화면 한 흐름과 발령 종료 위치(사용자 피드백 2026. 10. 23.)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('부족분 계산: 결론 문장이 먼저, 내부 메모 문장 없음, 좌우 두 칸 없음', () => {
  const src = read('../src/pages/console/ShortagePage.jsx')
  assert.match(src, /기한 안에 못 옮기는 사람 \$\{result\.total\}명/)
  assert.match(src, /무엇을 늘리면 줄어드나/)
  assert.match(src, /계산 방법과 근거/)
  assert.ok(!src.includes('근거가 한 곳뿐'))
  assert.ok(!src.includes('가정값 점검'))
  assert.ok(!src.includes('lg:grid-cols-2'))
  assert.ok(!src.includes('xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]'))
})

test('발령 종료: 콘솔은 배정 전과 전송 전에도 단계 표시줄 옆, 휴대폰은 시 관리자만', () => {
  const dp = read('../src/pages/console/DispatchPage.jsx')
  assert.match(dp, /function CloseControl/)
  assert.match(dp, /발령 종료는 시 관리자가 합니다/)
  const fs = read('../src/mobile/field/FieldScreens.jsx')
  assert.match(fs, /function CloseDispatch/)
  assert.match(fs, /if \(isDong\) return/)
})

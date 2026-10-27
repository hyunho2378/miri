// 공무원과 심사위원 시점 마무리 점검(2026. 10. 27.): 배정 검토 결론 숫자, 이송 진행 할 일 순서, 소방 인계 단추, 로그인 시연 코드 안내
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('배정 검토: 결론 숫자(배정표 기준 이동 불가 인원)를 본문 크기로, 회차 수와 개발 설명 줄은 없음', () => {
  const s = read('../src/pages/console/DispatchPage.jsx')
  assert.match(s, /title="배정표 확인"/)
  assert.match(s, /배정표 기준 이동 불가 인원/)
  assert.doesNotMatch(s, /type-display/)
  assert.doesNotMatch(s, /\$\{trips\}회차/)
  assert.doesNotMatch(s, /평시 현황판 값은 발령 직후 출발을 가정해/)
})

test('이송 진행: 미배정이 남으면 소방 지원 요청이 먼저, 발령 종료는 뒤', () => {
  const s = read('../src/pages/console/DispatchPage.jsx')
  const ask = s.indexOf('명 소방 지원 요청</Button>')
  const close = s.indexOf("onClick={() => setConfirmClose(true)}>발령 종료</Button>")
  assert.ok(ask > 0 && close > ask)
  assert.match(s, /variant=\{waitingFire\.length > 0 \? 'secondary' : 'danger'\}/)
})

test('훈련 배너와 소방 인계: 개발 말 없이 할 일로', () => {
  assert.doesNotMatch(read('../src/components/miri/DispatchBanner.jsx'), /시뮬레이션/)
  assert.match(read('../src/pages/console/HandoverPage.jsx'), /'선택 후 소방 인계'/)
})

test('로그인: 접속 코드는 선택이고 코드 없이도 모든 화면을 본다', () => {
  const s = read('../src/pages/console/LoginPage.jsx')
  assert.match(s, /접속 코드\(선택\)/)
  assert.match(s, /코드 없이 모든 화면 사용 가능/)
  assert.doesNotMatch(s, /서버 저장<\/p>/)
})

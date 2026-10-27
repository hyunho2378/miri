// 화면 2차 정리 B(2026. 10. 27. 공무원 시점 검수): 발령 운영, 소방 인계, 이송 기록, 서류 읽기, 현장 소식, 설정
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8')

test('배정 검토: 단추는 행동 동사, 현재 단계 중복 줄과 시연 속도 설명 없음, 등급 가중 점수 없음', () => {
  const d = src('pages/console/DispatchPage.jsx')
  assert.ok(d.includes('>배정표 보내기<') && d.includes('>배정 다시 계산<'))
  assert.ok(!d.includes('현재 단계: {step}'))
  assert.ok(!d.includes('시연 속도입니다'))
  assert.ok(!d.includes('10초 주기') && !d.includes('새로고침 뒤에도'))
  assert.ok(d.includes('배정표 전체 보기(차량 ${result.assignments.length}대)'), '배정표 전체는 접힘(결론, 할 일 다음 근거)')
  const b = src('components/miri/BaselineCompare.jsx')
  assert.ok(!b.includes('등급 가중 미이송') && !b.includes('등급 가중치'))
})

test('이송 진행 카드는 넷(이송 중, 인계 완료, 소방 인계, 확인 필요)이고 합은 8단계 합과 같음', () => {
  const d = src('pages/console/DispatchPage.jsx')
  for (const l of ["label: '이송 중'", "label: '인계 완료'", "label: '소방 인계'", "label: '확인 필요'"]) assert.ok(d.includes(l), l)
  const keys = ['wait', 'depart', 'arrive', 'board', 'handover', 'handedToFire', 'fail', 'unassigned']
  for (const k of keys) assert.ok(d.match(new RegExp(`keys: \\[[^\\]]*'${k}'`)), k)
})

test('소방 인계: 한 이름(소방 인계 대상), 기준 시각 카드와 가상 주소 표기 없음', () => {
  const h = src('pages/console/HandoverPage.jsx')
  assert.ok(h.includes('title="소방 인계 대상"'))
  assert.ok(!h.includes('구조 대상(기한 안 미이송)'))
  assert.ok(!h.includes('label="목록 기준 시각"'))
  assert.ok(!h.includes("'주소(가상)'"))
})

test('이송 기록 빈 상태는 기록이 어디 남는지 한 줄로', () => {
  const r = src('pages/console/RecordsPage.jsx')
  assert.ok(r.includes('title="아직 기록이 없습니다"') && r.includes('발령을 종료하면 여기에 남습니다.'))
})

test('서류 읽기와 현장 소식: 개발 용어 대신 서류와 같음, 다름, 확인 필요', () => {
  const i = src('pages/console/IntakePage.jsx'); const n = src('pages/console/NotesPage.jsx')
  for (const s of [i, n]) { assert.ok(!s.includes("'원문 일치'") && !s.includes("'확인 권장'")) }
  assert.ok(!i.includes('원문 불일치') && !i.includes('AI 판정') && !i.includes('왼쪽 메뉴의 숫자'))
  assert.ok(!src('components/miri/NoteReview.jsx').includes('시연용 모의 응답'))
})

test('설정: 확인 알림 기준과 실무 말', () => {
  const s = src('pages/console/SettingsPage.jsx')
  assert.ok(s.includes('확인 알림 기준') && s.includes('서류 확인 지연 알림') && s.includes('도우미 응답 대기 시간'))
  assert.ok(!s.includes('이상 탐지 기준값'))
})

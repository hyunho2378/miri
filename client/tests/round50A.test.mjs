// 화면 2차 정리 A(2026. 10. 27. 공무원 시점 검수): 숫자 옆 다음 행동, 현황판 발령 중 상태, 명부 확인 표시
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8')

test('현황판: 결론 숫자 바로 아래 다음 행동 단추, 문장 속 숫자 나열 줄 없음, 첫 화면 동기 추천 탐색 없음', () => {
  const s = read('pages/console/OverviewPage.jsx')
  assert.match(s, />부족분 계산</)
  assert.match(s, /협약 차량 확인/)
  assert.ok(!s.includes('todoSummaryLine'))
  assert.ok(!s.includes('optimizedUnserved('))
  assert.match(s, /useBoardingRecommended\(/)
})

test('현황판: 발령 중에는 발령 진행 값과 발령 운영 단추를 먼저 보임', () => {
  const s = read('pages/console/OverviewPage.jsx')
  assert.match(s, /\['standby', 'assigned', 'sent'\]\.includes\(d\.status\)/)
  assert.match(s, /발령 운영 열기/)
})

test('부족분 계산: 숫자 흐름 한 줄과 숫자 아래 행동 단추, 개발자 말투 제목 없음', () => {
  const s = read('pages/console/ShortagePage.jsx')
  assert.match(s, /<NumberFlow items=\{flow\}/)
  assert.match(read('components/console/NumberFlow.jsx'), /aria-label=\{label\}/)
  assert.match(s, /협약 차량 확인/)
  assert.ok(!s.includes('왜 이런 결과가 나오나'))
  assert.ok(!s.includes('조건을 바꾸면 결과가 바로 다시 계산됩니다'))
})

test('명부: 등급 확인과 당사자 계획 확인을 다른 이름으로 보여 모순으로 읽히지 않음, 상세 첫 줄은 재확인 여부', () => {
  const s = read('pages/console/RosterPage.jsx')
  assert.match(s, /label: '등급 확인'/)
  assert.ok(!s.includes("label: '확인 상태'"))
  const i = s.indexOf("{ label: '당사자와 계획 확인'")
  assert.ok(i > 0 && s.slice(Math.max(0, i - 40), i).includes('<InfoRows rows={['), '상세 첫 줄이 재확인 여부')
  assert.ok(!s.includes('서류 자동 판독'))
  assert.ok(!s.includes('갱신 담당'))
})

test('상황판과 차량: 설명 줄과 낯선 용어 정리', () => {
  assert.ok(!read('pages/console/MapPage.jsx').includes('평시입니다. 지금 등록된'))
  assert.ok(!read('components/map/TimeAxis.jsx').includes('단순 비례 가정으로 계산한 추정치'))
  const r = read('pages/console/ResourcesPage.jsx')
  assert.ok(!r.includes("label: '가용 확실성'"))
  assert.match(r, /한 번에 태우는 수/)
})

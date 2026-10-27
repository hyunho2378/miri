import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TOURS, tourEnabled } from '../src/components/onboarding/tours.js'

test('코치마크: 현황판, 발령 운영, 부족분 계산, 서류 읽기 4곳만 3~4단계이고 ?tour=off 로 꺼진다', () => {
  const need = ['/console', '/console/dispatch', '/console/shortage', '/console/intake']
  assert.deepEqual(Object.keys(TOURS).sort(), need.slice().sort())
  for (const p of need) {
    const steps = TOURS[p]
    assert.ok(steps && steps.length >= 3 && steps.length <= 4, p)
    for (const s of steps) {
      assert.ok(s.title && s.body, p)
      assert.ok(Array.isArray(s.targets) && s.targets.length >= 1, p + ' ' + s.title)
      assert.ok(!/[\u00B7\u2014\u2013]/.test(s.title + s.body), p + ' 금지 문자')
    }
  }
  assert.equal(tourEnabled('?tour=off'), false)
})

test('코치마크: 말풍선은 영역과 겹치지 않는 쪽에 놓고 영역 밖 클릭과 Esc 는 안내를 끝낸다', () => {
  const src = readFileSync(new URL('../src/components/onboarding/CoachTour.jsx', import.meta.url), 'utf8')
  for (const w of ['placeBubble', 'clipToViewport', 'holePath', 'BubbleArrow', "'below'", "'above'", "'right'", "'left'", 'coach-dim', 'coach-ring', 'onClick={close}']) assert.ok(src.includes(w), w)
  assert.ok(!src.includes('bump'), '흔들림 동작 삭제')
})

test('코치마크: 새로고침마다 다시 뜨도록 저장소에 기록하지 않는다', () => {
  const src = readFileSync(new URL('../src/components/onboarding/CoachTour.jsx', import.meta.url), 'utf8')
  assert.ok(!/localStorage|sessionStorage/.test(src))
  assert.match(src, /Escape/)
})

test('발령 운영: 4단계 안내와 자동 진행은 훈련 모드 함수만 쓴다', () => {
  const src = readFileSync(new URL('../src/components/onboarding/DispatchGuide.jsx', import.meta.url), 'utf8')
  for (const w of ['발령 개시', '배정 계산', '배정표 전송', '이송 진행', '자동 진행', '직접 진행']) assert.ok(src.includes(w), w)
  assert.match(src, /kind: 'drill'/)
})

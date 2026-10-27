import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TOURS, tourEnabled } from '../src/components/onboarding/tours.js'

test('코치마크: 화면마다 영역 단위 2~5단계가 있고 ?tour=off 로 꺼진다', () => {
  const need = ['/console', '/console/dispatch', '/console/shortage', '/console/intake', '/console/roster', '/console/resources', '/console/map', '/console/notes', '/console/records', '/console/settings', '/console/workspace', '/console/handover']
  for (const p of need) {
    const steps = TOURS[p]
    assert.ok(steps && steps.length >= 2 && steps.length <= 5, p)
    for (const s of steps) {
      assert.ok(s.title && s.body, p)
      assert.ok(Array.isArray(s.targets) && s.targets.length >= 1, p + ' ' + s.title)
      assert.ok(!/[\u00B7\u2014\u2013]/.test(s.title + s.body), p + ' 금지 문자')
    }
  }
  assert.equal(tourEnabled('?tour=off'), false)
})

test('코치마크: 말풍선은 영역과 겹치지 않는 쪽에 놓고 영역 밖 클릭은 막기만 한다', () => {
  const src = readFileSync(new URL('../src/components/onboarding/CoachTour.jsx', import.meta.url), 'utf8')
  for (const w of ['placeBubble', 'clipToViewport', "'below'", "'above'", "'right'", "'left'", 'bump']) assert.ok(src.includes(w), w)
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

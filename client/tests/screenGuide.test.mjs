import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GUIDES, SECTIONS, guideFor } from '../src/lib/screenGuide.js'
import { MAIN_NAV, SUB_NAV, DOCS_NAV, SECTION_TABS } from '../src/components/layout/navConfig.js'
import { TOURS } from '../src/components/onboarding/tours.js'

const FORBID = /평시|시연|가상|모의|[\u00B7\u2014\u2013]/
const HAEYO = /(해요|이에요|예요|세요|니다|어요|아요)(\s|$|[.,])/

test('화면 안내: 콘솔 메뉴의 모든 화면에 안내가 있다', () => {
  const paths = new Set([...MAIN_NAV, ...DOCS_NAV, ...SUB_NAV].map((m) => m.to))
  for (const tabs of Object.values(SECTION_TABS)) for (const t of tabs) paths.add(t.to)
  for (const p of paths) assert.ok(GUIDES[p], `${p} 안내 없음`)
  for (const p of Object.keys(GUIDES)) assert.ok(paths.has(p), `${p} 는 메뉴에 없는 안내`)
  assert.equal(guideFor('/console/records/R-1').path, '/console/records')
})

test('화면 안내: 소제목 세 개 구조, 한 줄 한 사실, 금지어와 해요체 없음', () => {
  assert.equal(SECTIONS.length, 3)
  for (const [path, g] of Object.entries(GUIDES)) {
    assert.ok(g.title, path)
    for (const key of ['does', 'look', 'next']) {
      assert.ok(Array.isArray(g[key]) && g[key].length >= 2 && g[key].length <= 5, `${path} ${key} 개수`)
      for (const it of g[key]) {
        const text = typeof it === 'string' ? it : it.text
        assert.ok(text.length <= 44, `${path} 줄이 김: ${text}`)
        assert.ok(!FORBID.test(text), `${path} 금지어: ${text}`)
        assert.ok(!HAEYO.test(text), `${path} 해요체: ${text}`)
        if (key === 'next') assert.ok(it.to && it.to.startsWith('/console'), `${path} 이동 경로`)
      }
    }
  }
})

test('화면 안내: 코치마크는 저절로 뜨지 않고 패널의 화면 투어 시작으로만 열린다', () => {
  const tour = readFileSync(new URL('../src/components/onboarding/CoachTour.jsx', import.meta.url), 'utf8')
  assert.ok(!/setTimeout/.test(tour), '자동 시작 타이머 없음')
  assert.ok(!/seen\b/.test(tour), '본 화면 기록 없음')
  assert.ok(tour.includes('startCoachTour'))
  const panel = readFileSync(new URL('../src/components/onboarding/GuidePanel.jsx', import.meta.url), 'utf8')
  for (const w of ['화면 투어 시작', 'Escape', '화면 안내', 'startCoachTour', 'TOURS']) assert.ok(panel.includes(w), w)
  for (const p of Object.keys(TOURS)) assert.ok(GUIDES[p], `${p} 투어 화면에 안내 없음`)
  const top = readFileSync(new URL('../src/components/layout/Topbar.jsx', import.meta.url), 'utf8')
  assert.ok(top.includes('GuideButton'))
})

// 모바일 재설계 2b: 현장 담당자 화면. 평시 홈 숫자는 콘솔과 같은 계산, 할 일 건수와 확인 목록이 같은 기준, 키트에 없는 덩어리 미사용
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { useMiriStore, activeScenario } from '../src/store/useMiriStore.js'
import { computeShortage, optimizedUnserved } from '../src/lib/shortageCalc.js'
import { pendingCounts } from '../src/lib/basis.js'
import { scopedShortage, docQueue, noteQueue, lateVillages } from '../src/mobile/field/fieldModel.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const s = useMiriStore.getState()
const r = computeShortage({ persons: s.persons, villages: s.villages, vehicles: s.vehicles, helpers: s.helpers, settings: s.settings, scenario: activeScenario(s), t0: s.today })
const scopeCodes = new Set(Object.keys(r.arrivals || {}))
const dong = new Set(s.villages.filter((v) => v.dongCode === 'MS').map((v) => v.code))

test('평시 홈 큰 숫자: 시 관리자는 콘솔과 같은 291명, 848명, 추천 배정 267명 유지', () => {
  const city = scopedShortage(r, () => true)
  assert.equal(city.unserved, 291)
  assert.equal(city.targets, 848)
  assert.equal(optimizedUnserved(r), 267)
})

test('평시 홈 큰 숫자: 동 담당자는 결과의 마을별 값을 담당 동만 더함', () => {
  const d = scopedShortage(r, (c) => dong.has(c))
  const want = Object.entries(r.byVillage).filter(([c, v]) => v.inScope && dong.has(c))
  assert.equal(d.unserved, want.reduce((a, [, v]) => a + v.total, 0))
  assert.equal(d.targets, want.reduce((a, [, v]) => a + v.targetTotal, 0))
  assert.ok(d.villages > 0 && d.villages < city().villages)
  function city() { return scopedShortage(r, () => true) }
})

test('확인할 서류: 홈 건수와 목록이 같은 기준(대피 대상 구역 4건, 명부 전체 7건)', () => {
  const pc = pendingCounts({ persons: s.persons, fieldNotes: s.fieldNotes, scopeVillageCodes: scopeCodes })
  assert.equal(docQueue(s.intakeDocs, s.persons, () => true, scopeCodes).length, pc.docsInScope)
  assert.equal(pc.docsInScope, 4)
  assert.equal(docQueue(s.intakeDocs, s.persons, () => true, null).length, pc.docsAll)
  assert.equal(pc.docsAll, 7)
  for (const q of docQueue(s.intakeDocs, s.persons, (c) => dong.has(c), scopeCodes)) assert.ok(dong.has(q.person.villageCode))
})

test('확인할 소식: 대기만, 담당 범위 안만', () => {
  assert.equal(noteQueue(s.fieldNotes, () => true).length, 3)
  for (const n of noteQueue(s.fieldNotes, (c) => dong.has(c))) assert.ok(dong.has(n.villageCode))
})

test('늦는 마을: 남은 사람이 있는 마을만, 기한 순 앞 3곳, 남은 사람 = 전체 - 도착', () => {
  const list = [{ code: 'A', at: 1, total: 5, done: 5, issue: 0 }, { code: 'B', at: 2, total: 4, done: 1, issue: 0 }, { code: 'C', at: 3, total: 2, done: 0, issue: 1 }, { code: 'D', at: 4, total: 1, done: 0, issue: 0 }, { code: 'E', at: 5, total: 1, done: 0, issue: 0 }]
  const late = lateVillages(list, 0, 3)
  assert.deepEqual(late.map((v) => v.code), ['B', 'C', 'D'])
  assert.equal(late[0].left, 3)
})

test('화면 구성: 키트에 없는 칩, 카드, 안내 띠, 옛 하단 묶음을 현장 화면에서 쓰지 않음', () => {
  const f = read('../src/mobile/field/FieldScreens.jsx')
  const imported = [...f.matchAll(/import \{([^}]+)\} from '\.\.\/ui\.jsx'/g)].flatMap((m) => m[1].split(',').map((x) => x.trim()))
  for (const bad of ['Chip', 'Card', 'Banner', 'BottomActions']) assert.ok(!imported.includes(bad), bad)
  assert.ok(!/<input type="checkbox"/.test(f), '체크 상자 대신 키트 스위치')
  assert.match(f, /<Toggle checked=\{agree\}/)
})

test('막다른 길 제거: 확인할 서류는 확인 목록으로, 동 담당자는 요청 버튼 대신 안내, 휴대폰에 없는 시연 코드 칸 안내 없음', () => {
  const f = read('../src/mobile/field/FieldScreens.jsx')
  assert.match(f, /title=\{`서류 확인 \$\{docs\.length\}건`\}[^\n]*navigate\('\/m\/f\/docs'\)/)
  assert.match(f, /scope\.isDong \? null : u\.total > 0 && <Button block variant="danger"/)
  assert.ok(!f.includes('로그인 화면에서 시연 코드'))
  const app = read('../src/App.jsx')
  for (const p of ['docs', 'docs/:code', 'notes', 'notes/:id']) assert.ok(app.includes(`path="${p}"`), p)
})

test('글 덩어리 80자 이하: 현장 화면 문자열', () => {
  const f = read('../src/mobile/field/FieldScreens.jsx')
  for (const m of f.matchAll(/(?:title|subtitle|body|label)="([^"]+)"|>([^<>{}\n]{20,})</g)) {
    const t = (m[1] || m[2]).trim()
    assert.ok(t.length <= 80, t)
  }
})

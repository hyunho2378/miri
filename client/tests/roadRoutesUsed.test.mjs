// 시드 시나리오 배정이 실제로 쓰는 마을과 대피소 짝은 모두 도로 경로가 있다. 화면 근거 문구는 마을 이름이 아니라 회차 확인 결과로 정한다
import test from 'node:test'
import assert from 'node:assert/strict'
import { ROAD_ROUTES } from '../src/data/roadRoutes.js'
import { routeBasisLabel, tripChecks } from '../src/lib/tripChecks.js'
import { usedPairs } from '../tools/used-pairs.mjs'
import { buildSeed } from '../src/mock/seed.js'

test('시드 시나리오 8종 배정이 쓰는 마을과 대피소 짝 모두 도로 경로 있음', () => {
  const used = usedPairs({ iterations: 10 })
  assert.ok(used.length >= 50)
  const miss = used.filter((k) => !ROAD_ROUTES.routes[k])
  assert.deepEqual(miss, [])
})

test('근거 문구는 회차 확인 결과로: 도로 경로면 도로 경로 기준', () => {
  assert.match(routeBasisLabel('road'), /도로 경로 기준/)
  assert.match(routeBasisLabel('line'), /직선 기준/)
  assert.match(routeBasisLabel(undefined), /직선 기준/)
  const seed = buildSeed()
  const v = seed.villages.find((x) => x.code === 'MS-04')
  const shelters = Object.fromEntries(seed.shelters.map((s) => [s.code, s]))
  const c = tripChecks({ trip: { village: 'MS-04', grade: 'assist', personCodes: [] }, shelters, villages: seed.villages, scenario: seed.scenarios[0], villageShelter: () => v.shelterCode })
  assert.equal(c.routeBasis, 'road')
})

test('여러 회차를 합칠 때 근거는 경로 확인이 걸린 회차로, 도우미 화면 두 곳도 같은 합치기 함수 사용', async () => {
  const { mergeChecks, tripCheckNotes } = await import('../src/lib/tripChecks.js')
  const base = { companionCall: [], caregiverUnreachable: [], commCaution: [], liftUnchecked: [] }
  const m = mergeChecks([{ ...base, routeCheck: true, routeBasis: 'road' }, { ...base, routeCheck: false, routeBasis: 'line' }])
  assert.equal(m.routeBasis, 'road')
  assert.match(tripCheckNotes(m).at(-1).text, /도로 경로 기준/)
  const fs = await import('node:fs')
  for (const f of ['src/mobile/helper/useHelperModel.js', 'src/pages/helper/HelperPage.jsx']) assert.match(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'), /mergeChecks\(Object\.values/)
})

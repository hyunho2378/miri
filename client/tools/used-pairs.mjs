// 시드 시나리오 8종을 낮, 밤, 시나리오 기본 시간대로 배정해 실제로 쓰는 마을과 대피소 짝을 모은다(도로 경로 사전 계산과 시험 공용)
import { planDispatch } from '../src/lib/assign.js'
import { calcTiming, calcVehicles, scenarioArrivals, scopeInput } from '../src/lib/shortageCalc.js'
import { buildSeed } from '../src/mock/seed.js'

export function usedPairs({ iterations = 30 } = {}) {
  const seed = buildSeed()
  const pairs = new Set()
  for (const sc0 of seed.scenarios) {
    for (const tb of [...new Set([sc0.timeBand, 'day', 'night'].filter(Boolean))]) {
      const sc = { ...sc0, timeBand: tb }
      const sp = scopeInput({ persons: seed.persons, villages: seed.villages, scenario: sc, settings: seed.settings })
      const arrivals = scenarioArrivals(sc, sp.villages, seed.today)
      const p = planDispatch({ persons: sp.persons, villages: sp.villages, vehicles: calcVehicles(seed.vehicles, sc), helpers: seed.helpers, t0: seed.today, arrivals, ...calcTiming(sc, seed.settings) }, { iterations })
      const vmap = Object.fromEntries(sp.villages.map((v) => [v.code, v]))
      for (const a of p.assignments) for (const t of a.trips) {
        const dests = (t.shelters || []).map((s) => (typeof s === 'string' ? s : s?.code)).filter(Boolean)
        for (const s of dests.length ? dests : [vmap[t.village]?.shelterCode].filter(Boolean)) pairs.add(`${t.village}>${s}`)
      }
      for (const v of sp.villages) if (v.shelterCode) pairs.add(`${v.code}>${v.shelterCode}`)
    }
  }
  return [...pairs]
}

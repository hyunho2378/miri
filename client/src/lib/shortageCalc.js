// shortageCalc.js 평시 부족분 계산기. API_CONTRACT 3.2.
// 마을별 부족분은 원문 배정 규칙(기준선)의 미이송 수. 차량이 마을 사이에 공유되므로 단순 합산은 과대 추정이다.
// 등급별 공식 표는 원문 공식(SOURCE B)을 그대로 보여 주는 설명용. 필요 추가 차량은 실제 재계산으로 산출.
import { buildContext, runBaseline, runOptimize } from './assign.js'
import { EXTRA_TYPE, GRADES, capOf, emptyByGrade, formulaShortage, typeOf } from './shortage.js'
import { HOUR } from './time.js'

export function scenarioArrivals(scenario, villages, t0) {
  const out = {}
  for (const v of villages) {
    const custom = scenario?.arrivals?.[v.code]
    const offset = custom ?? scenario?.offsetHours?.[v.code] ?? 0
    out[v.code] = t0 + ((scenario?.windowHours ?? 8) + offset) * HOUR
  }
  return out
}

function withExtra(vehicles, extra = {}, baseDong = 'MS') {
  const add = []
  for (const [type, n] of Object.entries(extra)) {
    for (let i = 0; i < n; i += 1) add.push({ code: `X-${type}-${i + 1}`, type, owner: 'contract', baseDong, available: true, virtual: true })
  }
  return [...vehicles, ...add]
}

export function computeShortage({ persons, villages, vehicles, helpers, settings, scenario, t0 }) {
  const arrivals = scenarioArrivals(scenario, villages, t0)
  const params = {
    persons: persons.filter((p) => p.review !== 'rejected'),
    villages, helpers, t0, arrivals,
    prepMinutes: scenario?.prepMinutes ?? settings.prepMinutes,
    windowHours: scenario?.windowHours ?? settings.windowHours,
    completeBeforeHours: scenario?.completeBeforeHours ?? settings.completeBeforeHours
  }
  const ctx = buildContext({ ...params, vehicles: withExtra(vehicles, scenario?.extraVehicles) })
  const base = runBaseline(ctx)

  const byVillage = {}
  for (const v of villages) byVillage[v.code] = { targets: emptyByGrade(), shortage: emptyByGrade(), total: 0, targetTotal: 0, provisional: 0 }
  for (const p of params.persons) {
    const row = byVillage[p.villageCode]
    if (!row) continue
    row.targets[p.grade] += 1
    row.targetTotal += 1
    if (p.review === 'pending') row.provisional += 1
  }
  const byGrade = emptyByGrade()
  for (const u of base.unserved) {
    byVillage[u.village].shortage[u.grade] += 1
    byVillage[u.village].total += 1
    byGrade[u.grade] += 1
  }
  const total = base.unserved.length
  const provisional = params.persons.filter((p) => p.review === 'pending').length

  // 원문 공식 설명표. 왕복 시간은 해당 등급 대상자가 있는 마을의 평균
  const usable = ctx.vehicles
  const formula = GRADES.map((g) => {
    const targets = params.persons.filter((p) => p.grade === g.key)
    const rts = targets.map((p) => ctx.vmap[p.villageCode]?.roundTripMin).filter(Boolean)
    const avgRt = rts.length ? Math.round(rts.reduce((s, x) => s + x, 0) / rts.length) : 0
    const compat = usable.filter((v) => capOf(v, g.key) > 0)
    const cap = compat.length ? Math.round((compat.reduce((s, v) => s + capOf(v, g.key), 0) / compat.length) * 10) / 10 : 0
    const f = formulaShortage({
      persons: targets.length, vehicles: compat.length, capacity: cap,
      windowHours: params.windowHours, prepMinutes: params.prepMinutes, completeBeforeHours: params.completeBeforeHours, roundTripMinutes: avgRt
    })
    return { grade: g.key, persons: targets.length, vehicles: compat.length, capacity: cap, roundTrip: avgRt, ...f }
  })

  return { byVillage, byGrade, total, provisional, formula, arrivals, ctx, baselineUnserved: base.unserved }
}

// 등급별 부족분 0이 될 때까지 추가 협약 차량을 한 대씩 더해 재계산
export function requiredExtraVehicles(input, current) {
  const out = []
  for (const g of GRADES) {
    if (!current.byGrade[g.key]) continue
    const type = EXTRA_TYPE[g.key]
    let n = 0
    let left = current.byGrade[g.key]
    while (left > 0 && n < 40) {
      n += 1
      const extra = { ...(input.scenario?.extraVehicles || {}) }
      extra[type] = (extra[type] || 0) + n
      const r = computeShortage({ ...input, scenario: { ...input.scenario, extraVehicles: extra } })
      left = r.byGrade[g.key]
    }
    out.push({ grade: g.key, type, typeLabel: typeOf(type).label, count: n, resolved: left === 0 })
  }
  return out
}

// AI 배정 최적화를 같은 시나리오에 돌렸을 때의 미이송 수(평시 화면 비교용)
export function optimizedUnserved(result) {
  return runOptimize(result.ctx, { budgetMs: 600 }).metrics.unserved
}

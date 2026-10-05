// shortageCalc.js 평시 부족분 계산기. API_CONTRACT 3.2.
// 마을별 부족분은 원문 배정 규칙(기준선)의 미이송 수. 차량이 마을 사이에 공유되므로 단순 합산은 과대 추정이다.
// 등급별 공식 표는 원문 공식(SOURCE B)을 그대로 보여 주는 설명용. 필요 추가 차량은 실제 재계산으로 산출.
import { buildContext, runBaseline, runOptimize } from './assign.js'
import { EXTRA_TYPE, GRADES, capOf, emptyByGrade, formulaShortage, typeOf } from './shortage.js'
import { HOUR } from './time.js'
import { resolveVillages } from './scenario.js'
import { TEMP_SHELTERS } from '../mock/donghaeData.js'

// 시나리오 범위 적용. 대피 대상 구역 마을과 그 대상자만 계산에 넣고, 마을별 대피소와 왕복 시간을 시나리오에 맞춘다
export function scopeInput({ persons, villages, scenario, settings = {}, shelters = TEMP_SHELTERS }) {
  const active = persons.filter((p) => p.review !== 'rejected')
  const r = resolveVillages({ villages, persons: active, scenario, shelters, settings })
  const scoped = r.villages.filter((v) => v.inScope)
  const codes = new Set(scoped.map((v) => v.code))
  return { all: r.villages, villages: scoped, persons: active.filter((p) => codes.has(p.villageCode)), shelterLoad: r.shelterLoad }
}

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

export function computeShortage({ persons, villages: allVillages, vehicles, helpers, settings, scenario, t0, shelters }) {
  const scope = scopeInput({ persons, villages: allVillages, scenario, settings, shelters })
  const villages = scope.villages
  const arrivals = scenarioArrivals(scenario, villages, t0)
  const params = {
    persons: scope.persons,
    villages, helpers, t0, arrivals,
    prepMinutes: scenario?.prepMinutes ?? settings.prepMinutes,
    windowHours: scenario?.windowHours ?? settings.windowHours,
    completeBeforeHours: scenario?.completeBeforeHours ?? settings.completeBeforeHours
  }
  const ctx = buildContext({ ...params, vehicles: withExtra(vehicles, scenario?.extraVehicles) })
  const base = runBaseline(ctx)

  const byVillage = {}
  for (const v of scope.all) byVillage[v.code] = { targets: emptyByGrade(), shortage: emptyByGrade(), total: 0, targetTotal: 0, provisional: 0, inScope: v.inScope }
  for (const p of persons.filter((x) => x.review !== 'rejected')) {
    const row = byVillage[p.villageCode]
    if (!row) continue
    row.targets[p.grade] += 1
    row.targetTotal += 1
    if (p.review === 'pending') row.provisional += 1
  }
  const byGrade = emptyByGrade()
  // 시간 부족: 준비가 끝난 뒤 첫 회차 왕복조차 도달 전에 끝나지 않는 마을. 차량을 늘려도 해소되지 않는다
  const timeByGrade = emptyByGrade()
  const timeShort = (code) => {
    const v = ctx.vmap[code]
    return ctx.deadlines[code].completeBy - ctx.start < (v?.roundTripMin || 0) * 60000
  }
  for (const u of base.unserved) {
    byVillage[u.village].shortage[u.grade] += 1
    byVillage[u.village].total += 1
    byGrade[u.grade] += 1
    if (timeShort(u.village)) { timeByGrade[u.grade] += 1; byVillage[u.village].timeOnly = (byVillage[u.village].timeOnly || 0) + 1 }
  }
  const timeTotal = Object.values(timeByGrade).reduce((s, x) => s + x, 0)
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

  return {
    byVillage, byGrade, timeByGrade, timeTotal, total, provisional, formula, arrivals, ctx, baselineUnserved: base.unserved,
    villages: scope.all, shelterLoad: scope.shelterLoad, scopeVillages: villages.length, scopeTargets: params.persons.length
  }
}

// 등급별로 차량으로 풀 수 있는 부족분이 0이 되는 최소 추가 협약 차량 수. 시간 부족 인원은 차량으로 풀리지 않으므로 뺀다
export function requiredExtraVehicles(input, current, { max = 300 } = {}) {
  const out = []
  for (const g of GRADES) {
    const floor = current.timeByGrade?.[g.key] || 0
    if (current.byGrade[g.key] <= floor) continue
    const type = EXTRA_TYPE[g.key]
    const leftWith = (n) => {
      const extra = { ...(input.scenario?.extraVehicles || {}) }
      extra[type] = (extra[type] || 0) + n
      return computeShortage({ ...input, scenario: { ...input.scenario, extraVehicles: extra } }).byGrade[g.key]
    }
    // 두 배씩 늘려 상한을 찾고 이분 탐색으로 최소 대수를 구한다
    let lo = 0
    let hi = 1
    while (hi <= max && leftWith(hi) > floor) { lo = hi; hi *= 2 }
    const resolved = hi <= max || leftWith(max) <= floor
    if (hi > max) hi = max
    if (resolved) {
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2)
        if (leftWith(mid) > floor) lo = mid
        else hi = mid
      }
    }
    out.push({ grade: g.key, type, typeLabel: typeOf(type).label, count: hi, resolved, timeOnly: floor })
  }
  return out
}

// AI 배정 최적화를 같은 시나리오에 돌렸을 때의 미이송 수(평시 화면 비교용)
export function optimizedUnserved(result) {
  return runOptimize(result.ctx, { budgetMs: 600 }).metrics.unserved
}

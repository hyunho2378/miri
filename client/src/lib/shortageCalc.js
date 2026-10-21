// shortageCalc.js 평시 부족분 계산기. API_CONTRACT 3.2.
// 마을별 부족분은 원문 배정 규칙(기준선)의 미이송 수. 차량이 마을 사이에 공유되므로 단순 합산은 과대 추정이다.
// 등급별 공식 표는 원문 공식(SOURCE B)을 그대로 보여 주는 설명용. 필요 추가 차량은 실제 재계산으로 산출.
import { buildContext, runBaseline, runOptimize } from './assign.js'
import { EXTRA_TYPE, GRADES, capOf, emptyByGrade, formulaShortage, typeOf } from './shortage.js'
import { HOUR } from './time.js'
import { resolveVillages } from './scenario.js'
import { TEMP_SHELTERS } from '../mock/donghaeData.js'

// 발령 시간대. 회신 R24(김현규)와 R27(최충익). 시나리오에 timeBand 가 없으면 이전과 같이 모두 집에 있다고 본다
export const TIME_BANDS = [
  { value: 'home', label: '밤이나 휴일', desc: '모든 대상자가 집에 있다고 봅니다.' },
  { value: 'day', label: '평일 낮', desc: '주야간보호 이용자는 센터에 있어 센터 송영 차량으로 대피한다고 보고 마을 이송 대상에서 뺍니다. 주야간보호기관 차량도 마을 이송에서 뺍니다.' }
]
export const bandOf = (scenario) => TIME_BANDS.find((b) => b.value === (scenario?.timeBand || 'home')) || TIME_BANDS[0]
const isDayCareVehicle = (v) => Boolean(v.dayCare) || /주야간보호/.test(v.note || '')

export function bandPersons(persons, scenario) {
  return scenario?.timeBand === 'day' ? persons.filter((p) => !p.dayCare) : persons
}

// 차량 가용률(%)은 기관 조사 전 담당자가 정하는 값. 차종마다 코드 순으로 그 비율만큼 남긴다
export function bandVehicles(vehicles, scenario) {
  const list = scenario?.timeBand === 'day' ? vehicles.filter((v) => !isDayCareVehicle(v)) : vehicles
  const rate = scenario?.availability ?? 100
  if (rate >= 100) return list
  const byType = {}
  for (const v of list) if (v.available !== false) (byType[v.type] = byType[v.type] || []).push(v)
  return Object.values(byType).flatMap((arr) => [...arr].sort((a, b) => a.code.localeCompare(b.code)).slice(0, Math.ceil((arr.length * rate) / 100)))
}

// 시나리오 범위 적용. 대피 대상 구역 마을과 그 대상자만 계산에 넣고, 마을별 대피소와 왕복 시간을 시나리오에 맞춘다
export function scopeInput({ persons, villages, scenario, settings = {}, shelters = TEMP_SHELTERS }) {
  const active = bandPersons(persons.filter((p) => p.review !== 'rejected'), scenario)
  const r = resolveVillages({ villages, persons: active, scenario, shelters, settings })
  const scoped = r.villages.filter((v) => v.inScope)
  const codes = new Set(scoped.map((v) => v.code))
  return { all: r.villages, villages: scoped, persons: active.filter((p) => codes.has(p.villageCode)), shelterLoad: r.shelterLoad }
}

// 발령 기준 칸과 현황판이 함께 쓰는 범위 요약. 명부 전체(반려 제외)와 기준 시나리오 대피 대상 구역 대상자를 나눠 센다
export function scopeSummary({ persons, villages, scenario, settings = {} }) {
  const sp = scopeInput({ persons, villages, scenario, settings })
  const roster = persons.filter((p) => p.review !== 'rejected')
  return {
    targets: sp.persons.length,
    pending: sp.persons.filter((p) => p.review === 'pending').length,
    villages: sp.villages.length,
    roster: roster.length,
    rosterPending: roster.filter((p) => p.review === 'pending').length
  }
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

// 평시 계산과 발령 배정이 함께 쓰는 차량 목록: 시간대, 가용률, 추가 협약 차량을 같은 방식으로 적용
export function calcVehicles(vehicles, scenario) {
  return withExtra(bandVehicles(vehicles, scenario), scenario?.extraVehicles)
}

// 평시 계산과 발령 배정이 함께 쓰는 시간 조건
export function calcTiming(scenario, settings = {}) {
  return {
    prepMinutes: scenario?.prepMinutes ?? settings.prepMinutes,
    windowHours: scenario?.windowHours ?? settings.windowHours,
    completeBeforeHours: scenario?.completeBeforeHours ?? settings.completeBeforeHours
  }
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
    ...calcTiming(scenario, settings)
  }
  const ctx = buildContext({ ...params, vehicles: calcVehicles(vehicles, scenario) })
  const base = runBaseline(ctx)

  const byVillage = {}
  for (const v of scope.all) byVillage[v.code] = { targets: emptyByGrade(), shortage: emptyByGrade(), total: 0, targetTotal: 0, provisional: 0, inScope: v.inScope }
  for (const p of bandPersons(persons.filter((x) => x.review !== 'rejected'), scenario)) {
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
    villages: scope.all, shelterLoad: scope.shelterLoad, scopeVillages: villages.length, scopeTargets: params.persons.length,
    // 평일 낮에 센터에 있어 마을 이송에서 뺀 주야간보호 이용자(대피 대상 구역 안)
    dayCareAway: scenario?.timeBand === 'day' ? persons.filter((p) => p.dayCare && p.review !== 'rejected' && villages.some((v) => v.code === p.villageCode)).length : 0
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
// 현황판, 서식, 발령 운영이 같은 탐색 조건(고정 횟수, 같은 씨앗)을 쓴다. 같은 입력이면 같은 값
const optCache = new WeakMap()
export function optimizedUnserved(result) {
  if (!result?.ctx) return 0
  if (!optCache.has(result.ctx)) optCache.set(result.ctx, runOptimize(result.ctx).metrics.unserved)
  return optCache.get(result.ctx)
}

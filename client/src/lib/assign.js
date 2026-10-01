// assign.js 배정 기준선(원문 배정 규칙)과 AI 배정 최적화. API_CONTRACT 4.2.
// 순수 함수. 같은 입력이면 같은 결과(시드 고정). 브라우저에서 서버 없이 실행.
//
// 기준선: 침상부터 도보 순, 같은 등급 안 도달 시각 빠른 마을 우선, 가장 빨리 비는 차량 배정
// 최적화: 기준선을 포함한 후보 해에서 출발해 마을 순서 교환과 배정 규칙 전환으로 지역 탐색.
//         목표는 등급 가중 미이송 최소 → 미이송 인원 최소 → 마지막 완료 시각 최소.
//         초기해에 기준선이 들어 있으므로 결과는 기준선보다 나빠지지 않는다.
import { GRADES, capOf, gradeOf, typeOf } from './shortage.js'
import { mulberry32 } from './rng.js'
import { MIN, fmtHM } from './time.js'

// 입력을 계산용 문맥으로 정리. 가용 차량만 사용
export function buildContext({
  persons, villages, vehicles, helpers = [], t0, arrivals = {},
  prepMinutes = 60, windowHours = 8, completeBeforeHours = 0
}) {
  const vmap = Object.fromEntries(villages.map((v) => [v.code, v]))
  const deadlines = {}
  for (const v of villages) {
    const arrival = arrivals[v.code] ?? t0 + windowHours * 60 * MIN
    deadlines[v.code] = {
      arrival,
      dispatchBy: arrival - windowHours * 60 * MIN,
      completeBy: arrival - completeBeforeHours * 60 * MIN
    }
  }
  const qmap = {}
  const queues = []
  for (const p of persons) {
    if (!vmap[p.villageCode]) continue
    const id = `${p.villageCode}|${p.grade}`
    if (!qmap[id]) {
      qmap[id] = { id, village: p.villageCode, grade: p.grade, codes: [] }
      queues.push(qmap[id])
    }
    qmap[id].codes.push(p.code)
  }
  queues.forEach((q) => q.codes.sort())
  return {
    vmap, deadlines, qmap, queues,
    vehicles: vehicles.filter((v) => v.available !== false).sort((a, b) => a.code.localeCompare(b.code)),
    helpers,
    t0,
    start: t0 + prepMinutes * MIN
  }
}

const rtOf = (ctx, qid) => ctx.vmap[ctx.qmap[qid].village].roundTripMin * MIN

function simulate(ctx, order, rule) {
  const avail = Object.fromEntries(ctx.vehicles.map((v) => [v.code, ctx.start]))
  const remaining = Object.fromEntries(ctx.queues.map((q) => [q.id, [...q.codes]]))
  const trips = []
  const unserved = []

  for (const g of GRADES) {
    const qs = order[g.key] || []
    const vs = ctx.vehicles.filter((v) => capOf(v, g.key) > 0)

    const bestVehicle = (qid) => {
      const r = rtOf(ctx, qid)
      const E = ctx.deadlines[ctx.qmap[qid].village].completeBy
      let best = null
      for (const v of vs) {
        const f = avail[v.code] + r
        if (f > E) continue
        if (!best || f < best.f || (f === best.f && capOf(v, g.key) > capOf(best.v, g.key))) best = { v, f }
      }
      return best
    }

    const doTrip = (qid, v) => {
      const q = ctx.qmap[qid]
      const take = remaining[qid].splice(0, capOf(v, g.key))
      const departAt = avail[v.code]
      const finishAt = departAt + rtOf(ctx, qid)
      trips.push({ vehicle: v.code, village: q.village, grade: g.key, personCodes: take, departAt, finishAt })
      avail[v.code] = finishAt
    }

    if (rule === 'seq') {
      for (const qid of qs) {
        while (remaining[qid].length) {
          const b = bestVehicle(qid)
          if (!b) break
          doTrip(qid, b.v)
        }
      }
    } else {
      // eft: 완료 시각이 가장 빠른 (마을, 차량) 조합부터. 같으면 order 앞쪽 우선
      for (;;) {
        let pick = null
        for (const qid of qs) {
          if (!remaining[qid].length) continue
          const b = bestVehicle(qid)
          if (b && (!pick || b.f < pick.f)) pick = { qid, v: b.v, f: b.f }
        }
        if (!pick) break
        doTrip(pick.qid, pick.v)
      }
    }

    for (const qid of qs) {
      for (const code of remaining[qid]) {
        unserved.push({ personCode: code, grade: g.key, village: ctx.qmap[qid].village, reason: vs.length ? 'capacity' : 'noCompatibleVehicle' })
      }
    }
  }
  return { trips, unserved }
}

export function scorePlan(plan) {
  return {
    weightedUnserved: plan.unserved.reduce((s, u) => s + gradeOf(u.grade).weight, 0),
    unserved: plan.unserved.length,
    lastFinishAt: plan.trips.reduce((m, t) => Math.max(m, t.finishAt), 0)
  }
}

const better = (a, b) => {
  if (a.weightedUnserved !== b.weightedUnserved) return a.weightedUnserved < b.weightedUnserved
  if (a.unserved !== b.unserved) return a.unserved < b.unserved
  return a.lastFinishAt < b.lastFinishAt
}

function orderBy(ctx, cmp) {
  const order = {}
  for (const g of GRADES) {
    order[g.key] = ctx.queues.filter((q) => q.grade === g.key).sort((a, b) => cmp(a, b) || a.village.localeCompare(b.village)).map((q) => q.id)
  }
  return order
}

export function baselineOrder(ctx) {
  return orderBy(ctx, (a, b) => ctx.deadlines[a.village].arrival - ctx.deadlines[b.village].arrival)
}

// 원문 배정 규칙 그대로
export function runBaseline(ctx) {
  const plan = simulate(ctx, baselineOrder(ctx), 'seq')
  return { ...plan, rule: 'seq', metrics: scorePlan(plan) }
}

export function runOptimize(ctx, { iterations = 300, seed = 20261214, budgetMs = 1200 } = {}) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
  const t = now()
  const rt = (q) => ctx.vmap[q.village].roundTripMin
  const seeds = [
    baselineOrder(ctx),
    orderBy(ctx, (a, b) => rt(a) - rt(b)),
    orderBy(ctx, (a, b) => (ctx.deadlines[a.village].completeBy - rt(a) * MIN) - (ctx.deadlines[b.village].completeBy - rt(b) * MIN))
  ]
  let best = null
  for (const order of seeds) {
    for (const rule of ['seq', 'eft']) {
      const plan = simulate(ctx, order, rule)
      const m = scorePlan(plan)
      if (!best || better(m, best.metrics)) best = { ...plan, order, rule, metrics: m }
    }
  }
  const r = mulberry32(seed)
  const grades = GRADES.map((g) => g.key).filter((k) => (best.order[k] || []).length > 1)
  for (let i = 0; i < iterations && grades.length && now() - t < budgetMs; i += 1) {
    const g = grades[Math.floor(r() * grades.length)]
    const arr = [...best.order[g]]
    const a = Math.floor(r() * arr.length)
    const b = Math.floor(r() * arr.length)
    if (a === b) continue
    ;[arr[a], arr[b]] = [arr[b], arr[a]]
    const order = { ...best.order, [g]: arr }
    for (const rule of ['seq', 'eft']) {
      const plan = simulate(ctx, order, rule)
      const m = scorePlan(plan)
      if (better(m, best.metrics)) best = { ...plan, order, rule, metrics: m }
    }
  }
  return { trips: best.trips, unserved: best.unserved, rule: best.rule, metrics: best.metrics, elapsedMs: Math.round(now() - t) }
}

// 차량 단위 묶음 + 도우미 매칭 + 배정 사유(계산 사실만 문장화. 생성 모델 아님)
export function bundle(ctx, plan) {
  const byVehicle = {}
  for (const trip of plan.trips) {
    if (!byVehicle[trip.vehicle]) byVehicle[trip.vehicle] = []
    byVehicle[trip.vehicle].push(trip)
  }
  const vehicleMap = Object.fromEntries(ctx.vehicles.map((v) => [v.code, v]))
  const assignments = Object.keys(byVehicle).sort().map((code) => {
    const trips = byVehicle[code].sort((a, b) => a.departAt - b.departAt).map((tr, i) => ({ ...tr, index: i + 1 }))
    return { vehicleCode: code, trips, helperCodes: [], reasons: [] }
  })

  // 도우미: 같은 차량에 끝까지 동승. 담당 마을과 지원 등급이 맞는 사람 우선
  const used = new Set()
  const warnings = []
  for (const a of assignments) {
    const need = Math.max(...a.trips.map((tr) => gradeOf(tr.grade).helpers))
    if (!need) continue
    const villages = new Set(a.trips.map((tr) => tr.village))
    const grades = [...new Set(a.trips.map((tr) => tr.grade))]
    const score = (h) => (h.villages.some((v) => villages.has(v)) ? 2 : 0) + (grades.every((g) => h.grades.includes(g)) ? 1 : 0)
    const cands = ctx.helpers
      .filter((h) => h.active !== false && !used.has(h.code) && grades.some((g) => h.grades.includes(g)))
      .sort((x, y) => score(y) - score(x) || x.code.localeCompare(y.code))
    a.helperCodes = cands.slice(0, need).map((h) => h.code)
    a.helperCodes.forEach((c) => used.add(c))
    if (a.helperCodes.length < need) warnings.push({ vehicleCode: a.vehicleCode, need, got: a.helperCodes.length })
  }

  for (const a of assignments) {
    const v = vehicleMap[a.vehicleCode]
    const type = typeOf(v.type)
    const grades = [...new Set(a.trips.map((tr) => tr.grade))]
    const last = a.trips[a.trips.length - 1]
    const slack = Math.min(...a.trips.map((tr) => (ctx.deadlines[tr.village].completeBy - tr.finishAt) / MIN))
    const villageCount = new Set(a.trips.map((tr) => tr.village)).size
    const persons = a.trips.reduce((s, tr) => s + tr.personCodes.length, 0)
    a.reasons = [
      `${grades.map((g) => gradeOf(g).label).join('와 ')} 등급 담당. ${type.label} 회차당 정원 ${grades.map((g) => `${gradeOf(g).label} ${type.capacity[g]}명`).join(' ')}`,
      `${a.trips.length}회차 ${persons}명 ${villageCount}개 마을. 마지막 완료 ${fmtHM(last.finishAt)}`,
      `이송 완료 기한까지 최소 여유 ${Math.round(slack)}분`,
      plan.rule === 'eft' ? '완료 시각이 가장 빠른 마을과 차량 조합부터 배정' : '도달 시각이 빠른 마을부터 순서대로 배정'
    ]
  }

  const helperLoads = assignments.flatMap((a) => a.helperCodes.map(() => a.trips.reduce((s, tr) => s + tr.personCodes.length, 0) / Math.max(1, a.helperCodes.length)))
  const mean = helperLoads.reduce((s, x) => s + x, 0) / Math.max(1, helperLoads.length)
  const helperLoadStd = Math.sqrt(helperLoads.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, helperLoads.length))
  return { assignments, warnings, helperLoadStd: Math.round(helperLoadStd * 10) / 10 }
}

// 화면에서 쓰는 한 번에 계산. 기준선과 최적화를 같이 돌려 차이를 보인다
export function planDispatch(input, opts) {
  const ctx = buildContext(input)
  const baseline = runBaseline(ctx)
  const optimized = runOptimize(ctx, opts)
  const b = bundle(ctx, optimized)
  return {
    ctx,
    assignments: b.assignments,
    unassigned: optimized.unserved,
    warnings: b.warnings,
    metrics: { ...optimized.metrics, helperLoadStd: b.helperLoadStd },
    rule: optimized.rule,
    elapsedMs: optimized.elapsedMs,
    baseline: { metrics: baseline.metrics, unserved: baseline.unserved },
    diff: {
      unserved: optimized.metrics.unserved - baseline.metrics.unserved,
      weightedUnserved: optimized.metrics.weightedUnserved - baseline.metrics.weightedUnserved,
      lastFinishMinutes: Math.round((optimized.metrics.lastFinishAt - baseline.metrics.lastFinishAt) / MIN)
    }
  }
}

export const UNSERVED_REASON = { capacity: '차량 부족', noCompatibleVehicle: '호환 차량 없음' }

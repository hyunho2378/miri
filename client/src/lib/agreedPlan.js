// 약속된 차량만 쓸 때 필요한 협약 구성(플랫폼 46회차, 1026 면담 '민간 기관 차량은 자기 이용자 우선').
// 확인 전 차량을 빼고 같은 규칙으로 다시 계산해, 등급별로 더 협약해야 하는 대수를 구한다. 숫자는 계산에서 직접 구한다.
import { computeShortage, requiredExtraVehicles } from './shortageCalc.js'
import { commitmentOf, typeOf } from './shortage.js'

export function agreedOnlyPlan(input) {
  const agreed = (input.vehicles || []).filter((v) => commitmentOf(v) !== 'unconfirmed')
  const base = { ...input, vehicles: agreed, scenario: { ...input.scenario, extraVehicles: {} } }
  const cur = computeShortage(base)
  const need = requiredExtraVehicles(base, cur).filter((n) => n.resolved)
  const extra = {}
  for (const n of need) extra[n.type] = n.count
  const left = (ex) => computeShortage({ ...base, scenario: { ...base.scenario, extraVehicles: ex } }).total
  const total = left(extra)
  // 한 가지씩 1대 줄이면 남는 인원
  const lessOne = need.filter((n) => n.count > 0).map((n) => ({ type: n.type, label: typeOf(n.type)?.label || n.type, count: n.count, left: left({ ...extra, [n.type]: n.count - 1 }) }))
  return { alone: cur.total, need, extra, total, lessOne, unconfirmed: (input.vehicles || []).length - agreed.length }
}

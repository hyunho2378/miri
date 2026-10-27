// 차량 수 표기를 한곳에서 만든다(플랫폼 AI 협업 툴 셀 57 검토 반영).
// 숫자 기본값을 두지 않고 차량 목록에서만 센다. 구분 순서: 등록, 가용(빠진 차량 사유), 약속, 확인 전.
import { commitmentOf } from './shortage.js'

export function vehicleCounts(vehicles) {
  if (!Array.isArray(vehicles)) throw new Error('vehicles 목록이 필요합니다')
  const total = vehicles.length
  const off = vehicles.filter((v) => v.available === false)
  const usable = total - off.length
  const unconfirmed = vehicles.filter((v) => commitmentOf(v) === 'unconfirmed').length
  const fireOff = off.filter((v) => v.owner === 'fire').length
  return { total, usable, agreed: total - unconfirmed, unconfirmed, fireOff, otherOff: off.length - fireOff }
}

function offText(c) {
  const parts = []
  if (c.fireOff) parts.push(`소방 구급차 ${c.fireOff}대 소방 출동 중`)
  if (c.otherOff) parts.push(`그 밖의 차량 ${c.otherOff}대 불가`)
  return parts.length ? `(${parts.join(', ')} 제외)` : ''
}

// 설명 자리: 등록 42대 중 가용 39대(소방 구급차 3대 소방 출동 중 제외), 약속 31대, 확인 전 11대
export function vehicleSummaryLong(vehicles) {
  const c = vehicleCounts(vehicles)
  return `등록 ${c.total}대 중 가용 ${c.usable}대${offText(c)}, 약속 ${c.agreed}대, 확인 전 ${c.unconfirmed}대`
}

// 숫자 칩: 등록 42 / 출동 가능 39 / 협약 확정 31 / 미확정 11
export function vehicleChips(vehicles) {
  const c = vehicleCounts(vehicles)
  return `등록 ${c.total} / 출동 가능 ${c.usable} / 협약 확정 ${c.agreed} / 미확정 ${c.unconfirmed}`
}

// 짧은 자리: 출동 가능 39대 / 등록 42대
export function vehicleSummaryShort(vehicles) {
  const c = vehicleCounts(vehicles)
  return `출동 가능 ${c.usable}대 / 등록 ${c.total}대`
}

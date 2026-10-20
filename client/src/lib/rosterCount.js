// rosterCount.js 명부 건수와 출처를 한 곳에서 센다.
// 회신 R24(김현규): 대상자 수가 2,005명(추정)과 2,013명(가상 명부)으로 섞여 나온다는 지적에 맞춰,
// 화면마다 같은 함수로 건수와 구성을 보여 준다.
import { LTC } from '../mock/donghaeData.js'

// 같은 서류 같은 위치의 두 번째 기록부터 중복 의심으로 센다(anomaly.js 중복 규칙과 같은 기준)
export function rosterBreakdown(persons = []) {
  const active = persons.filter((p) => p.review !== 'rejected')
  const pending = active.filter((p) => p.review === 'pending').length
  const seen = new Set()
  let duplicate = 0
  for (const p of active) {
    if (!p.docId) continue
    const k = `${p.villageCode}|${p.docId}|${p.docPos}|${p.grade}`
    if (seen.has(k)) duplicate += 1
    else seen.add(k)
  }
  return {
    total: active.length,
    confirmed: active.length - pending - duplicate,
    pending,
    duplicate,
    estimate: LTC.homeTotal,
    period: LTC.period,
    dayCare: LTC.dayCareUsers?.['계'] || 0
  }
}

const n = (x) => x.toLocaleString('ko-KR')

// 화면에 붙이는 출처 문장. 숫자는 모두 위 함수에서 온다
export function rosterPartsText(b) {
  const parts = [`확인 ${n(b.confirmed)}명`]
  if (b.pending) parts.push(`판독 확인 대기 ${n(b.pending)}건`)
  if (b.duplicate) parts.push(`중복 의심 ${n(b.duplicate)}건`)
  return parts.join(', ')
}

export function rosterSourceText(b) {
  return `명부 ${n(b.total)}건은 ${rosterPartsText(b)}입니다. 확인된 대상자는 ${b.period}년 장기요양 재가 수급자 추정 ${n(b.estimate)}명(국민건강보험공단, KOSIS)을 마을별로 나눈 수에 맞춘 가상 명부입니다. 부족분 계산에는 판독 확인 대기를 잠정값으로 넣고, 중복 의심은 정리 전까지 그대로 셉니다.`
}

export const DISABLED_NOTE = '등록장애인 가운데 장기요양을 받지 않는 분(65세 미만 지체, 뇌병변, 시각 장애 등)은 아직 명부에 없습니다. 동해시 명부 확인 뒤 포함합니다.'

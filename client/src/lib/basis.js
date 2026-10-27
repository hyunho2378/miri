// 화면마다 같은 항목의 숫자가 다를 때 기준을 함께 보이는 문구(회신 R34). 계산은 각 화면이 같은 함수를 쓰고, 여기서는 기준만 글로 만든다.
import { fmtHM } from './time.js'

const n = (x) => Number(x || 0).toLocaleString('ko-KR')

const md = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}. ${d.getDate()}.` }

// 평시 계산(현황판, 부족분 계산): 발령 직후 출발을 가정한 값.
// 계산 시각(at)과 명부 기준일(rosterAt)을 받으면 '(10. 25. 00:20 계산, 명부 10. 2. 기준)'처럼 숫자 옆에 붙인다(셀 59 검토 반영)
export function calcStamp({ at, rosterAt } = {}) {
  if (at == null || rosterAt == null) return ''
  return `${md(at)} ${fmtHM(at)} 계산, 명부 ${md(rosterAt)} 기준`
}
export function peaceBasisText({ villages, targets, at, rosterAt } = {}) {
  const stamp = calcStamp({ at, rosterAt })
  return `${stamp || '평시 기준'}, 발령 직후 출발 가정, 대피 대상 ${n(villages)}개 마을 ${n(targets)}명`
}

// 시연 명부 기준일과 오늘 기준 경과 일수가 함께 보이는 이유(화면 아래 한 줄)
export function rosterDateNote(rosterAt) {
  if (rosterAt == null) return ''
  return `명부 ${md(rosterAt)} 기준, 마지막 확인은 오늘부터 지난 날수로 계산`
}

// 발령 운영: 발령 개시 뒤 흐른 시간만큼 남은 시간이 줄어든 값
export function dispatchBasisText(basis) {
  if (!basis) return ''
  const when = basis.elapsedMin > 0 ? `발령 개시 ${basis.elapsedMin}분 경과 기준(${fmtHM(basis.at)} 계산)` : `발령 개시 직후 기준(${fmtHM(basis.at)} 계산)`
  return `${when}, 대피 대상 ${n(basis.villages)}개 마을 ${n(basis.targets)}명`
}

// 확인 대기 건수: 범위가 다른 세 값을 한곳에서 센다
export function pendingCounts({ persons = [], fieldNotes = [], scopeVillageCodes } = {}) {
  const docsAll = persons.filter((p) => p.review === 'pending').length
  const docsInScope = scopeVillageCodes ? persons.filter((p) => p.review === 'pending' && scopeVillageCodes.has(p.villageCode)).length : docsAll
  const notes = fieldNotes.filter((x) => x.status === 'pending').length
  return { docsAll, docsInScope, notes, total: docsAll + notes }
}

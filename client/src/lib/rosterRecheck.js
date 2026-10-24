// 명부 재확인 필터: 마지막 확인이 STALE_DAYS 를 넘었거나 확인 기록이 없는 대상자(현황판 '명부 재확인 필요'와 같은 기준, 제외 처리한 대상자는 뺀다)
import { checkedOf, STALE_DAYS } from './handoverRows.js'

export const RECHECK_OPTIONS = [
  { value: 'all', label: '전체 마지막 확인' },
  { value: 'stale', label: `재확인 필요(${STALE_DAYS}일 경과, 기록 없음)` }
]

export function recheckMatch(person, mode, now) {
  if (mode !== 'stale') return true
  return person.review !== 'rejected' && checkedOf(person, now).stale
}

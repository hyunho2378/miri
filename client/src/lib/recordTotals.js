// recordTotals.js 발령 종료 기록의 합계. 이송 기록 화면과 문서 자료값(훈련 결과 보고)이 같은 말과 같은 합계를 쓴다.
// 플랫폼 AI 협업 툴 검토 반영(셀 81): 화면의 말(인계 완료, 소방 인계, 미완료)을 기준으로 서식 이름을 맞춤.
import { fmtHM } from './time.js'

export const RECORD_LABELS = { total: '대상자', done: '인계 완료', fire: '소방 인계', open: '미완료' }

export function recordTotals(rec) {
  const rows = Object.values(rec?.byVillage || {})
  const total = rows.reduce((s, r) => s + r.total, 0)
  const done = rows.reduce((s, r) => s + r.done, 0)
  const fire = rows.reduce((s, r) => s + r.fire, 0)
  return { total, done, fire, open: total - done - fire }
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
// 2026. 10. 24.(토) 23:10∼23:58 (날짜가 바뀌면 끝 날짜도 붙임)
export function recordPeriod(rec) {
  if (!rec || !Number.isFinite(rec.startedAt) || !Number.isFinite(rec.closedAt)) return null
  const s = new Date(rec.startedAt), e = new Date(rec.closedAt)
  const day = (d) => `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.(${DAYS[d.getDay()]})`
  const same = s.toDateString() === e.toDateString()
  return `${day(s)} ${fmtHM(rec.startedAt)}∼${same ? '' : `${day(e)} `}${fmtHM(rec.closedAt)}`
}

// 가장 최근 훈련 기록(기록은 최신이 앞). 없으면 null
export const latestDrillRecord = (records = []) => records.find((r) => r.kind === 'drill') || null

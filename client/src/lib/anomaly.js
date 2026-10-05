// anomaly.js 이상 탐지 규칙 7개. API_CONTRACT 4.3. 규칙 기반 탐지이며 임계값은 설정값.
import { GRADES } from './shortage.js'
import { MIN } from './time.js'

const DAY = 24 * 60 * MIN
const NEEDS_HELPER = new Set(GRADES.filter((g) => g.helpers > 0).map((g) => g.key))

export const ANOMALY_RULES = {
  pendingLong: '오래 확인 안 한 서류',
  gradeConflict: '등급과 특이사항이 안 맞음',
  duplicate: '같은 사람 두 번 등록 의심',
  contract: '차량 협약 곧 끝남',
  helperLoad: '도우미 한 명에게 몰림',
  deadline: '마감 안에 못 옮김',
  noAck: '도우미 응답 없음'
}

export function detectAnomalies({ persons, vehicles, helpers, settings, now, dispatch, villages = [] }) {
  const out = []
  const vlabel = Object.fromEntries(villages.map((v) => [v.code, v.label]))

  for (const p of persons) {
    if (p.review === 'pending' && now - p.updatedAt > settings.pendingDays * DAY) {
      out.push({ id: `pending-${p.code}`, rule: 'pendingLong', target: p.code, value: `${Math.floor((now - p.updatedAt) / DAY)}일 경과`, to: '/console/intake' })
    }
    if ((p.grade === 'walk' || p.grade === 'assist') && p.tags?.includes('bedridden')) {
      out.push({ id: `conflict-${p.code}`, rule: 'gradeConflict', target: p.code, value: `${p.grade === 'walk' ? '도보' : '부축'} 등급에 와상 표기`, to: `/console/roster?person=${p.code}` })
    }
  }

  const dup = {}
  for (const p of persons) {
    if (!p.docId) continue
    const k = `${p.villageCode}|${p.docId}|${p.docPos}|${p.grade}`
    ;(dup[k] = dup[k] || []).push(p.code)
  }
  for (const codes of Object.values(dup)) {
    if (codes.length > 1) out.push({ id: `dup-${codes.join('-')}`, rule: 'duplicate', target: codes.join(', '), value: '같은 서류 같은 위치', to: `/console/roster?person=${codes[0]}` })
  }

  for (const v of vehicles) {
    if (!v.contractUntil) continue
    const left = (v.contractUntil - now) / DAY
    if (left < 0) out.push({ id: `contract-${v.code}`, rule: 'contract', target: v.code, value: '협약 만료', to: '/console/resources' })
    else if (left <= settings.contractWarnDays) out.push({ id: `contract-${v.code}`, rule: 'contract', target: v.code, value: `${Math.ceil(left)}일 남음`, to: '/console/resources' })
  }

  for (const h of helpers) {
    const load = persons.filter((p) => h.villages.includes(p.villageCode) && NEEDS_HELPER.has(p.grade)).length
    if (load > settings.helperLoadMax) out.push({ id: `load-${h.code}`, rule: 'helperLoad', target: h.code, value: `담당 대상자 ${load}명`, to: '/console/resources?tab=helpers' })
  }

  if (dispatch?.result) {
    const byVillage = {}
    for (const u of dispatch.result.unassigned) byVillage[u.village] = (byVillage[u.village] || 0) + 1
    for (const [code, n] of Object.entries(byVillage)) {
      out.push({ id: `deadline-${code}`, rule: 'deadline', target: vlabel[code] || code, value: `${n}명`, to: '/console/dispatch' })
    }
    if (dispatch.sentAt) {
      for (const [code, ack] of Object.entries(dispatch.acks || {})) {
        if (ack.answer === 'none' && dispatch.now - dispatch.sentAt > settings.noAckMinutes * MIN) {
          out.push({ id: `noack-${code}`, rule: 'noAck', target: code, value: `${Math.floor((dispatch.now - dispatch.sentAt) / MIN)}분 무응답`, to: '/console/dispatch' })
        }
      }
    }
  }
  return out
}

// anomaly.js 이상 탐지 규칙 7개. API_CONTRACT 4.3. 규칙 기반 탐지이며 임계값은 설정값.
import { GRADES } from './shortage.js'
import { MIN } from './time.js'

const DAY = 24 * 60 * MIN
const NEEDS_HELPER = new Set(GRADES.filter((g) => g.helpers > 0).map((g) => g.key))

export const ANOMALY_RULES = {
  pendingLong: '장기 확인 대기 서류',
  gradeConflict: '등급과 특이사항 불일치',
  duplicate: '중복 등록 의심',
  contract: '차량 협약 만료 임박',
  helperLoad: '도우미 담당 건수 초과',
  deadline: '기한 내 이송 불가',
  noAck: '도우미 무응답'
}

export function detectAnomalies({ persons, vehicles, helpers, settings, now, dispatch, villages = [] }) {
  const out = []
  const vlabel = Object.fromEntries(villages.map((v) => [v.code, v.label]))

  for (const p of persons) {
    if (p.review === 'pending' && now - p.updatedAt > settings.pendingDays * DAY) {
      out.push({ id: `pending-${p.code}`, rule: 'pendingLong', target: p.code, value: `확인 대기 ${Math.floor((now - p.updatedAt) / DAY)}일 경과`, to: '/console/intake' })
    }
    if ((p.grade === 'walk' || p.grade === 'assist') && p.tags?.includes('bedridden')) {
      out.push({ id: `conflict-${p.code}`, rule: 'gradeConflict', target: p.code, value: `${p.grade === 'walk' ? '도보' : '부축'} 등급과 와상 표기 불일치`, to: `/console/roster?person=${p.code}` })
    }
  }

  const dup = {}
  for (const p of persons) {
    if (!p.docId) continue
    const k = `${p.villageCode}|${p.docId}|${p.docPos}|${p.grade}`
    ;(dup[k] = dup[k] || []).push(p.code)
  }
  for (const codes of Object.values(dup)) {
    if (codes.length > 1) out.push({ id: `dup-${codes.join('-')}`, rule: 'duplicate', target: codes.join(', '), value: '동일 서류 동일 위치', to: `/console/roster?person=${codes[0]}` })
  }

  for (const v of vehicles) {
    if (!v.contractUntil) continue
    const left = (v.contractUntil - now) / DAY
    if (left < 0) out.push({ id: `contract-${v.code}`, rule: 'contract', target: v.code, value: '협약 만료', to: '/console/resources' })
    else if (left <= settings.contractWarnDays) out.push({ id: `contract-${v.code}`, rule: 'contract', target: v.code, value: `만료까지 ${Math.ceil(left)}일`, to: '/console/resources' })
  }

  // 담당 대상자는 마을 대상자를 그 마을을 맡은 도우미 수로 나눠 더한다(한 마을을 여럿이 나눠 맡는 경우)
  const needByVillage = {}
  for (const p of persons) if (NEEDS_HELPER.has(p.grade)) needByVillage[p.villageCode] = (needByVillage[p.villageCode] || 0) + 1
  const helpersByVillage = {}
  for (const h of helpers) for (const vc of h.villages) helpersByVillage[vc] = (helpersByVillage[vc] || 0) + 1
  for (const h of helpers) {
    const load = Math.round(h.villages.reduce((s, vc) => s + (needByVillage[vc] || 0) / (helpersByVillage[vc] || 1), 0))
    if (load > settings.helperLoadMax) out.push({ id: `load-${h.code}`, rule: 'helperLoad', target: h.code, value: `담당 대상자 ${load}명`, to: '/console/resources?tab=helpers' })
  }

  if (dispatch?.result) {
    const byVillage = {}
    for (const u of dispatch.result.unassigned) byVillage[u.village] = (byVillage[u.village] || 0) + 1
    for (const [code, n] of Object.entries(byVillage)) {
      out.push({ id: `deadline-${code}`, rule: 'deadline', target: vlabel[code] || code, value: `미이송 예상 ${n}명`, to: '/console/dispatch' })
    }
    if (dispatch.sentAt) {
      for (const [code, ack] of Object.entries(dispatch.acks || {})) {
        if (ack.answer === 'none' && dispatch.now - dispatch.sentAt > settings.noAckMinutes * MIN) {
          out.push({ id: `noack-${code}`, rule: 'noAck', target: code, value: `전송 후 ${Math.floor((dispatch.now - dispatch.sentAt) / MIN)}분 무응답`, to: '/console/dispatch' })
        }
      }
    }
  }
  return out
}

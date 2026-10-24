// 소방 인계 목록 계산(화면, CSV, 인쇄 공통).
// 현직 소방관 인터뷰(2026. 10. 24., 경기 파주소방서) 반영:
//  - Q4 급하면 숫자와 색부터, 제일 급한 사람이 맨 위, 숫자의 기준 시각이 보여야 함
//  - Q6 정확한 위치(동호수, 층, 엘리베이터 가능 여부)와 연락 되는 보호자 번호
//  - Q3 오래된 명부 정보는 현장에서 믿지 못함: 마지막 확인 시점 표시
//  - Q5 소방 쪽 용어: 구조 대상, 거동불편
import { gradeOf } from './shortage.js'
import { fmtDate, fmtDateTime, fmtHM } from './time.js'

export const DAY = 24 * 60 * 60 * 1000
// 명부 마지막 확인이 이 기간을 넘으면 경고 색. 분기별 일괄 확인 제안(상세기획서 운영 모델)과 맞춘 90일
export const STALE_DAYS = 90

// 소방 용어로 본 등급 설명. 서비스 등급 이름은 그대로 두고 옆에 붙인다
export const FIRE_GRADE_TERM = {
  bed: '거동불편(와상)',
  wheelchair: '거동불편(휠체어)',
  assist: '거동불편(부축)',
  walk: '자력 보행(안내 필요)'
}

// 엘리베이터 여부: 명부 이동 경로 항목(access.stairs)에서 읽는다
export function elevatorOf(access) {
  const s = access?.stairs || ''
  if (!s) return '명부에 없음'
  if (s.includes('엘리베이터 있음')) return '있음'
  if (s.includes('계단 없음')) return '해당 없음(계단 없음)'
  return '없음(계단만)'
}

// 플랫폼 AI 협업 툴 셀 39(소방 인계 추가 열) 검토 반영.
// 필요 대원 수: 침상과 휠체어는 1층이거나 계단 문제가 없으면 2명, 2층 이상이고 계단만이면 3~4명(현직 소방관 면담),
// 부축과 도보는 1층이거나 계단 문제가 없으면 1명, 2층 이상이고 계단만이면 2명(팀 설정). 욕창이 있으면 시간 더 걸림 표시
export function floorNum(floor) {
  const m = String(floor || '').match(/\d+/)
  return m ? Number(m[0]) : 1
}
export function crewOf(grade, access, tags = []) {
  const heavy = grade === 'bed' || grade === 'wheelchair'
  const hard = floorNum(access?.floor) > 1 && String(access?.stairs || '').includes('계단만')
  const base = heavy ? (hard ? '3~4명' : '2명') : (hard ? '2명' : '1명')
  return tags.includes('pressureSore') ? `${base} (욕창, 이송 시간 더 걸림)` : base
}
export const DEVICE_TAGS = { oxygen: '산소' }
export function deviceOf(tags = []) {
  const d = tags.filter((t) => DEVICE_TAGS[t]).map((t) => DEVICE_TAGS[t])
  return d.length ? d.join(', ') : '없음'
}
export function petOf(tags = []) { return tags.includes('pet') ? '있음' : '없음' }

export function locationOf(person, info) {
  // 마을은 옆 열에 있으므로 동호수와 층을 앞에 둔다. 동호수가 없으면 주소로 대신한다
  const unit = (info?.unit || '').replace(/^가상 /, '')
  const floor = person?.access?.floor || ''
  const head = unit || info?.address || ''
  return [head, floor].filter(Boolean).join(', ') + (info?.unit ? ' (가상)' : '') || '명부에 없음'
}

export function checkedOf(person, now) {
  const at = person?.planCheckedAt
  if (!at) return { text: '확인 기록 없음', days: null, stale: true }
  const days = Math.max(0, Math.floor((now - at) / DAY))
  return { at, days, text: `${days}일 전`, stale: days > STALE_DAYS }
}

// 가장 급한 사람 먼저: 인계 대기(이송 실패, 미배정)를 위에, 이미 소방 인계한 사람은 아래.
// 같은 묶음 안에서는 산불 도달이 빠른 마을, 그다음 등급 가중치 높은 순, 같으면 대상자 코드 순
export function sortUrgent(rows) {
  const done = (r) => (r.status === 'handedToFire' ? 1 : 0)
  return [...rows].sort((a, b) =>
    done(a) - done(b) ||
    (a.arrival ?? Infinity) - (b.arrival ?? Infinity) ||
    (gradeOf(b.grade)?.weight || 0) - (gradeOf(a.grade)?.weight || 0) ||
    String(a.code).localeCompare(String(b.code)))
}

// entries: [{ code, reason, status, at, care }] (이송 실패, 미배정, 소방 인계)
export function buildHandoverRows({ entries, persons, villages, privateInfo = {}, arrivals = {}, now, dongName = (c) => c, tagText = (t) => t }) {
  const pmap = Object.fromEntries(persons.map((p) => [p.code, p]))
  const vmap = Object.fromEntries(villages.map((v) => [v.code, v]))
  const seen = new Set()
  const out = []
  for (const e of entries) {
    if (seen.has(e.code) || !pmap[e.code]) continue
    seen.add(e.code)
    const p = pmap[e.code]
    const v = vmap[p.villageCode]
    const info = privateInfo[e.code] || null
    out.push({
      code: e.code, grade: p.grade, gradeTerm: FIRE_GRADE_TERM[p.grade] || '',
      dong: dongName(v?.dongCode), village: v?.label || p.villageCode,
      arrival: arrivals[p.villageCode] ?? null,
      location: locationOf(p, info), elevator: elevatorOf(p.access),
      guardianPhone: info?.guardianPhone || '명부에 없음',
      address: info?.address || '명부에 없음',
      crew: crewOf(p.grade, p.access, p.tags || []), device: deviceOf(p.tags || []), pet: petOf(p.tags || []),
      checked: checkedOf(p, now),
      tags: (p.tags || []).map(tagText).join(' '), reason: e.reason, status: e.status,
      at: e.at, care: e.care || null
    })
  }
  return sortUrgent(out)
}

// CSV 열(소방 인계 전달용). 첫 열에 목록 기준 시각을 모든 행에 넣어, 파일만 받아도 몇 시 기준인지 보이게 한다(인터뷰 Q4)
export function handoverCsvColumns(baseAt) {
  const statusText = (r) => (r.status === 'handedToFire' ? '소방 인계' : r.status === 'fail' ? '이송 실패' : '미배정')
  return [
    { key: 'baseAt', label: '목록 기준 시각', value: () => fmtDateTime(baseAt) },
    { key: 'code', label: '대상자 코드' }, { key: 'dong', label: '동' }, { key: 'village', label: '마을' },
    { key: 'arrival', label: '산불 도달 예상', value: (r) => fmtHM(r.arrival) },
    { key: 'grade', label: '등급', value: (r) => gradeOf(r.grade)?.label }, { key: 'gradeTerm', label: '거동 상태' },
    { key: 'location', label: '상세 위치(동호수, 층)' }, { key: 'elevator', label: '엘리베이터' },
    { key: 'guardianPhone', label: '보호자 연락처' },
    { key: 'address', label: '주소(가상)' }, { key: 'crew', label: '필요 대원 수' },
    { key: 'device', label: '의료기기' }, { key: 'pet', label: '반려동물' },
    { key: 'checked', label: '명부 마지막 확인', value: (r) => (r.checked.days == null ? r.checked.text : `${fmtDate(r.checked.at)}(${r.checked.text}${r.checked.stale ? ', 재확인 필요' : ''})`) },
    { key: 'tags', label: '특이사항' },
    { key: 'reason', label: '기한 안 미이송 사유' },
    { key: 'symptomAt', label: '증상 발생 시각', value: (r) => r.care?.symptomAt || '' },
    { key: 'observation', label: '관찰 내용', value: (r) => r.care?.observation || '' },
    { key: 'action', label: '수행한 조치', value: (r) => r.care?.action || '' },
    { key: 'status', label: '상태', value: statusText }
  ]
}

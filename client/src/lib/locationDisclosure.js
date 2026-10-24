// 도우미 위치 정보 최소 공개(26회차 검수 반영). 화면, 서버, 시험이 같이 쓴다.
// 근거(국가법령정보센터 원문, 2026. 10. 25. 확인):
//  - 개인정보 보호법 제17조 제1항 제1호(정보주체 동의), 제2항(제공받는 자, 이용 목적, 항목, 보유 기간, 거부권과 불이익 고지)
//  - 개인정보 보호법 제15조 제1항 제5호(명백히 정보주체 또는 제3자의 급박한 생명, 신체, 재산의 이익),
//    제7호(공중위생 등 공공의 안전과 안녕을 위하여 긴급히 필요한 경우), 제17조 제1항 제2호(그 목적 범위의 제공)
//  - 개인정보 보호법 제3조, 제16조(최소 처리), 제21조(목적 달성 뒤 파기)
//  - 재난 및 안전관리 기본법 제74조의3: 재난 대응 기관 사이 제공(소방 인계)의 근거. 개인 도우미는 같은 조 제3항의 기관이 아니므로
//    도우미 제공 근거로 쓰지 않는다
// 원칙: 평시, 수락 전, 불가 뒤에는 보내지 않는다. 훈련 발령은 급박성이 없으므로 별도 동의한 대상자만.
// 공개하는 항목은 찾아가는 데 필요한 네 가지뿐이다. 이름, 건강 정보, 등급 사유 원문은 계속 보내지 않는다.
import { elevatorOf } from './handoverRows.js'

export const LOCATION_FIELDS = ['address', 'unit', 'floor', 'elevator', 'guardianPhone']

export const LOCATION_LAW = {
  consent: '개인정보 보호법 제17조 제1항 제1호(별도 동의)',
  urgent: '개인정보 보호법 제15조 제1항 제5호, 제7호와 제17조 제1항 제2호(실제 발령 중 급박한 생명, 신체 보호)'
}

// 명부 등록 때 받는 별도 동의의 고지 다섯 가지(개인정보 보호법 제17조 제2항)
export const LOCATION_CONSENT_NOTICE = [
  ['제공받는 자', '발령 때 이 대상자에게 배정되어 수락한 이송 도우미 1~2명'],
  ['이용 목적', '기한 안에 집을 찾아가 차량에 태워 대피소로 모시기 위함'],
  ['제공 항목', '주소(도로명), 동호수와 층, 엘리베이터 여부, 보호자 연락처'],
  ['보유 기간', '해당 발령이 끝나거나 배정이 바뀌면 도우미 휴대폰과 서버에서 바로 지움'],
  ['거부권과 불이익', '동의하지 않아도 됩니다. 동의하지 않으면 도우미는 담당자에게 위치를 물어 찾아가며, 이송 배정에는 불이익이 없습니다']
]

// 공개 근거. 'consent'(별도 동의), 'urgent'(실제 발령의 급박한 보호), null(공개하지 않음)
export function disclosureBasis({ kind, consent }) {
  if (consent === true) return 'consent'
  if (kind === 'real') return 'urgent'
  return null
}

// 공개 조건 전체: 본인 배정 대상자이고, 수락했고, 발령이 진행 중일 때만. 그리고 근거가 있을 때만
export function canDisclose({ kind, consent, accepted, assigned, closed }) {
  if (closed || !assigned || accepted !== true) return null
  return disclosureBasis({ kind, consent })
}

// 명부에서 공개 항목만 뽑는다(최소 항목)
export function locationOf(person, info) {
  if (!person) return null
  const unit = String(info?.unit || '').replace(/^가상 /, '')
  return {
    address: info?.address || '',
    unit: unit === '단독주택' ? '' : unit,
    floor: person.access?.floor || '',
    elevator: elevatorOf(person.access),
    guardianPhone: info?.guardianPhone || ''
  }
}

// 서버 입력 검사. 정해진 칸과 길이만 받는다
const PHONE_OK = /^0\d{1,2}-\d{3,4}-\d{4}$/
const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
export function cleanLocation(x) {
  if (!x || typeof x !== 'object') return null
  const out = {
    address: s(x.address, 80), unit: s(x.unit, 40), floor: s(x.floor, 10), elevator: s(x.elevator, 20),
    guardianPhone: PHONE_OK.test(String(x.guardianPhone || '')) ? x.guardianPhone : '',
    basis: x.basis === 'urgent' ? 'urgent' : 'consent'
  }
  return out.address || out.unit || out.guardianPhone ? out : null
}

// 저장 때 도우미별 공개 후보를 만든다. 훈련 발령은 별도 동의한 대상자만, 실제 발령은 본인 배정 전원(급박성).
// 수락 여부는 서버가 조회 때 다시 확인한다(여기서는 배정과 근거만)
export function locationsForHelpers({ kind, briefs, persons = [], privateInfo = {} }) {
  const pBy = Object.fromEntries(persons.map((p) => [p.code, p]))
  const out = {}
  for (const [h, b] of Object.entries(briefs || {})) {
    const codes = b?.personCodes || (b?.trips || []).flatMap((t) => t.personCodes || [])
    const m = {}
    for (const c of codes) {
      const p = pBy[c]
      const basis = disclosureBasis({ kind, consent: p?.locConsent === true })
      if (!p || !basis) continue
      const loc = locationOf(p, privateInfo[c])
      if (loc) m[c] = { ...loc, basis }
    }
    if (Object.keys(m).length) out[h] = m
  }
  return out
}

// 도우미의 최신 수락 여부(서버에 접수된 응답 기준)
export function acceptedOf(reports, helper) {
  const acks = (reports || []).filter((r) => r && r.type === 'ack' && (!helper || r.helper === helper))
  if (!acks.length) return false
  const last = acks.reduce((a, b) => ((b.receivedAt ?? b.at ?? 0) >= (a.receivedAt ?? a.at ?? 0) ? b : a))
  return last.answer === 'accept'
}

// 도우미 화면 문구
export const LOCATION_ERASE_NOTE = '발령이 끝나면 이 정보는 휴대폰에서 지워집니다'
export function locationRows(loc) {
  if (!loc || !(loc.address || loc.unit || loc.floor)) return null
  const place = loc.address || '주소 없음'
  const ev = String(loc.elevator || '')
  const evText = ev.startsWith('해당 없음') ? '계단 없음' : ev.startsWith('없음') ? '엘리베이터 없음, 계단만' : ev === '있음' ? '엘리베이터 있음' : ''
  const detail = [loc.unit, loc.floor, evText].filter(Boolean).join(', ')
  const basisText = loc.basis === 'urgent' ? '근거: 실제 발령 중 생명 보호(개인정보 보호법 제15조)' : '근거: 대상자 별도 동의(개인정보 보호법 제17조)'
  return { place, detail: detail || '동호수와 층 정보 없음', basisText }
}

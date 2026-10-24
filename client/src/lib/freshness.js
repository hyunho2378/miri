// 공공데이터 자료 지연 판정. 서버(/api/opendata)가 붙인 asOf(자료 기준 시각)와 fetchedAt(조회 시각)으로
// 허용 지연을 넘었는지, 응답이 0건인지를 가른다. 회신(재난문자 지도 서비스 개발자) 의견: 기준 시각이 보여야
// 담당자가 오래된 자료인지 판단할 수 있음. 허용 지연의 근거는 README 데이터 출처 표와 같다.
export const MAX_LAG_MIN = {
  // 기상청 단기예보: 1일 8회(02, 05, 08, 11, 14, 17, 20, 23시) 발표(기상청 단기예보 조회서비스 활용가이드). 3시간 간격에 1시간 여유
  wind: { min: 240, basis: '기상청 단기예보 1일 8회 발표(3시간 간격) + 1시간 여유' },
  // 국립중앙의료원 응급실 가용병상: 병원 입력 시각 기준. 공식 허용 지연 기준이 공개되지 않아 팀 기준
  er: { min: 180, basis: '팀 기준(병원 입력 3시간 경과)' },
  // 산림청 산불위험예보: 분석 시각 기준. 공공데이터포털 15084817 상세 안내(2026. 10. 25. 접속): 2, 5, 8, 11, 14, 17, 20, 23시 분석,
  // 3시간 주기 제공. 두 번 거른 경우까지 보도록 공식 주기 3시간 + 여유 3시간(플랫폼 AI 협업 툴 셀 85, 이전 팀 기준 24시간)
  fire: { min: 6 * 60, basis: '산림청 공식 3시간 주기(공공데이터포털 15084817) + 3시간 여유' },
  // 기상청 특보현황: 특보 변동이 없으면 발표 시각이 그대로 남으므로 넓게 잡은 팀 기준(과경보 방지)
  warning: { min: 72 * 60, basis: '팀 기준(발표 72시간 경과, 변동 없을 때 발표 시각 유지)' }
}
// 등록 목록형 자료: 기준 시각이 없어 지연 판정을 하지 않고 조회 시각만 보인다
export const STATIC_KINDS = new Set(['access', 'shelters', 'ltc', 'ambulance'])

const pad = (n) => String(n).padStart(2, '0')
export function fmtKst(iso) {
  const t = Date.parse(iso || '')
  if (Number.isNaN(t)) return ''
  const d = new Date(t + 9 * 3600000)
  return `${d.getUTCMonth() + 1}. ${d.getUTCDate()}. ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
const fmtLag = (min) => (min >= 60 ? `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ''}` : `${min}분`)

// 상태: ok | stale | empty | static | pending | unknown
export function freshness(kind, data, now = Date.now()) {
  if (!data) return { state: 'unknown' }
  if (data.status === 'pending') return { state: 'pending', label: `승인 대기(신청 ${data.appliedAt || ''})` }
  const asOfText = fmtKst(data.asOf)
  const basis = data.asOfBasis || '기준 시각'
  if (data.empty) return { state: 'empty', label: `응답 0건(누락 가능), 조회 ${fmtKst(data.fetchedAt)}` }
  if (STATIC_KINDS.has(kind)) return { state: 'static', label: `조회 ${fmtKst(data.fetchedAt)}` }
  const rule = MAX_LAG_MIN[kind]
  if (!rule) return { state: 'ok', label: asOfText ? `${basis} ${asOfText}` : '' }
  const t = Date.parse(data.asOf || '')
  // 기준 시각이 없거나 미래 시각이면 정상으로 보지 않는다
  if (Number.isNaN(t)) return { state: 'unknown', label: `자료 기준 시각 없음, 조회 ${fmtKst(data.fetchedAt)}` }
  if (t > now + 10 * 60000) return { state: 'unknown', label: `기준 시각 확인 필요(${asOfText}, 조회 시각보다 늦음)` }
  const lagMin = Math.max(0, Math.round((now - t) / 60000))
  // 응급실: 병원별로 판정해 지연 기관 수를 함께 보인다
  if (kind === 'er' && Array.isArray(data.list)) {
    const late = data.list.filter((x) => { const u = Date.parse(x.asOf || ''); return Number.isNaN(u) || (now - u) / 60000 > rule.min }).length
    if (late) return { state: 'stale', lagMin, limitMin: rule.min, late, label: `갱신 지연: ${data.list.length}곳 중 ${late}곳 병원 입력 ${fmtLag(rule.min)} 초과 또는 시각 없음(가장 오래된 입력 ${asOfText}, ${rule.basis})` }
    return { state: 'ok', lagMin, limitMin: rule.min, label: `${basis} ${asOfText}` }
  }
  if (lagMin > rule.min) return { state: 'stale', lagMin, limitMin: rule.min, label: `갱신 지연: ${basis} ${asOfText}, ${fmtLag(lagMin)} 경과(허용 ${fmtLag(rule.min)}, ${rule.basis})` }
  return { state: 'ok', lagMin, limitMin: rule.min, label: `${basis} ${asOfText}` }
}

// 마지막 정상 수신 시각(브라우저 보관). 지연, 0건, 실패 때 함께 보인다
const KEY = (kind) => `miri.opendata.lastgood.${kind}`
export function rememberGood(kind, data, now = Date.now()) {
  try { if (typeof localStorage !== 'undefined' && freshness(kind, data, now).state === 'ok') localStorage.setItem(KEY(kind), data.fetchedAt || new Date(now).toISOString()) } catch { /* 보관 불가 환경 */ }
}
export function lastGood(kind) {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY(kind)) : null } catch { return null }
}

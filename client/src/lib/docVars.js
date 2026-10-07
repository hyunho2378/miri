// docVars.js 문서에 넣는 자료값. 상황판과 같은 계산(computeShortage)으로 지금 숫자를 만든다.
// 문서 안에서는 <span class="dv" data-var="키"> 로 들어가고, 문서를 열 때와 [자료 새로 고침]을 누를 때 값이 바뀐다.
// 계산은 <span class="dv" data-calc="식" data-fmt="소수 자리"> 로 들어간다. 식에는 자료 키와 + - * / ( ) 숫자만 쓴다.
import { GRADES } from './shortage.js'
import { computeShortage, optimizedUnserved, requiredExtraVehicles } from './shortageCalc.js'
import { HAZARD_KINDS } from './scenario.js'
import { DONG_STATS, TEMP_SHELTERS } from '../mock/donghaeData.js'

const n = (x) => Number(x || 0).toLocaleString('ko-KR')
export const dotDate = (d = new Date()) => `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
const elapsed = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm ? `${hh}시간 ${mm}분` : `${hh}시간` }

// 자료 목록(편집기 오른쪽 자료 넣기에 보이는 순서). group 으로 묶는다
export const VAR_DEFS = [
  { key: 'today', label: '오늘 날짜', group: '기본' },
  { key: 'baseDate', label: '명부 기준일', group: '기본' },
  { key: 'org', label: '기관명', group: '기본' },
  { key: 'population', label: '주민등록인구', unit: '명', group: '기본', num: true },
  { key: 'age65', label: '65세 이상 인구', unit: '명', group: '기본', num: true },
  { key: 'agingRate', label: '고령화율', unit: '%', group: '기본', num: true },
  { key: 'targets', label: '등록 대상자', unit: '명', group: '명부', num: true },
  { key: 'villages', label: '마을 수', unit: '곳', group: '명부', num: true },
  { key: 'bed', label: '침상 대상자', unit: '명', group: '명부', num: true },
  { key: 'wheelchair', label: '휠체어 대상자', unit: '명', group: '명부', num: true },
  { key: 'assist', label: '부축 대상자', unit: '명', group: '명부', num: true },
  { key: 'walk', label: '도보 대상자', unit: '명', group: '명부', num: true },
  { key: 'pending', label: '확인 대기 서류', unit: '건', group: '명부', num: true },
  { key: 'scenario', label: '시나리오 이름', group: '시나리오' },
  { key: 'hazard', label: '재난 종류', group: '시나리오' },
  { key: 'firstArrival', label: '첫 도달(발령 후)', group: '시나리오' },
  { key: 'scopeVillages', label: '대피 대상 마을', unit: '곳', group: '시나리오', num: true },
  { key: 'scopeTargets', label: '대피 대상자', unit: '명', group: '시나리오', num: true },
  { key: 'unserved', label: '미이송 예상', unit: '명', group: '시나리오', num: true },
  { key: 'unservedOpt', label: '추천 배정 적용 시 미이송', unit: '명', group: '시나리오', num: true },
  { key: 'shortVillages', label: '부족 마을', unit: '곳', group: '시나리오', num: true },
  { key: 'extraVehicles', label: '필요 추가 차량', unit: '대', group: '시나리오', num: true },
  { key: 'vehicles', label: '전체 차량', unit: '대', group: '자원', num: true },
  { key: 'vehiclesAvail', label: '가용 차량', unit: '대', group: '자원', num: true },
  { key: 'helpers', label: '대피 도우미', unit: '명', group: '자원', num: true },
  { key: 'shelters', label: '임시주거시설', unit: '곳', group: '자원', num: true },
  { key: 'shelterCapacity', label: '임시주거시설 수용', unit: '명', group: '자원', num: true },
  { key: 'tableShortage', label: '마을별 미이송 표', group: '표', table: true },
  { key: 'tableGrades', label: '이송 등급별 대상자 표', group: '표', table: true },
  { key: 'tableVehicles', label: '차종별 차량 표', group: '표', table: true }
]
export const VAR_BY_KEY = Object.fromEntries(VAR_DEFS.map((d) => [d.key, d]))

const TD = 'border:1px solid #33363d;padding:4px 6px;text-align:center'
const TH = `${TD};background:#e6e8ea;font-weight:700`
const table = (head, rows) => `<table class="dv-table" style="border-collapse:collapse;width:100%;margin:6px 0"><thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`

// 값 계산. data 는 useMiriStore 상태, scenario 는 활성 시나리오
export function computeVars(data, scenario) {
  const { persons, villages, vehicles, helpers, settings, dongs, today } = data
  const result = computeShortage({ persons, villages, vehicles, helpers, settings, scenario, t0: today })
  const extra = requiredExtraVehicles({ persons, villages, vehicles, helpers, settings, scenario, t0: today }, result)
  const opt = optimizedUnserved(result)
  const active = persons.filter((p) => p.review !== 'rejected')
  const byGrade = Object.fromEntries(GRADES.map((g) => [g.key, active.filter((p) => p.grade === g.key).length]))
  const pop = Object.values(DONG_STATS).reduce((a, d) => a + d.total, 0)
  const a65 = Object.values(DONG_STATS).reduce((a, d) => a + d.age65, 0)
  const scope = villages.filter((v) => result.byVillage[v.code]?.inScope)
  const short = scope.filter((v) => result.byVillage[v.code].total > 0).sort((a, b) => result.byVillage[b.code].total - result.byVillage[a.code].total)
  const dongName = (c) => dongs.find((d) => d.code === c)?.name || c
  const vals = {
    today: dotDate(new Date()),
    baseDate: dotDate(new Date(today)),
    org: settings.orgName || '동해시',
    population: pop, age65: a65, agingRate: Math.round((a65 / pop) * 1000) / 10,
    targets: active.length, villages: villages.length,
    bed: byGrade.bed, wheelchair: byGrade.wheelchair, assist: byGrade.assist, walk: byGrade.walk,
    pending: persons.filter((p) => p.review === 'pending').length,
    scenario: scenario.name, hazard: HAZARD_KINDS[scenario.kind]?.label || '재난',
    firstArrival: elapsed(scenario.windowHours),
    scopeVillages: scope.length, scopeTargets: result.scopeTargets ?? scope.reduce((a, v) => a + result.byVillage[v.code].targetTotal, 0),
    unserved: result.total, unservedOpt: opt, shortVillages: short.length,
    extraVehicles: extra.reduce((a, x) => a + x.count, 0),
    vehicles: vehicles.length, vehiclesAvail: vehicles.filter((v) => v.available !== false).length,
    helpers: helpers.filter((h) => h.active !== false).length,
    shelters: TEMP_SHELTERS.length, shelterCapacity: TEMP_SHELTERS.reduce((a, s) => a + s.capacity, 0)
  }
  vals.tableShortage = short.length
    ? table(['마을', '행정동', '대상자', '미이송 예상'], short.map((v) => [v.label, dongName(v.dongCode), `${n(result.byVillage[v.code].targetTotal)}명`, `${n(result.byVillage[v.code].total)}명`]))
    : table(['마을', '행정동', '대상자', '미이송 예상'], [['부족 마을 없음', '', '', '']])
  vals.tableGrades = table(['이송 등급', '대상', '필요 차량과 인력', '인원'], GRADES.map((g) => [g.label, g.target, g.need, `${n(byGrade[g.key])}명`]))
  const types = {}
  for (const v of vehicles) { const k = v.type || '기타'; types[k] = types[k] || { all: 0, ok: 0 }; types[k].all += 1; if (v.available !== false) types[k].ok += 1 }
  vals.tableVehicles = table(['차종', '전체', '가용'], Object.entries(types).map(([k, x]) => [k, `${x.all}대`, `${x.ok}대`]))
  return vals
}

export function formatVar(key, vals) {
  const d = VAR_BY_KEY[key]
  const v = vals[key]
  if (v == null) return '○○○'
  if (d?.num && typeof v === 'number') return `${n(v)}${d.unit || ''}`
  return String(v)
}

// 계산식: 자료 키와 숫자, 사칙연산만 허용
export function evalCalc(expr, vals, digits = 0) {
  const src = String(expr).replace(/[A-Za-z][A-Za-z0-9]*/g, (k) => (VAR_BY_KEY[k]?.num ? String(Number(vals[k] || 0)) : 'NaN'))
  if (!/^[\d\s+\-*/().NaN]+$/.test(src)) return '계산 불가'
  try {
    const r = Function(`"use strict";return (${src})`)()
    if (!Number.isFinite(r)) return '계산 불가'
    return r.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  } catch { return '계산 불가' }
}

// 문서에서 고친 값(overrides: 키별 글)을 얹는다. 숫자로 읽히면 숫자로 바꿔 계산에도 쓴다
export function withOverrides(vals, overrides) {
  if (!overrides) return vals
  const out = { ...vals }
  for (const [k, t] of Object.entries(overrides)) {
    if (t == null) continue
    const num = Number(String(t).replace(/[,\s]/g, '').replace(/(명|대|곳|건|%|분)$/, ''))
    out[k] = VAR_BY_KEY[k]?.num && Number.isFinite(num) && /\d/.test(t) ? num : t
  }
  return out
}

// 문서 안 자료 칸을 지금 값으로 바꾼다. 표 자료는 칸 안에 표를 다시 그린다
export function refreshVars(root, vals) {
  root.querySelectorAll('.dv[data-var]').forEach((el) => {
    const k = el.dataset.var
    if (VAR_BY_KEY[k]?.table) el.innerHTML = vals[k] || ''
    else el.textContent = formatVar(k, vals)
  })
  root.querySelectorAll('.dv[data-calc]').forEach((el) => {
    el.textContent = `${evalCalc(el.dataset.calc, vals, Number(el.dataset.fmt || 0))}${el.dataset.unit || ''}`
  })
}

// 템플릿용 자료 칸 HTML
export const V = (key) => VAR_BY_KEY[key]?.table
  ? `<div class="dv dv-block" data-var="${key}" contenteditable="false"></div>`
  : `<span class="dv" data-var="${key}" contenteditable="false"></span>`
export const C = (expr, unit = '', digits = 0) => `<span class="dv" data-calc="${expr}" data-fmt="${digits}" data-unit="${unit}" contenteditable="false"></span>`

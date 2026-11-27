// 삼척시 실제 공개 자료 시험. 원자료(scripts/data-raw/samcheok)와 생성 파일이 맞는지, 산출 순서가 동해시와 같은지,
// 시나리오별 이동 불가 인원과 0명이 되는 추가 자원이 정해진 값인지 본다. 지역은 프로세스마다 하나라 따로 띄워 계산한다
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { REGIONS } from '../src/regions/index.js'
import { VILLAGE_TERRAIN } from '../src/mock/samcheokTerrain.js'
import { FOREST_FIRE_ROWS } from '../src/data/forestFireHistorySamcheok.js'

const CLIENT = fileURLToPath(new URL('..', import.meta.url))
const RAW = new URL('../scripts/data-raw/samcheok/', import.meta.url)
const raw = (f) => JSON.parse(fs.readFileSync(new URL(f, RAW), 'utf8'))
const R = REGIONS.samcheok
const { VILLAGES, TEMP_SHELTERS, LTC, DONG_STATS, LTC_RESIDENTIAL, LTC_DAYCARE, DONG_CENTERS, SENIOR_CENTERS } = R.data

test('삼척 원자료: 인구와 장기요양 통계를 원자료 값 그대로 옮김', () => {
  const pop = raw('pop_51230.json')
  assert.equal(pop.period, '2026년 9월')
  // 원덕읍은 임원출장소 인구를 더한 값
  const wd = pop.dongs['원덕읍'], im = pop.dongs['원덕읍임원출장소']
  assert.equal(DONG_STATS.WD.total, wd.total + im.total)
  assert.equal(DONG_STATS.WD.age75, wd.age75 + im.age75)
  for (const [code, d] of Object.entries(DONG_STATS)) if (code !== 'WD') assert.equal(d.total, pop.dongs[d.name].total, d.name)
  const users = raw('ltc_users_51230.json')
  assert.deepEqual(LTC.users, users.total)
  assert.deepEqual(LTC.judged, raw('ltc_grades_51230.json').values)
  assert.equal(LTC.judged['계'], 2449)
})

test('삼척 산출 순서: 재가 수급자를 75세 이상 인구 비율로 행정동에, 경로당 수로 마을에 나눔', () => {
  // 1) 등급 합계와 이송 유형 합계가 재가 수급자와 같다
  const gradeSum = Object.values(LTC.homeByGrade).reduce((a, b) => a + b, 0)
  assert.equal(gradeSum, LTC.homeTotal)
  assert.deepEqual(LTC.homeByGrade, { '1등급': 86, '2등급': 156, '3등급': 554, '4등급': 737, '5등급': 104, 인지지원등급: 10 })
  assert.deepEqual(LTC.homeByTransport, { bed: 86, wheelchair: 156, assist: 1291, walk: 114 })
  // 2) 행정동 배분 합계, 75세 이상 인구가 많은 동이 더 받는다(최대 잔여 방식이라 1명 오차 안)
  const dongs = Object.values(DONG_STATS)
  assert.equal(dongs.reduce((t, d) => t + d.targets, 0), LTC.homeTotal)
  const age75 = dongs.reduce((t, d) => t + d.age75, 0)
  for (const d of dongs) assert.ok(Math.abs(d.targets - (LTC.homeTotal * d.age75) / age75) < 1, d.name)
  // 3) 마을 합계가 행정동 몫과 같다
  for (const [code, d] of Object.entries(DONG_STATS)) assert.equal(VILLAGES.filter((v) => v.dongCode === code).reduce((t, v) => t + v.targets, 0), d.targets, d.name)
  assert.ok(VILLAGES.every((v) => v.weightBasis === '경로당 수 비례(건축물 통계 미수신)' || v.weightBasis === '행정동 전체'))
  // 법정동 27곳과 법정리 101곳(국토교통부 법정동 파일)
  assert.equal(VILLAGES.filter((v) => /^5123010|^5123011|^5123012/.test(v.bdongCode)).length, 27)
  assert.equal(VILLAGES.length - 27, 101)
})

test('삼척 시설 자료: 대피소, 장기요양기관, 행정복지센터, 경로당', () => {
  // 대피소 22곳 모두 삼척시 경계 안, 주행 시간은 모든 마을이 모든 대피소로 가는 값(가까운 순)
  for (const v of VILLAGES) {
    assert.equal(v.drive.length, TEMP_SHELTERS.length, v.code)
    for (let i = 1; i < v.drive.length; i += 1) assert.ok(v.drive[i][1] >= v.drive[i - 1][1])
  }
  assert.ok(TEMP_SHELTERS.every((s) => R.dongs.some((d) => d.code === s.dong)))
  // 노인요양시설 6곳과 공동생활가정 1곳, 주야간보호 3곳(공단 장기요양기관 찾기)
  assert.equal(LTC_RESIDENTIAL.length, 7)
  assert.equal(LTC_RESIDENTIAL.reduce((t, f) => t + f.capacity, 0), 464)
  assert.deepEqual(LTC_DAYCARE.map((f) => [f.name, f.capacity, f.current]), [['삼척종합재가노인복지센터', 40, 33], ['도계재가노인복지센터', 20, 21], ['봄재활주간보호센터', 70, 40]])
  assert.equal(DONG_CENTERS.length, 12)
  assert.ok(DONG_CENTERS.every((c) => R.dongs.some((d) => d.code === c.dong)))
  assert.equal(SENIOR_CENTERS.length, 240)
  // 지형 값은 마을마다 하나
  assert.deepEqual(Object.keys(VILLAGE_TERRAIN).sort(), VILLAGES.map((v) => v.code).sort())
  // 산불 이력: 삼척 행 18건과 삼척까지 번진 2022년 울진 산불 1건
  assert.equal(FOREST_FIRE_ROWS.length, 19)
  assert.ok(FOREST_FIRE_ROWS.some((r) => r.start === '2022-03-04 11:17' && r.areaHa === 16301.98))
})

test('삼척 시나리오: 근거 기록이 있고 차량은 가정으로 표시', () => {
  const ids = R.scenarios.map((s) => s.id)
  assert.deepEqual(ids, ['F-1', 'F-2', 'T-1', 'S-4'])
  for (const s of R.scenarios) assert.ok(s.basis.length > 40, s.id)
  assert.match(R.scenarios[0].basis, /연합뉴스 2022\. 3\. 5\./)
  assert.match(R.scenarios[2].basis, /1983년 5월 26일/)
  assert.equal(R.fleetAssumed, true)
})

// 시나리오별 기준 배정 이동 불가, 추천 배정, 0명이 되는 추가 협약 차량(차량으로 풀리는 부족분)
function runAll() {
  const code = `
    const { buildSeed } = await import('./src/mock/seed.js')
    const { REGION } = await import('./src/regions/index.js')
    const { fireScenario } = await import('./src/lib/scenario.js')
    const { computeShortage, optimizedUnserved, requiredExtraVehicles } = await import('./src/lib/shortageCalc.js')
    const s = buildSeed()
    const out = {}
    for (const sc of s.scenarios) {
      const input = { persons: s.persons, villages: s.villages, vehicles: s.vehicles, helpers: s.helpers, settings: s.settings, scenario: sc, t0: s.today }
      const r = computeShortage(input)
      const ex = requiredExtraVehicles(input, r)
      const extra = {}
      for (const e of ex) extra[e.type] = (extra[e.type] || 0) + e.count
      const after = ex.length ? computeShortage({ ...input, scenario: { ...sc, extraVehicles: extra } }).total : r.total
      const spec = REGION.scenarios.find((x) => x.id === sc.id)
      const lead = sc.kind === 'fire' ? [1, 2].map((h) => computeShortage({ ...input, scenario: { ...fireScenario({ ...spec, leadHours: h, villages: s.villages }), builtin: true } }).total) : null
      out[sc.id] = { scope: r.scopeTargets, total: r.total, time: r.timeTotal, opt: optimizedUnserved(r), extra, after, lead }
    }
    console.log(JSON.stringify(out))`
  const res = execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: CLIENT, env: { ...process.env, MIRI_REGION: 'samcheok' }, encoding: 'utf8', maxBuffer: 1 << 24 })
  return JSON.parse(res.trim().split('\n').pop())
}

test('삼척 부족분: 시나리오별 이동 불가 인원과 0명이 되는 추가 자원', () => {
  const o = runAll()
  // 산불 F-1(2022년 기록 경로): 원덕읍 6곳 96명, 불이 닿은 때 발령하면 45명이 첫 왕복 전에 시간 부족
  assert.deepEqual([o['F-1'].scope, o['F-1'].total, o['F-1'].time, o['F-1'].opt], [96, 45, 45, 45])
  assert.deepEqual(o['F-1'].extra, {})
  // 차량을 더해도 풀리지 않고, 경계 도달 1시간 전 발령이면 19명, 2시간 전이면 0명
  assert.deepEqual(o['F-1'].lead, [19, 0])
  // F-2(가곡천 북상 가정): 4곳 90명, 38명 시간 부족
  assert.deepEqual([o['F-2'].scope, o['F-2'].total, o['F-2'].time, o['F-2'].opt], [90, 38, 38, 38])
  assert.deepEqual(o['F-2'].lead, [19, 0])
  // 지진해일 T-1: 12곳 304명, 기준 163명, 추천 배정 127명, 침상 10, 리프트 8, 승용차 71, 버스 1대를 더하면 0명
  assert.deepEqual([o['T-1'].scope, o['T-1'].total, o['T-1'].time, o['T-1'].opt], [304, 163, 0, 127])
  assert.deepEqual(o['T-1'].extra, { bedVan: 10, liftVan: 8, car: 71, bus: 1 })
  assert.equal(o['T-1'].after, 0)
  // 시 전체 S-4: 128곳 1,647명, 기준 880명, 추천 배정 661명, 침상 1, 리프트 4, 승용차 27대를 더하면 0명
  assert.deepEqual([o['S-4'].scope, o['S-4'].total, o['S-4'].time, o['S-4'].opt], [1647, 880, 0, 661])
  assert.deepEqual(o['S-4'].extra, { bedVan: 1, liftVan: 4, car: 27 })
  assert.equal(o['S-4'].after, 0)
})

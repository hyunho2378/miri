// 지역 설정 검증. 필수 항목 누락 감지, 두 지역 전환, 지역 간 자료 섞임 없음, 동해시 기준 수치 유지
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { REGIONS, REGION, DEFAULT_REGION_ID, validateRegion, resolveRegionId } from '../src/regions/index.js'

const CLIENT = fileURLToPath(new URL('..', import.meta.url))

// 다른 지역으로 켠 프로세스에서 시드와 부족분을 계산해 요약만 돌려받는다(모듈은 프로세스당 한 지역)
function runIn(regionId) {
  const code = `
    const { REGION } = await import('./src/regions/index.js')
    const { buildSeed } = await import('./src/mock/seed.js')
    const { computeShortage } = await import('./src/lib/shortageCalc.js')
    const { ROAD_ROUTES, TEMP_SHELTERS } = await import('./src/regions/data.js')
    const s = buildSeed()
    const sc = s.scenarios.find((x) => x.id === s.activeScenarioId)
    const r = computeShortage({ persons: s.persons, villages: s.villages, vehicles: s.vehicles, helpers: s.helpers, settings: s.settings, scenario: sc, t0: s.today })
    console.log(JSON.stringify({
      id: REGION.id, org: s.settings.orgName, dongs: s.dongs.map((d) => d.code), villages: s.villages.map((v) => v.code),
      shelters: s.shelters.map((x) => x.code), sheltersData: TEMP_SHELTERS.map((x) => x.code), persons: s.persons.length,
      personVillages: [...new Set(s.persons.map((p) => p.villageCode))], vehicleDongs: [...new Set(s.vehicles.map((v) => v.baseDong))],
      addresses: [...new Set(Object.values(s.privateInfo).map((p) => p.address.split(' ')[0]))],
      roadKeys: Object.keys(ROAD_ROUTES.routes).length, scenarios: s.scenarios.map((x) => x.id), records: s.records.length,
      scopeTargets: r.scopeTargets, total: r.total
    }))`
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: CLIENT, env: { ...process.env, MIRI_REGION: regionId }, encoding: 'utf8' })
  return JSON.parse(out.trim().split('\n').pop())
}

test('지역 설정: 등록된 모든 지역이 검사를 통과', () => {
  for (const [id, r] of Object.entries(REGIONS)) {
    assert.equal(r.id, id)
    assert.deepEqual(validateRegion(r), [], `${id} 설정 오류`)
  }
})

test('지역 설정: 필수 항목이 빠지면 이름을 짚어 알림', () => {
  const base = REGIONS.samcheok
  const noName = { ...base, name: '' }
  assert.ok(validateRegion(noName).includes('필수 항목 없음: name'))
  const noFire = { ...base, org: { ...base.org, fire: undefined } }
  assert.ok(validateRegion(noFire).includes('필수 항목 없음: org.fire'))
  const noBbox = { ...base, map: { ...base.map, bbox: null } }
  assert.ok(validateRegion(noBbox).includes('필수 항목 없음: map.bbox'))
  const noShelters = { ...base, data: { ...base.data, TEMP_SHELTERS: undefined } }
  assert.ok(validateRegion(noShelters).includes('필수 항목 없음: data.TEMP_SHELTERS'))
  assert.deepEqual(validateRegion(null), ['설정 없음'])
})

test('지역 설정: 코드와 범위가 어긋나면 알림', () => {
  const base = REGIONS.samcheok
  assert.ok(validateRegion({ ...base, codes: { ...base.codes, sgg: '5123' } }).some((e) => e.includes('codes.sgg')))
  assert.ok(validateRegion({ ...base, map: { ...base.map, bbox: [129, 37, 128, 36] } }).some((e) => e.includes('map.bbox')))
  // 다른 지역 마을이 섞이면(동 목록에 없는 동, 없는 대피소) 잡는다
  const mixed = { ...base, data: { ...base.data, VILLAGES: [...base.data.VILLAGES, REGIONS.donghae.data.VILLAGES[0]] } }
  const errs = validateRegion(mixed)
  assert.ok(errs.some((e) => e.includes('CG-01') && e.includes('동 목록에 없음')))
  assert.ok(errs.some((e) => e.includes('대피소') && e.includes('TS-')))
  // 차량 소속 동이 다른 지역 동이면 잡는다
  assert.ok(validateRegion({ ...base, fleet: { ...base.fleet, car: ['CG'] } }).some((e) => e.includes('차량 car')))
  assert.ok(validateRegion({ ...base, activeScenarioId: 'S-1' }).some((e) => e.includes('activeScenarioId')))
})

test('지역 고르기: 주소 인자, 탭 기억값, 환경 변수 순서, 모르는 이름은 동해시', () => {
  assert.equal(DEFAULT_REGION_ID, 'donghae')
  assert.equal(resolveRegionId({}), 'donghae')
  assert.equal(resolveRegionId({ search: '?region=samcheok' }), 'samcheok')
  assert.equal(resolveRegionId({ search: '?region=samcheok', env: 'donghae' }), 'samcheok')
  assert.equal(resolveRegionId({ stored: 'samcheok' }), 'samcheok')
  assert.equal(resolveRegionId({ env: 'samcheok' }), 'samcheok')
  assert.equal(resolveRegionId({ search: '?region=seoul' }), 'donghae')
  assert.equal(resolveRegionId({ search: '?region=seoul', env: 'samcheok' }), 'samcheok')
})

test('지역 전환: 기본은 동해시, 시험 프로세스도 동해시로 돈다', () => {
  assert.equal(REGION.id, 'donghae')
  assert.equal(REGION.name, '동해시')
  assert.equal(REGION.codes.sgg, '51170')
})

test('지역 전환: 동해시 기준 수치(848명, 산식) 그대로', () => {
  const d = runIn('donghae')
  assert.equal(d.id, 'donghae')
  assert.equal(d.org, '동해시')
  assert.equal(d.dongs.length, 10)
  assert.equal(d.villages.length, 37)
  assert.equal(d.shelters.length, 27)
  assert.equal(d.scopeTargets, 848)
  assert.equal(d.total, 291)
  assert.deepEqual(d.addresses, ['동해시'])
  assert.equal(d.records, 8)
  assert.ok(d.roadKeys > 0)
})

test('지역 전환: 삼척시는 설정 파일 하나로 켜지고 동해시 자료가 섞이지 않음', () => {
  const s = runIn('samcheok')
  const d = REGIONS.donghae
  assert.equal(s.id, 'samcheok')
  assert.equal(s.org, '삼척시')
  assert.equal(s.dongs.length, 12)
  // 마을, 대피소, 대상자, 차량 소속 동이 모두 삼척시 설정 안에 있다
  const sDongs = new Set(s.dongs)
  for (const v of s.villages) assert.ok(sDongs.has(v.split('-')[0]), v)
  for (const v of s.personVillages) assert.ok(s.villages.includes(v), v)
  for (const v of s.vehicleDongs) assert.ok(sDongs.has(v), v)
  assert.deepEqual(s.shelters, s.sheltersData)
  const dVillages = new Set(d.data.VILLAGES.map((v) => v.code))
  const dShelters = new Set(d.data.TEMP_SHELTERS.map((x) => x.code))
  assert.ok(s.villages.every((v) => !dVillages.has(v)))
  assert.ok(s.shelters.every((x) => !dShelters.has(x)))
  assert.ok(s.dongs.every((c) => !d.dongs.some((x) => x.code === c)))
  assert.deepEqual(s.addresses, ['삼척시'])
  // 동해시 도로 경로, 훈련 기록, 시나리오(S-1 등)를 쓰지 않는다
  assert.equal(s.roadKeys, 0)
  assert.equal(s.records, 0)
  assert.deepEqual(s.scenarios, ['S-4'])
  // 대상자 수는 설정 견본 마을의 합계
  assert.equal(s.persons, REGIONS.samcheok.data.VILLAGES.reduce((a, v) => a + v.targets, 0))
  assert.equal(s.scopeTargets, s.persons)
})

test('삼척시 견본: 실제 자료가 없는 칸은 시험용 가상 자료로 표시', () => {
  const r = REGIONS.samcheok
  assert.equal(r.sample, true)
  for (const v of r.data.VILLAGES) assert.equal(v.sample, true)
  for (const x of r.data.TEMP_SHELTERS) { assert.equal(x.sample, true); assert.match(x.name, /시험용 가상/) }
  assert.match(r.data.LTC.period, /시험용 가상 자료/)
  // 행정동 이름과 코드는 경계 자료(vuski/admdongkor)의 실제 값
  assert.ok(r.map.dongGeo.every((g) => /^51230\d{5}$/.test(g.admCd)))
  // 확인 전 행정 코드는 지어내지 않고 비워 둔다
  assert.equal(r.codes.openGov, null)
})

test('공공데이터: 지역 인자로 시군 이름이 바뀌고 빈 인자는 상류를 부르지 않음', async () => {
  const { default: handler } = await import('../api/opendata.js')
  const call = async (query) => {
    const res = { code: 0, body: null, headers: {}, status(c) { this.code = c; return this }, json(b) { this.body = b; return this }, setHeader(k, v) { this.headers[k] = v } }
    await handler({ method: 'GET', query }, res)
    return res
  }
  const keep = process.env.DATA_GO_KR_KEY
  const realFetch = globalThis.fetch
  let url = ''
  process.env.DATA_GO_KR_KEY = 'TEST'
  globalThis.fetch = async (u) => { url = decodeURIComponent(String(u)); return { ok: true, headers: { get: () => 'application/json' }, json: async () => ({ response: { body: { items: { item: [] } } } }), text: async () => '' } }
  try {
    await call({ kind: 'shelters', region: 'samcheok' })
    assert.match(url, /LIKE\]=삼척시/)
    await call({ kind: 'shelters' })
    assert.match(url, /LIKE\]=동해시/)
    await call({ kind: 'ltc', region: 'samcheok' })
    assert.match(url, /siGunGuCd=230/)
    url = ''
    const amb = await call({ kind: 'ambulance', region: 'samcheok' })
    assert.equal(amb.code, 503)
    assert.equal(amb.body.error.code, 'REGION')
    assert.equal(url, '')
    const bad = await call({ kind: 'fire', region: 'seoul' })
    assert.equal(bad.code, 400)
  } finally {
    globalThis.fetch = realFetch
    if (keep === undefined) delete process.env.DATA_GO_KR_KEY; else process.env.DATA_GO_KR_KEY = keep
  }
})

test('운영 기록: 접근 기록에 지역 이름표', async () => {
  const G = await import('../api/_guard.js')
  const line = G.accessLog({ url: '/api/x', method: 'GET', headers: {} }, { statusCode: 200 }, Date.now())
  assert.equal(line.region, process.env.MIRI_REGION || 'donghae')
})

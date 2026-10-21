// 회신 R30(치매 전문 언론), R34(재난문자 지도 서비스 개발자) 반영 회귀 시험: 돌봄과 의사소통 항목, 대피소 확인 칸, 직선 경로 확인
import assert from 'node:assert/strict'
import { personCare, routeCrossesHazard, shelterAccess, tripChecks, UNKNOWN } from '../src/lib/tripChecks.js'
import { buildSeed } from '../src/mock/seed.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log('ok', name) }
const seed = buildSeed()

t('시연 명부: 핵심 건수 유지와 돌봄 항목 생성', () => {
  const main = seed.persons.filter((p) => p.review === 'confirmed')
  assert.ok(main.length > 2000)
  const withCare = main.filter((p) => p.care)
  assert.equal(withCare.length, main.length)
  const c = personCare(withCare.find((p) => p.care.caregiverType === '가족' && p.care.caregiverReachable === true))
  assert.equal(c.companionCall, true)
  assert.ok(withCare.some((p) => p.care.comm.includes('청각')))
  assert.ok(withCare.some((p) => p.care.aids.includes('산소')))
  // 이름 필드를 두지 않음
  assert.ok(withCare.every((p) => !('caregiverName' in p.care)))
})

t('돌봄 정보가 없는 대상자(판독 확인 대기)는 확인 필요', () => {
  const c = personCare({ code: 'X' })
  assert.equal(c.known, false)
  assert.equal(c.caregiverType, UNKNOWN)
  assert.equal(c.companionCall, false)
})

t('돌봄 담당자 연락 불가는 동행 연락 대신 연락 불가로 표시', () => {
  const c = personCare({ care: { comm: [], caregiverType: '요양보호사', caregiverReachable: false, aids: [] } })
  assert.equal(c.companionCall, false)
  assert.equal(c.caregiverUnreachable, true)
  assert.equal(c.reachableLabel, '연락 불가')
})

t('대피소 확인 칸: 값이 없으면 확인 필요, 시연 대피소 27곳 모두 칸 보유', () => {
  assert.equal(seed.shelters.length, 27)
  assert.ok(seed.shelters.every((s) => 'liftAccess' in s && 'nightOpen' in s))
  assert.deepEqual(shelterAccess({ liftAccess: null, nightOpen: null }), { liftLabel: UNKNOWN, liftUnchecked: true, nightLabel: UNKNOWN })
  assert.equal(shelterAccess({ liftAccess: true, nightOpen: '행정복지센터 당직' }).liftUnchecked, false)
})

const villages = [
  { code: 'A', lngLat: [129.10, 37.55] },
  { code: 'B', lngLat: [129.10, 37.53] },
  { code: 'C', lngLat: [129.10, 37.51] }
]
// 북쪽(37.57)에서 남쪽(heading 180)으로 번지는 산불. A, B 가 대피 대상
const fire = { kind: 'fire', origin: [129.10, 37.57], heading: 180, halfWidthKm: 3, affected: ['A', 'B'] }

t('직선 경로: 불이 오는 쪽으로 가거나 대상 구역 안 대피소면 경로 확인 필요', () => {
  // B 에서 북쪽(발화 쪽) 대피소로 가는 직선
  assert.equal(routeCrossesHazard({ from: [129.10, 37.53], to: [129.10, 37.56], fromVillage: 'B', scenario: fire, villages }), true)
  // B 에서 남쪽 C 너머 대피소로 가는 직선
  assert.equal(routeCrossesHazard({ from: [129.10, 37.53], to: [129.10, 37.50], fromVillage: 'B', scenario: fire, villages }), false)
  // 띠 밖 동쪽 멀리 가는 직선
  assert.equal(routeCrossesHazard({ from: [129.10, 37.53], to: [129.16, 37.53], fromVillage: 'B', scenario: fire, villages }), false)
})

t('회차 확인: 휠체어 회차가 리프트 미확인 대피소로 가면 표시, 부축 회차는 표시하지 않음', () => {
  const shelters = { S1: { code: 'S1', name: '가초등학교', lngLat: [129.10, 37.50], liftAccess: null } }
  const persons = { P1: { code: 'P1', care: { comm: ['청각'], caregiverType: '가족', caregiverReachable: true, aids: ['수동 휠체어'] } } }
  const wc = tripChecks({ trip: { village: 'B', grade: 'wheelchair', personCodes: ['P1'], shelters: ['S1'] }, persons, shelters, villages, scenario: fire })
  assert.deepEqual(wc.liftUnchecked, ['가초등학교'])
  assert.deepEqual(wc.companionCall, ['P1'])
  assert.deepEqual(wc.commCaution, ['P1'])
  assert.equal(wc.routeCheck, false)
  const as = tripChecks({ trip: { village: 'B', grade: 'assist', personCodes: ['P1'], shelters: ['S1'] }, persons, shelters, villages, scenario: fire })
  assert.deepEqual(as.liftUnchecked, [])
})

console.log(`\n${n}개 시험 통과`)

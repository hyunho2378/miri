// 전체 자문 의견 수용 회귀 시험(2026. 10. 21.): 도우미 동의와 역할(R12), 차량 가용 확실성(R01), 인계 기록 항목(R06), 문서함 서식(R06, R12, R24)
import assert from 'node:assert/strict'
import { crewEligible, helperQualifies } from '../src/lib/assign.js'
import { commitmentOf, COMMITMENTS } from '../src/lib/shortage.js'
import { computeShortage } from '../src/lib/shortageCalc.js'
import { cleanCare, cleanReport } from '../api/dispatch.js'
import { mergeReports } from '../src/lib/reportQueue.js'
import { DOC_TEMPLATES } from '../src/lib/docTemplates.js'
import { buildSeed } from '../src/mock/seed.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log('ok', name) }
const seed = buildSeed()
const sc = seed.scenarios[0]

t('E1 시연 도우미는 모두 동의와 차량 동행 역할을 가져 기준 결과 291명 유지', () => {
  assert.ok(seed.helpers.every((h) => h.consent === true && h.roles.includes('ride')))
  assert.equal(computeShortage({ ...seed, scenario: sc, t0: seed.today }).total, 291)
})

t('E1 동의 철회, 차량 동행을 고르지 않은 도우미는 동승 후보에서 빠짐', () => {
  const h = { code: 'H-9', active: true, grades: ['wheelchair', 'assist', 'walk'] }
  assert.equal(crewEligible(h), true)
  assert.equal(crewEligible({ ...h, consent: false }), false)
  assert.equal(crewEligible({ ...h, roles: ['contact'] }), false)
  assert.equal(crewEligible({ ...h, roles: ['ride'] }), true)
  assert.equal(helperQualifies({ ...h, consent: false }, ['assist']), false)
})

t('E1 동의를 모두 철회하면 도우미 부족으로 미이송이 늘어남', () => {
  const helpers = seed.helpers.map((h) => ({ ...h, consent: false }))
  assert.ok(computeShortage({ ...seed, helpers, scenario: sc, t0: seed.today }).total > 291)
})

t('E2 차량 가용 확실성: 소방은 별도, 요양시설 차량은 미확인, 협약과 시청은 약속됨', () => {
  const by = (code) => commitmentOf(seed.vehicles.find((v) => v.code === code))
  assert.equal(by('V-01'), 'fire')
  assert.equal(by('V-09'), 'unconfirmed')
  assert.equal(by('V-19'), 'agreed')
  assert.equal(commitmentOf({ owner: 'facility' }), 'unconfirmed')
  assert.ok(Object.keys(COMMITMENTS).length === 3)
})

t('E2 약속된 차량만 쓰면 미이송 예상이 같거나 늘어남', () => {
  const agreed = seed.vehicles.filter((v) => commitmentOf(v) !== 'unconfirmed')
  const r = computeShortage({ ...seed, vehicles: agreed, scenario: sc, t0: seed.today })
  assert.ok(r.total >= 291)
})

t('E3 인계 기록: 시각 형식과 글자 수 검사, 빈 값은 버림', () => {
  assert.deepEqual(cleanCare({ symptomAt: '14:05', observation: '호흡 가빠짐', action: '이동 중단, 119 신고' }), { symptomAt: '14:05', observation: '호흡 가빠짐', action: '이동 중단, 119 신고' })
  assert.equal(cleanCare({ symptomAt: '25:00' }), null)
  assert.equal(cleanCare({ observation: 'x'.repeat(500) }).observation.length, 200)
  assert.equal(cleanCare(null), null)
})

t('E3 보고에 붙은 인계 기록이 담당자 상태까지 전달됨', () => {
  const brief = { personCodes: ['P-1'] }
  const rep = cleanReport({ key: 'abcdefgh12', type: 'step', personCode: 'P-1', step: 'fail', reason: 'health', care: { symptomAt: '09:10', observation: '의식 저하' }, at: 5 }, brief, 'H-001')
  assert.equal(rep.care.symptomAt, '09:10')
  const m = mergeReports({ ackOverride: {}, events: {} }, [rep])
  assert.equal(m.events['P-1'].care.observation, '의식 저하')
})

t('E4 문서함 서식 3종 추가(도우미 운영 기준, 교육 시나리오, 가족 안내 문자)', () => {
  for (const k of ['helper-rules', 'helper-training', 'family-notice']) assert.ok(DOC_TEMPLATES.some((x) => x.key === k), k)
  const rules = DOC_TEMPLATES.find((x) => x.key === 'helper-rules').html
  assert.ok(rules.includes('1365') && rules.includes('사고 접수 기관'))
  assert.ok(!/[·—–]/.test(DOC_TEMPLATES.filter((x) => ['helper-rules', 'helper-training', 'family-notice'].includes(x.key)).map((x) => x.html).join('')))
})

console.log(`\n${n}개 시험 통과`)

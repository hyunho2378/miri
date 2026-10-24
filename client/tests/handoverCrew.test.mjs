// 플랫폼 AI 협업 툴 셀 39(소방 인계 추가 열) 검토 반영: 실제 글자 값(층, 계단)으로 필요 대원 수 규칙을 시험한다.
// 플랫폼 첫 생성 코드는 숫자 층과 참거짓 계단으로만 시험해 291명 모두 같은 값이 나오는 오류를 놓쳤다
import assert from 'node:assert/strict'
import { crewOf, deviceOf, petOf, floorNum, buildHandoverRows, handoverCsvColumns } from '../src/lib/handoverRows.js'
import { buildSeed } from '../src/mock/seed.js'
let n = 0
const t = (name, fn) => { fn(); n += 1; console.log('ok', name) }

t('필요 대원 수: 실제 글자 값', () => {
  assert.equal(floorNum('3층'), 3)
  assert.equal(floorNum(''), 1)
  assert.equal(crewOf('bed', { floor: '3층', stairs: '계단만 있음' }), '3~4명')
  assert.equal(crewOf('bed', { floor: '1층', stairs: '계단 없음' }), '2명')
  assert.equal(crewOf('wheelchair', { floor: '2층', stairs: '엘리베이터 있음' }), '2명')
  assert.equal(crewOf('assist', { floor: '1층', stairs: '계단 없음' }), '1명')
  assert.equal(crewOf('assist', { floor: '2층', stairs: '엘리베이터 있음' }), '1명')
  assert.equal(crewOf('assist', { floor: '3층', stairs: '계단만 있음' }), '2명')
  assert.equal(crewOf('bed', { floor: '1층', stairs: '계단 없음' }, ['pressureSore']), '2명 (욕창, 이송 시간 더 걸림)')
})

t('의료기기와 반려동물', () => {
  assert.equal(deviceOf(['oxygen', 'guardian']), '산소')
  assert.equal(deviceOf(['medication']), '없음')
  assert.equal(petOf(['pet']), '있음')
  assert.equal(petOf([]), '없음')
})

t('시드 명부 전체: 값이 한 가지로 몰리지 않고 CSV 에 네 열', () => {
  const seed = buildSeed()
  const entries = seed.persons.map((p) => ({ code: p.code, reason: '차량 부족', status: 'unassigned' }))
  const rows = buildHandoverRows({ entries, persons: seed.persons, villages: seed.villages, privateInfo: seed.privateInfo, now: seed.today })
  const crews = new Set(rows.map((r) => r.crew.split(' ')[0]))
  for (const c of ['1명', '2명', '3~4명']) assert.ok(crews.has(c), c)
  assert.ok(rows.some((r) => r.device === '산소'))
  assert.ok(rows.some((r) => r.pet === '있음') && rows.some((r) => r.pet === '없음'))
  assert.ok(rows.every((r) => r.address && r.address.includes('가상')))
  const labels = handoverCsvColumns(seed.today).map((c) => c.label)
  for (const l of ['주소(가상)', '필요 대원 수', '의료기기', '반려동물']) assert.ok(labels.includes(l), l)
})

console.log(`handoverCrew: ${n} passed`)

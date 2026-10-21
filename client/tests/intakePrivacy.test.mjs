// 회신 R36 홀드아웃 후속 4건 행동 시험: 칸 이름 없는 이름 가림, 빠진 대상자 채움, 형식 오류 1회 재요청 뒤 422, 보조 단서 도보 판정 확인 필요
import assert from 'node:assert/strict'
import { maskLines, residualPII } from '../api/_ncp.js'
import { askItems, fillMissing } from '../api/intake.js'
import { planningGrade } from '../src/lib/intake.js'

let n = 0
const t = async (name, fn) => { await fn(); n++; console.log('ok', name) }

const NAMES = ['김영순', '박철수', '이민정', '최순자', '한영자', '홍길동', '이하준', '정임시', '김가상', '박영수']
await t('칸 이름 없는 이름(문장, 서명, 관계, 나이 괄호, 번호 목록)을 가리고 잔존 검사도 통과한다', () => {
  const src = ['김영순 어르신은 지팡이를 짚고 천천히 걸으심', '아들 박철수 연락 가능', '작성자: 이민정', '최순자(82세) 휠체어 사용', '한영자 할머니 와상', '서명 홍길동', '손주 이하준과 거주', '3. 정임시 / 거동상태: 부축하면 몇 걸음 걸으심', '1번 어르신(김가상, 010-0000-1234)은 치매 있으나 걷는 데 문제 없음.', '장남 박영수가 매주 방문']
  const out = maskLines(src)
  for (const line of out) for (const nm of NAMES) assert.ok(!line.includes(nm), `${nm} 잔존: ${line}`)
  assert.deepEqual(residualPII(out), [])
})
await t('거동 근거 낱말은 가리지 않는다', () => {
  const src = ['지팡이 짚고 천천히 걸음, 차에는 혼자 오르심', '이동 시 부축 필요, 주간에 혼자 있음', '보행기 사용, 계단 불가', '오전에 보건소 다녀옴', '정도의 차이']
  assert.deepEqual(maskLines(src), src)
})
await t('지번, 동호수, 년생, 도로명 주소를 가린다', () => {
  const out = maskLines(['동해시 천곡동 123-4번지 거주', '101동 1203호', '1942년생', '강원특별자치도 동해시 중앙로 245'])
  assert.ok(out.every((l) => !/\d{3}|년생/.test(l)), out.join(' | '))
  assert.deepEqual(residualPII(out), [])
})
await t('가린 뒤 이름 꼴이 남으면 잔존으로 잡는다', () => {
  assert.ok(residualPII(['최순자 어르신 와상']).includes('이름 꼴 낱말'))
})
await t('형식 오류는 한 번 다시 묻고, 두 번째도 틀리면 MODEL_FORMAT', async () => {
  let calls = 0
  const bad = async () => { calls++; throw Object.assign(new Error('x'), { code: 'PARSE' }) }
  await assert.rejects(askItems('s', 'u', bad), (e) => e.code === 'MODEL_FORMAT')
  assert.equal(calls, 2)
  calls = 0
  const once = async () => { calls++; if (calls === 1) throw Object.assign(new Error('x'), { code: 'BAD_MODEL_OUTPUT' }); return { items: [{ id: 'S1', grade: 'walk', confidence: 'high', quote: 'a' }] } }
  const items = await askItems('s', 'u', once)
  assert.equal(calls, 2); assert.equal(items.length, 1)
})
await t('형식 오류가 아닌 오류는 다시 묻지 않는다', async () => {
  let calls = 0
  await assert.rejects(askItems('s', 'u', async () => { calls++; throw Object.assign(new Error('x'), { code: 'UPSTREAM' }) }), (e) => e.code === 'UPSTREAM')
  assert.equal(calls, 1)
})
await t('자유 서술에서 모델이 빠뜨린 대상자를 확인 필요로 채운다(P 번호 빈자리, 번호 줄 수)', () => {
  const persons = [{ grade: 'walk' }, { grade: 'bed' }]
  const items = [{ id: 'P1' }, { id: 'P3' }]
  const out = fillMissing(persons, items, ['1. [이름 가림] 걸음 가능', '2. [이름 가림] 휠체어', '3. [이름 가림] 와상', '4. [이름 가림] 거동 상태 판독 불가'])
  assert.equal(out.length, 4)
  assert.ok(out.slice(2).every((p) => p.grade === 'unknown' && p.reason === 'missingFromModel'))
  assert.equal(planningGrade({ grade: 'unknown' }).grade, 'wheelchair')
})
await t('보조 단서가 있는 도보 판정은 확인 필요(휠체어로 계산)', () => {
  assert.deepEqual(planningGrade({ grade: 'walk', confidence: 'high', quote: '지팡이 짚고 천천히 걸음' }), { grade: 'wheelchair', uncertain: true })
  assert.deepEqual(planningGrade({ grade: 'walk', confidence: 'high', quote: '혼자 걸음', context: '혼자 걸음 가능, 보행기 사용' }), { grade: 'wheelchair', uncertain: true })
  assert.deepEqual(planningGrade({ grade: 'walk', confidence: 'high', quote: '혼자 걸음 가능' }), { grade: 'walk', uncertain: false })
})
await t('가린 주소 뒤 건물 이름과 호수, 줄이 나뉜 호수도 가린다(홀드아웃2 뒤 수정)', () => {
  const out = maskLines(['강원특별자치도 동해시 은물결로 336 가상주택 106', '호', '사는 곳: 강원특별자치도 동해시 달모래길 322 가상주택 104호 전화는', '해솔빌라 203호'])
  assert.ok(out.every((l) => !/\d{3}/.test(l)), out.join(' | '))
})
console.log(`${n}개 시험 통과`)

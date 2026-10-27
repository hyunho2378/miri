// 의료 AI 분야 교수 면담(2026. 10. 22.) 화면 반영: 확인 필요 사유 구분, 서류 돌봄 칸, 모델 카드, 집결지와 대피소 정의
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { useMiriStore } from '../src/store/useMiriStore.js'
import { verifyResult } from '../src/lib/intake.js'
import { AI_CARD, PLACE_TERMS, docCare, reviewReasons, NOT_IN_DOC } from '../src/lib/aiCard.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const s = useMiriStore.getState()
const results = s.intakeDocs.flatMap((d) => d.results.map((r) => ({ d, v: verifyResult(d.transcript, r) })))

test('사유가 없는 판독에는 확인 필요를 붙이지 않음(원문 일치, 일치도 높음)', () => {
  const clean = results.filter(({ v }) => v.quoteMatched && v.confidence === 'high' && !v.conflict && !v.gradeUncertain)
  assert.ok(clean.length >= 3)
  for (const { v } of clean) assert.deepEqual(reviewReasons(v), [], v.personCode)
})

test('등급 확인 필요(휠체어로 계산)인 판독은 사유가 하나 이상', () => {
  for (const { v } of results.filter(({ v }) => v.gradeUncertain || v.confidence === 'low')) assert.ok(reviewReasons(v).length > 0, v.personCode)
})

test('사유 구분: 원문에 없는 근거, 판독 불가, 보조 단서 있는 도보, 모델이 빠뜨린 순번', () => {
  const mismatch = results.find(({ v }) => v.personCode === 'SH-03-902').v
  assert.deepEqual(reviewReasons(mismatch).map((r) => r.key), ['quoteMismatch'])
  assert.deepEqual(reviewReasons(verifyResult('순번 2 거동 상태 판독 불가', { grade: 'unknown', quote: '판독 불가', confidence: 'low' })).map((r) => r.key), ['unread'])
  assert.ok(reviewReasons(verifyResult('지팡이 짚고 혼자 걸음', { grade: 'walk', quote: '지팡이 짚고 혼자 걸음', confidence: 'high' })).some((r) => r.key === 'assistCue'))
  assert.deepEqual(reviewReasons({ grade: 'unknown', reason: 'missingFromModel', quote: '' }).map((r) => r.key), ['modelSkip'])
})

test('서류 돌봄 칸: 판독 결과마다 확인 필요를 되풀이하지 않고 서류에서 알 수 있는 값만 채움', () => {
  const bed = docCare({ grade: 'bed', tags: ['bedridden', 'oxygen', 'guardian'] })
  assert.equal(bed.caregiver, '보호자 동행 필요(서류)')
  assert.equal(bed.aids, '침대형 이송, 산소')
  const walk = docCare({ grade: 'walk', tags: ['hearing'] })
  assert.equal(walk.comm, '청각')
  assert.equal(walk.caregiver, NOT_IN_DOC)
  const src = read('../src/components/miri/ReviewRow.jsx')
  assert.ok(!src.includes("personCare(result)"), '판독 결과에 명부용 돌봄 함수를 쓰면 모든 칸이 확인 필요가 됨')
  assert.ok(!/확인 필요\. 침상 가능성 담당자 확인/.test(src))
})

test('모델 카드: 절 구성과 시험 기록 값, 휴대폰 문장 80자 이하', () => {
  const titles = AI_CARD.map((x) => x.title)
  for (const t of ['하는 일', '모델과 입력', '하지 않는 일', '개인정보', '시험 결과', '알려진 약점']) assert.ok(titles.includes(t), t)
  const flat = AI_CARD.flatMap((x) => x.rows)
  assert.ok(flat.some((r) => r.v.includes('40명 중 21명')))
  assert.ok(flat.some((r) => r.v.includes('HCX-005')))
  for (const r of flat) assert.ok(`${r.k} ${r.v}`.length <= 80, r.v)
  assert.ok(read('../src/mobile/field/FieldScreens.jsx').includes('서류 읽기 AI 정보'))
  assert.ok(read('../src/components/miri/ReviewRow.jsx').includes('AiCardButton'))
})

test('집결지와 대피소 정의: 설정 화면 문장 기준, 휴대폰 마을 상세와 도우미 알림에 노출, 지도 마을 상세에는 설명 줄 없음', () => {
  // 화면 설명 줄을 지우고 설정의 자료 안내(dataNotes.js)로 옮김(1027 공공 서비스 문구 정리)
  assert.ok(read('../src/lib/dataNotes.js').includes('경로당 가운데 분포 중심에 가까운 곳'))
  assert.ok(PLACE_TERMS.pickup.text.includes('분포 중심에 가까운 곳'))
  assert.ok(PLACE_TERMS.shelter.text.includes('임시주거시설'))
  for (const t of Object.values(PLACE_TERMS)) assert.ok(`${t.term}: ${t.text}`.length <= 80)
  assert.ok(!read('../src/components/map/VillageDetail.jsx').includes('placeLine'))
  assert.ok(read('../src/mobile/field/FieldScreens.jsx').includes("meta={placeLine('pickup')}"))
  assert.ok(read('../src/mobile/helper/HelperScreens.jsx').includes('label="장소 뜻"'))
})

test('루브릭 판독 사유 연결(판독출력형식 v1): 근거 없음, 항목 엇갈림, 항목 근거 불일치', () => {
  const keys = (v) => reviewReasons(v).map((r) => r.key)
  assert.ok(keys({ grade: 'wheelchair', aiGrade: 'unknown', reason: 'noEvidence', quote: '' }).includes('noEvidence'))
  assert.ok(keys({ grade: 'wheelchair', aiGrade: 'wheelchair', quote: '휠체어', quoteMatched: true, confidence: 'low', reason: 'dimConflict', rubric: { conflict: true, quoteMismatch: ['D1'] } }).includes('dimConflict'))
  assert.ok(keys({ grade: 'wheelchair', aiGrade: 'wheelchair', quote: '휠체어', quoteMatched: true, confidence: 'mid', rubric: { conflict: false, quoteMismatch: ['D1'] } }).includes('dimMismatch'))
  assert.ok(read('../src/components/miri/ReviewRow.jsx').includes('result.rubric?.dims'))
})

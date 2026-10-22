// 루브릭 v0 판독 규칙(공모전/AI검증/AI판독_검증기획서_20261022.md 3.3), seed 고정, 출력 형식 하위 호환
import assert from 'node:assert/strict'
import { gradeFromScores, verifyDims, rubricItemsOf, rubricPerson, tagsFromScores, RUBRIC_VERSION } from '../src/lib/rubric.js'
import { hcxBody, hcxSeed } from '../api/_ncp.js'
import { askRubric, judgeRubric, useRubric } from '../api/intake.js'
import { summarize } from '../../tools/ai-eval/metrics.mjs'

let n = 0
const t = async (name, fn) => { await fn(); n++; console.log('ok', name) }
const D = (o) => Object.fromEntries(['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map((k) => [k, { score: o[k] ?? null }]))

await t('등급 규칙: 와상과 침대는 침상, 걷지 못함과 휠체어는 휠체어, 보행기와 부축은 부축, 혼자 걸음은 도보', () => {
  assert.equal(gradeFromScores(D({ D2: 5 })).grade, 'bed')
  assert.equal(gradeFromScores(D({ D3: 5 })).grade, 'bed')
  assert.equal(gradeFromScores(D({ D1: 5 })).grade, 'wheelchair')
  assert.equal(gradeFromScores(D({ D3: 4 })).grade, 'wheelchair')
  assert.equal(gradeFromScores(D({ D1: 3 })).grade, 'assist')
  assert.equal(gradeFromScores(D({ D3: 2 })).grade, 'assist')
  assert.equal(gradeFromScores(D({ D1: 1 })).grade, 'walk')
  assert.equal(gradeFromScores(D({ D4: 5, D6: 4 })).grade, 'unknown')
})
await t('차원끼리 엇갈리면 높은 등급, 신뢰도 낮음', () => {
  const r = gradeFromScores(D({ D1: 2, D3: 4 }))
  assert.equal(r.grade, 'wheelchair'); assert.equal(r.conflict, true)
  const p = rubricPerson({ dims: { D1: { score: 2, quote: '혼자 걸음' }, D3: { score: 4, quote: '가끔 휠체어' } } }, '혼자 걸음, 가끔 휠체어')
  assert.equal(p.grade, 'wheelchair'); assert.equal(p.confidence, 'low'); assert.equal(p.reason, 'dimConflict')
})
await t('근거 문구가 원문에 없는 차원은 점수를 비우고, 이동 차원이 모두 비면 unknown', () => {
  const v = verifyDims({ D1: { score: 1, quote: '혼자 잘 걸음' }, D3: { score: 3, quote: '보행기' } }, '보행기 사용, 계단 불가')
  assert.equal(v.D1.score, null); assert.equal(v.D1.reason, 'quoteMismatch'); assert.equal(v.D3.score, 3)
  const p = rubricPerson({ dims: { D1: { score: 1, quote: '혼자 잘 걸음' } } }, '거동 불편')
  assert.equal(p.grade, 'unknown'); assert.equal(p.confidence, 'low'); assert.equal(p.reason, 'quoteMismatch')
})
await t('태그는 등급을 바꾸지 않는다(청력, 치매, 산소, 보호자, 와상)', () => {
  assert.deepEqual(tagsFromScores({ D4: { score: 3, quote: '청력 저하' }, D5: { score: 4 }, D6: { score: 3 } }).sort(), ['guardian', 'hearing', 'oxygen'])
  assert.deepEqual(tagsFromScores({ D4: { score: 4, quote: '치매로 지시 이해 어려움' }, D2: { score: 5 } }).sort(), ['bedridden', 'dementia'])
})
await t('출력 형식 하위 호환: grade, quote, confidence, tags 유지와 rubric 필드 추가', () => {
  const p = judgeRubric({ dims: { D1: { score: 3, quote: '지팡이 짚고 천천히 걸음' }, D3: { score: 2, quote: '지팡이' } } }, '지팡이 짚고 천천히 걸음', '순번 1', null)
  for (const k of ['grade', 'quote', 'confidence', 'tags', 'personHint', 'context']) assert.ok(k in p, k)
  assert.equal(p.grade, 'assist'); assert.equal(p.confidence, 'high')
  assert.equal(p.rubric.version, RUBRIC_VERSION); assert.equal(p.rubric.status, '전문가 검증 전 초안')
  const u = judgeRubric(undefined, '판독 불가', '순번 2', null)
  assert.equal(u.grade, 'unknown'); assert.equal(u.reason, 'unreadable')
})
await t('루브릭 응답 형식 검사와 1회 재요청', async () => {
  assert.throws(() => rubricItemsOf({ nope: 1 }), /형식/)
  assert.equal(rubricItemsOf({ items: [{ id: 'S1', dims: { D1: { score: '4', quote: 'x' }, D2: { score: 9 } } }] })[0].dims.D2.score, null)
  let k = 0
  const r = await askRubric('s', 'u', async () => (k++ === 0 ? Promise.reject(Object.assign(new Error('x'), { code: 'PARSE' })) : { items: [{ id: 'S1', dims: {} }] }))
  assert.equal(r.length, 1); assert.equal(k, 2)
})
await t('HyperCLOVA X 요청에 seed 고정, null 이면 빼고, temperature 와 topP 는 기존값', () => {
  const b = hcxBody('s', 'u', 100)
  assert.equal(b.seed, hcxSeed()); assert.equal(b.temperature, 0.1); assert.equal(b.topP, 0.8)
  assert.ok(!('seed' in hcxBody('s', 'u', 100, { seed: null })))
  assert.equal(hcxBody('s', 'u', 100, { seed: 7, temperature: 0 }).temperature, 0)
})
await t('루브릭 방식은 요청이나 환경변수로만 켜진다(기본은 기존 방식)', () => {
  assert.equal(useRubric({}), false); assert.equal(useRubric({ rubric: true }), true)
})
await t('재현성 지표: 5회 같은 등급 비율과 정답 일치, 낮게 판정', () => {
  const raw = [0, 1, 2].map((run) => ({ cond: 'A', doc: 'HO2-01', run, persons: [{ grade: run === 2 ? 'assist' : 'walk', quote: 'q' }] }))
  const s = summarize(raw, [{ id: 'A', label: 'a' }], { documents: [{ document: 'HO2-01.png', people: [{ true_grade: '부축', grade_determinable_from_text: true }] }] })
  assert.equal(s.A.allSameGradePct, 0); assert.equal(s.A.answerMatch, '0/1'); assert.equal(s.A.underGraded, 1)
})
console.log(`rubric ${n} passed`)

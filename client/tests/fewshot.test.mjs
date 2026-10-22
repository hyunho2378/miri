// 학습 없이 예시를 넣는 판독(few-shot) 시험: 예시 구성, 누설 없음, 기본 꺼짐, 예시 글자가 근거로 새지 않음
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { FEWSHOT_EXAMPLES, withFewShot, useFewShot } from '../src/lib/rubricFewShot.js'
import { RUBRIC_SYSTEM, rubricItemsOf, rubricPerson, gradeFromScores } from '../src/lib/rubric.js'
import { check } from '../../tools/hcx-tuning/leak-check.mjs'
import { pick } from '../../tools/hcx-tuning/pick-fewshot.mjs'
import { CONDITIONS, promptOf } from '../../tools/ai-eval/repro-test.mjs'

const inputs = JSON.parse(fs.readFileSync(new URL('../../tools/ai-eval/holdout2-inputs.json', import.meta.url), 'utf8'))

test('예시 6개: 네 등급, 이동 근거 없음, 읽을 수 없음', () => {
  assert.equal(FEWSHOT_EXAMPLES.length, 6)
  assert.deepEqual(FEWSHOT_EXAMPLES.map((e) => `${e.grade}/${e.kind}`), ['bed/normal', 'wheelchair/normal', 'assist/normal', 'walk/normal', 'unknown/normal', 'unknown/unreadable'])
})

test('예시 정답은 루브릭 규칙으로 다시 계산해도 같은 등급이고 근거는 예시 글 안에 있음', () => {
  for (const e of FEWSHOT_EXAMPLES) {
    const it = rubricItemsOf(JSON.parse(e.completion))[0]
    assert.equal(gradeFromScores(it.dims).grade, e.grade)
    const p = rubricPerson(it, e.text)
    assert.equal(p.rubric.quoteMismatch.length, 0, e.text)
  }
})

test('예시는 시험용 홀드아웃2와 겹치지 않음', () => {
  const r = check(FEWSHOT_EXAMPLES.map((e) => ({ Text: e.text })), inputs)
  assert.equal(r.exact, 0)
  assert.equal(r.sentenceHits, 0)
  assert.equal(r.gram12OverlapPct, 0)
})

test('예시 넣기는 루브릭 방식에서 요청하거나 환경변수가 있을 때만', () => {
  delete process.env.INTAKE_FEWSHOT
  assert.equal(useFewShot({}, true), false)
  assert.equal(useFewShot({ fewshot: true }, false), false)
  assert.equal(useFewShot({ fewshot: true }, true), true)
  process.env.INTAKE_FEWSHOT = '1'
  assert.equal(useFewShot({}, true), true)
  assert.equal(useFewShot({}, false), false)
  delete process.env.INTAKE_FEWSHOT
})

test('지시문: 루브릭 원문을 그대로 두고 뒤에 예시를 붙임', () => {
  const s = withFewShot(RUBRIC_SYSTEM)
  assert.ok(s.startsWith(RUBRIC_SYSTEM))
  for (const e of FEWSHOT_EXAMPLES) assert.ok(s.includes(e.text))
  assert.equal(withFewShot(RUBRIC_SYSTEM, []), RUBRIC_SYSTEM)
})

test('예시 글자를 실제 서류 근거로 베껴 오면 원문 대조에서 그 차원을 비움', () => {
  const ex = rubricItemsOf(JSON.parse(FEWSHOT_EXAMPLES[1].completion))[0]
  const p = rubricPerson({ id: 'S1', dims: ex.dims }, '지팡이를 짚고 천천히 걸음')
  assert.ok(p.rubric.quoteMismatch.length > 0)
  assert.equal(p.grade, 'unknown')
})

test('재현성 조건 D: 루브릭 + 예시, seed 고정', () => {
  const d = CONDITIONS.find((c) => c.id === 'D')
  assert.ok(d && d.rubric && d.fewshot && d.seed != null)
  const doc = inputs.docs.find((x) => x.mode === 'segments')
  assert.ok(promptOf(doc, true, true).system.includes(FEWSHOT_EXAMPLES[0].text))
  assert.ok(!promptOf(doc, true, false).system.includes(FEWSHOT_EXAMPLES[0].text))
})

test('예시 고르기는 같은 데이터면 같은 결과', () => {
  const rows = FEWSHOT_EXAMPLES.map((e, i) => ({ C_ID: i, Text: e.text, Completion: e.completion }))
  const meta = FEWSHOT_EXAMPLES.map((e, i) => ({ C_ID: i, mode: 'segments', people: [{ grade: e.grade, kind: e.kind, dims: Object.fromEntries(Object.entries(rubricItemsOf(JSON.parse(e.completion))[0].dims).map(([k, v]) => [k, v.score])) }] }))
  assert.deepEqual(pick(rows, meta).map((x) => x.text), pick(rows, meta).map((x) => x.text))
})

// HCX 튜닝 데이터 시험. 실행: node --test tools/hcx-tuning/hcxTuning.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { build, crossOf, selfCheck, makeGen } from './gen.mjs'
import { check } from './leak-check.mjs'
import { costOf } from './tune.mjs'
import { rubricPerson, DIM_KEYS } from '../../client/src/lib/rubric.js'

const small = build(120, 30)
const inputs = JSON.parse(fs.readFileSync(new URL('../ai-eval/holdout2-inputs.json', import.meta.url), 'utf8'))

test('같은 seed 면 같은 데이터', () => {
  const a = build(20, 5), b = build(20, 5)
  assert.deepEqual(a.train.rows, b.train.rows)
})

test('데이터셋 열 순서와 번호 규칙(System_Prompt, C_ID, T_ID, Text, Completion, C_ID 0부터 1씩, 싱글턴 T_ID 0)', () => {
  for (const set of [small.train, small.valid]) set.rows.forEach((r, i) => {
    assert.deepEqual(Object.keys(r), ['System_Prompt', 'C_ID', 'T_ID', 'Text', 'Completion'])
    assert.equal(r.C_ID, i); assert.equal(r.T_ID, 0)
    assert.ok(r.Text.length > 0 && r.Completion.length > 0)
    assert.ok(r.System_Prompt.length + r.Text.length + r.Completion.length <= 8000)
  })
})

test('정답 근거 문구는 입력에 그대로 있고 서비스 판정 함수와 점수가 같다', () => {
  for (const r of small.train.rows) {
    const items = JSON.parse(r.Completion).items
    for (const it of items) {
      const seg = r.Text.split('\n').find((l) => l.startsWith(`${it.id}: `))
      const src = seg ? seg.slice(it.id.length + 2) : r.Text
      const out = rubricPerson(it, src)
      for (const k of DIM_KEYS) if (it.dims[k].score != null) assert.equal(out.rubric.dims[k].score, it.dims[k].score, `${r.C_ID} ${it.id} ${k}`)
    }
  }
})

test('학습과 검증 입력이 겹치지 않는다', () => {
  const t = new Set(small.train.rows.map((r) => r.Text))
  for (const r of small.valid.rows) assert.ok(!t.has(r.Text))
})

test('홀드아웃2 누설 없음(같은 글, 문장 겹침, 문구 묶음 겹침)', () => {
  const res = check([...small.train.rows, ...small.valid.rows], inputs)
  assert.equal(res.exact, 0); assert.equal(res.sentenceHits, 0); assert.deepEqual(res.phraseHits, [])
})

test('다른 차원 함께 표기: 지팡이, 보행기, 휠체어, 부정 표현은 제외', () => {
  assert.deepEqual(crossOf('지팡이 하나 짚고 다님'), { D1: 3, D3: 2 })
  assert.deepEqual(crossOf('보행기 사용'), { D1: 3, D3: 3 })
  assert.deepEqual(crossOf('휠체어나 보행기는 쓰지 않음'), {})
})

test('selfCheck 는 원문에 없는 근거를 잡는다', () => {
  const ex = makeGen(1).example()
  const p = ex.items.find((x) => DIM_KEYS.some((k) => x.dims[k].score != null))
  if (!p) return
  const k = DIM_KEYS.find((d) => p.dims[d].score != null)
  p.dims[k] = { score: p.dims[k].score, quote: '원문에 없는 문구' }
  assert.match(selfCheck(ex), /원문 대조 실패/)
})

test('예상 학습 비용 계산(HCX-005 1,000 토큰 6.25원)', () => {
  assert.deepEqual(costOf(1000000, 4), { tokensOnce: 1000000, wonIfBilledOnce: 6250, wonIfBilledPerEpoch: 25000, epochs: 4, vat: '별도' })
})

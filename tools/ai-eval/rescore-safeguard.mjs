// 반복 판독 원자료를 사후 검사(safeguard.js) 적용 전후로 다시 채점한다. 모델 호출 없음
// 사용: node tools/ai-eval/rescore-safeguard.mjs [원자료.json] [answers_sealed.json]
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { summarize } from './metrics.mjs'
import { applySafeguard } from '../../client/src/lib/safeguard.js'
import { parseModelJson } from '../../client/api/_ncp.js'
import { personsOf } from './repro-test.mjs'

const RAW = process.argv[2] || fileURLToPath(new URL('../../../../공모전/AI검증/재현성시험_원자료_2026-10-22.json', import.meta.url))
const ANS = process.argv[3] || fileURLToPath(new URL('../../../../공모전/반영기록/홀드아웃2/answers_sealed.json', import.meta.url))
const INP = fileURLToPath(new URL('./holdout2-inputs.json', import.meta.url))

const KO = { 도보: 'walk', 부축: 'assist', 휠체어: 'wheelchair', 침상: 'bed' }
const RANK = { walk: 1, assist: 2, wheelchair: 3, bed: 4, unknown: 3 }

// 1단계: 모델 원문 응답(content)을 지금 판정 함수(띄어쓰기와 말줄임 무시 원문 대조)로 다시 판정
export function rejudge(raw, inputs, conditions) {
  const byDoc = Object.fromEntries(inputs.docs.map((d) => [d.doc, d]))
  const rub = Object.fromEntries(conditions.map((c) => [c.id, !!c.rubric]))
  return raw.map((r) => {
    if (r.error || !r.content) return r
    try {
      const ps = personsOf(byDoc[r.doc], parseModelJson(r.content), rub[r.cond])
      return { ...r, persons: ps.map((x) => ({ id: x.id, grade: x.grade, quote: x.quote, reason: x.reason, dims: x.rubric ? Object.fromEntries(Object.entries(x.rubric.dims).map(([k, v]) => [k, v.score])) : undefined })) }
    } catch { return r }
  })
}

// 2단계: 사후 검사 적용
export function rescore(raw, inputs) {
  const byDoc = Object.fromEntries(inputs.docs.map((d) => [d.doc, d]))
  return raw.map((r) => {
    if (r.error) return r
    const d = byDoc[r.doc]
    const persons = r.persons.map((p, i) => ({ ...p, context: d.mode === 'segments' ? d.segments[i]?.text : undefined, rubric: p.dims ? { dims: {} } : undefined }))
    return { ...r, persons: applySafeguard(persons, d.transcript).map((p) => ({ id: p.id, grade: p.grade, quote: p.quote, dims: r.persons.find((x) => x.id === p.id)?.dims, reason: p.reason })) }
  })
}

// 높게 판정 수(정답보다 높은 최빈 등급)
export function overCount(raw, cond, answers) {
  const key = {}
  for (const d of answers.documents) key[d.document.replace(/\.png$/, '')] = d.people.map((p) => ({ g: KO[p.true_grade], det: p.grade_determinable_from_text }))
  const rows = raw.filter((r) => r.cond === cond && !r.error)
  const by = {}
  for (const r of rows) (by[r.doc] ||= []).push(r)
  let over = 0, upgraded = 0
  for (const [doc, runs] of Object.entries(by)) {
    const n = Math.max(...runs.map((r) => r.persons.length))
    for (let i = 0; i < n; i++) {
      const g = runs.map((r) => r.persons[i]?.grade ?? 'missing')
      const c = {}; let m = null; for (const x of g) { c[x] = (c[x] || 0) + 1; if (m == null || c[x] > c[m]) m = x }
      if (runs.some((r) => /cueUpgrade/.test(r.persons[i]?.reason || ''))) upgraded++
      const t = key[doc]?.[i]
      if (t?.g && t.det && (RANK[m] ?? 0) > RANK[t.g]) over++
    }
  }
  return { over, upgraded }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const src = JSON.parse(fs.readFileSync(RAW, 'utf8'))
  const answers = JSON.parse(fs.readFileSync(ANS, 'utf8'))
  const inputs = JSON.parse(fs.readFileSync(INP, 'utf8'))
  const q = rejudge(src.raw, inputs, src.conditions)
  const stages = { before: src.raw, quoteFix: q, quoteFixSafeguard: rescore(q, inputs), safeguardOnly: rescore(src.raw, inputs) }
  const out = {}
  for (const c of src.conditions) {
    out[c.id] = {}
    for (const [name, rows] of Object.entries(stages)) { const m = summarize(rows, src.conditions, answers)[c.id]; out[c.id][name] = { match: m.answerMatch, under: m.underGraded, allSame: m.allSameGradePct, people: m.people, ...overCount(rows, c.id, answers) } }
  }
  console.log(JSON.stringify(out, null, 1))
}

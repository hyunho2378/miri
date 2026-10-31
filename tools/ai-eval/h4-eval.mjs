// 평가셋 H4(가상 서류 11장, 24명) 한 번 측정. 서비스 기본 경로(기존 지시문, seed 고정, 사후 검사 포함)를 그대로 쓴다.
// 정답은 H4_생성.py 가 문구 틀의 등급으로 정한 값이라 라벨링 정답지와 무관하다. 서류 본문은 이 도구가 읽을 뿐 사람이 열람하지 않는다.
// 사용: NCP_CLOVASTUDIO_KEY=… node tools/ai-eval/h4-eval.mjs [--runs 5] [--dry]
//   --dry : 봉인 서류를 건드리지 않고 개발셋 첫 서류 1회만 불러 키와 경로가 동작하는지 본다(결과 파일 없음)
// 재개: 같은 결과 파일에 이미 성공한 (서류, 회차)는 다시 부르지 않는다. 오류로 비어 있는 칸만 채운다. 규칙을 바꿔 다시 재지 않는다(바꾸면 새 평가셋 H5).
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { maskLines, residualPII } from '../../client/api/_ncp.js'
import { segment, detectedPersonCount, fillMissing } from '../../client/api/intake.js'
import { applySafeguard } from '../../client/src/lib/safeguard.js'
import { callModel } from './model-adapter.mjs'
import { promptOf, personsOf } from './repro-test.mjs'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const RUNS = Number(arg('--runs', 5))
const DRY = process.argv.includes('--dry')
const MODEL = 'HCX-005'
const SEED = 20261022 // 서버 현재 설정과 같은 조건 B
const GAP_MS = 1200
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const SEAL = here('../../../../공모전/AI검증/정답지/H4_평가셋_봉인.json')
const SEAL_SHA = here('../../../../공모전/AI검증/정답지/H4_평가셋_봉인.sha256')
const OUT = here('../../../../공모전/AI검증/H4_측정_원자료.jsonl')
const SUMMARY = here('../../../../공모전/AI검증/H4_측정_요약.json')

const TRUTH = { 침상: 'bed', 휠체어: 'wheelchair', 부축: 'assist', 도보: 'walk', 판정불가: 'unknown' }
const RANK = { walk: 1, assist: 2, wheelchair: 3, bed: 4, unknown: 3 } // 판정 불가는 계산상 휠체어

// 서식 한 줄씩(서식명, 성명 줄, 대상자 줄) 서비스의 OCR 줄 모양으로 되돌린다
function linesOf(tr) {
  const parts = tr.split(/(?=\d\) 대상자)/).map((s) => s.trim()).filter(Boolean)
  const head = parts.shift() || ''
  const m = /^(.*?)\s+(성명 .*)$/.exec(head)
  return [...(m ? [m[1], m[2]] : [head]), ...parts]
}
// build-holdout2-inputs.mjs 와 같은 분기
function toInput(doc, lines) {
  const masked = maskLines(lines)
  const left = residualPII(masked)
  if (left.length) return { skipped: true, doc }
  const segs0 = segment(masked)
  const segs = segs0.length && detectedPersonCount(masked) > segs0.length ? [] : segs0
  return { doc, mode: segs.length ? 'segments' : 'free', segments: segs.map((s, k) => ({ id: `S${k + 1}`, text: s.text })), transcript: masked.join(' ').replace(/\s+/g, ' ').trim(), lines: masked }
}
async function callOnce(inp) {
  const p = promptOf(inp, false, false)
  let res
  try { res = await callModel(MODEL, p, { seed: SEED, temperature: 0.1, topP: 0.8 }) } catch (e1) { process.stderr.write(`retry after ${e1.code || e1.message}\n`); await sleep(15000); res = await callModel(MODEL, p, { seed: SEED, temperature: 0.1, topP: 0.8 }) }
  let ps = personsOf(inp, res.out, false)
  ps = applySafeguard(inp.mode === 'segments' ? ps : fillMissing(ps, [], inp.lines || []), inp.transcript)
  return { res, ps }
}

async function main() {
  if (!process.env.NCP_CLOVASTUDIO_KEY) { console.error('NCP_CLOVASTUDIO_KEY 가 없어 실행하지 않음'); process.exit(2) }
  if (DRY) {
    const dev = JSON.parse(fs.readFileSync(here('./holdout2-inputs.json'), 'utf8')).docs[0]
    const { ps } = await callOnce(dev)
    console.log(JSON.stringify({ dry: true, doc: dev.doc, people: ps.length, grades: ps.map((p) => p.grade) }))
    return
  }
  const raw = fs.readFileSync(SEAL)
  const sha = crypto.createHash('sha256').update(raw).digest('hex')
  const want = fs.readFileSync(SEAL_SHA, 'utf8').trim().split(/\s+/)[0]
  if (sha !== want) { console.error('봉인 해시가 달라 실행하지 않음', sha, want); process.exit(3) }
  const seal = JSON.parse(raw.toString('utf8'))
  const inputs = seal.docs.map((d) => toInput(d.doc, linesOf(d.transcript)))
  if (inputs.some((x) => x.skipped)) { console.error('잔존 검사에 걸린 서류가 있어 실행하지 않음', inputs.filter((x) => x.skipped).map((x) => x.doc)); process.exit(4) }
  const done = new Set()
  if (fs.existsSync(OUT)) for (const l of fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (!r.error) done.add(`${r.doc}|${r.run}`) }
  let errRun = 0
  outer: for (const inp of inputs) for (let n = 0; n < RUNS; n++) {
    if (done.has(`${inp.doc}|${n}`)) continue
    await sleep(GAP_MS)
    try {
      const { res, ps } = await callOnce(inp)
      errRun = 0
      fs.appendFileSync(OUT, JSON.stringify({ doc: inp.doc, run: n, mode: inp.mode, ms: res.ms, usage: res.usage, persons: ps.map((p) => ({ grade: p.grade, reason: p.reason || '' })), content: res.content }) + '\n')
      process.stderr.write(`${inp.doc} ${n} ok\n`)
    } catch (e) {
      fs.appendFileSync(OUT, JSON.stringify({ doc: inp.doc, run: n, error: e.code || e.message }) + '\n')
      process.stderr.write(`${inp.doc} ${n} ERR ${e.code || e.message}\n`)
      if (++errRun >= 3) { process.stderr.write('연속 오류 3회, 중단. 다시 실행하면 빈 칸만 채움\n'); break outer }
    }
  }
  // 집계
  const rows = fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => !r.error)
  const byDoc = {}
  for (const r of rows) (byDoc[r.doc] ||= {})[r.run] = r
  const people = []
  for (const d of seal.docs) {
    const runs = Object.values(byDoc[d.doc] || {})
    d.answers.forEach((a, i) => {
      const grades = runs.map((r) => { const p = r.persons[i]; return !p || p.reason === 'missingFromModel' ? 'missing' : p.grade })
      const c = {}; for (const g of grades) c[g] = (c[g] || 0) + 1
      const modal = Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'missing'
      people.push({ id: a.id, truth: TRUTH[a.final], modal, runs: grades.length, allSame: grades.length > 0 && new Set(grades).size === 1 })
    })
  }
  const N = people.length
  const found = people.filter((p) => p.modal !== 'missing')
  const exact = found.filter((p) => p.modal === p.truth).length
  const calc = (g) => RANK[g]
  const under = found.filter((p) => calc(p.modal) < calc(p.truth)).length
  const over = found.filter((p) => calc(p.modal) > calc(p.truth)).length
  const calcMatch = found.filter((p) => calc(p.modal) === calc(p.truth)).length
  const sum = {
    measuredAt: new Date().toISOString(), model: MODEL, runs: RUNS, seed: SEED, path: '서비스 기본 경로(기존 지시문, seed 고정, 후처리 포함)', sealSha256: sha,
    commit: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: here('../../') }).toString().trim() } catch { return null } })(),
    people: N, found: found.length, foundPct: Math.round((found.length / N) * 1000) / 10,
    exactAmongFound: exact, exactAmongFoundPct: found.length ? Math.round((exact / found.length) * 1000) / 10 : null, exactOfAll: exact, exactOfAllPct: Math.round((exact / N) * 1000) / 10,
    calcGradeMatch: calcMatch, calcGradeMatchOfAllPct: Math.round((calcMatch / N) * 1000) / 10,
    lowerThanTruth: under, higherThanTruth: over,
    allRunsSameGrade: people.filter((p) => p.allSame).length,
    callsOk: rows.length, expectedCalls: seal.docs.length * RUNS,
    perPerson: people.map((p) => ({ id: p.id, truth: p.truth, modal: p.modal, runs: p.runs, allSame: p.allSame }))
  }
  fs.writeFileSync(SUMMARY, JSON.stringify(sum, null, 1))
  const { perPerson, ...short } = sum
  console.log(JSON.stringify(short, null, 1))
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()

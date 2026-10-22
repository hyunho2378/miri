// 학습 데이터와 시험용 홀드아웃2 사이 누설 검사.
// 사용: node tools/hcx-tuning/leak-check.mjs [--data tools/hcx-tuning/data]
// 검사 1 같은 입력 글: 학습 Text 와 홀드아웃 구간 글이나 전사문이 같으면 실패
// 검사 2 문장 겹침: 홀드아웃의 8자 이상 문장(띄어쓰기 무시)이 학습 Text 안에 그대로 있으면 실패
// 검사 3 문구 묶음 겹침: phrases.mjs 문구(띄어쓰기 무시)가 홀드아웃 글 안에 그대로 있으면 실패
// 검사 4 글자 12개 연속 조각 겹침 비율(참고값, 실패 기준 아님)
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LEVEL, AMBIG, DISTRACT, UNREADABLE } from './phrases.mjs'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const squash = (s) => String(s || '').replace(/\s+/g, '')

export function holdoutTexts(inputs) {
  const segs = inputs.docs.flatMap((d) => (d.segments || []).map((s) => s.text))
  const trans = inputs.docs.map((d) => d.transcript)
  const sentences = [...segs, ...trans].flatMap((t) => String(t).split(/[.\n|]/)).map((x) => x.trim()).filter((x) => squash(x).length >= 8)
  return { segs, trans, sentences }
}

// 홀드아웃 서식의 머리말 같은 공통 문구(가림 표시 등)는 문장 겹침에서 뺀다
const COMMON = /^\[?[^\]]*가림\]?$|허구|가상|실제 행정 서식 아님|^\d+\s*\/\s*\d+$/

export function check(rows, inputs) {
  const h = holdoutTexts(inputs)
  const hSet = new Set([...h.segs, ...h.trans].map(squash))
  const hSent = [...new Set(h.sentences.filter((x) => !COMMON.test(x)).map(squash))]
  const hAll = squash([...h.segs, ...h.trans].join(' '))
  const bank = [...Object.values(LEVEL).flatMap((o) => Object.values(o).flat()), ...AMBIG.map((a) => a[2]), ...DISTRACT].map(squash).filter((x) => x.length >= 6)
  const exact = [], sent = [], phrase = []
  for (const r of rows) {
    const t = squash(r.Text)
    if (hSet.has(t)) exact.push(r.C_ID)
    for (const s of hSent) if (t.includes(s)) sent.push({ C_ID: r.C_ID, s })
  }
  for (const p of bank) if (hAll.includes(p)) phrase.push(p)
  // 12자 조각 겹침
  const grams = (s, n = 12) => { const g = new Set(); for (let i = 0; i + n <= s.length; i++) g.add(s.slice(i, i + n)); return g }
  const hg = grams(squash(h.segs.join('|')))
  let hit = 0, tot = 0
  for (const r of rows) { const g = grams(squash(r.Text)); tot += g.size; for (const x of g) if (hg.has(x)) hit++ }
  const ignored = UNREADABLE.length
  return { rows: rows.length, exact: exact.length, sentenceHits: sent.length, sentenceExamples: sent.slice(0, 5), phraseHits: phrase, gram12OverlapPct: tot ? Math.round((hit / tot) * 10000) / 100 : 0, holdoutSentencesChecked: hSent.length, note: `판독 불가 같은 짧은 공통 표기 ${ignored}종은 정답 형식상 홀드아웃과 겹칠 수 있어 검사 3에서 6자 미만으로 제외` }
}

function main() {
  const DATA = arg('--data', fileURLToPath(new URL('./data', import.meta.url)))
  const inputs = JSON.parse(fs.readFileSync(new URL('../ai-eval/holdout2-inputs.json', import.meta.url), 'utf8'))
  const load = (f) => fs.readFileSync(`${DATA}/${f}`, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const out = { train: check(load('train.jsonl'), inputs), valid: check(load('valid.jsonl'), inputs) }
  console.log(JSON.stringify(out, null, 1))
  const fail = ['train', 'valid'].some((k) => out[k].exact || out[k].sentenceHits || out[k].phraseHits.length)
  process.exit(fail ? 1 : 0)
}
if (fileURLToPath(import.meta.url) === process.argv[1]) main()

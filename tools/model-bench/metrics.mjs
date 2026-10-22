// model-bench/metrics.mjs 이송 등급 판정 모델 비교용 지표.
// 등급 순서: walk(도보) < assist(부축) < wheelchair(휠체어) < bed(침상). 낮게 판정(필요 자원 과소)이 가장 위험하다.
// 서비스 규칙(client/src/lib/intake.js 21~22행): unknown 과 근거 약함(low)인 walk, assist 는 배정 계산에서 wheelchair 로 잡는다.

export const GRADES = ['walk', 'assist', 'wheelchair', 'bed']
export const RANK = { walk: 0, assist: 1, wheelchair: 2, bed: 3 }

// 서비스가 실제 배정 계산에 쓰는 등급
export function finalGrade(pred, conf) {
  if (!GRADES.includes(pred)) return 'wheelchair'
  if ((pred === 'walk' || pred === 'assist') && conf === 'low') return 'wheelchair'
  return pred
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null)

// rows: [{ id, truth, det, pred, conf, final? }] final 이 있으면(서비스가 실제로 정한 등급) 그것을 쓴다
// det=false 는 글만으로 등급을 정할 수 없는 사람(정답은 숨은 시나리오 값). 맞히기보다 보류가 바른 행동이다.
export function score(rows) {
  const det = rows.filter((r) => r.det !== false)
  const nondet = rows.filter((r) => r.det === false)
  const raw = { exact: 0, under: 0, over: 0, abstain: 0 }
  const fin = { exact: 0, under: 0, over: 0 }
  const byGrade = Object.fromEntries(GRADES.map((g) => [g, { n: 0, exact: 0, under: 0 }]))
  for (const r of det) {
    const t = RANK[r.truth]
    const g = byGrade[r.truth]; g.n++
    if (!GRADES.includes(r.pred)) raw.abstain++
    else if (RANK[r.pred] === t) raw.exact++
    else if (RANK[r.pred] < t) raw.under++
    else raw.over++
    const f = RANK[r.final || finalGrade(r.pred, r.conf)]
    if (f === t) { fin.exact++; g.exact++ } else if (f < t) { fin.under++; g.under++ } else fin.over++
  }
  // 정할 수 없는 사람: 보류(unknown) 또는 근거 약함(low)으로 담당자 확인에 넘겼는가, 최종 등급이 낮게 잡혔는가
  let deferred = 0, nondetUnder = 0
  for (const r of nondet) {
    if (!GRADES.includes(r.pred) || r.conf === 'low') deferred++
    if (RANK[r.final || finalGrade(r.pred, r.conf)] < RANK[r.truth]) nondetUnder++
  }
  return {
    n: rows.length, nDet: det.length, nNondet: nondet.length,
    raw: { ...raw, exactPct: pct(raw.exact, det.length), underPct: pct(raw.under, det.length) },
    final: { ...fin, exactPct: pct(fin.exact, det.length), underPct: pct(fin.under, det.length), overPct: pct(fin.over, det.length) },
    nondet: { deferred, deferredPct: pct(deferred, nondet.length), under: nondetUnder },
    byGrade
  }
}

// 같은 입력을 여러 번 돌린 결과의 일치율. runs: [[pred...], [pred...]] (같은 순서)
export function repro(runs) {
  if (!runs.length) return null
  const n = runs[0].length
  let same = 0
  for (let i = 0; i < n; i++) if (runs.every((r) => r[i] === runs[0][i])) same++
  return { items: n, runs: runs.length, allSame: same, allSamePct: pct(same, n) }
}

// 근거 문구가 입력 글에 그대로 있는가(빈 문구는 불일치)
export function quoteMatchRate(rows) {
  const withQ = rows.filter((r) => r.quote != null)
  const ok = withQ.filter((r) => r.quote && r.text && r.text.replace(/\s+/g, ' ').includes(r.quote.replace(/\s+/g, ' ').trim()))
  return { n: withQ.length, matched: ok.length, pct: pct(ok.length, withQ.length) }
}

// 재현성과 정답 일치 지표. 합격선은 정하지 않고 숫자만 낸다(정답지 v1 확정 뒤 팀이 정함)
const KO = { 도보: 'walk', 부축: 'assist', 휠체어: 'wheelchair', 침상: 'bed' }
const RANK = { walk: 1, assist: 2, wheelchair: 3, bed: 4, unknown: 3 } // unknown 은 계산상 휠체어
export const mode = (a) => { const c = {}; let best = null; for (const x of a) { c[x] = (c[x] || 0) + 1; if (best == null || c[x] > c[best]) best = x } return { value: best, count: best == null ? 0 : c[best] } }

// answers_sealed.json → 서류별 사람 정답(순서대로)
export function answerKey(answers) {
  const key = {}
  for (const d of answers?.documents || []) key[d.document.replace(/\.png$/, '')] = d.people.map((p) => ({ grade: KO[p.true_grade] || null, determinable: p.grade_determinable_from_text }))
  return key
}

export function summarize(raw, conditions, answers) {
  const key = answerKey(answers)
  const res = {}
  for (const c of conditions) {
    const rows = raw.filter((r) => r.cond === c.id)
    const errors = rows.filter((r) => r.error).length
    const byDoc = {}
    for (const r of rows.filter((r) => !r.error)) (byDoc[r.doc] ||= []).push(r)
    let people = 0, allSame = 0, modeShare = 0, quoteSame = 0, countVaries = 0, dimSame = 0, dimTotal = 0, match = 0, under = 0, judged = 0
    for (const [doc, runs] of Object.entries(byDoc)) {
      const counts = new Set(runs.map((r) => r.persons.length))
      if (counts.size > 1) countVaries++
      const n = Math.max(...runs.map((r) => r.persons.length))
      for (let i = 0; i < n; i++) {
        const grades = runs.map((r) => r.persons[i]?.grade ?? 'missing')
        const quotes = runs.map((r) => r.persons[i]?.quote ?? '')
        const m = mode(grades)
        people++; modeShare += m.count / runs.length
        if (m.count === runs.length) allSame++
        if (new Set(quotes).size === 1) quoteSame++
        if (runs[0].persons[i]?.dims) for (const k of Object.keys(runs[0].persons[i].dims)) { dimTotal++; if (new Set(runs.map((r) => r.persons[i]?.dims?.[k] ?? null)).size === 1) dimSame++ }
        const truth = key[doc]?.[i]
        if (truth?.grade && truth.determinable) { judged++; if (m.value === truth.grade) match++; if ((RANK[m.value] ?? 0) < RANK[truth.grade]) under++ }
      }
    }
    const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null)
    res[c.id] = { label: c.label, calls: rows.length, errors, people, allSameGradePct: pct(allSame, people), meanModeSharePct: pct(modeShare, people), sameQuotePct: pct(quoteSame, people), docsWithVaryingPersonCount: countVaries, dimSamePct: dimTotal ? pct(dimSame, dimTotal) : null, answerMatch: `${match}/${judged}`, underGraded: under }
  }
  return res
}

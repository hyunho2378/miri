// 작은 분류기(E). 글자 2~3그램 다항 나이브 베이즈. 의존성 없음, 같은 입력이면 같은 결과.
// 학습은 synth.mjs 의 train 묶음(가상)으로만 한다. 정답지 v1(전문가 검증)이 쌓이면 그것으로 다시 학습한다.
// 가장 높은 확률과 두 번째의 차이가 작으면 근거 약함(low), 두 후보 중 높은 등급을 고른다(낮게 판정 방지).
import { GRADES, RANK } from '../metrics.mjs'

const grams = (s) => {
  const t = ` ${String(s).replace(/\s+/g, ' ').trim()} `
  const out = []
  for (let n = 2; n <= 3; n++) for (let i = 0; i + n <= t.length; i++) out.push(t.slice(i, i + n))
  return out
}

export function trainNB(items, alpha = 1) {
  const count = Object.fromEntries(GRADES.map((g) => [g, new Map()]))
  const total = Object.fromEntries(GRADES.map((g) => [g, 0]))
  const docs = Object.fromEntries(GRADES.map((g) => [g, 0]))
  const vocab = new Set()
  for (const it of items) {
    docs[it.truth]++
    for (const w of grams(it.text)) { vocab.add(w); count[it.truth].set(w, (count[it.truth].get(w) || 0) + 1); total[it.truth]++ }
  }
  const N = items.length, V = vocab.size
  return {
    predict(text) {
      const ws = grams(text)
      if (!String(text || '').trim()) return { pred: 'unknown', conf: 'low', quote: '' }
      const lp = GRADES.map((g) => {
        let s = Math.log((docs[g] + 1) / (N + GRADES.length))
        for (const w of ws) s += Math.log(((count[g].get(w) || 0) + alpha) / (total[g] + alpha * V))
        return [g, s]
      }).sort((a, b) => b[1] - a[1])
      const [[g1, s1], [g2, s2]] = lp
      const margin = s1 - s2
      if (margin < 2) {
        const hi = RANK[g1] >= RANK[g2] ? g1 : g2
        return { pred: hi, conf: 'low', quote: null, margin }
      }
      return { pred: g1, conf: margin > 6 ? 'high' : 'mid', quote: null, margin }
    }
  }
}

export function clfAdapter(trainItems) {
  const m = trainNB(trainItems)
  return { id: 'clf', label: '작은 분류기(글자 n그램 나이브 베이즈, 가상 학습)', kind: 'clf', run: async (item) => m.predict(item.text) }
}

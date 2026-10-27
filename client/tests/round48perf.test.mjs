import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildSeed } from '../src/mock/seed.js'
import { computeShortage, optimizedUnserved } from '../src/lib/shortageCalc.js'
import { boardingRecommended } from '../src/lib/boardingOpt.js'

let n = 0
const t = async (name, fn) => { try { await fn(); n++; console.log('ok', name) } catch (e) { console.error('FAIL', name, e.message); process.exitCode = 1 } }
const seed = buildSeed()
const input = { ...seed, scenario: seed.scenarios[0], t0: seed.today }

await t('따로 계산한 승하차 추천 배정 값은 화면에서 바로 계산하던 값과 같다(20분 267명)', async () => {
  for (const m of [20, 30]) {
    const direct = optimizedUnserved(computeShortage({ ...input, settings: { ...input.settings, boardingMinutes: m } }))
    assert.equal(boardingRecommended(input, m), direct)
  }
  assert.equal(boardingRecommended(input, input.settings.boardingMinutes ?? 20), 267)
})
await t('부족분 계산 화면은 그리는 중에 추천 배정 탐색을 직접 돌리지 않는다', async () => {
  const src = readFileSync(new URL('../src/pages/console/ShortagePage.jsx', import.meta.url), 'utf8')
  assert.ok(!/optimizedUnserved\(/.test(src))
  assert.ok(/useBoardingRecommended\(/.test(src))
})
await t('추천 배정 계산은 웹 작업자로 돌리고, 못 쓰면 쉬는 틈에 나눠 돌린다', async () => {
  const src = readFileSync(new URL('../src/hooks/useBoardingRecommended.js', import.meta.url), 'utf8')
  assert.ok(/new Worker\(new URL\('\.\.\/lib\/boardingOpt\.worker\.js'/.test(src))
  assert.ok(/setTimeout\(next, 0\)/.test(src))
})
console.log('round48perf', n)

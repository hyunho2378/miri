import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildSeed } from '../src/mock/seed.js'
import { computeShortage, optimizedUnserved } from '../src/lib/shortageCalc.js'
import { BOARDING_STEPS, boardingLabel } from '../src/lib/boardingSensitivity.js'

test('R42 승하차 시간 민감도: 지금 조건의 1배, 1.25배, 1.5배, 2배 값이 플랫폼 41회차 표와 같음', () => {
  const seed = buildSeed()
  const sc = seed.scenarios[0]
  const run = (m) => computeShortage({ ...seed, settings: { ...seed.settings, boardingMinutes: m }, scenario: sc, t0: seed.today })
  const now = seed.settings.boardingMinutes
  assert.equal(now, 20)
  const got = [now, now * 1.25, now * 1.5, now * 2].map((m) => [run(m).total, optimizedUnserved(run(m))])
  assert.deepEqual(got, [[291, 267], [345, 306], [402, 338], [459, 398]])
  for (const m of [now, now * 1.25, now * 1.5, now * 2]) assert.ok(BOARDING_STEPS.includes(m), `${m}분이 화면 단계에 있음`)
})

test('R42 승하차 시간 행 이름: 지금 조건, 1.25배, 1.5배, 2배', () => {
  assert.equal(boardingLabel(20, 20), '20분 (지금 조건)')
  assert.equal(boardingLabel(25, 20), '25분 (지금의 1.25배)')
  assert.equal(boardingLabel(30, 20), '30분 (지금의 1.5배)')
  assert.equal(boardingLabel(40, 20), '40분 (지금의 2배)')
  assert.equal(boardingLabel(15, 20), '15분')
})

import { splitDesc } from '../src/lib/foldText.js'

test('R42 상황판 긴 설명: 첫 문장은 보이고 나머지는 접으며 글자는 하나도 빠지지 않음', () => {
  const fire = '동해 옥계에서 시속 2km로 번진다고 둔 가정입니다. 띠 안 마을에 발령 후 2시간 35분부터 4시간 41분 사이에 차례로 도달합니다.'
  const [head, rest] = splitDesc(fire)
  assert.equal(head, '동해 옥계에서 시속 2km로 번진다고 둔 가정입니다.')
  assert.equal(`${head} ${rest}`, fire)
  const [h2, r2] = splitDesc('짧은 설명입니다.')
  assert.equal(h2, '짧은 설명입니다.')
  assert.equal(r2, '')
  assert.deepEqual(splitDesc(undefined), [undefined, ''])
})

test('R42 상황판 화면 코드: 요약 패널, 레이어 패널, 시간축의 긴 가정은 가정 보기 접힘 안에 있음', () => {
  const src = (f) => readFileSync(new URL(`../src/components/map/${f}`, import.meta.url), 'utf8')
  assert.ok(src('SummaryPanel.jsx').includes('summary="확산 조건 보기"'))
  assert.ok(src('LayerPanel.jsx').includes("'확산 조건과 출처' : '확산 조건'"))
  assert.ok(src('TimeAxis.jsx').includes('summary="계산 방식"'))
})

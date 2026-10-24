// 검수 반영: 명부 표 1280, 1440 폭에서 편집 열이 잘리지 않도록 열 숨김 단계 조정(상세 창에 같은 정보가 있는 열만 숨김)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const src = readFileSync(new URL('../src/pages/console/RosterPage.jsx', import.meta.url), 'utf8')
const hideOf = (key) => (src.match(new RegExp(`key: '${key}'[^}]*?hideBelow: '([a-z0-9]+)'`)) || [])[1]

test('입력 방법은 2xl, 동행과 소통은 3xl 부터 표에 보임', () => {
  assert.equal(hideOf('source'), '2xl')
  assert.equal(hideOf('care'), '3xl')
})

test('숨긴 열의 정보는 대상자 상세 창에 남아 있음', () => {
  assert.ok(src.includes("{ label: '입력 방법', value: <SourceLabel source={open.gradeSource} /> }"))
  assert.ok(src.includes("label: '의사소통 특성'"))
})

test('편집과 마지막 확인 열은 숨기지 않음', () => {
  assert.equal(hideOf('edit'), undefined)
  assert.equal(hideOf('planCheckedAt'), undefined)
})

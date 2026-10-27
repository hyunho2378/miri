// 명부 목록은 필수 열만 두고 나머지 정보는 오른쪽 상세에 둔다(1280, 1440, 1920 폭에서 목록과 상세가 함께 보임)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const src = readFileSync(new URL('../src/pages/console/RosterPage.jsx', import.meta.url), 'utf8')
const hideOf = (key) => (src.match(new RegExp(`key: '${key}'[^}]*?hideBelow: '([a-z0-9]+)'`)) || [])[1]

test('목록 열은 필수 다섯 개만, 입력 방법과 동행과 소통은 오른쪽 상세로', () => {
  const list = src.slice(src.indexOf('const columns = ['), src.indexOf('const listGrid'))
  for (const k of ['code', 'village', 'grade', 'review', 'planCheckedAt']) assert.ok(list.includes(`key: '${k}'`), k)
  assert.ok(!list.includes("key: 'source'"))
  assert.ok(!list.includes("key: 'care'"))
})

test('숨긴 열의 정보는 대상자 상세 창에 남아 있음', () => {
  assert.ok(src.includes("{ label: '입력 방법', value: <SourceLabel source={open.gradeSource} /> }"))
  assert.ok(src.includes("label: '의사소통 특성'"))
})

test('마지막 확인 열은 숨기지 않고, 수정은 상세 단추', () => {
  assert.equal(hideOf('planCheckedAt'), undefined)
  assert.ok(src.includes('>수정</Button>'))
})

// 실제 판독 사례(10. 22. HCX-005 저장본): 개인정보 문자열 없음, 이미지 존재, 외부 호출 없이 원문 대조
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { REAL_READINGS, REAL_READ_LABEL } from '../src/mock/realReadings.js'
import { verifyPage } from '../src/lib/intake.js'

test('사례 4장, 이미지 파일 존재, 표시 문구', () => {
  assert.equal(REAL_READINGS.length, 4)
  for (const c of REAL_READINGS) assert.ok(fs.existsSync(new URL('../public' + c.image, import.meta.url)), c.image)
  assert.match(REAL_READ_LABEL, /HCX-005 실제 판독/)
})

test('전사문과 근거에 연락처, 생년월일 숫자 형식 없음', () => {
  for (const c of REAL_READINGS) {
    const all = c.transcript + c.results.map((r) => r.quote).join(' ')
    assert.doesNotMatch(all, /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/)
    assert.doesNotMatch(all, /(19|20)\d{2}[.\-/년]\s?\d{1,2}[.\-/월]\s?\d{1,2}/)
    assert.match(c.transcript, /\[이름 가림\]|\[가림\]/)
  }
})

test('사례 선택은 외부 호출 없이 원문 대조', async () => {
  const orig = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('no fetch') }
  try {
    for (const c of REAL_READINGS) {
      const page = await Promise.resolve(verifyPage({ ...c, persons: c.results }))
      assert.equal(page.persons.length, c.results.length)
    }
  } finally { globalThis.fetch = orig }
  assert.equal(calls, 0)
})

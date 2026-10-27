// 37회차 반영: 문서함 서식 미리보기의 파란 머리말에 '종류 (서식 이름)'.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { thumbHeadLabel } from '../src/lib/thumbLabel.js'
import { DOC_TEMPLATES, FORM_TEMPLATES, SHEET_TEMPLATES } from '../src/lib/workspaceTemplates.js'

test('머리말은 종류 뒤에 서식 이름을 괄호로 붙인다', () => {
  assert.equal(thumbHeadLabel('doc', '협조 요청 공문'), '협조 요청 공문')
  assert.equal(thumbHeadLabel('sheet', '대상자 명부'), '대상자 명부')
  assert.equal(thumbHeadLabel('form', '인터뷰 참여 동의'), '인터뷰 참여 동의')
})

test('서식 35종(빈 서식 3개 포함) 모두 머리말이 만들어지고 이름이 비어 있지 않다', () => {
  const all = [['doc', DOC_TEMPLATES], ['sheet', SHEET_TEMPLATES], ['form', FORM_TEMPLATES]]
  let n = 0
  for (const [k, list] of all) for (const t of list) { assert.ok(t.title, `${k} ${t.key} 이름 없음`); assert.match(thumbHeadLabel(k, t.title), /.+/); n += 1 }
  assert.equal(n, 35)
})

test('문서함 화면은 머리말에 이름을 쓰고, 카드 바깥에는 서식 이름을 다시 쓰지 않는다', () => {
  const src = readFileSync(new URL('../src/pages/workspace/WorkspaceHome.jsx', import.meta.url), 'utf8')
  assert.ok(src.includes('thumbHeadLabel(kind, t.title)'))
  assert.ok(!/type-strong text-text-pri">\{t\.title\}/.test(src))
})

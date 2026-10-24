// 38회차: 플랫폼 AI 협업 툴 셀 88(서식 공문 표기 점검), 붙임이 하나면 번호를 빼고 붙임 뒤 2타
import assert from 'node:assert/strict'
import { DOC_TEMPLATES } from '../src/lib/docTemplates.js'

const text = (html) => html.replace(/<[^>]+>/g, '\n').split('\n').map((x) => x.trim().length ? x : '').filter(Boolean)
const attach = (t) => text(t.html).filter((l) => l.replace(/\u00a0/g, ' ').startsWith('붙임'))

const gian = DOC_TEMPLATES.find((t) => t.key === 'gian-request')
const lines = attach(gian)
assert.equal(lines.length, 1)
// 붙임 뒤 2타, 쌍점 없음, 번호 없음, 수량은 부수 뒤 온점
assert.equal(lines[0].replace(/\u00a0/g, ' '), '붙임  마을별 미이송 예상 1부.')
assert.ok(!/붙임\s*:/.test(lines[0]))
// 줄바꿈 없는 공백이라 화면에서 접히지 않는다(literal 문자, 엔티티 글자가 아님)
assert.ok(lines[0].startsWith('붙임\u00a0\u00a0'))
assert.ok(!gian.html.includes('&nbsp;'))

// 붙임이 한 줄뿐인 서식에서 번호(1.)가 붙은 서식이 남지 않는다
for (const t of DOC_TEMPLATES) {
  if (!t.html) continue
  const a = attach(t)
  if (a.length === 1) assert.ok(!/^붙임\s+1\./.test(a[0].replace(/\u00a0/g, ' ')), `${t.key} 붙임 하나인데 번호가 있음`)
}

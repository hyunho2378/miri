// 플랫폼 AI 협업 툴 검토 반영(셀 40 계열): 화면과 문서 서식의 용어를 현장 용어(거동불편자, 사전 대피, 구조 대상)로 통일
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const files = ['src/lib/docTemplates.js', 'src/components/miri/RosterPrint.jsx', 'src/pages/public/PrivacyPage.jsx']
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')

test('문서 서식, 명부 인쇄, 개인정보 화면에 옛 용어가 남지 않음', () => {
  for (const f of files) {
    const s = read(f)
    for (const old of ['재난취약자', '사전 이송', '미이송자']) assert.ok(!s.includes(old), `${f}: ${old}`)
  }
})

test('행정안전부 인용은 취약계층 8시간 전 사전 대피로 표기', () => {
  assert.ok(read('src/lib/docTemplates.js').includes('취약계층 8시간 전 사전 대피 체계'))
  assert.ok(read('src/lib/handoverDoc.js').includes('취약계층 8시간 전 사전 대피'))
})

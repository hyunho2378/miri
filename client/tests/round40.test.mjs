// 40회차: 플랫폼 AI 협업 툴 셀 90(내보내기 붙임 공백) 검토
// 결론: 내보내기 변환(hwpDoc.js)은 그대로 둔다. 붙임 뒤 2칸은 kordoc 이 한글 파일을 만들 때 직접 넣는다.
import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import JSZip from 'jszip'
import * as k from 'kordoc'

const sectionTexts = async (md, preset) => {
  const r = await k.markdownToHwpx(md, { gongmun: { preset: k.normalizeGongmunPreset(preset) } })
  const zip = await JSZip.loadAsync(r.buffer ?? r)
  const xml = await zip.file('Contents/section0.xml').async('string')
  return [...xml.matchAll(/<hp:t>([^<]*)<\/hp:t>/g)].map((m) => m[1])
}

test('붙임이 하나인 줄은 내보내기 변환이 한 칸으로 줄여도 한글 파일에서 붙임 뒤 2칸이 된다', async () => {
  for (const preset of ['기안문', '보고서']) {
    const t = await sectionTexts('제목\n\n붙임 마을별 미이송 예상 1부.\n', preset)
    assert.ok(t.includes('붙임  마을별 미이송 예상 1부.'), `${preset}: ${JSON.stringify(t)}`)
  }
})

test('줄바꿈 없는 공백을 그대로 kordoc 에 넘기면 문단이 사라지므로 hwpDoc.js 의 공백 치환은 유지한다', async () => {
  const t = await sectionTexts('제목\n\n가나\u00a0\u00a0다라 사.\n', '기안문')
  assert.ok(!t.some((x) => x.includes('가나')), '줄바꿈 없는 공백 문단이 사라지는 동작이 바뀌었다. hwpDoc.js 243줄 치환을 다시 검토한다')
  const src = fs.readFileSync(new URL('../src/pages/workspace/hwpDoc.js', import.meta.url), 'utf8')
  assert.ok(src.includes(".replace(/\\u00a0/g, ' ')"), 'hwpDoc.js 의 줄바꿈 없는 공백 치환이 없어졌다')
})

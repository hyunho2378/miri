// 홀드아웃2(별도 작업자가 만든 처음 보는 가상 서류 15장 40명) 원시결과의 가린 글자만 모아 언어 모델 입력 묶음을 만든다.
// 서류 사진과 가리기 전 글자는 쓰지 않는다. 지금 가림 규칙(maskLines)을 한 번 더 적용하고, 잔존 검사(residualPII)에 걸리면 그 서류는 뺀다.
// 사용: node tools/ai-eval/build-holdout2-inputs.mjs <원시결과.json 경로>
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { maskLines, residualPII } from '../../client/api/_ncp.js'
import { segment, detectedPersonCount } from '../../client/api/intake.js'

const src = process.argv[2] || fileURLToPath(new URL('../../../../공모전/반영기록/홀드아웃2/원시결과.json', import.meta.url))
const raw = JSON.parse(fs.readFileSync(src, 'utf8'))
const docs = []
const skipped = []
for (const r of raw.results) {
  const masked = maskLines(r.masked || [])
  const left = residualPII(masked)
  if (left.length) { skipped.push({ doc: r.doc, reason: 'residualPII' }); continue }
  // 서버(api/intake.js)와 같은 분기: 구간이 대상자 표식 수보다 적으면 문서 전체 판독
  const segs0 = segment(masked)
  const segs = segs0.length && detectedPersonCount(masked) > segs0.length ? [] : segs0
  docs.push({ doc: r.doc, mode: segs.length ? 'segments' : 'free', segments: segs.map((s, k) => ({ id: `S${k + 1}`, text: s.text })), transcript: masked.join(' ').replace(/\s+/g, ' ').trim(), lines: masked })
}
const out = { dataset: 'HO2', fictional: true, source: 'holdout2 원시결과.json masked 글자(commit ' + raw.commit + ')', builtAt: new Date().toISOString(), docs, skipped }
fs.writeFileSync(new URL('./holdout2-inputs.json', import.meta.url), JSON.stringify(out, null, 1))
console.log('docs', docs.length, 'segments', docs.reduce((n, d) => n + d.segments.length, 0), 'skipped', skipped.length)

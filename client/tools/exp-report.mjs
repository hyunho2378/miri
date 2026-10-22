#!/usr/bin/env node
// 체험 기록 집계 내려받기. 시연 코드로 세션을 받은 뒤 /api/exp?report=1 을 읽어 JSON 과 엑셀(xlsx)로 저장한다.
// 쓰는 법: MIRI_DEMO_CODE=... node tools/exp-report.mjs --out 체험기록_집계.xlsx [--base https://miri-indol.vercel.app] [--test] [--purge-test]
// --test: 시험 출처도 함께 집계. --purge-test: 시험 출처(src=test) 기록을 지운다. 엑셀은 python3 openpyxl 로 만든다(tools/exp_xlsx.py).
import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const has = (k) => process.argv.includes(k)
const base = (arg('--base') || 'https://miri-indol.vercel.app').replace(/\/$/, '')
const out = arg('--out', '체험기록_집계.xlsx')
const code = process.env.MIRI_DEMO_CODE
if (!code) { console.error('MIRI_DEMO_CODE 가 필요합니다'); process.exit(2) }
const H = { origin: base, 'content-type': 'application/json' }

const s = await fetch(`${base}/api/session`, { method: 'POST', headers: H, body: JSON.stringify({ code }) })
const cookie = (s.headers.get('set-cookie') || '').split(';')[0]
if (!s.ok || !cookie) { console.error(`세션 발급 실패 HTTP ${s.status}`); process.exit(1) }
const auth = { ...H, cookie }

if (has('--purge-test')) {
  const d = await fetch(`${base}/api/exp?src=test`, { method: 'DELETE', headers: auth })
  console.log('시험 기록 지우기', d.status, await d.text())
}
const r = await fetch(`${base}/api/exp?report=1${has('--test') ? '&test=1' : ''}`, { headers: auth })
if (!r.ok) { console.error(`집계 읽기 실패 HTTP ${r.status} ${await r.text()}`); process.exit(1) }
const data = await r.json()
const jsonPath = out.replace(/\.xlsx$/, '') + '.json'
writeFileSync(jsonPath, JSON.stringify(data, null, 2))
const here = dirname(fileURLToPath(import.meta.url))
execFileSync('python3', [join(here, 'exp_xlsx.py'), jsonPath, out], { stdio: 'inherit' })
const all = data.report?.['전체']
console.log(`참여 ${all?.participants ?? 0}명, 이송 끝까지 ${all?.completed ?? 0}명 → ${out}`)

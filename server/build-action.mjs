// 네이버 클라우드 Cloud Functions 배포용 묶음(zip)을 만든다. 배포는 하지 않는다.
// 액션 하나(server/ncpAction.cjs 의 main)가 /api/<이름> 경로로 client/api 핸들러 12개와 상태 확인을 모두 처리한다.
//
// 실행(저장소 맨 위에서, client 폴더에 npm install 을 먼저 해 둔다)
//   node server/build-action.mjs                 묶음 폴더와 zip 만들기
//   node server/build-action.mjs --with-optional 패키지의 선택 의존성(optionalDependencies)까지 넣기(kordoc 의 PDF, 이미지 처리용. 수백 MB)
//   node server/build-action.mjs --no-redis      표준 Redis(ioredis) 빼기(MIRI_STORE=ncpobject 나 upstash 만 쓸 때)
//   node server/build-action.mjs --verify        만든 zip 을 임시 폴더에 풀고 server/action-smoke.mjs 로 핸들러 12개와 상태 확인을 불러 본다
//
// 결과: server/dist/ncp-action/ (풀어 놓은 폴더), server/dist/ncp-action.zip
//   zip 안 구조는 저장소와 같다: package.json(main=server/ncpAction.cjs), server/, client/api/, client/src/(api 가 불러오는 파일만), client/node_modules/(쓰는 패키지만)
// 넣는 범위는 client/api/*.js 에서 시작해 import, export from, import(), require 를 따라가며 정한다. .env 와 비밀 값은 넣지 않는다
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const client = join(root, 'client')
const out = join(here, 'dist', 'ncp-action')
const zipPath = join(here, 'dist', 'ncp-action.zip')
const withOptional = process.argv.includes('--with-optional')
const noRedis = process.argv.includes('--no-redis')
const verify = process.argv.includes('--verify')

if (!existsSync(join(client, 'node_modules'))) { console.error('client/node_modules 가 없습니다. client 폴더에서 npm install 을 먼저 실행하세요'); process.exit(2) }

// 1. 소스 따라가기
const IMPORT_RE = /(?:^|[\s;])(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|(?:^|[\s;(])import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g
const files = new Set()
const packages = new Set()
const builtin = (s) => s.startsWith('node:') || ['fs', 'path', 'url', 'crypto', 'http', 'https', 'zlib', 'stream', 'buffer', 'util', 'os', 'events', 'module', 'child_process'].includes(s)
const pkgName = (s) => (s.startsWith('@') ? s.split('/').slice(0, 2).join('/') : s.split('/')[0])
function walk(file) {
  if (files.has(file)) return
  files.add(file)
  if (!/\.(m?js|cjs)$/.test(file)) return
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1] || m[2] || m[3] || m[4]
    if (!spec || builtin(spec)) continue
    if (spec.startsWith('.')) {
      let target = resolve(dirname(file), spec)
      if (!existsSync(target) && existsSync(`${target}.js`)) target = `${target}.js`
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.js')
      if (!existsSync(target)) { console.error(`찾지 못한 파일: ${relative(root, file)} -> ${spec}`); process.exitCode = 1; continue }
      walk(target)
    } else {
      packages.add(pkgName(spec))
    }
  }
}
const serverFiles = ['ncpAction.cjs', 'ncpAction.mjs', 'adapter.mjs'].map((f) => join(here, f))
serverFiles.forEach(walk)
const apiFiles = readdirSync(join(client, 'api')).filter((f) => f.endsWith('.js')).map((f) => join(client, 'api', f))
apiFiles.forEach(walk)
if (noRedis) packages.delete('ioredis')

// 2. 패키지와 그 의존성(노드 해석 규칙대로 가까운 node_modules 부터)
const pkgDirs = new Map() // 실제 폴더 -> 이름
function findPkg(name, fromDir) {
  let d = fromDir
  while (d.startsWith(client)) {
    const p = join(d, 'node_modules', name)
    if (existsSync(join(p, 'package.json'))) return p
    const up = dirname(d)
    if (up === d) break
    d = up
  }
  return null
}
const missing = []
function addPkg(name, fromDir, optional = false) {
  const dir = findPkg(name, fromDir)
  if (!dir) { if (!optional) missing.push(name); return }
  if (pkgDirs.has(dir)) return
  pkgDirs.set(dir, name)
  const pj = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  for (const dep of Object.keys(pj.dependencies || {})) addPkg(dep, dir)
  if (withOptional) for (const dep of Object.keys(pj.optionalDependencies || {})) addPkg(dep, dir, true)
}
for (const p of packages) addPkg(p, client)
if (missing.length) { console.error(`설치되지 않은 패키지: ${[...new Set(missing)].join(', ')}`); process.exit(1) }

// 3. 묶음 폴더 만들기
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const f of files) {
  const dst = join(out, relative(root, f))
  mkdirSync(dirname(dst), { recursive: true })
  cpSync(f, dst)
}
// 패키지 폴더 안의 중첩 node_modules 는 따로 고른 것만 넣는다
for (const dir of pkgDirs.keys()) {
  const dst = join(out, relative(root, dir))
  cpSync(dir, dst, { recursive: true, filter: (src) => !relative(dir, src).split(sep).includes('node_modules') })
}
const clientPkg = JSON.parse(readFileSync(join(client, 'package.json'), 'utf8'))
writeFileSync(join(out, 'package.json'), JSON.stringify({ name: 'miri-ncp-action', private: true, version: clientPkg.version, main: 'server/ncpAction.cjs' }, null, 2))
// client/api 는 ESM 이라 client/package.json 의 type 표시가 필요하다
writeFileSync(join(out, 'client', 'package.json'), JSON.stringify({ name: 'miri-client', private: true, type: 'module' }, null, 2))

// 4. zip
const du = (p) => { let s = 0; for (const e of readdirSync(p, { withFileTypes: true })) { const q = join(p, e.name); s += e.isDirectory() ? du(q) : e.isFile() ? statSync(q).size : 0 } return s }
rmSync(zipPath, { force: true })
let zipped = false
try { execFileSync('zip', ['-qr9X', zipPath, '.'], { cwd: out, stdio: 'ignore' }); zipped = true } catch { zipped = false }
if (!zipped) {
  const JSZip = createRequire(join(client, 'package.json'))('jszip')
  const zip = new JSZip()
  const add = (p) => { for (const e of readdirSync(p, { withFileTypes: true })) { const q = join(p, e.name); if (e.isDirectory()) add(q); else zip.file(relative(out, q).split(sep).join('/'), readFileSync(q)) } }
  add(out)
  writeFileSync(zipPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }))
}

const mb = (b) => `${(b / 1024 / 1024).toFixed(2)}MB`
const bySize = [...pkgDirs.keys()].map((d) => [relative(client, d), du(d)]).sort((a, b) => b[1] - a[1])
console.log(JSON.stringify({
  out: relative(root, out),
  zip: relative(root, zipPath),
  unzipped: mb(du(out)),
  zipSize: mb(statSync(zipPath).size),
  sourceFiles: files.size,
  apiHandlers: apiFiles.filter((f) => !f.split(sep).pop().startsWith('_')).map((f) => f.split(sep).pop().replace(/\.js$/, '')),
  topPackages: [...packages].sort(),
  packageCount: pkgDirs.size,
  largest: bySize.slice(0, 8).map(([n, s]) => `${n} ${mb(s)}`),
  optionalDeps: withOptional,
  redis: !noRedis
}, null, 2))

// 5. 풀어서 점검(저장소 폴더 밖에서 풀어 묶음 안의 파일과 패키지만으로 도는지 본다)
if (verify) {
  const tmp = mkdtempSync(join(tmpdir(), 'miri-action-'))
  try {
    execFileSync('unzip', ['-q', zipPath, '-d', tmp], { stdio: 'ignore' })
    const outText = execFileSync(process.execPath, [join(here, 'action-smoke.mjs'), tmp], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
    console.log(outText.trim())
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

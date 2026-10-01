// qr.js 의존성 없이 QR 코드를 만든다. 바이트 모드, 오류정정 L, 버전 1~10.
// 시설 QR 은 "{origin}/?facility=fac-008&src=qr" 정도라 60자를 넘지 않는다. 버전 4 안쪽이다.
// ISO/IEC 18004 의 최소 구현이다. 마스크 8종을 전부 평가해 벌점이 가장 낮은 것을 고른다.

// ---- GF(256). 원시다항식 0x11D ----
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x
  LOG[x] = i
  x <<= 1
  if (x & 0x100) x ^= 0x11d
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

// 오류정정 부호 n개짜리 생성 다항식
function rsGenerator(n) {
  let g = [1]
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0)
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j]
      next[j + 1] ^= mul(g[j], EXP[i])
    }
    g = next
  }
  return g
}

function rsEncode(data, ecLen) {
  const g = rsGenerator(ecLen)
  const res = new Array(ecLen).fill(0)
  for (const byte of data) {
    const factor = byte ^ res[0]
    res.shift()
    res.push(0)
    for (let i = 0; i < ecLen; i++) res[i] ^= mul(g[i + 1], factor)
  }
  return res
}

// ---- 버전별 제원. [총 코드워드, EC 코드워드/블록, 블록 수]. 오류정정 L 만 쓴다 ----
const VERSION_L = {
  1: [26, 7, 1], 2: [44, 10, 1], 3: [70, 15, 1], 4: [100, 20, 1], 5: [134, 26, 1],
  6: [172, 18, 2], 7: [196, 20, 2], 8: [242, 24, 2], 9: [292, 30, 2], 10: [346, 18, 4]
}
// 버전별 정렬 패턴 중심 좌표
const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
}

const size = (v) => v * 4 + 17
const dataCapacity = (v) => {
  const [total, ecPerBlock, blocks] = VERSION_L[v]
  return total - ecPerBlock * blocks
}

function pickVersion(byteLen) {
  for (let v = 1; v <= 10; v++) {
    const header = 4 + (v < 10 ? 8 : 16)
    if (dataCapacity(v) * 8 >= header + byteLen * 8) return v
  }
  throw new Error('QR: 내용이 너무 깁니다')
}

// ---- 비트 스트림 ----
function buildData(bytes, version) {
  const bits = []
  const push = (value, len) => { for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1) }
  push(0b0100, 4)                                   // 바이트 모드
  push(bytes.length, version < 10 ? 8 : 16)
  for (const b of bytes) push(b, 8)

  const cap = dataCapacity(version) * 8
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0)   // 종단자
  while (bits.length % 8) bits.push(0)

  const out = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]
    out.push(byte)
  }
  // 남는 자리는 EC 11 을 번갈아 채운다
  for (let i = 0; out.length < dataCapacity(version); i++) out.push(i % 2 === 0 ? 0xec : 0x11)
  return out
}

// 블록으로 나눠 인터리브한다
function interleave(dataCodewords, version) {
  const [, ecPerBlock, blocks] = VERSION_L[version]
  const per = Math.floor(dataCodewords.length / blocks)
  const extra = dataCodewords.length % blocks
  const dataBlocks = []
  const ecBlocks = []
  let at = 0
  for (let b = 0; b < blocks; b++) {
    const len = per + (b >= blocks - extra ? 1 : 0)
    const block = dataCodewords.slice(at, at + len)
    at += len
    dataBlocks.push(block)
    ecBlocks.push(rsEncode(block, ecPerBlock))
  }
  const out = []
  const maxData = Math.max(...dataBlocks.map((b) => b.length))
  for (let i = 0; i < maxData; i++) for (const b of dataBlocks) if (i < b.length) out.push(b[i])
  for (let i = 0; i < ecPerBlock; i++) for (const b of ecBlocks) out.push(b[i])
  return out
}

// ---- 매트릭스 ----
function emptyMatrix(n) {
  return { m: Array.from({ length: n }, () => new Array(n).fill(null)), n }
}

function placeFunctionPatterns(g, version) {
  const { m, n } = g
  const finder = (r, c) => {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const y = r + i
        const x = c + j
        if (y < 0 || y >= n || x < 0 || x >= n) continue
        const inRing = i >= 0 && i <= 6 && j >= 0 && j <= 6
        const dark = inRing && ((i === 0 || i === 6 || j === 0 || j === 6) || (i >= 2 && i <= 4 && j >= 2 && j <= 4))
        m[y][x] = dark ? 1 : 0
      }
    }
  }
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0)

  for (let i = 8; i < n - 8; i++) {          // 타이밍 패턴
    const v = i % 2 === 0 ? 1 : 0
    m[6][i] = v
    m[i][6] = v
  }

  const centers = ALIGN[version]
  for (const r of centers) {
    for (const c of centers) {
      if ((r === 6 && c === 6) || (r === 6 && c === n - 7) || (r === n - 7 && c === 6)) continue
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          m[r + i][c + j] = (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)) ? 1 : 0
        }
      }
    }
  }

  m[n - 8][8] = 1                            // 항상 어두운 모듈
  // 형식 정보 자리를 예약한다
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) m[8][i] = 0
    if (m[i][8] === null) m[i][8] = 0
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][n - 1 - i] === null) m[8][n - 1 - i] = 0
    if (m[n - 1 - i][8] === null) m[n - 1 - i][8] = 0
  }
}

// 형식 정보를 넣기 전 데이터 자리인지 판단하려면 예약 여부를 따로 들고 있어야 한다
function reservedMask(version) {
  const n = size(version)
  const g = emptyMatrix(n)
  placeFunctionPatterns(g, version)
  return g.m.map((row) => row.map((v) => v !== null))
}

function placeData(g, codewords, reserved) {
  const { m, n } = g
  let bitIndex = 0
  const nextBit = () => {
    const byte = codewords[bitIndex >> 3]
    const bit = byte === undefined ? 0 : (byte >> (7 - (bitIndex & 7))) & 1
    bitIndex++
    return bit
  }
  let up = true
  for (let right = n - 1; right > 0; right -= 2) {
    if (right === 6) right--                  // 세로 타이밍 열은 건너뛴다
    for (let step = 0; step < n; step++) {
      const y = up ? n - 1 - step : step
      for (const x of [right, right - 1]) {
        if (reserved[y][x]) continue
        m[y][x] = nextBit()
      }
    }
    up = !up
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
]

// 형식 정보 15비트. L(01) + 마스크 3비트에 BCH(15,5) 를 붙이고 0x5412 로 뒤집는다
function formatBits(mask) {
  const data = (0b01 << 3) | mask
  let rem = data << 10
  for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0b10100110111 << (i - 10)
  return ((data << 10) | rem) ^ 0b101010000010010
}

function placeFormat(g, mask) {
  const { m, n } = g
  const bits = formatBits(mask)
  const at = (i) => (bits >> i) & 1
  for (let i = 0; i <= 5; i++) m[8][i] = at(i)
  m[8][7] = at(6)
  m[8][8] = at(7)
  m[7][8] = at(8)
  for (let i = 9; i <= 14; i++) m[14 - i][8] = at(i)
  for (let i = 0; i <= 7; i++) m[n - 1 - i][8] = at(i)
  for (let i = 8; i <= 14; i++) m[8][n - 15 + i] = at(i)
}

// 벌점 규칙 4가지. 값이 낮을수록 좋은 마스크다
function penalty(m, n) {
  let score = 0
  const runScore = (line) => {
    let run = 1
    for (let i = 1; i < n; i++) {
      if (line[i] === line[i - 1]) run++
      else { if (run >= 5) score += 3 + (run - 5); run = 1 }
    }
    if (run >= 5) score += 3 + (run - 5)
  }
  for (let r = 0; r < n; r++) runScore(m[r])
  for (let c = 0; c < n; c++) runScore(m.map((row) => row[c]))

  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m[r][c]
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3
    }
  }

  const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
  const hasPattern = (line, i) => pat.every((p, k) => line[i + k] === p)
  const revPat = [...pat].reverse()
  const hasRev = (line, i) => revPat.every((p, k) => line[i + k] === p)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c + 11 <= n; c++) if (hasPattern(m[r], c) || hasRev(m[r], c)) score += 40
  }
  for (let c = 0; c < n; c++) {
    const col = m.map((row) => row[c])
    for (let r = 0; r + 11 <= n; r++) if (hasPattern(col, r) || hasRev(col, r)) score += 40
  }

  let dark = 0
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) dark += m[r][c]
  const ratio = (dark * 100) / (n * n)
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10
  return score
}

// ---- 공개 API ----
// 문자열 → 0/1 매트릭스. 여백(quiet zone)은 그리는 쪽이 붙인다
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)]
  const version = pickVersion(bytes.length)
  const codewords = interleave(buildData(bytes, version), version)
  const reserved = reservedMask(version)

  let best = null
  for (let mask = 0; mask < 8; mask++) {
    const g = emptyMatrix(size(version))
    placeFunctionPatterns(g, version)
    placeData(g, codewords, reserved)
    for (let r = 0; r < g.n; r++) {
      for (let c = 0; c < g.n; c++) {
        if (!reserved[r][c] && MASKS[mask](r, c)) g.m[r][c] ^= 1
      }
    }
    placeFormat(g, mask)
    const p = penalty(g.m, g.n)
    if (!best || p < best.p) best = { p, m: g.m, n: g.n, version, mask }
  }
  return best
}

// 매트릭스 → SVG 문자열. dark 와 light 는 호출부가 tokens 값으로 반드시 넘긴다.
// 기본값을 두지 않는 이유는 이 파일에 색을 적지 않기 위해서다(hex 직접 입력 금지)
export function qrSvg(text, { size: px = 240, dark, light, quiet = 4 } = {}) {
  const { m, n } = qrMatrix(text)
  const total = n + quiet * 2
  const rects = []
  for (let r = 0; r < n; r++) {
    let run = 0
    for (let c = 0; c <= n; c++) {
      if (c < n && m[r][c]) { run++; continue }
      if (run) rects.push(`<rect x="${c - run + quiet}" y="${r + quiet}" width="${run}" height="1"/>`)
      run = 0
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img"><rect width="${total}" height="${total}" fill="${light}"/><g fill="${dark}">${rects.join('')}</g></svg>`
}

export function downloadQrSvg(text, filename, opts) {
  const url = URL.createObjectURL(new Blob([qrSvg(text, opts)], { type: 'image/svg+xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

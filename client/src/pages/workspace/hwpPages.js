// hwpPages.js 한글 미리보기 쪽(kordoc renderHwpxToSvg 결과)으로 인쇄하고 PDF 파일을 만든다.
// 미리보기 SVG 는 쪽들이 위아래로 이어진 한 장이다. 쪽마다 viewBox 를 잘라 A4 한 장씩으로 나눈다.
// 인쇄: 쪽 SVG 를 그대로 인쇄 창에 넣는다(글자가 벡터로 찍힘).
// PDF: 쪽 SVG 를 200dpi 그림으로 바꿔 PDF 쪽에 한 장씩 붙인다. 바깥 라이브러리 없이 PDF 구조(xref)를 직접 쓴다.

const A4 = { w: 595.28, h: 841.89 } // pt

export function splitPages(svgText, { pageCount = 1, width, height } = {}) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const svg = doc.documentElement
  const vb = (svg.getAttribute('viewBox') || `0 0 ${width} ${height}`).split(/[\s,]+/).map(Number)
  const W = width || vb[2]
  const H = height || A4.h
  const n = Math.max(1, pageCount)
  const gap = n > 1 ? (vb[3] - n * H) / (n - 1) : 0
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const inner = svg.innerHTML
  return Array.from({ length: n }, (_, i) => {
    const y = vb[1] + i * (H + gap)
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb[0]} ${y} ${W} ${H}" width="210mm" height="297mm"><style>text{white-space:pre}</style><rect x="${vb[0]}" y="${y}" width="${W}" height="${H}" fill="#fff"/>${inner}</svg>`
  })
}

export function printPages(pages, title) {
  const w = window.open('', '_blank')
  if (!w) return false
  const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Noto+Sans+KR:wght@400;700;900&family=Nanum+Gothic+Coding&display=swap">
<style>@page{size:A4;margin:0}html,body{margin:0;background:#fff}.pg{width:210mm;height:297mm;overflow:hidden;break-after:page}.pg:last-child{break-after:auto}.pg svg{display:block;width:210mm;height:297mm}</style></head>
<body>${pages.map((p) => `<div class="pg">${p}</div>`).join('')}</body></html>`)
  w.document.close()
  w.focus()
  const go = () => setTimeout(() => w.print(), 300)
  if (w.document.fonts?.ready) w.document.fonts.ready.then(go); else go()
  return true
}

function svgToJpeg(svgText, px = 1654) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const ratio = A4.h / A4.w
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = px; c.height = Math.round(px * ratio)
      const g = c.getContext('2d')
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
      g.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((b) => (b ? b.arrayBuffer().then((ab) => resolve({ bytes: new Uint8Array(ab), w: c.width, h: c.height })) : reject(new Error('그림 변환 실패'))), 'image/jpeg', 0.92)
    }
    img.onerror = () => reject(new Error('쪽 그림을 읽지 못했습니다'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText.replace('width="210mm" height="297mm"', `width="${px}" height="${Math.round(px * ratio)}"`))}`
  })
}

// 제목을 PDF 문자열(UTF-16BE 16진)로
const pdfText = (s) => `<FEFF${[...String(s || '')].map((ch) => { const c = ch.codePointAt(0); if (c > 0xffff) { const v = c - 0x10000; return ((0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0')) } return c.toString(16).padStart(4, '0') }).join('').toUpperCase()}>`

export async function pagesToPdf(pages, title) {
  const imgs = []
  for (const p of pages) imgs.push(await svgToJpeg(p))
  const enc = new TextEncoder()
  const chunks = []
  let size = 0
  const offsets = []
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); size += b.length }
  const obj = (id, body) => { offsets[id] = size; push(`${id} 0 obj\n`); body(); push('\nendobj\n') }
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const n = imgs.length
  // 1 카탈로그, 2 쪽 묶음, 3 문서 정보, 쪽마다 [쪽, 내용, 그림]
  const pageId = (i) => 4 + i * 3
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'))
  obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${imgs.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] >>`))
  obj(3, () => push(`<< /Title ${pdfText(title)} /Producer (miri, kordoc renderHwpxToSvg) >>`))
  imgs.forEach((im, i) => {
    const pid = pageId(i), cid = pid + 1, iid = pid + 2
    const content = `q ${A4.w} 0 0 ${A4.h} 0 0 cm /Im${i} Do Q`
    obj(pid, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /XObject << /Im${i} ${iid} 0 R >> >> /Contents ${cid} 0 R >>`))
    obj(cid, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`))
    obj(iid, () => { push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`); push(im.bytes); push('\nendstream') })
  })
  const total = 4 + n * 3
  const xref = size
  push(`xref\n0 ${total}\n0000000000 65535 f \n`)
  for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(chunks, { type: 'application/pdf' })
}

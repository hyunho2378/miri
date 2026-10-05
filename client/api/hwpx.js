// api/hwpx.js Vercel 서버리스 함수. 마크다운을 한글 문서(HWPX)로 변환한다(PRD v2 F5, kordoc markdownToHwpx).
// POST { title, markdown, preset } → HWPX 파일(application/hwp+zip)
// preset: 통지 | 보고서 | 계획서 | 기안문. kordoc 은 호출할 때만 동적으로 불러온다(콜드 스타트 단축).
// OCR 과 이미지 처리 모듈은 이 경로에서 쓰지 않는다.

export const config = { maxDuration: 30 }

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

const PRESETS = ['통지', '보고서', '계획서', '기안문']
const MAX_MD = 500 * 1024

const safeName = (s) => (String(s || '문서').replace(/[\\/:*?"<>|\r\n]/g, '').trim().slice(0, 80) || '문서')

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST 만 허용')
  let body = req.body
  if (Buffer.isBuffer(body)) body = body.toString('utf8')
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return fail(res, 400, 'BAD_JSON', '요청 형식 오류') }
  }
  const { title, markdown, preset = '기안문' } = body || {}
  if (typeof markdown !== 'string' || !markdown.trim()) return fail(res, 400, 'BAD_INPUT', 'markdown 필요')
  if (!PRESETS.includes(preset)) return fail(res, 400, 'PRESET', `preset 은 ${PRESETS.join(', ')} 중 하나`)
  if (Buffer.byteLength(markdown, 'utf8') > MAX_MD) return fail(res, 413, 'TOO_LARGE', '본문 500KB 초과')

  const name = safeName(title)
  // 제목이 본문 맨 앞 제목과 다르면 앞에 붙인다
  const md = /^\s*#\s/.test(markdown) || !title ? markdown : `# ${name}\n\n${markdown}`

  try {
    const { markdownToHwpx } = await import('kordoc')
    const warnings = []
    const ab = await markdownToHwpx(md, { gongmun: { preset }, warnings })
    const buf = Buffer.from(ab)
    res.setHeader('Content-Type', 'application/hwp+zip')
    res.setHeader('Content-Disposition', `attachment; filename="document.hwpx"; filename*=UTF-8''${encodeURIComponent(`${name}.hwpx`)}`)
    res.setHeader('Content-Length', String(buf.length))
    res.setHeader('Cache-Control', 'no-store')
    if (warnings.length) res.setHeader('X-Miri-Warnings', encodeURIComponent(warnings.join(' | ').slice(0, 400)))
    return res.status(200).send(buf)
  } catch (e) {
    return fail(res, 502, 'KORDOC', `한글 문서 변환 실패: ${e.message}`)
  }
}

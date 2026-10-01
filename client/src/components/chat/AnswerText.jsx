// 동해사이 렌더러 이식. 문단, 하이픈 불릿, 번호 목록, 파이프 표, 볼드만 그린다.
// 그 외 마크다운은 지원하지 않는다. react-markdown 도입 금지(토큰 밖 스타일이 샌다).
// 입력은 호출부가 stripMarkdown 을 통과시킨 문자열이다.
import clsx from 'clsx'

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-text-pri">{part.slice(2, -2)}</strong>
      : part
  )
}

const isBullet = (l) => /^\s*-\s+/.test(l)
const isNumber = (l) => /^\s*\d+[.)]\s+/.test(l)
const isRow = (l) => l.trim().startsWith('|') && l.trim().endsWith('|')
const isDivider = (l) => /^\s*\|[\s|:-]+\|\s*$/.test(l)
const cells = (l) => l.trim().slice(1, -1).split('|').map((c) => c.trim())

// 연속된 같은 종류의 줄을 한 블록으로 묶는다
function toBlocks(text) {
  const lines = (text || '').split('\n')
  const blocks = []
  let buf = null
  const flush = () => { if (buf) blocks.push(buf); buf = null }

  for (const line of lines) {
    if (!line.trim()) { flush(); continue }
    const kind = isRow(line) ? 'table' : isBullet(line) ? 'ul' : isNumber(line) ? 'ol' : 'p'
    if (!buf || buf.kind !== kind) { flush(); buf = { kind, lines: [] } }
    buf.lines.push(line)
  }
  flush()
  return blocks
}

export default function AnswerText({ text, compact = false, caret = false, className }) {
  const blocks = toBlocks(text)
  const body = compact ? 'type-body-sm' : 'type-body'

  // 마지막 블록 끝에 커서를 붙인다. 문단 파싱은 그대로다
  const tail = (i) => (caret && i === blocks.length - 1
    ? <span aria-hidden="true" className="stream-caret ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] rounded-full bg-primary" />
    : null)

  return (
    <div className={clsx('text-text-sec', className)}>
      {blocks.map((b, i) => {
        if (b.kind === 'ul') {
          return (
            <ul key={i} className={clsx('mt-3 first:mt-0 space-y-1.5 pl-5 list-disc marker:text-text-ter', body)}>
              {b.lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*-\s+/, ''))}{j === b.lines.length - 1 && tail(i)}</li>)}
            </ul>
          )
        }
        if (b.kind === 'ol') {
          return (
            <ol key={i} className={clsx('mt-3 first:mt-0 space-y-1.5 pl-5 list-decimal marker:text-text-ter', body)}>
              {b.lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''))}{j === b.lines.length - 1 && tail(i)}</li>)}
            </ol>
          )
        }
        if (b.kind === 'table') {
          const rows = b.lines.filter((l) => !isDivider(l)).map(cells)
          const [head, ...rest] = rows
          return (
            <div key={i} className="mt-4 first:mt-0 overflow-x-auto rounded-lg shadow-card bg-page">
              <table className="w-full text-left tabular-nums">
                <thead>
                  <tr className="bg-subtle">
                    {head.map((c, j) => <th key={j} className="px-4 py-3 type-caption font-semibold text-text-meta">{inline(c)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rest.map((r, j) => (
                    <tr key={j} className="border-t border-line-sub">
                      {r.map((c, k) => <td key={k} className="px-4 py-3 type-body-sm text-text-pri">{inline(c)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return (
          <p key={i} className={clsx('mt-3 first:mt-0 whitespace-pre-wrap', body)}>
            {b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}
            {tail(i)}
          </p>
        )
      })}
    </div>
  )
}

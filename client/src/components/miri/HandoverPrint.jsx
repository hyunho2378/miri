// 소방 인계 인쇄본(플랫폼 AI 협업 툴 셀 53 검토 반영). 화면에는 보이지 않고 인쇄 때만 나온다.
// 이전에는 인쇄 버튼이 화면 전체를 찍으려 했지만 @media print 가 .print-area 밖을 모두 숨겨 빈 쪽이 나왔다.
// A4 가로, 쪽마다 표 머리와 목록 기준 시각, 쪽 번호. 인계 대기 전체(화면 표의 20행 제한과 무관)
import { createPortal } from 'react-dom'
import { handoverPrintColumns, paginateHandover, HANDOVER_PRINT_CSV_NOTE } from '../../lib/handoverRows.js'
import { fmtDateTime } from '../../lib/time.js'

export default function HandoverPrint({ rows, baseAt, orgName }) {
  const cols = handoverPrintColumns()
  const pages = paginateHandover(rows)
  if (!pages.length) return null
  const count = pages.reduce((s, p) => s + p.rows.length, 0)
  // body 바로 아래에 붙여 인쇄 때 다른 화면 요소를 빼고 흐름대로 쪽을 나눈다(절대 위치면 한 쪽에 겹쳐 잘림)
  return createPortal(
    <div className="print-area handover-print hidden print:block" aria-hidden="true">
      {pages.map((pg) => (
        <section key={pg.n} className="print-page handover-print-page">
          <header className="mb-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9pt] text-text-sec">{orgName} 소방 인계 목록, 구조 대상(기한 안 미이송) {count}명</p>
              <p className="text-[12pt] font-bold text-text-pri">목록 기준 시각 {fmtDateTime(baseAt)}</p>
            </div>
            <p className="text-[9pt] text-text-sec tabular-nums">쪽 {pg.n} / {pg.total}</p>
          </header>
          <table className="w-full border-collapse text-[9pt] leading-tight">
            <thead>
              <tr className="text-left">
                <th className="py-1 pr-2 font-bold">번호</th>
                {cols.map((c) => <th key={c.key} className="py-1 pr-2 font-bold">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {pg.rows.map((r, i) => (
                <tr key={r.code} className="align-top">
                  <td className="py-1 pr-2 tabular-nums">{(pg.n - 1) * pages[0].rows.length + i + 1}</td>
                  {cols.map((c) => <td key={c.key} className="py-1 pr-2">{c.value ? c.value(r) : (r[c.key] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {pg.n === pg.total && <p className="mt-2 text-[8pt] text-text-sec">{HANDOVER_PRINT_CSV_NOTE}</p>}
        </section>
      ))}
    </div>,
    document.body
  )
}

// 명부 서식 출력. 마을마다 한 장(A4 세로). 이름과 연락처 칸은 비워 두고 지자체 서버 원본에서 채워 쓴다(일본 개별피난계획 서식 출력 방식).
// 인쇄 버튼은 브라우저 인쇄를 연다. index.css 의 @media print 가 이 영역만 남긴다.
import { Printer } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { TAGS } from '../../lib/intake.js'
import { gradeOf } from '../../lib/shortage.js'
import { TEMP_SHELTERS } from '../../mock/donghaeData.js'
import { fmtKDate } from './BasisLine.jsx'

export default function RosterPrint({ groups, dongs, today }) {
  const dongName = (c) => dongs.find((d) => d.code === c)?.name || c
  const shelter = (c) => TEMP_SHELTERS.find((s) => s.code === c)
  if (!groups.length) return <p className="type-body-sm text-text-sec">출력할 대상자가 없습니다. 필터를 바꿔 주십시오.</p>
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="type-body-sm text-text-sec">마을 {groups.length}곳, 한 마을에 한 장씩 인쇄합니다.</p>
        <Button onClick={() => window.print()} leftIcon={<Printer size={16} aria-hidden="true" />}>인쇄</Button>
      </div>
      <div className="print-area space-y-6">
        {groups.map((g) => {
          const s = shelter(g.village.shelterCode)
          return (
            <section key={g.code} className="print-page rounded-lg border border-line-def p-6">
              <header className="flex flex-wrap items-end justify-between gap-2 border-b border-text-pri pb-3">
                <div>
                  <p className="type-caption text-text-sec">재난취약자 이송 명부, {dongName(g.village.dongCode)}</p>
                  <h3 className="type-h2 text-text-pri">{g.name} <span className="type-body text-text-sec tabular-nums">{g.count}명</span></h3>
                </div>
                <p className="type-meta text-text-sec">명부 {fmtKDate(today)} 기준</p>
              </header>
              <dl className="mt-3 grid gap-x-6 gap-y-1 type-body-sm text-text-pri sm:grid-cols-2">
                <div className="flex gap-2"><dt className="text-text-sec">집결지</dt><dd>{g.village.pickup ? `${g.village.pickup.name}, ${g.village.pickup.road.replace('동해시 ', '')}` : '미지정'}</dd></div>
                <div className="flex gap-2"><dt className="text-text-sec">평시 대피소</dt><dd>{s ? `${s.name}, 왕복 ${g.village.roundTripMin}분` : '미지정'}</dd></div>
              </dl>
              <table className="mt-4 w-full border-collapse type-body-sm">
                <thead>
                  <tr className="border-b border-line-strong text-left">
                    {['번호', '대상자 코드', '이름', '연락처', '이송 등급', '특이사항', '확인'].map((h) => <th key={h} className="py-2 pr-3 type-caption text-text-sec">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {g.persons.map((p, i) => (
                    <tr key={p.code} className="border-b border-line-sub">
                      <td className="py-2 pr-3 tabular-nums">{i + 1}</td>
                      <td className="py-2 pr-3 tabular-nums">{p.code}</td>
                      <td className="py-2 pr-3 w-24" />
                      <td className="py-2 pr-3 w-28" />
                      <td className="py-2 pr-3 type-strong">{gradeOf(p.grade)?.label}</td>
                      <td className="py-2 pr-3">{p.tags.map((t) => TAGS[t]).join(', ')}</td>
                      <td className="py-2 pr-3 w-10"><span className="inline-block h-4 w-4 border border-text-sec" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>
    </div>
  )
}

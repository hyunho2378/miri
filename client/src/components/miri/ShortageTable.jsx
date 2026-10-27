// 마을별 부족분 표와 히트맵(마을 × 등급). TableCard 를 직접 반환한다(감싸는 Card 금지).
// 부족분 내림차순 기본. 히트맵 셀마다 숫자를 함께 적는다(색만으로 전달 금지).
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { GRADES } from '../../lib/shortage.js'
import TableCard from '../dashboard/TableCard.jsx'
import SegmentControl from '../ui/SegmentControl.jsx'
import { byGradeLine } from './ShortageValue.jsx'
import { fmtElapsed } from '../../lib/geo.js'

const STEPS = ['bg-mute text-text-meta', 'bg-chart-heatDanger-1 text-text-pri', 'bg-chart-heatDanger-2 text-text-pri', 'bg-chart-heatDanger-3 text-text-pri', 'bg-chart-heatDanger-4 text-text-inverse']

export default function ShortageTable({ title = '마을별 부족분', basis, headingLevel = 2, villages, dongs, byVillage, arrivals, t0, initialView = 'table', pageSize = 20, className, tone, compact = false }) {
  const [view, setView] = useState(initialView)
  const dongName = (c) => dongs.find((d) => d.code === c)?.name || c
  // 회신 R27(최충익): 산불 위험(도달 시각)과 대피 취약성(침상과 휠체어 인원)을 따로 본다
  const hours = (code) => (arrivals && t0 != null && arrivals[code] != null ? (arrivals[code] - t0) / 3600000 : null)
  const rows = useMemo(() => villages.map((v) => ({ ...v, ...byVillage[v.code], arrivalH: hours(v.code), vulnerable: (byVillage[v.code]?.targets?.bed || 0) + (byVillage[v.code]?.targets?.wheelchair || 0) }))
    .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code)), [villages, byVillage, arrivals, t0]) // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...rows.flatMap((r) => GRADES.map((g) => r.shortage[g.key])))
  const level = (x) => (x <= 0 ? 0 : Math.min(4, Math.ceil((x / max) * 4)))

  const columns = compact ? [
    { key: 'label', label: '마을', sortable: true, render: (r) => <span className="type-strong">{r.label}</span> },
    ...(arrivals ? [{ key: 'arrivalH', label: '산불 도달', align: 'right', sortable: true, render: (r) => (r.arrivalH == null ? '-' : <span className="whitespace-nowrap">발령 후 {fmtElapsed(r.arrivalH)}</span>) }] : []),
    { key: 'targetTotal', label: '대상자', align: 'right', sortable: true, render: (r) => `${r.targetTotal}명` },
    { key: 'total', label: '이동 불가 인원', align: 'right', sortable: true, render: (r) => (r.total ? <span className="type-strong text-danger-text tabular-nums">{r.total}명</span> : <span className="text-text-meta">없음</span>) }
  ] : [
    { key: 'label', label: '마을', sortable: true, render: (r) => <span className="type-strong">{r.label}</span> },
    { key: 'dong', label: '행정동', hideBelow: 'lg', render: (r) => dongName(r.dongCode) },
    { key: 'roundTripMin', label: '왕복 시간', align: 'right', sortable: true, hideBelow: 'md', render: (r) => (r.roundTripMin == null ? '대피소 없음' : `${r.roundTripMin}분`) },
    ...(arrivals ? [{ key: 'arrivalH', label: '산불 도달(위험)', align: 'right', sortable: true, hideBelow: 'md', render: (r) => (r.arrivalH == null ? '-' : <span className="whitespace-nowrap">발령 후 {fmtElapsed(r.arrivalH)}</span>) }] : []),
    { key: 'targetTotal', label: '대상자', align: 'right', sortable: true, render: (r) => `${r.targetTotal}명` },
    ...(arrivals ? [{ key: 'vulnerable', label: '이동 취약(침상과 휠체어)', align: 'right', sortable: true, hideBelow: 'lg', render: (r) => `${r.vulnerable}명` }] : []),
    { key: 'targets', label: '등급별 대상자', hideBelow: 'lg', render: (r) => <span className="type-meta text-text-meta">{byGradeLine(r.targets)}</span> },
    {
      key: 'total', label: '부족분', align: 'right', sortable: true,
      render: (r) => (r.total ? <span className="type-strong text-danger-text tabular-nums">부족 {r.total}명</span> : <span className="text-text-meta">부족 없음</span>)
    }
  ]

  const shortVillages = rows.filter((r) => r.total > 0).length
  const toggle = <SegmentControl label="보기 전환" value={view} onChange={setView} items={[{ value: 'table', label: '표' }, { value: 'heat', label: '색 표' }]} />

  if (view === 'table') {
    return (
      <TableCard
        title={title} headingLevel={headingLevel} className={className} tone={tone}
        count={shortVillages ? `부족 ${shortVillages}곳` : '부족 없음'} desc={basis} actions={toggle}
        columns={columns} rows={rows} rowKey={(r) => r.code} pageSize={pageSize} caption={title}
      />
    )
  }

  return (
    <TableCard
      title={title} headingLevel={headingLevel} className={className} tone={tone}
      count={shortVillages ? `부족 ${shortVillages}곳` : '부족 없음'} desc={basis} actions={toggle}
    >
      <div className="px-4 pb-4 lg:px-5 lg:pb-5">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 tabular-nums" aria-label="마을별 등급별 부족분 히트맵">
            <thead>
              <tr>
                <th scope="col" className="text-left type-caption text-text-meta pr-2">마을</th>
                {GRADES.map((g) => <th key={g.key} scope="col" className="type-caption text-text-meta">{g.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <th scope="row" className="text-left type-meta text-text-sec pr-2 whitespace-nowrap">{r.label}</th>
                  {GRADES.map((g) => {
                    const x = r.shortage[g.key]
                    return (
                      <td key={g.key} className={clsx('h-9 min-w-12 rounded-xs text-center type-caption', STEPS[level(x)])}>
                        {x || ''}<span className="sr-only">{x ? `${g.label} 부족 ${x}명` : `${g.label} 부족 없음`}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2" aria-hidden="true">
          <span className="type-meta text-text-meta">0</span>
          {STEPS.map((st) => <span key={st} className={clsx('h-3 w-6 rounded-xs', st.split(' ')[0])} />)}
          <span className="type-meta text-text-meta tabular-nums">{max}명</span>
        </div>
      </div>
    </TableCard>
  )
}

// 이송 기록(IA 4.8). 발령별 결과 목록과 마을별 미이송 추이.
import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import BarChart from '../../components/dashboard/BarChart.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { MIN, fmtDateTime, fmtHM, minutesText } from '../../lib/time.js'
import useMiriStore from '../../store/useMiriStore.js'

const SERIES = [
  { fill: 'fill-chart-1', dot: 'bg-chart-1' },
  { fill: 'fill-chart-2', dot: 'bg-chart-2' },
  { fill: 'fill-chart-3', dot: 'bg-chart-3' }
]

export function recordTotals(rec) {
  const rows = Object.values(rec.byVillage || {})
  const total = rows.reduce((s, r) => s + r.total, 0)
  const done = rows.reduce((s, r) => s + r.done, 0)
  const fire = rows.reduce((s, r) => s + r.fire, 0)
  return { total, done, fire, open: total - done - fire }
}

export default function RecordsPage() {
  const records = useMiriStore((s) => s.records)
  const villages = useMiriStore((s) => s.villages)
  const navigate = useNavigate()

  const rows = records.map((r) => ({ ...r, ...recordTotals(r), minutes: (r.closedAt - r.startedAt) / MIN }))
  const columns = [
    { key: 'startedAt', label: '일시', render: (r) => <span className="tabular-nums">{fmtDateTime(r.startedAt)}</span>, sortable: true },
    { key: 'kind', label: '종류', render: (r) => <StatusPill status={r.kind === 'drill' ? 'closed' : 'standby'} label={r.kind === 'drill' ? '훈련' : '실제'} /> },
    { key: 'total', label: '대상자', render: (r) => `${r.total}명`, align: 'right', sortable: true },
    { key: 'done', label: '인계 완료', render: (r) => `${r.done}명`, align: 'right', sortable: true },
    { key: 'fire', label: '소방 인계', render: (r) => `${r.fire}명`, align: 'right', hideBelow: 'md' },
    { key: 'open', label: '미완료', render: (r) => <span className={r.open ? 'text-danger-text' : ''}>{r.open}명</span>, align: 'right', sortable: true },
    { key: 'minutes', label: '소요 시간', render: (r) => minutesText(r.minutes), align: 'right', hideBelow: 'lg' }
  ]

  // 최근 3건, 미완료와 소방 인계 합이 큰 마을 8곳
  const chart = useMemo(() => {
    if (records.length < 2) return null
    const recent = records.slice(0, 3).reverse()
    const label = Object.fromEntries(villages.map((v) => [v.code, v.label]))
    const score = {}
    for (const r of recent) for (const [code, v] of Object.entries(r.byVillage)) score[code] = (score[code] || 0) + (v.total - v.done)
    const top = Object.entries(score).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c)
    if (!top.length) return []
    return top.map((code) => ({
      label: (label[code] || code).replace(' 가상마을 ', ' '),
      bars: recent.map((r, i) => ({
        key: r.id, name: `${fmtDateTime(r.startedAt)}`, value: (r.byVillage[code]?.total || 0) - (r.byVillage[code]?.done || 0),
        ...SERIES[recent.length - 1 - i]
      }))
    }))
  }, [records, villages])

  return (
    <PageShell title="이송 기록" intro="발령마다 쌓이는 결과. 마을별 미이송 추이를 차량 협약 규모 산정 근거로 사용">
      {!records.length ? (
        <Card as="div" padding="none">
          <EmptyState
            title="이송 기록 없음"
            desc="발령 종료 시 결과가 자동 저장됨. 훈련 발령으로 기록 생성 가능"
            action={<Button as={Link} to="/console/dispatch">발령 운영</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns} rows={rows} rowKey={(r) => r.id} pageSize={20} caption="이송 기록"
            onRowClick={(r) => navigate(`/console/records/${r.id}`)}
          />
          <Card title="마을별 미이송 추이" desc="최근 발령 3건. 미완료와 소방 인계 합계">
            {chart === null && <p className="type-body-sm text-text-meta">기록 2건 이상부터 추이 표시. 현재 {records.length}건</p>}
            {Array.isArray(chart) && !chart.length && <p className="type-body-sm text-text-meta">최근 발령 모두 전원 인계 완료</p>}
            {Array.isArray(chart) && chart.length > 0 && <BarChart groups={chart} height={260} ariaLabel="마을별 미이송 추이 막대 차트" />}
          </Card>
          <p className="type-meta text-text-meta tabular-nums">마지막 기록 종료 {fmtHM(records[0].closedAt)}</p>
        </div>
      )}
    </PageShell>
  )
}

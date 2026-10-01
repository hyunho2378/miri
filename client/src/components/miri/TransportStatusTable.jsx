// 발령 운영 실시간 현황표. 실패와 미이송 행을 위로 정렬해 넘긴다(호출부 책임).
import DataTable from '../dashboard/DataTable.jsx'
import StatusPill from '../dashboard/StatusPill.jsx'
import GradeChip from './GradeChip.jsx'

export default function TransportStatusTable({ rows, caption = '대상자별 이송 단계', pageSize = 20 }) {
  const columns = [
    { key: 'code', label: '대상자', render: (r) => <span className="tabular-nums">{r.code}</span>, sortable: true },
    { key: 'village', label: '마을', sortable: true },
    { key: 'grade', label: '등급', render: (r) => <GradeChip grade={r.grade} size="sm" /> },
    { key: 'vehicle', label: '차량', render: (r) => <span className="tabular-nums">{r.vehicle || '-'}</span>, hideBelow: 'lg' },
    { key: 'helpers', label: '도우미', render: (r) => <span className="tabular-nums">{r.helpers || '-'}</span>, hideBelow: 'lg' },
    { key: 'step', label: '단계', render: (r) => <StatusPill status={r.step} /> },
    { key: 'note', label: '최근 보고', render: (r) => <span className="type-meta text-text-meta tabular-nums">{r.note}</span>, hideBelow: 'md' }
  ]
  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(r) => r.code} pageSize={pageSize} caption={caption}
      emptyTitle="표시할 대상자 없음" emptyDesc="필터를 바꾸거나 배정 확정 후 전송"
    />
  )
}

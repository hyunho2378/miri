// 발령 운영 실시간 현황표. TableCard 를 직접 반환한다. 실패와 미이송 행을 위로 정렬해 넘긴다(호출부 책임).
import TableCard from '../dashboard/TableCard.jsx'
import StatusPill from '../dashboard/StatusPill.jsx'
import GradeChip from './GradeChip.jsx'

export default function TransportStatusTable({
  rows, title = '대상자별 이송 현황', count, actions, filters, headingLevel = 2, caption = '대상자별 이송 단계', pageSize = 20, className
}) {
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
    <TableCard
      title={title} count={count ?? `${rows.length}명`} actions={actions} filters={filters} headingLevel={headingLevel} className={className}
      columns={columns} rows={rows} rowKey={(r) => r.code} pageSize={pageSize} caption={caption}
      emptyTitle="표시할 대상자가 없습니다" emptyDesc="필터 조건을 바꿔 주십시오."
    />
  )
}

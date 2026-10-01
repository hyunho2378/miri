// 이송 기록 상세. 마을별 결과, 단계별 카운트, 규칙 순서 대비 지표, 차량 협약 규모 근거.
import { ArrowLeft, Printer, Route } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import MetricCard from '../../components/miri/MetricCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ExportButton from '../../components/ui/ExportButton.jsx'
import { STEP_LABEL } from '../../lib/dispatchSim.js'
import { MIN, fmtDateTime, fmtHM, minutesText } from '../../lib/time.js'
import useMiriStore from '../../store/useMiriStore.js'
import { recordTotals } from './RecordsPage.jsx'

const COUNT_KEYS = ['handover', 'handedToFire', 'fail', 'unassigned', 'wait', 'depart', 'arrive', 'board']
const COUNT_LABEL = { ...STEP_LABEL, unassigned: '미배정' }

export default function RecordDetailPage() {
  const { id } = useParams()
  const rec = useMiriStore((s) => s.records.find((r) => r.id === id))
  const villages = useMiriStore((s) => s.villages)
  const orgName = useMiriStore((s) => s.settings.orgName)

  if (!rec) {
    return (
      <PageShell title="이송 기록 상세">
        <Card as="div" padding="none">
          <EmptyState title="기록을 찾을 수 없음" desc="가상 데이터는 새로고침 시 초기화됨" action={<Button as={Link} to="/console/records">이송 기록 목록</Button>} />
        </Card>
      </PageShell>
    )
  }

  const t = recordTotals(rec)
  const rows = villages
    .filter((v) => rec.byVillage[v.code])
    .map((v) => {
      const r = rec.byVillage[v.code]
      return { code: v.code, label: v.label, ...r, open: r.total - r.done - r.fire }
    })
    .sort((a, b) => (b.open + b.fire) - (a.open + a.fire) || a.code.localeCompare(b.code))
  const columns = [
    { key: 'label', label: '마을', sortable: true },
    { key: 'total', label: '대상자', render: (r) => `${r.total}명`, align: 'right', sortable: true },
    { key: 'done', label: '인계 완료', render: (r) => `${r.done}명`, align: 'right', sortable: true },
    { key: 'fire', label: '소방 인계', render: (r) => `${r.fire}명`, align: 'right', sortable: true },
    { key: 'open', label: '미완료', render: (r) => <span className={r.open ? 'type-strong text-danger-text' : ''}>{r.open}명</span>, align: 'right', sortable: true }
  ]
  const csvCols = [
    { key: 'code', label: '마을 코드' }, { key: 'label', label: '마을' }, { key: 'total', label: '대상자' },
    { key: 'done', label: '인계 완료' }, { key: 'fire', label: '소방 인계' }, { key: 'open', label: '미완료' }
  ]
  const short = rows.filter((r) => r.open + r.fire > 0)
  const m = rec.metrics
  const b = rec.baseline

  return (
    <PageShell title="이송 기록 상세">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/console/records" className="inline-flex min-h-11 md:min-h-0 items-center gap-1 type-body-sm text-text-sec hover:text-text-pri">
          <ArrowLeft size={16} aria-hidden="true" />이송 기록
        </Link>
        <div className="flex flex-wrap gap-2">
          <ExportButton columns={csvCols} rows={rows} filename={`${orgName}_이송기록_${fmtDateTime(rec.startedAt).replace(/[ .:]/g, '')}`} />
          <Button variant="secondary" leftIcon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>협약 규모 근거 인쇄</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={rec.kind === 'drill' ? 'closed' : 'standby'} label={rec.kind === 'drill' ? '훈련 발령' : '실제 발령'} />
        <span className="type-body-sm text-text-sec tabular-nums">{fmtDateTime(rec.startedAt)} 개시 {fmtHM(rec.closedAt)} 종료 소요 {minutesText((rec.closedAt - rec.startedAt) / MIN)}</span>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard label="대상자" value={t.total} unit="명" />
          <MetricCard label="인계 완료" value={t.done} unit="명" />
          <MetricCard label="소방 인계" value={t.fire} unit="명" tone={t.fire ? 'danger' : 'neutral'} />
          <MetricCard label="미완료" value={t.open} unit="명" tone={t.open ? 'danger' : 'neutral'} sub="종료 시점 이송 중 또는 실패" />
        </div>

        <Card title="종료 시점 단계별 인원">
          <ul className="flex flex-wrap gap-2">
            {COUNT_KEYS.filter((k) => rec.counts?.[k]).map((k) => (
              <li key={k} className="inline-flex items-center gap-2">
                <StatusPill status={k} label={`${COUNT_LABEL[k]} ${rec.counts[k]}명`} />
              </li>
            ))}
          </ul>
          <p className="mt-3 type-meta text-text-meta tabular-nums">도우미 {rec.helpers}명 참여. 소방 전달 {rec.handovers?.length || 0}회</p>
        </Card>

        {m && b && (
          <Card
            eyebrow={<span className="inline-flex items-center gap-1 text-primary-text"><Route size={14} aria-hidden="true" />AI 배정</span>}
            title="규칙 순서 대비 배정 지표"
            desc="발령 당시 배정 계산 결과. 제약 조건 최적화와 원문 배정 규칙 비교"
          >
            <dl className="grid gap-2 sm:grid-cols-3 tabular-nums">
              <div className="rounded-md bg-subtle p-3"><dt className="type-caption text-text-sec">미이송 예상</dt><dd className="mt-1 type-strong text-text-pri">규칙 순서 {b.unserved}명 → AI 배정 {m.unserved}명</dd></div>
              <div className="rounded-md bg-subtle p-3"><dt className="type-caption text-text-sec">등급 가중 미이송</dt><dd className="mt-1 type-strong text-text-pri">{b.weightedUnserved}점 → {m.weightedUnserved}점</dd></div>
              <div className="rounded-md bg-subtle p-3"><dt className="type-caption text-text-sec">마지막 이송 완료</dt><dd className="mt-1 type-strong text-text-pri">{fmtHM(b.lastFinishAt)} → {fmtHM(m.lastFinishAt)}</dd></div>
            </dl>
          </Card>
        )}

        <Card title="마을별 결과" desc="미완료와 소방 인계가 많은 마을 순">
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.code} pageSize={20} caption="마을별 이송 결과" />
        </Card>

        <Card title="차량 협약 규모 산정 근거" desc="이번 발령에서 기한 안에 옮기지 못한 마을. 부족분 계산 화면에서 추가 협약 차량 시나리오로 확인">
          {short.length ? (
            <ul className="divide-y divide-line-sub">
              {short.map((r) => (
                <li key={r.code} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="type-body-sm text-text-pri">{r.label}</span>
                  <span className="type-strong text-danger-text tabular-nums">미이송 {r.open + r.fire}명</span>
                </li>
              ))}
            </ul>
          ) : <p className="type-body-sm text-text-meta">전 마을 기한 내 인계 완료. 현 협약 규모로 충분</p>}
          <Link to="/console/shortage" className="mt-3 inline-flex min-h-11 md:min-h-0 items-center type-body-sm text-primary-text underline underline-offset-2">부족분 계산</Link>
        </Card>
      </div>
    </PageShell>
  )
}

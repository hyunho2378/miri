// 시설 관리. 사업계획서 별첨 시설 관리 화면 구조 그대로.
// 오늘 상담 건수와 요약 지표는 상담 로그를 집계해 만든다. 없는 수치를 지어내지 않는다.
import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import { formatDate, formatNumber } from '../../lib/format.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import FacilityAdminCard from '../../components/facility/FacilityAdminCard.jsx'

function Summary({ label, value, unit }) {
  return (
    <div className="bg-page rounded-lg shadow-card p-4 lg:p-5">
      <p className="type-caption text-text-meta">{label}</p>
      <p className="mt-2 type-kpi text-text-pri">
        {value}{unit && <span className="ml-1 type-h3 text-text-meta">{unit}</span>}
      </p>
    </div>
  )
}

export default function FacilitiesAdminPage() {
  const { t } = useLang()
  const [facilities, setFacilities] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [logs, setLogs] = useState([])

  useTopbar({ title: t('admin.facilities.title') })

  useEffect(() => {
    let alive = true
    Promise.all([get('/api/admin/facilities'), get('/api/admin/logs?page=1&pageSize=1000')])
      .then(([f, l]) => { if (!alive) return; setFacilities(f); setLogs(l.rows || []) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [reload])

  const today = new Date().toISOString().slice(0, 10)
  const todayChats = useMemo(() => logs.reduce((acc, r) => {
    if (!r.at.startsWith(today)) return acc
    acc[r.facilityId] = (acc[r.facilityId] || 0) + 1
    return acc
  }, {}), [logs, today])

  const list = facilities || []
  const active = list.filter((f) => f.status === 'normal').length
  const todayTotal = Object.values(todayChats).reduce((s, n) => s + n, 0)
  const reservable = list.length ? Math.round((list.filter((f) => f.reservation !== 'full').length / list.length) * 100) : 0
  const issues = list.filter((f) => f.status !== 'normal').length

  // 최근 운영 로그. 상담 로그에서 최신 순으로 만든다
  const opsLogs = useMemo(() => [...logs]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 40)
    .map((r) => ({ ...r, facilityLabel: list.find((f) => f.id === r.facilityId)?.name || r.facilityId })),
  [logs, list])

  const logColumns = [
    { key: 'at', label: t('admin.logs.colTime'), sortable: true, width: 150, render: (r) => formatDate(r.at, 'datetime') },
    { key: 'facilityLabel', label: t('common.meta.facility'), sortable: true, width: 180 },
    { key: 'question', label: t('admin.facilities.colEvent'), render: (r) => <span className="line-clamp-1">{r.question}</span> },
    { key: 'result', label: t('admin.facilities.colAiStatus'), width: 120, render: (r) => <StatusPill size="sm" status={r.result} label={t(`common.status.${r.result}`)} /> }
  ]

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6">
        <EmptyState tone="error" onRetry={() => { setFacilities(null); setFailed(false); setReload((n) => n + 1) }} />
      </div>
    )
  }
  if (facilities === null) {
    return (
      <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="card" />)}</div>
        <Skeleton variant="card" className="h-64" />
      </div>
    )
  }

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Summary label={t('admin.facilities.summaryActive')} value={formatNumber(active)} />
        <Summary label={t('admin.facilities.summaryToday')} value={formatNumber(todayTotal)} unit={t('common.meta.count')} />
        <Summary label={t('admin.facilities.summaryReservable')} value={formatNumber(reservable)} unit={t('admin.unit.percent')} />
        <Summary label={t('admin.facilities.summaryIssue')} value={formatNumber(issues)} unit={t('common.meta.count')} />
      </div>

      <div className="flex justify-end">
        <Button as={Link} to="/admin/facilities/new" size="md" leftIcon={<Plus size={16} aria-hidden="true" />}>
          {t('admin.facilities.new')}
        </Button>
      </div>

      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {list.map((f) => (
          <li key={f.id}><FacilityAdminCard facility={f} todayChats={todayChats[f.id] || 0} /></li>
        ))}
      </ul>

      <section>
        <h2 className="type-h3 text-text-pri">{t('admin.facilities.recentLog')}</h2>
        <div className="mt-3">
          <DataTable columns={logColumns} rows={opsLogs} pageSize={10} caption={t('admin.facilities.recentLog')} />
        </div>
      </section>
    </div>
  )
}

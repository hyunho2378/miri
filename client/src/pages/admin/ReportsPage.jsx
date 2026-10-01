// 운영 컨설팅 리포트. 계획서 4-1 ② 를 3-1 수익모델의 데이터 분석 리포트 화면으로 만든다.
// 표는 1단계 DataTable 을 그대로 쓰고 상세는 드로어다. 드로어 열림 상태는 쿼리 ?id= 다(ROUTES.md).
import { useEffect, useMemo, useState } from 'react'
import { Download, FilePlus2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { formatDate } from '../../lib/format.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Select from '../../components/ui/Select.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import PatternCard from '../../components/insight/PatternCard.jsx'

// 5단계 mock. 백엔드가 붙으면 get('/api/admin/reports') 로 바뀐다
const load = () => Promise.all([
  import('../../mock/reports.json').then((m) => m.default),
  import('../../mock/patterns.json').then((m) => m.default)
])

const PERIODS = ['2026-09', '2026-08', '2026-07', '2026-Q2']

export default function ReportsPage() {
  const { t } = useLang()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState(null)
  const [patterns, setPatterns] = useState([])
  const [creating, setCreating] = useState(false)
  const [period, setPeriod] = useState(PERIODS[0])

  useTopbar({ title: t('admin.reports.title') })

  useEffect(() => {
    let alive = true
    load().then(([reps, pats]) => {
      if (!alive) return
      setRows(reps)
      setPatterns(pats)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const openId = params.get('id')
  const open = useMemo(() => (rows || []).find((r) => r.id === openId) || null, [rows, openId])
  const patternById = useMemo(() => Object.fromEntries(patterns.map((p) => [p.id, p])), [patterns])

  const setOpen = (id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('id', id)
    else next.delete('id')
    setParams(next)
  }

  const create = () => {
    const id = `rep-${period.toLowerCase()}`
    setRows((prev) => {
      if (prev.some((r) => r.id === id)) return prev
      return [{
        id, periodKey: period.includes('Q') ? 'quarter' : 'month', period,
        from: '', to: '', status: 'draft', createdAt: new Date().toISOString().slice(0, 10),
        patternIds: patterns.slice(0, 2).map((p) => p.id),
        stats: { total: 0, auto: 0, handoff: 0, unresolved: 0, autoRate: 0 },
        nextActionKeys: ['collect']
      }, ...prev]
    })
    setCreating(false)
    toast(t('admin.reports.createDone', { period }), 'primary')
  }

  const columns = [
    {
      key: 'period', label: t('admin.reports.colTitle'), sortable: true,
      render: (r) => t('admin.reports.reportTitle', { period: r.period })
    },
    { key: 'from', label: t('admin.reports.colPeriod'), hideBelow: 'lg', width: 200, render: (r) => (r.from ? `${r.from} ~ ${r.to}` : '') },
    {
      key: 'patternIds', label: t('admin.reports.colPatterns'), width: 110, hideBelow: 'md',
      sortable: true, sortValue: (r) => r.patternIds.length,
      render: (r) => <span className="tabular-nums">{t('admin.reports.patternCount', { n: r.patternIds.length })}</span>
    },
    {
      key: 'status', label: t('admin.reports.colStatus'), width: 110,
      render: (r) => (
        <StatusPill
          size="sm" status={r.status === 'draft' ? 'pending' : 'indexed'}
          label={t(r.status === 'draft' ? 'admin.reports.statusDraft' : 'admin.reports.statusPublished')}
        />
      )
    },
    { key: 'createdAt', label: t('admin.reports.colCreated'), sortable: true, width: 130, hideBelow: 'md', render: (r) => formatDate(r.createdAt) }
  ]

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-body text-text-pri">{t('admin.reports.headline')}</p>
          <p className="mt-1 type-meta text-text-meta">{t('admin.reports.revenue')}</p>
        </div>
        <Button size="md" leftIcon={<FilePlus2 size={16} aria-hidden="true" />} onClick={() => setCreating(true)}>
          {t('admin.reports.create')}
        </Button>
      </div>

      {rows === null
        ? <Skeleton variant="card" className="h-64" />
        : (
          <DataTable
            columns={columns} rows={rows} onRowClick={(r) => setOpen(r.id)}
            caption={t('admin.reports.title')}
            emptyTitle={t('admin.reports.empty')} emptyDesc={t('admin.reports.emptyDesc')}
          />
        )}

      <Modal
        open={creating} onClose={() => setCreating(false)} title={t('admin.reports.create')}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>{t('common.action.cancel')}</Button>
            <Button onClick={create}>{t('admin.reports.create')}</Button>
          </>
        )}
      >
        <Select
          label={t('admin.reports.createPeriod')} value={period} onChange={setPeriod}
          options={PERIODS.map((p) => ({ value: p, label: p }))}
        />
      </Modal>

      <Drawer
        open={!!open} onClose={() => setOpen(null)}
        title={open ? t('admin.reports.reportTitle', { period: open.period }) : ''}
        footer={(
          <Button variant="secondary" leftIcon={<Download size={16} aria-hidden="true" />} onClick={() => toast(t('admin.reports.download'), 'neutral')}>
            {t('admin.reports.download')}
          </Button>
        )}
      >
        {open && (
          <div className="space-y-6">
            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.reports.summaryTitle')}</h3>
              <p className="mt-2 type-body-sm text-text-sec tabular-nums">
                {t('admin.reports.summary', {
                  period: open.period, total: open.stats.total,
                  patterns: open.patternIds.length, autoRate: open.stats.autoRate
                })}
              </p>
            </section>

            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.reports.statsTitle')}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {[
                  ['statTotal', open.stats.total, ''],
                  ['statAuto', open.stats.auto, ''],
                  ['statHandoff', open.stats.handoff, ''],
                  ['statUnresolved', open.stats.unresolved, ''],
                  ['statAutoRate', open.stats.autoRate, t('admin.unit.percent')]
                ].map(([key, value, unit]) => (
                  <div key={key} className="rounded-md bg-subtle p-3">
                    <dt className="type-caption text-text-meta">{t(`admin.reports.${key}`)}</dt>
                    <dd className="mt-1 type-h3 text-text-pri tabular-nums">{value}{unit}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.reports.patternTitle')}</h3>
              <div className="mt-3 space-y-3">
                {open.patternIds.map((id) => (patternById[id]
                  ? <PatternCard key={id} pattern={patternById[id]} />
                  : null))}
              </div>
            </section>

            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.reports.nextTitle')}</h3>
              <ul className="mt-3 space-y-2">
                {open.nextActionKeys.map((k) => (
                  <li key={k} className="flex gap-2 type-body-sm text-text-sec">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {t(`admin.reports.action${k[0].toUpperCase()}${k.slice(1)}`)}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  )
}

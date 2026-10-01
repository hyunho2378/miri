// 분석. 탭 4개가 사업계획서 4대 가설과 1:1 이다(IA.md).
// 시설별 시간대별은 kpi.json, 언어별 질문유형별은 상담 로그를 집계해 만든다. 없는 수치를 지어내지 않는다.
import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import { formatNumber } from '../../lib/format.js'
import useAdminUi, { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import BarChart from '../../components/dashboard/BarChart.jsx'
import DateRangeTabs from '../../components/dashboard/DateRangeTabs.jsx'
import Heatmap from '../../components/dashboard/Heatmap.jsx'
import Reloading from '../../components/dashboard/Reloading.jsx'
import TrendChart from '../../components/dashboard/TrendChart.jsx'

const TABS = ['auto', 'nps', 'handoff', 'accuracy']
const TAB_KEY = {
  auto: 'admin.analytics.tabAuto', nps: 'admin.analytics.tabNps',
  handoff: 'admin.analytics.tabHandoff', accuracy: 'admin.analytics.tabAccuracy'
}

function AnalyticsActions() {
  return <DateRangeTabs className="hidden sm:flex" />
}

// 표 데이터를 CSV 로 만들어 내려받는다. 백엔드 export 가 붙으면 그 주소로 바꾼다
function downloadCsv(name, header, rows) {
  const escape = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
  const body = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function Panel({ title, busy, children, className }) {
  return (
    <section className={`min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5 ${className || ''}`}>
      <h2 className="type-h3 text-text-pri">{title}</h2>
      <Reloading busy={busy} className="mt-4">{children}</Reloading>
    </section>
  )
}

function CountTable({ caption, labelHead, rows }) {
  const { t } = useLang()
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  if (!rows.length) return <p className="type-body-sm text-text-meta">{t('admin.dashboard.noData')}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-subtle">
            <th className="px-3 py-2 type-caption font-semibold text-text-meta">{labelHead}</th>
            <th className="px-3 py-2 type-caption font-semibold text-text-meta text-right">{t('common.meta.count')}</th>
            <th className="px-3 py-2 type-caption font-semibold text-text-meta text-right">{t('admin.dashboard.share')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line-sub">
              <td className="px-3 py-2 type-body-sm text-text-pri">{r.label}</td>
              <td className="px-3 py-2 type-body-sm text-text-pri text-right">{formatNumber(r.value)}</td>
              <td className="px-3 py-2 type-body-sm text-text-sec text-right">{((r.value / total) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AnalyticsPage() {
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'auto'
  const range = useAdminUi((s) => s.range)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(true)
  const [logs, setLogs] = useState([])
  const [facilities, setFacilities] = useState({})

  useTopbar({ title: t('admin.analytics.title'), actions: <AnalyticsActions /> })

  // 탭이나 기간을 바꿔도 이전 데이터를 버리지 않는다. 차트와 표만 흐려 두고 값이 오면 교체한다(7단계)
  useEffect(() => {
    let alive = true
    setBusy(true)
    Promise.all([
      get(`/api/admin/analytics/${tab}?range=${range}`),
      get('/api/admin/logs?page=1&pageSize=1000'),
      get('/api/admin/facilities')
    ])
      .then(([d, l, f]) => {
        if (!alive) return
        setData(d)
        setLogs(l.rows || [])
        setFacilities(Object.fromEntries(f.map((x) => [x.id, x.name])))
        setBusy(false)
      })
      .catch(() => { if (alive) setBusy(false) })
    return () => { alive = false }
  }, [tab, range])

  const setTab = (next) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p)
  }

  const series = useMemo(() => (data ? [
    { key: 'auto', name: t('common.status.auto'), points: data.trend.auto, stroke: 'stroke-chart-1', fill: 'fill-chart-1', dot: 'bg-chart-1' },
    { key: 'handoff', name: t('common.status.handoff'), points: data.trend.handoff, stroke: 'stroke-chart-2', fill: 'fill-chart-2', dot: 'bg-chart-2' },
    { key: 'unresolved', name: t('common.status.unresolved'), points: data.trend.unresolved, stroke: 'stroke-danger', fill: 'fill-danger', dot: 'bg-danger', dash: '6 4' }
  ] : []), [data, t])

  const count = (key, label) => Object.entries(
    logs.reduce((acc, r) => { acc[r[key]] = (acc[r[key]] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: label(k), value: v }))

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton variant="card" className="h-64" />
      </div>
    )
  }

  const byFacility = (data.breakdown.byFacility || []).map((s) => ({
    label: facilities[s.facilityId] || s.facilityId, value: s.count
  }))
  const byLang = count('lang', (k) => t(`common.lang.${k}`))
  const byType = count('topic', (k) => t(`admin.topic.${k}`))
  const trendRows = data.trend.labels.map((l, i) => [
    l, data.trend.auto[i], data.trend.handoff[i], data.trend.unresolved[i],
    data.trend.auto[i] + data.trend.handoff[i] + data.trend.unresolved[i]
  ])

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <DateRangeTabs className="sm:hidden" />
      <Tabs items={TABS.map((v) => ({ value: v, label: t(TAB_KEY[v]) }))} value={tab} onChange={setTab} />

      <Panel busy={busy} title={`${t(TAB_KEY[tab])} ${t('admin.analytics.trendTitle')}`}>
        <TrendChart
          labels={data.trend.labels} series={series} height={280}
          ariaLabel={`${t(TAB_KEY[tab])} ${t('admin.analytics.trendTitle')}`}
        />
      </Panel>

      {tab === 'auto' && (
        <Panel busy={busy} title={t('admin.analytics.heatmap')}>
          <Heatmap matrix={data.breakdown.byHour} ariaLabel={t('admin.analytics.heatmap')} />
        </Panel>
      )}

      {tab === 'nps' && data.npsBeforeAfter && (
        <Panel busy={busy} title={t('admin.analytics.beforeAfter')}>
          <BarChart
            height={260} ariaLabel={t('admin.analytics.beforeAfter')}
            groups={[
              {
                label: data.npsBeforeAfter.before.period,
                bars: [{ key: 'before', name: t('admin.dashboard.nps'), value: data.npsBeforeAfter.before.nps, fill: 'fill-chart-2', dot: 'bg-chart-2' }]
              },
              {
                label: data.npsBeforeAfter.after.period,
                bars: [{ key: 'after', name: t('admin.dashboard.nps'), value: data.npsBeforeAfter.after.nps, fill: 'fill-chart-1', dot: 'bg-chart-1' }]
              }
            ]}
          />
          <p className="mt-3 type-meta text-text-meta tabular-nums">
            {t('admin.analytics.respondents')} {formatNumber(data.npsBeforeAfter.before.n)} / {formatNumber(data.npsBeforeAfter.after.n)}
          </p>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel busy={busy} title={t('admin.analytics.byFacility')}>
          <CountTable caption={t('admin.analytics.byFacility')} labelHead={t('common.meta.facility')} rows={byFacility} />
        </Panel>
        <Panel busy={busy} title={t('admin.analytics.byLang')}>
          <CountTable caption={t('admin.analytics.byLang')} labelHead={t('common.language')} rows={byLang} />
        </Panel>
        <Panel busy={busy} title={t('admin.analytics.byType')}>
          <CountTable caption={t('admin.analytics.byType')} labelHead={t('admin.analytics.byType')} rows={byType} />
        </Panel>
      </div>

      <section className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-h3 text-text-pri">{t('admin.analytics.dataTable')}</h2>
          <Button
            size="sm" variant="secondary" leftIcon={<Download size={16} aria-hidden="true" />}
            onClick={() => downloadCsv(
              `gchat-${tab}-${range}`,
              [t('admin.analytics.date'), t('common.status.auto'), t('common.status.handoff'), t('common.status.unresolved'), t('admin.analytics.sum')],
              trendRows
            )}
          >
            {t('admin.analytics.exportCsv')}
          </Button>
        </div>
        <Reloading busy={busy} className="mt-4 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr className="bg-subtle">
                {[t('admin.analytics.date'), t('common.status.auto'), t('common.status.handoff'), t('common.status.unresolved'), t('admin.analytics.sum')].map((h, i) => (
                  <th key={h} className={`px-3 py-2 type-caption font-semibold text-text-meta ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trendRows.map((r) => (
                <tr key={r[0]} className="border-t border-line-sub">
                  {r.map((c, i) => (
                    <td key={i} className={`px-3 py-2 type-body-sm ${i > 0 ? 'text-right text-text-sec' : 'text-text-pri'}`}>
                      {i === 0 ? c : formatNumber(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reloading>
      </section>
    </div>
  )
}

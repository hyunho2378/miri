// 대시보드. 사업계획서 4대 가설을 KPI 4장으로 그대로 세운다. 지표명을 바꾸지 않는다.
// H1 민원 자동처리율 / H2 이용자 만족도 NPS / H3 담당자 응대시간 / H4 응답 정확도
import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import useAdminUi, { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import DateRangeTabs from '../../components/dashboard/DateRangeTabs.jsx'
import DonutChart from '../../components/dashboard/DonutChart.jsx'
import KpiCard from '../../components/dashboard/KpiCard.jsx'
import RankList from '../../components/dashboard/RankList.jsx'
import Reloading from '../../components/dashboard/Reloading.jsx'
import ReviewQueueCard from '../../components/dashboard/ReviewQueueCard.jsx'
import TrendChart from '../../components/dashboard/TrendChart.jsx'

// Topbar 슬롯은 stale 될 수 있으므로 자기 상태를 스스로 읽는 컴포넌트만 넣는다
function DashboardActions() {
  const { t } = useLang()
  return (
    <>
      <DateRangeTabs className="hidden sm:flex" />
      <Button size="sm" variant="secondary" leftIcon={<Download size={16} aria-hidden="true" />}>
        <span className="hidden lg:inline">{t('admin.dashboard.report')}</span>
      </Button>
    </>
  )
}

export default function DashboardPage() {
  const { t } = useLang()
  const navigate = useNavigate()
  const range = useAdminUi((s) => s.range)
  const [kpi, setKpi] = useState(null)
  const [busy, setBusy] = useState(true)
  const [facilities, setFacilities] = useState({})

  useTopbar({ title: t('admin.dashboard.title'), actions: <DashboardActions /> })

  // 기간을 바꿔도 이전 데이터를 버리지 않는다. 버리면 트리가 통째로 언마운트돼 화면이 깜빡인다(7단계)
  useEffect(() => {
    let alive = true
    setBusy(true)
    Promise.all([get(`/api/admin/kpi?range=${range}`), get('/api/admin/facilities')])
      .then(([k, f]) => {
        if (!alive) return
        setKpi(k)
        setFacilities(Object.fromEntries(f.map((x) => [x.id, x.name])))
        setBusy(false)
      })
      .catch(() => { if (alive) setBusy(false) })
    return () => { alive = false }
  }, [range])

  const series = useMemo(() => (kpi ? [
    { key: 'auto', name: t('common.status.auto'), points: kpi.trend.auto, stroke: 'stroke-chart-1', fill: 'fill-chart-1', dot: 'bg-chart-1' },
    { key: 'handoff', name: t('common.status.handoff'), points: kpi.trend.handoff, stroke: 'stroke-chart-2', fill: 'fill-chart-2', dot: 'bg-chart-2' },
    { key: 'unresolved', name: t('common.status.unresolved'), points: kpi.trend.unresolved, stroke: 'stroke-danger', fill: 'fill-danger', dot: 'bg-danger', dash: '6 4' }
  ] : []), [kpi, t])

  if (!kpi) {
    return (
      <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="card" />)}
        </div>
        <Skeleton variant="card" className="h-64" />
      </div>
    )
  }

  const share = (kpi.facilityShare || []).map((s) => ({
    label: facilities[s.facilityId] || s.facilityId,
    value: s.count,
    status: s.status
  }))

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <DateRangeTabs className="sm:hidden" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          label={t('admin.dashboard.autoRate')} value={kpi.autoRate.value} decimals={1}
          unit={t('admin.unit.percent')} delta={kpi.autoRate.delta} status={kpi.autoRate.status}
          targetText={t('admin.dashboard.targetAutoRate', { n: kpi.autoRate.target })}
          to="/admin/analytics?tab=auto"
        />
        <KpiCard
          label={t('admin.dashboard.nps')} value={kpi.nps.value}
          unit={t('admin.unit.point')} delta={kpi.nps.delta} status={kpi.nps.status}
          targetText={t('admin.dashboard.targetNps', { n: kpi.nps.target })}
          to="/admin/analytics?tab=nps"
        />
        <KpiCard
          label={t('admin.dashboard.handoffMinutes')} value={kpi.handoffMinutes.value}
          unit={t('admin.unit.minute')} delta={kpi.handoffMinutes.delta} status={kpi.handoffMinutes.status}
          invertDelta
          targetText={t('admin.dashboard.targetHandoff', {
            base: kpi.handoffMinutes.baseline, cut: kpi.handoffMinutes.reduction, n: kpi.handoffMinutes.target
          })}
          to="/admin/analytics?tab=handoff"
        />
        <KpiCard
          label={t('admin.dashboard.accuracy')} value={kpi.accuracy.value} decimals={1}
          unit={t('admin.unit.percent')} delta={kpi.accuracy.delta} status={kpi.accuracy.status}
          targetText={t('admin.dashboard.targetAccuracy', { n: kpi.accuracy.target })}
          to="/admin/analytics?tab=accuracy"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
          <h2 className="type-h3 text-text-pri">{t('admin.dashboard.trend')}</h2>
          <Reloading busy={busy} className="mt-3">
            <TrendChart labels={kpi.trend.labels} series={series} ariaLabel={t('admin.dashboard.trend')} />
          </Reloading>
        </section>

        <section className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
          <h2 className="type-h3 text-text-pri">{t('admin.dashboard.topQuestions')}</h2>
          <Reloading busy={busy} className="mt-4">
            <RankList
              items={kpi.topQuestions}
              actionLabel={t('admin.dashboard.addToFaq')}
              onAction={() => navigate('/admin/knowledge?tab=pending')}
            />
          </Reloading>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
          <h2 className="type-h3 text-text-pri">{t('admin.dashboard.facilityShare')}</h2>
          <Reloading busy={busy} className="mt-4">
            <DonutChart items={share} otherLabel={t('facility.filter.etc')} ariaLabel={t('admin.dashboard.facilityShare')} />
          </Reloading>
        </section>

        <ReviewQueueCard queue={kpi.reviewQueue} />
      </div>
    </div>
  )
}

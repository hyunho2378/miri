// 민원 수요 예측. 계획서 4-1 ③ 축적 데이터 기반 민원량 예측과 인력 운영 계획 지원.
// 예측값은 mock/forecast.json 이 logs.json 260건의 요일과 시간대 분포를 확장해 만든 값이다.
import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Select from '../../components/ui/Select.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import ForecastChart from '../../components/insight/ForecastChart.jsx'

// 5단계 mock. 백엔드가 붙으면 get('/api/admin/forecast') 로 바뀐다
const load = () => import('../../mock/forecast.json').then((m) => m.default)

const ALL = 'all'

export default function ForecastPage() {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [facilities, setFacilities] = useState([])
  const [facilityId, setFacilityId] = useState(ALL)

  useTopbar({ title: t('admin.forecast.title') })

  useEffect(() => {
    let alive = true
    Promise.all([load(), get('/api/facilities')])
      .then(([d, f]) => { if (alive) { setData(d); setFacilities(f) } })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const name = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f.name])), [facilities])

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
        <Skeleton variant="card" className="h-80" />
        <Skeleton variant="card" className="h-64" />
      </div>
    )
  }

  const picked = facilityId === ALL ? data.total : data.series.find((s) => s.facilityId === facilityId)
  const event = data.events[0]
  const eventIndex = event ? data.actualLabels.length + data.forecastLabels.indexOf(event.week) : null
  const eventName = event ? t(`admin.forecast.event${event.key[0].toUpperCase()}${event.key.slice(1)}`) : ''

  const staffColumns = [
    { key: 'week', label: t('admin.forecast.colWeek'), sortable: true, width: 120, render: (r) => t('admin.forecast.weekLabel', { label: r.week }) },
    { key: 'facilityId', label: t('admin.forecast.colFacility'), sortable: true, render: (r) => name[r.facilityId] || r.facilityId },
    {
      key: 'expected', label: t('admin.forecast.colExpected'), sortable: true, width: 130,
      render: (r) => <span className="tabular-nums">{r.expected}{t('admin.forecast.countUnit')}</span>
    },
    {
      key: 'baseline', label: t('admin.forecast.colBaseline'), width: 110, hideBelow: 'lg',
      render: (r) => <span className="tabular-nums text-text-meta">{r.baseline}{t('admin.forecast.countUnit')}</span>
    },
    {
      key: 'staff', label: t('admin.forecast.colStaff'), sortable: true, width: 120,
      render: (r) => <span className="tabular-nums font-medium">{r.staff}{t('admin.forecast.staffUnit')}</span>
    }
  ]

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div>
        <p className="type-body text-text-pri">{t('admin.forecast.headline')}</p>
        <p className="mt-1 type-meta text-text-meta tabular-nums">
          {t('admin.forecast.basis', { days: data.basis.days, n: data.basis.logCount })}
        </p>
      </div>

      <section className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-h3 text-text-pri">{t('admin.forecast.chartTitle')}</h2>
          <Select
            compact label={t('admin.forecast.facilityLabel')} value={facilityId} onChange={setFacilityId}
            className="w-full sm:w-64"
            options={[
              { value: ALL, label: t('admin.forecast.facilityAll') },
              ...facilities.map((f) => ({ value: f.id, label: f.name }))
            ]}
          />
        </div>
        <div className="mt-4">
          <ForecastChart
            actualLabels={data.actualLabels} forecastLabels={data.forecastLabels}
            actual={picked.actual} forecast={picked.forecast} lower={picked.lower} upper={picked.upper}
            eventIndex={eventIndex}
            eventLabel={t('admin.forecast.eventOn', { label: event?.week, event: eventName })}
            actualName={t('admin.forecast.legendActual')}
            forecastName={t('admin.forecast.legendForecast')}
            bandName={t('admin.forecast.legendBand')}
            peakName={t('admin.forecast.peak')}
            ariaLabel={t('admin.forecast.chartTitle')}
          />
        </div>
      </section>

      <section className="min-w-0 space-y-3">
        <div>
          <h2 className="type-h3 text-text-pri">{t('admin.forecast.staffTitle')}</h2>
          {/* 권고 인력이 어떤 규칙에서 나왔는지 화면에 적는다. 근거 없는 숫자는 심사에서 못 쓴다 */}
          <p className="mt-1 type-meta text-text-meta tabular-nums">{t('admin.forecast.staffRule')}</p>
        </div>
        <DataTable
          columns={staffColumns} rows={data.staffing} rowKey={(r) => `${r.week}-${r.facilityId}`}
          pageSize={12} caption={t('admin.forecast.staffTitle')}
        />
      </section>
    </div>
  )
}

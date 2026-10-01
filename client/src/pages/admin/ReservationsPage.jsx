// 예약 현황. 연동된 예약 시스템 데이터의 읽기 전용 뷰다. 자체 예약 처리는 하지 않는다(IA.md).
import { useEffect, useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import { formatDate, formatNumber } from '../../lib/format.js'
import { useTopbar } from '../../store/useAdminUi.js'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Select from '../../components/ui/Select.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import WeekCalendar from '../../components/dashboard/WeekCalendar.jsx'

export default function ReservationsPage() {
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const [slots, setSlots] = useState(null)
  const [facilities, setFacilities] = useState([])
  const [logs, setLogs] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)

  useTopbar({ title: t('admin.reservations.title') })

  useEffect(() => {
    let alive = true
    Promise.all([
      get('/api/admin/reservations'), get('/api/admin/facilities'),
      get('/api/admin/logs?page=1&pageSize=1000')
    ]).then(([s, f, l]) => {
      if (!alive) return
      setSlots(s); setFacilities(f); setLogs(l.rows || [])
    }).catch(() => { if (alive) setSlots(null) })
    return () => { alive = false }
  }, [])

  const facilityId = params.get('facilityId') || slots?.facilityId || ''
  const facility = facilities.find((f) => f.id === facilityId)

  const reserveCount = useMemo(
    () => logs.filter((r) => r.facilityId === facilityId && r.topic === 'reserve').length,
    [logs, facilityId]
  )

  const setFacility = (v) => {
    const p = new URLSearchParams(params)
    p.set('facilityId', v)
    setParams(p)
  }

  if (slots === null) {
    return <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton variant="card" className="h-72" /></div>
  }

  const from = format(addDays(new Date(slots.from), weekOffset * 7), 'yyyy-MM-dd')

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          compact className="w-full sm:w-72" label={t('admin.reservations.selectFacility')}
          value={facilityId} onChange={setFacility}
          placeholder={t('admin.reservations.noFacility')}
          options={facilities.map((f) => ({ value: f.id, label: f.name, secondary: f.typeLabel }))}
        />
        <p className="type-body-sm text-text-meta">{t('admin.reservations.readOnly')}</p>
      </div>

      {!facility ? (
        <EmptyState title={t('admin.reservations.noFacility')} desc={t('common.empty.desc')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <section className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
            <h2 className="type-h3 text-text-pri">{facility.name}</h2>
            <div className="mt-4">
              <WeekCalendar
                from={from} hours={slots.hours} days={slots.days}
                ariaLabel={`${facility.name} ${t('admin.reservations.title')}`}
                onPrev={() => setWeekOffset((w) => w - 1)}
                onNext={() => setWeekOffset((w) => w + 1)}
                onToday={() => setWeekOffset(0)}
              />
            </div>
          </section>

          <aside className="space-y-4">
            <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
              <h2 className="type-h3 text-text-pri">{t('admin.reservations.aiCount')}</h2>
              <p className="mt-2 type-kpi text-text-pri">
                {formatNumber(reserveCount)}<span className="ml-1 type-h3 text-text-meta">{t('common.meta.count')}</span>
              </p>
            </section>
            <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
              <h2 className="type-h3 text-text-pri">{t('admin.facilities.integrationState')}</h2>
              <div className="mt-3 space-y-2">
                <StatusPill status={facility.reservation} label={t(`common.status.${facility.reservation}`)} />
                <p className="type-meta text-text-meta tabular-nums">
                  {t('admin.reservations.lastSync')} {formatDate(slots.syncedAt, 'datetime')}
                </p>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}

// 답변 아래 인라인 카드. 요구사항 1(지금 예약이 되는지 바로 알고 싶다)에 대한 답이다.
// 상태와 예약 가능 여부는 lib/api.js 경유. 색 매핑은 StatusPill 한 곳이다.
import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import { facilityName, hoursText } from '../../lib/lang.js'
import { get } from '../../lib/api.js'
import Button from '../ui/Button.jsx'
import Skeleton from '../ui/Skeleton.jsx'
import StatusPill from '../dashboard/StatusPill.jsx'

export default function FacilityStatusCard({ facilityId }) {
  const { t, lang } = useLang()
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([get(`/api/facilities/${facilityId}`), get(`/api/facilities/${facilityId}/status`)])
      .then(([facility, status]) => { if (alive) setData({ facility, status }) })
      .catch(() => {})
    return () => { alive = false }
  }, [facilityId])

  if (!data) return <Skeleton variant="card" className="mt-4" />

  const { facility, status } = data
  const full = status.reservation === 'full'

  return (
    <section className="mt-4 bg-page rounded-lg shadow-card p-4 animate-flow-down-late">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="type-h3 text-text-pri">{facilityName(facility, lang)}</h3>
          <p className="mt-1 type-body-sm text-text-sec">
            {t('chat.facilityCard.todayHours')} {hoursText(status.todayHours, t)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={status.status} label={t(`common.status.${status.status}`)} />
          <StatusPill status={status.reservation} label={t(`common.status.${status.reservation}`)} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          as="a" variant="secondary" href={status.reservationUrl} target="_blank" rel="noreferrer"
          disabled={full} rightIcon={<ExternalLink size={16} aria-hidden="true" />}
        >
          {t('chat.facilityCard.reserve')}
        </Button>
        <p className="type-meta text-text-meta">
          {full ? t('chat.facilityCard.fullNotice') : t('chat.facilityCard.newWindow')}
        </p>
      </div>
    </section>
  )
}

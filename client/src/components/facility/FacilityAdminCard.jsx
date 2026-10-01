// 관리자 면 시설 카드. 사진 작게 좌측, 우측에 이름과 유형과 상태, 하단에 운영 지표.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { facilityName } from '../../lib/lang.js'
import { formatDate, formatNumber } from '../../lib/format.js'
import Badge from '../ui/Badge.jsx'
import StatusPill from '../dashboard/StatusPill.jsx'

const TYPES = ['sports', 'culture', 'tourism', 'parking']
const placeholder = (type) => `/images/facilities/type-${TYPES.includes(type) ? type : 'etc'}.svg`

export default function FacilityAdminCard({ facility, todayChats = 0 }) {
  const { t, lang } = useLang()
  const [broken, setBroken] = useState(false)

  return (
    <Link
      to={`/admin/facilities/${facility.id}`}
      className="block bg-page rounded-lg shadow-card p-4 hover:shadow-md transition-shadow duration-fast"
    >
      <div className="flex items-start gap-3">
        <span className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md bg-mute">
          <img
            src={broken || !facility.image ? placeholder(facility.type) : facility.image}
            alt={facilityName(facility, lang)} loading="lazy" onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 type-h3 text-text-pri line-clamp-1">{facilityName(facility, lang)}</h3>
            <StatusPill size="sm" status={facility.status} label={t(`common.status.${facility.status}`)} />
          </div>
          <div className="mt-1.5"><Badge>{t(`facility.filter.${facility.type}`)}</Badge></div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line-sub pt-3">
        <div>
          <dt className="type-meta text-text-meta">{t('admin.facilities.todayChats')}</dt>
          <dd className="mt-0.5 type-body-sm font-medium text-text-pri tabular-nums">{formatNumber(todayChats)}</dd>
        </div>
        <div>
          <dt className="type-meta text-text-meta">{t('admin.facilities.reservationRate')}</dt>
          <dd className="mt-0.5 type-body-sm font-medium text-text-pri">{t(`common.status.${facility.reservation}`)}</dd>
        </div>
        <div>
          <dt className="type-meta text-text-meta">{t('common.meta.updatedAt')}</dt>
          <dd className="mt-0.5 type-body-sm text-text-sec tabular-nums">{formatDate(facility.updatedAt)}</dd>
        </div>
      </dl>
    </Link>
  )
}

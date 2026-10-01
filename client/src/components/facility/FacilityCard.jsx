// 시민 면 시설 카드. 별점과 리뷰수는 넣지 않는다(DESIGN.md 절대 금지).
// 사진이 없으면 mute 면에 유형 아이콘을 채운다.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { facilityName, hoursText } from '../../lib/lang.js'
import Badge from '../ui/Badge.jsx'
import StatusPill from '../dashboard/StatusPill.jsx'

// 사진이 없으면 유형 플레이스홀더로 떨어진다. 실사진이 오면 facilities.json 의 image 경로에 그대로 넣으면 된다
const TYPES = ['sports', 'culture', 'tourism', 'parking']
const placeholder = (type) => `/images/facilities/type-${TYPES.includes(type) ? type : 'etc'}.svg`
const WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export default function FacilityCard({ facility }) {
  const { t, lang } = useLang()
  const [broken, setBroken] = useState(false)
  const todayHours = facility.hours?.[WEEKDAY[new Date().getDay()]] || ''
  // 시설명은 데이터의 4언어 필드에서, 유형 라벨은 i18n 에서 온다. 둘 다 한국어로 남지 않는다
  const name = facilityName(facility, lang)

  return (
    <Link
      to={`/facilities/${facility.id}`}
      className="group block overflow-hidden rounded-lg bg-page shadow-card hover:shadow-md transition-shadow duration-fast"
    >
      <div className="relative aspect-[16/10] bg-mute">
        <img
          src={broken || !facility.image ? placeholder(facility.type) : facility.image}
          alt={name} loading="lazy" onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
        {/* 사진 면 위에서는 중립 배지가 배경과 같은 회색이라 안 보인다. page 면으로 띄운다 */}
        <span className="absolute left-3 top-3"><Badge className="bg-page shadow-card">{t(`facility.filter.${facility.type}`)}</Badge></span>
        <span className="absolute right-3 top-3">
          <StatusPill status={facility.status} label={t(`common.status.${facility.status}`)} />
        </span>
      </div>

      <div className="p-4">
        <h3 className="type-h3 text-text-pri line-clamp-1">{name}</h3>
        <p className="mt-1.5 type-body-sm text-text-sec">
          {t('facility.card.todayHours')} {hoursText(todayHours, t)}
        </p>
        <p className="mt-2 type-caption text-text-meta">
          {t('facility.card.reservation')} {t(`common.status.${facility.reservation}`)}
        </p>
      </div>
    </Link>
  )
}

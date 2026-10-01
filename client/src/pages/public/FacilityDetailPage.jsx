// 시설 상세. 탭은 쿼리에 둔다. 예약은 연동 시스템 안내만 하고 자체 처리하지 않는다(IA.md).
import { useEffect, useState } from 'react'
import { ExternalLink, MapPin, Phone, Users } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import { formatPrice } from '../../lib/format.js'
import { facilityName } from '../../lib/lang.js'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import HoursTable from '../../components/facility/HoursTable.jsx'

const TABS = ['guide', 'fee', 'reserve', 'map']
const TAB_KEY = { guide: 'facility.detail.tabGuide', fee: 'facility.detail.tabFee', reserve: 'facility.detail.tabReserve', map: 'facility.detail.tabMap' }

export default function FacilityDetailPage() {
  const { t, lang } = useLang()
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'guide'
  const [facility, setFacility] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setFacility(null)
    setFailed(false)
    get(`/api/facilities/${id}`)
      .then((f) => { if (alive) setFacility(f) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [id])

  const setTab = (next) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p)
  }

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-page px-4 md:px-6 py-10">
        <EmptyState
          tone="error"
          title={t('facility.detail.notFound')} desc={t('common.error.notFound')}
          action={<Button as={Link} to="/facilities">{t('facility.title')}</Button>}
        />
      </div>
    )
  }
  if (!facility) {
    return <div className="mx-auto w-full max-w-page px-4 md:px-6 py-10 space-y-4"><Skeleton variant="card" /><Skeleton variant="text" /></div>
  }

  return (
    <div className="page-enter mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16 py-8 lg:py-10">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="type-h1 text-text-pri">{facilityName(facility, lang)}</h1>
              {/* 주소와 이용 안내 원문과 부서명은 번역하지 않는다(mock/README 원문 무결성).
                  대신 lang 을 박아 이 부분만 한국어임을 선언한다(WCAG 3.1.2 Language of Parts) */}
              <p className="mt-2 inline-flex items-center gap-1.5 type-body-sm text-text-sec">
                <MapPin size={16} aria-hidden="true" className="text-text-meta" /><span lang="ko">{facility.address}</span>
              </p>
            </div>
            <StatusPill status={facility.status} label={t(`common.status.${facility.status}`)} />
          </div>

          <Tabs
            className="mt-6"
            items={TABS.map((v) => ({ value: v, label: t(TAB_KEY[v]) }))}
            value={tab} onChange={setTab}
          />

          <div className="mt-6">
            {tab === 'guide' && (
              <div className="space-y-6">
                <p lang="ko" className="type-body text-text-sec max-w-text whitespace-pre-wrap">{facility.guide}</p>
                <section>
                  <h2 className="type-h2 text-text-pri">{t('facility.detail.hours')}</h2>
                  <div className="mt-3 rounded-lg bg-page shadow-card overflow-hidden"><HoursTable hours={facility.hours} /></div>
                </section>
              </div>
            )}

            {tab === 'fee' && (
              <div className="overflow-x-auto rounded-lg shadow-card bg-page">
                <table className="w-full text-left tabular-nums">
                  <thead>
                    <tr className="bg-subtle">
                      <th className="px-4 py-3 type-caption font-semibold text-text-meta">{t('facility.detail.feeItem')}</th>
                      <th className="px-4 py-3 type-caption font-semibold text-text-meta text-right">{t('facility.detail.feePrice')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facility.fees?.map((f) => (
                      <tr key={f.item} className="border-t border-line-sub">
                        <td className="px-4 py-3 type-body-sm text-text-pri">{f.item}</td>
                        <td className="px-4 py-3 type-body-sm text-text-pri text-right">{formatPrice(f.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'reserve' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={facility.reservation} label={t(`common.status.${facility.reservation}`)} />
                  <p className="type-body-sm text-text-meta">{t('facility.detail.reserveNotice')}</p>
                </div>
                <div className="rounded-lg bg-page shadow-card overflow-hidden"><HoursTable hours={facility.hours} /></div>
                <Button
                  as="a" variant="secondary" href={facility.reservationUrl} target="_blank" rel="noreferrer"
                  rightIcon={<ExternalLink size={16} aria-hidden="true" />}
                >
                  {t('facility.detail.reserveExternal')}
                </Button>
              </div>
            )}

            {tab === 'map' && (
              <div className="space-y-3">
                <p className="type-body text-text-sec">{t('facility.detail.directions')}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <dt className="type-caption text-text-meta">{t('facility.detail.address')}</dt>
                  <dd lang="ko" className="type-body-sm text-text-pri">{facility.address}</dd>
                  <dt className="type-caption text-text-meta">{t('facility.detail.phone')}</dt>
                  <dd className="type-body-sm">
                    <a href={`tel:${facility.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover transition-colors duration-fast">
                      <Phone size={16} aria-hidden="true" />{facility.phone}
                    </a>
                  </dd>
                </dl>
                <Button
                  as="a" variant="secondary" rightIcon={<ExternalLink size={16} aria-hidden="true" />}
                  href={`https://map.kakao.com/?q=${encodeURIComponent(facility.address)}`} target="_blank" rel="noreferrer"
                >
                  {t('facility.detail.openMap')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* lg+ 는 우측 고정 패널, 그 아래 폭은 본문 하단 */}
        <aside className="mt-8 lg:mt-0 lg:sticky lg:top-24">
          <div className="rounded-lg bg-page shadow-card p-4 lg:p-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="type-caption text-text-meta">{t('facility.detail.department')}</dt>
              <dd className="type-body-sm text-text-sec inline-flex items-center gap-1.5">
                <Users size={16} aria-hidden="true" className="text-text-meta" /><span lang="ko">{facility.department}</span>
              </dd>
              <dt className="type-caption text-text-meta">{t('facility.detail.phone')}</dt>
              <dd className="type-body-sm text-text-sec">{facility.phone}</dd>
            </dl>
            <Button as={Link} to={`/?facility=${facility.id}`} className="mt-4 w-full">
              {t('facility.detail.ask')}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

// 시설 안내. 필터 칩은 URL 쿼리에 둔다(ROUTES.md 쿼리 규칙).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import Chip from '../../components/ui/Chip.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import FacilityCard from '../../components/facility/FacilityCard.jsx'

const TYPES = ['all', 'sports', 'culture', 'tourism', 'parking', 'etc']

export default function FacilitiesPage() {
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const type = params.get('type') || 'all'
  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    setRows(null)
    setFailed(false)
    get(`/api/facilities?type=${type}`)
      .then((r) => { if (alive) setRows(r) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [type, reload])

  const setType = (next) => {
    const p = new URLSearchParams(params)
    if (next === 'all') p.delete('type')
    else p.set('type', next)
    setParams(p)
  }

  return (
    <div className="page-enter mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16 py-8 lg:py-10">
      <h1 className="type-h1 text-text-pri">{t('facility.title')}</h1>
      <p className="mt-2 type-body text-text-meta">{t('facility.subtitle')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TYPES.map((v) => (
          <Chip key={v} variant={v === type ? 'selected' : 'outline'} aria-pressed={v === type} onClick={() => setType(v)}>
            {t(`facility.filter.${v}`)}
          </Chip>
        ))}
      </div>

      {failed ? (
        <EmptyState tone="error" onRetry={() => setReload((n) => n + 1)} />
      ) : rows === null ? (
        <div className="mt-6 grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="card" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState image="/images/illustrations/no-results.svg" title={t('facility.list.empty')} desc={t('common.empty.filterDesc')} />
      ) : (
        <>
          <p className="mt-6 type-caption text-text-meta tabular-nums">{t('facility.list.count', { n: rows.length })}</p>
          <ul className="mt-3 grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((f) => <li key={f.id}><FacilityCard facility={f} /></li>)}
          </ul>
        </>
      )}
    </div>
  )
}

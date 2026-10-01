import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { facilityName } from '../../lib/lang.js'
import { get } from '../../lib/api.js'
import { formatDate } from '../../lib/format.js'
import Badge from '../../components/ui/Badge.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'

export default function NoticesPage() {
  const { t, lang } = useLang()
  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [facilities, setFacilities] = useState({})

  useEffect(() => {
    let alive = true
    Promise.all([get('/api/notices'), get('/api/facilities')])
      .then(([notices, facs]) => {
        if (!alive) return
        setRows(notices)
        setFacilities(Object.fromEntries(facs.map((f) => [f.id, facilityName(f, lang)])))
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [lang, reload])

  return (
    <div className="page-enter mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16 py-8 lg:py-10">
      <h1 className="type-h1 text-text-pri">{t('common.notice.title')}</h1>
      <p className="mt-2 type-body text-text-meta">{t('common.notice.subtitle')}</p>

      {failed ? (
        <EmptyState tone="error" onRetry={() => { setRows(null); setFailed(false); setReload((n) => n + 1) }} />
      ) : rows === null ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} variant="card" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState title={t('common.notice.empty')} desc={t('common.empty.desc')} />
      ) : (
        <ul className="mt-6 space-y-3" aria-label={t('common.notice.list')}>
          {rows.map((n) => (
            <li key={n.id}>
              <Link
                to={`/notices/${n.id}`}
                className="block rounded-lg bg-page shadow-card p-4 lg:p-5 hover:shadow-md transition-shadow duration-fast"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="type-meta text-text-meta tabular-nums">{formatDate(n.publishedAt)}</span>
                  {n.facilityId && facilities[n.facilityId] && <Badge>{facilities[n.facilityId]}</Badge>}
                </div>
                {/* 공지 제목과 본문은 기관이 올린 원문이다. 번역하지 않고 언어만 선언한다(WCAG 3.1.2) */}
                <p lang="ko" className="mt-1.5 type-h3 text-text-pri">{n.title}</p>
                <p lang="ko" className="mt-1 type-body-sm text-text-meta line-clamp-2">{n.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

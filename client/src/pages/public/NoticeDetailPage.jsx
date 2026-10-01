import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { facilityName } from '../../lib/lang.js'
import { get } from '../../lib/api.js'
import { formatDate } from '../../lib/format.js'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'

export default function NoticeDetailPage() {
  const { t, lang } = useLang()
  const { id } = useParams()
  const [notice, setNotice] = useState(null)
  const [facility, setFacility] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setNotice(null)
    setFailed(false)
    get(`/api/notices/${id}`)
      .then((n) => {
        if (!alive) return
        setNotice(n)
        if (n.facilityId) get(`/api/facilities/${n.facilityId}`).then((f) => { if (alive) setFacility(f) }).catch(() => {})
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [id])

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-page px-4 md:px-6 py-10">
        <EmptyState
          tone="error"
          title={t('common.notice.notFound')} desc={t('common.error.notFound')}
          action={<Button as={Link} to="/notices">{t('common.notice.title')}</Button>}
        />
      </div>
    )
  }
  if (!notice) return <div className="mx-auto w-full max-w-text px-4 md:px-6 py-10"><Skeleton variant="text" lines={5} /></div>

  return (
    <article className="page-enter mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16 py-8 lg:py-10">
      <div className="max-w-text">
        <p className="type-meta text-text-meta tabular-nums">{formatDate(notice.publishedAt)}</p>
        {/* 공지 원문. 번역하지 않고 언어만 선언한다(WCAG 3.1.2) */}
        <h1 lang="ko" className="mt-1.5 type-h1 text-text-pri">{notice.title}</h1>
        <p lang="ko" className="mt-6 type-body text-text-sec whitespace-pre-wrap">{notice.body}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button as={Link} to={`/?facility=${notice.facilityId || ''}&q=${encodeURIComponent(notice.title)}`}>
            {t('common.notice.ask')}
          </Button>
          {facility && (
            <Link to={`/facilities/${facility.id}`} className="inline-flex items-center min-h-11 md:min-h-0 type-body-sm text-primary hover:text-primary-hover transition-colors duration-fast">
              {t('common.notice.related')} {facilityName(facility, lang)}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

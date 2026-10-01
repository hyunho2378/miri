// 답변이 공지를 인용할 때 붙는 인라인 카드.
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import { formatDate } from '../../lib/format.js'
import Skeleton from '../ui/Skeleton.jsx'

export default function NoticeCard({ noticeId }) {
  const { t } = useLang()
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let alive = true
    get(`/api/notices/${noticeId}`).then((n) => { if (alive) setNotice(n) }).catch(() => {})
    return () => { alive = false }
  }, [noticeId])

  if (!notice) return <Skeleton variant="card" className="mt-4" />

  return (
    <Link
      to={`/notices/${notice.id}`}
      className="group mt-4 block bg-page rounded-lg shadow-card p-4 hover:bg-mute transition-colors duration-fast animate-flow-down-late"
    >
      <p className="type-caption text-text-meta">{t('chat.noticeCard.related')}</p>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-h3 text-text-pri line-clamp-2">{notice.title}</p>
          <p className="mt-1 type-meta text-text-meta">{formatDate(notice.publishedAt)}</p>
        </div>
        <span className="shrink-0 self-center w-7 h-7 inline-flex items-center justify-center rounded-full bg-primary-soft text-primary group-hover:bg-primary group-hover:text-text-inverse transition-colors duration-fast">
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

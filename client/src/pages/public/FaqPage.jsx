// 자주 묻는 질문. 카테고리는 데이터에서 온다(mock 의 category 값). 아코디언 + 더 자세히 물어보기.
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import Chip from '../../components/ui/Chip.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'

// 카테고리 값은 데이터(원문)라 한국어다. 쿼리에는 그 값을 그대로 쓰고 화면 라벨만 사전에서 꺼낸다
const CAT_KEY = { 운영시간: 'hours', 요금: 'fee', 예약: 'reserve', 이용안내: 'guide', 찾아오는길: 'way', 휴관: 'closed' }

export default function FaqPage() {
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat') || ''
  const [all, setAll] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let alive = true
    get('/api/faq').then((r) => { if (alive) setAll(r) }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [reload])

  const setCat = (next) => {
    const p = new URLSearchParams(params)
    if (!next) p.delete('cat')
    else p.set('cat', next)
    setParams(p)
  }

  const categories = all ? [...new Set(all.map((f) => f.category))] : []
  const rows = all ? all.filter((f) => !cat || f.category === cat) : null

  return (
    <div className="page-enter mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16 py-8 lg:py-10">
      <h1 className="type-h1 text-text-pri">{t('common.faq.title')}</h1>
      <p className="mt-2 type-body text-text-meta">{t('common.faq.subtitle')}</p>

      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip variant={!cat ? 'selected' : 'outline'} aria-pressed={!cat} onClick={() => setCat('')}>
            {t('common.meta.all')}
          </Chip>
          {categories.map((c) => (
            <Chip key={c} variant={c === cat ? 'selected' : 'outline'} aria-pressed={c === cat} onClick={() => setCat(c)}>
              {CAT_KEY[c] ? t(`common.faq.cat.${CAT_KEY[c]}`) : c}
            </Chip>
          ))}
        </div>
      )}

      {failed ? (
        <EmptyState tone="error" onRetry={() => { setAll(null); setFailed(false); setReload((n) => n + 1) }} />
      ) : rows === null ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} variant="card" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState image="/images/illustrations/no-results.svg" title={t('common.faq.empty')} desc={t('common.empty.filterDesc')} />
      ) : (
        <ul className="mt-6 max-w-text space-y-2">
          {rows.map((f) => {
            const open = openId === f.id
            return (
              <li key={f.id} className="rounded-lg bg-page shadow-card overflow-hidden">
                <h2>
                  <button
                    type="button" aria-expanded={open} aria-controls={`faq-${f.id}`}
                    onClick={() => setOpenId(open ? null : f.id)}
                    className="flex w-full items-center justify-between gap-3 min-h-14 px-4 py-3 text-left hover:bg-mute transition-colors duration-fast"
                  >
                    {/* 질문과 답변은 등록된 원문이다. 번역하지 않고 언어만 선언한다(WCAG 3.1.2) */}
                    <span lang="ko" className="min-w-0 type-h3 text-text-pri">{f.question}</span>
                    <ChevronDown
                      size={20} aria-hidden="true"
                      className={clsx('shrink-0 text-text-meta transition-transform duration-fast ease-out', open && 'rotate-180')}
                    />
                  </button>
                </h2>
                {open && (
                  <div id={`faq-${f.id}`} className="px-4 pb-4 animate-flow-down">
                    <p lang="ko" className="type-body text-text-sec whitespace-pre-wrap">{f.answer}</p>
                    <Link
                      to={`/?q=${encodeURIComponent(f.question)}${f.facilityId ? `&facility=${f.facilityId}` : ''}`}
                      className="mt-3 inline-flex items-center min-h-11 type-body-sm font-medium text-primary hover:text-primary-hover transition-colors duration-fast"
                    >
                      {t('common.faq.askMore')}
                    </Link>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

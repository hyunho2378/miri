// 상담 로그. 정확도 리뷰가 H4(응답 정확도) 데이터의 원천이다.
// 필터와 드로어 열림 상태는 URL 쿼리에 둔다. 새로고침과 링크 공유가 되어야 한다(ROUTES.md).
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get, post, put } from '../../lib/api.js'
import { formatDate, formatNumber } from '../../lib/format.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import useAdminUi from '../../store/useAdminUi.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import Select from '../../components/ui/Select.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import DateRangeTabs from '../../components/dashboard/DateRangeTabs.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'

const VERDICTS = ['correct', 'wrong', 'hold']
const RESULTS = ['auto', 'handoff', 'unresolved']
const LANGS = ['ko', 'en', 'ja', 'zh']

function LogsActions() {
  return <DateRangeTabs className="hidden sm:flex" />
}

// 정답 오답 보류. 네이티브 라디오를 감춰 두고 라벨을 칩처럼 그린다.
// 키보드 방향키 이동과 그룹 의미는 브라우저가 준다
function VerdictRadio({ name, value, onChange }) {
  const { t } = useLang()
  return (
    <div role="radiogroup" aria-label={t('admin.logs.review')} className="flex flex-wrap gap-2">
      {VERDICTS.map((v) => (
        <label
          key={v}
          className={`pressable inline-flex h-8 cursor-pointer items-center rounded-full px-4 type-body-sm font-medium
            ${value === v ? 'bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-line' : 'bg-page text-text-sec ring-1 ring-inset ring-line-def hover:text-text-pri'}`}
        >
          <input
            type="radio" name={name} value={v} checked={value === v}
            onChange={() => onChange(v)} className="sr-only"
          />
          {t(`common.status.${v}`)}
        </label>
      ))}
    </div>
  )
}

export default function LogsPage() {
  const { t } = useLang()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const range = useAdminUi((s) => s.range)

  const openId = params.get('id')
  const sampleMode = params.get('review') === '1'
  const facilityId = params.get('facilityId') || ''
  const result = params.get('result') || ''
  const lang = params.get('lang') || ''
  const vote = params.get('vote') || ''

  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [facilities, setFacilities] = useState([])
  const [detail, setDetail] = useState(null)     // GET /api/admin/logs/:id 응답
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useTopbar({ title: t('admin.logs.title'), actions: <LogsActions /> })

  useEffect(() => {
    let alive = true
    get('/api/admin/facilities').then((f) => { if (alive) setFacilities(f) }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    setRows(null)
    const qs = new URLSearchParams({ range, page: '1', pageSize: '1000' })
    if (facilityId) qs.set('facilityId', facilityId)
    if (result) qs.set('result', result)
    if (lang) qs.set('lang', lang)
    if (vote) qs.set('vote', vote)
    const url = sampleMode ? '/api/admin/logs/sample' : `/api/admin/logs?${qs}`
    get(url).then((d) => { if (alive) setRows(d.rows || []) }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [range, facilityId, result, lang, vote, sampleMode, reload])

  const setParam = (key, value) => {
    const p = new URLSearchParams(params)
    if (!value) p.delete(key)
    else p.set(key, value)
    setParams(p)
  }

  const facilityName = useMemo(
    () => Object.fromEntries(facilities.map((f) => [f.id, f.name])),
    [facilities]
  )

  // 드로어는 목록 행이 아니라 상세 응답을 그린다. 답변 본문과 근거가 여기서 온다
  useEffect(() => {
    if (!openId) { setDetail(null); return undefined }
    let alive = true
    setDetail(null)
    setNote('')
    get(`/api/admin/logs/${openId}`).then((d) => { if (alive) { setDetail(d); setNote(d.review?.note || '') } }).catch(() => {})
    return () => { alive = false }
  }, [openId])

  const open = detail
  const openIndex = rows?.findIndex((r) => r.id === openId) ?? -1
  const verdict = detail?.review?.verdict ?? null

  const saveReview = async (v) => {
    if (!openId) return
    setSaving(true)
    try {
      const saved = await put(`/api/admin/logs/${openId}/review`, { verdict: v, note })
      setDetail((prev) => ({ ...prev, ...saved }))
      setRows((prev) => prev.map((r) => (r.id === openId ? { ...r, review: saved.review?.verdict ?? v } : r)))
      toast(t('admin.logs.reviewSaved'), 'primary')
      if (sampleMode && openIndex >= 0 && rows[openIndex + 1]) setParam('id', rows[openIndex + 1].id)
    } catch (e) {
      toast(e.error?.message || t('common.error.network'), 'danger')
    } finally {
      setSaving(false)
    }
  }

  const toFaq = async () => {
    if (!openId) return
    await post(`/api/admin/logs/${openId}/to-faq`).catch(() => {})
    navigate('/admin/knowledge?tab=pending')
  }

  const columns = [
    { key: 'at', label: t('admin.logs.colTime'), sortable: true, width: 150, render: (r) => formatDate(r.at, 'datetime') },
    { key: 'question', label: t('admin.logs.colQuestion'), render: (r) => <span className="line-clamp-1">{r.question}</span> },
    { key: 'facilityId', label: t('admin.logs.facility'), hideBelow: 'lg', render: (r) => facilityName[r.facilityId] || '' },
    { key: 'lang', label: t('admin.logs.lang'), hideBelow: 'lg', width: 90, render: (r) => t(`common.lang.${r.lang}`) },
    { key: 'result', label: t('admin.logs.result'), width: 110, render: (r) => <StatusPill size="sm" status={r.result} label={t(`common.status.${r.result}`)} /> },
    { key: 'responseMs', label: t('admin.logs.colResponse'), sortable: true, align: 'right', hideBelow: 'md', width: 110, render: (r) => `${formatNumber(r.responseMs)}ms` },
    { key: 'vote', label: t('admin.logs.vote'), hideBelow: 'lg', width: 110, render: (r) => (r.vote ? t(r.vote === 'up' ? 'chat.answer.helpful' : 'chat.answer.notHelpful') : '') },
    { key: 'sourceCount', label: t('admin.logs.colSources'), sortable: true, align: 'right', hideBelow: 'md', width: 90 }
  ]

  const opt = (values, label) => [{ value: '', label: t('common.meta.all') }, ...values.map((v) => ({ value: v, label: label(v) }))]

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <DateRangeTabs className="sm:hidden" />

      <div className="flex flex-wrap items-center gap-3">
        {sampleMode ? (
          <>
            <StatusPill status="wait" label={t('admin.logs.sampleMode')} />
            <span className="type-body-sm text-text-meta tabular-nums">
              {t('admin.logs.sampleProgress', { i: openIndex >= 0 ? openIndex + 1 : 0, n: rows?.length ?? 0 })}
            </span>
            <Button size="sm" variant="secondary" onClick={() => setParams(new URLSearchParams())}>
              {t('admin.logs.sampleExit')}
            </Button>
          </>
        ) : (
          <>
            <Select
              compact className="w-full sm:w-56" label={t('admin.logs.facility')} value={facilityId}
              onChange={(v) => setParam('facilityId', v)}
              options={opt(facilities.map((f) => f.id), (v) => facilityName[v] || v)}
            />
            <Select
              compact className="w-full sm:w-48" label={t('admin.logs.result')} value={result}
              onChange={(v) => setParam('result', v)}
              options={opt(RESULTS, (v) => t(`common.status.${v}`))}
            />
            <Select
              compact className="w-full sm:w-44" label={t('admin.logs.lang')} value={lang}
              onChange={(v) => setParam('lang', v)}
              options={opt(LANGS, (v) => t(`common.lang.${v}`))}
            />
            <Select
              compact className="w-full sm:w-52" label={t('admin.logs.vote')} value={vote}
              onChange={(v) => setParam('vote', v)}
              options={opt(['up', 'down'], (v) => t(v === 'up' ? 'chat.answer.helpful' : 'chat.answer.notHelpful'))}
            />
            <Button size="sm" variant="secondary" onClick={() => setParams(new URLSearchParams([['review', '1']]))}>
              {t('admin.logs.sampleReview')}
            </Button>
          </>
        )}
      </div>

      {failed ? (
        <EmptyState tone="error" onRetry={() => { setRows(null); setFailed(false); setReload((n) => n + 1) }} />
      ) : rows === null
        ? <Skeleton variant="card" className="h-64" />
        : (
          <DataTable
            columns={columns} rows={rows} caption={t('admin.logs.title')}
            emptyImage="/images/illustrations/no-results.svg"
            emptyTitle={t('admin.logs.empty')} emptyDesc={t('common.empty.filterDesc')}
            onRowClick={(r) => setParam('id', r.id)}
          />
        )}

      <Drawer open={!!open} onClose={() => setParam('id', '')} title={t('admin.logs.drawerTitle')}>
        {open && (
          <div className="space-y-6">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="type-caption text-text-meta">{t('admin.logs.colTime')}</dt>
              <dd className="type-body-sm text-text-sec tabular-nums">{formatDate(open.at, 'datetime')}</dd>
              <dt className="type-caption text-text-meta">{t('admin.logs.facility')}</dt>
              <dd className="type-body-sm text-text-sec">{facilityName[open.facilityId] || ''}</dd>
              <dt className="type-caption text-text-meta">{t('admin.logs.result')}</dt>
              <dd><StatusPill size="sm" status={open.result} label={t(`common.status.${open.result}`)} /></dd>
              <dt className="type-caption text-text-meta">{t('admin.logs.colResponse')}</dt>
              <dd className="type-body-sm text-text-sec tabular-nums">{formatNumber(open.responseMs)}ms</dd>
            </dl>

            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.logs.drawerQuestion')}</h3>
              <p className="mt-2 rounded-lg bg-primary-soft px-4 py-3 type-body text-text-pri">{open.question}</p>
            </section>

            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.logs.drawerAnswer')}</h3>
              {/* mock 로그에는 답변 본문이 없다. 없는 내용을 지어내지 않는다 */}
              <p className="mt-2 type-body-sm text-text-meta">{open.answer || t('admin.logs.answerPending')}</p>
            </section>

            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.logs.drawerSources')}</h3>
              {open.sources?.length ? (
                <ul className="mt-2 space-y-2">
                  {open.sources.map((s) => (
                    <li key={s.id} className="rounded-lg bg-subtle p-3">
                      <Badge>{t(`admin.kind.${s.kind}`)}</Badge>
                      <p className="mt-1.5 type-body-sm text-text-pri">{s.title}</p>
                      <p className="mt-0.5 type-meta text-text-meta tabular-nums">{t('common.meta.updatedAt')} {formatDate(s.updatedAt)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 type-body-sm text-text-meta">{t('admin.logs.drawerNoSources')}</p>
              )}
            </section>

            <section className="border-t border-line-sub pt-5">
              <h3 className="type-h3 text-text-pri">{t('admin.logs.review')}</h3>
              <div className="mt-3">
                <VerdictRadio name={`verdict-${open.id}`} value={verdict} onChange={saveReview} />
              </div>
              <Textarea
                className="mt-3" rows={3} label={t('admin.logs.note')} value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" loading={saving} disabled={!verdict} onClick={() => saveReview(verdict)}>
                  {t('common.action.save')}
                </Button>
                <Button size="sm" variant="secondary" onClick={toFaq}>{t('admin.logs.toFaq')}</Button>
              </div>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  )
}

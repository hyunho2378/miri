// 지식베이스. 승인 대기 탭이 Human in the loop 다. 질의 로그에서 만들어진 FAQ 후보를 사람이 판단한다.
import { useEffect, useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get, post, put } from '../../lib/api.js'
import { formatDate, formatNumber } from '../../lib/format.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Modal from '../../components/ui/Modal.jsx'
import MultiSelect from '../../components/ui/MultiSelect.jsx'
import Select from '../../components/ui/Select.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import ToolCard from '../../components/chat/agent/ToolCard.jsx'

const TABS = ['docs', 'pending', 'index']
const CHUNK_PAGE = 10
const STALE_DAYS = 90

// 청크는 GET /api/admin/knowledge/docs/:id 가 준다
const KINDS = ['manual', 'notice', 'faq', 'reservation', 'regulation']
const ACCEPT = '.pdf,.docx,.hwpx,.md'

export default function KnowledgePage() {
  const { t } = useLang()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'docs'

  const [docs, setDocs] = useState(null)
  const [pending, setPending] = useState(null)
  const [index, setIndex] = useState(null)
  const [facilities, setFacilities] = useState([])
  const [handled, setHandled] = useState({})
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ file: '', kind: 'manual', facilityIds: [] })
  const [logs, setLogs] = useState([])
  const [chunkPage, setChunkPage] = useState(1)
  const [chunks, setChunks] = useState([])
  const [reindexNode, setReindexNode] = useState(null)

  useTopbar({ title: t('admin.knowledge.title') })

  useEffect(() => {
    let alive = true
    Promise.all([
      get('/api/admin/knowledge/docs'), get('/api/admin/knowledge/pending'),
      get('/api/admin/knowledge/index-status'), get('/api/admin/facilities')
    ]).then(([d, p, i, f]) => {
      if (!alive) return
      setDocs(d); setPending(p); setIndex(i); setFacilities(f)
    }).catch(() => { if (alive) { setDocs([]); setPending([]); setIndex({ logs: [] }) } })
    return () => { alive = false }
  }, [])

  // 이 문서를 근거로 쓴 질문을 찾으려면 로그가 필요하다
  useEffect(() => {
    let alive = true
    get('/api/admin/logs?range=30d&pageSize=300').then((r) => { if (alive) setLogs(r.rows || []) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const facilityName = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f.name])), [facilities])
  const docTitle = useMemo(() => Object.fromEntries((docs || []).map((d) => [d.id, d.title])), [docs])

  const setTab = (next) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p)
  }

  // 승인하면 서버가 FAQ 를 만들어 돌려준다. 승인 대기에서는 빠진다
  const decide = async (row, action) => {
    try {
      const res = await put(`/api/admin/knowledge/pending/${row.id}`, { action })
      setHandled((prev) => ({ ...prev, [row.id]: res.action === 'reject' ? 'reject' : 'approve' }))
      toast(t(res.action === 'reject' ? 'admin.knowledge.rejected' : 'admin.knowledge.approved'), res.action === 'reject' ? 'danger' : 'primary')
    } catch (e) {
      toast(e.error?.message || t('common.error.network'), 'danger')
    }
  }

  const reindex = async () => {
    const next = await post('/api/admin/knowledge/reindex').catch(() => null)
    if (next) setIndex(next)
    toast(t('admin.knowledge.reindexStarted'), 'neutral')
  }

  const upload = async (e) => {
    e.preventDefault()
    const doc = await post('/api/admin/knowledge/docs', form).catch(() => null)
    if (doc) setDocs((prev) => [doc, ...prev])
    setModal(false)
    toast(t('admin.knowledge.approved'), 'primary')
  }

  const openId = params.get('id')
  const openDoc = useMemo(() => (docs || []).find((d) => d.id === openId) || null, [docs, openId])
  const setOpenDoc = (id) => {
    const p = new URLSearchParams(params)
    if (id) p.set('id', id)
    else p.delete('id')
    setParams(p)
    setChunkPage(1)
    setReindexNode(null)
  }

  // 드로어를 열면 그 문서의 청크를 받아 온다
  useEffect(() => {
    if (!openId) { setChunks([]); return undefined }
    let alive = true
    get(`/api/admin/knowledge/docs/${openId}`)
      .then((doc) => { if (alive) setChunks(doc.chunkList || []) })
      .catch(() => { if (alive) setChunks([]) })
    return () => { alive = false }
  }, [openId])

  // 이 문서가 근거로 쓰인 질문. 같은 시설의 최근 질문에서 찾는다
  const usedIn = useMemo(() => (openDoc
    ? logs.filter((l) => openDoc.facilityIds.includes(l.facilityId)).slice(0, 10)
    : []), [openDoc, logs])
  const stale = openDoc ? (Date.now() - new Date(openDoc.updatedAt).getTime()) / 864e5 > STALE_DAYS : false

  const reindexOne = async () => {
    setReindexNode({ kind: 'tool', id: 'rx', tool: 'knowledge', phase: 'running', label: t('admin.docDrawer.reindexing'), detail: openDoc.title })
    try {
      const saved = await post(`/api/admin/knowledge/docs/${openDoc.id}/reindex`)
      setDocs((prev) => prev.map((d) => (d.id === saved.id ? saved : d)))
      setReindexNode({ kind: 'tool', id: 'rx', tool: 'knowledge', phase: 'done', label: t('admin.docDrawer.reindexing'), summary: t('admin.docDrawer.reindexDone') })
    } catch (e) {
      setReindexNode({ kind: 'tool', id: 'rx', tool: 'knowledge', phase: 'error', label: t('admin.docDrawer.reindexing'), message: e.error?.message })
    }
  }

  const docColumns = [
    { key: 'title', label: t('admin.knowledge.colDoc'), sortable: true },
    { key: 'kind', label: t('admin.knowledge.colKind'), width: 130, render: (r) => t(`admin.kind.${r.kind}`) },
    { key: 'facilityIds', label: t('admin.knowledge.colFacility'), hideBelow: 'lg', render: (r) => r.facilityIds.map((id) => facilityName[id] || id).join(', ') },
    { key: 'updatedAt', label: t('common.meta.updatedAt'), sortable: true, hideBelow: 'md', width: 120, render: (r) => formatDate(r.updatedAt) },
    { key: 'indexStatus', label: t('admin.knowledge.colStatus'), width: 120, render: (r) => <StatusPill size="sm" status={r.indexStatus} label={t(`common.status.${r.indexStatus}`)} /> },
    { key: 'chunks', label: t('admin.knowledge.colChunks'), sortable: true, align: 'right', hideBelow: 'md', width: 90, render: (r) => formatNumber(r.chunks) }
  ]

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} items={[
          { value: 'docs', label: t('admin.knowledge.tabDocs') },
          { value: 'pending', label: t('admin.knowledge.tabPending') },
          { value: 'index', label: t('admin.knowledge.tabIndex') }
        ]} />
        {tab === 'docs' && (
          <Button size="sm" leftIcon={<Upload size={16} aria-hidden="true" />} onClick={() => setModal(true)}>
            {t('admin.knowledge.upload')}
          </Button>
        )}
      </div>

      {tab === 'docs' && (docs === null
        ? <Skeleton variant="card" className="h-64" />
        : <DataTable columns={docColumns} rows={docs} onRowClick={(r) => setOpenDoc(r.id)} caption={t('admin.knowledge.tabDocs')} />)}

      {tab === 'pending' && (pending === null ? <Skeleton variant="card" className="h-64" />
        : pending.length === 0 ? <EmptyState title={t('admin.knowledge.pendingEmpty')} desc={t('admin.knowledge.pendingDesc')} />
        : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="bg-page rounded-lg shadow-card p-4 lg:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="type-caption text-text-meta">{t('admin.knowledge.pendingQuestion')}</p>
                    <p className="mt-1 type-h3 text-text-pri">{p.question}</p>
                  </div>
                  <span className="shrink-0 type-caption text-text-meta tabular-nums">
                    {t('admin.knowledge.occurrences')} {formatNumber(p.occurrences)}{t('common.meta.count')}
                  </span>
                </div>

                <p className="mt-3 type-caption text-text-meta">{t('admin.knowledge.pendingAnswer')}</p>
                <p className="mt-1 type-body text-text-sec">{p.answer}</p>

                <p className="mt-3 type-meta text-text-meta">
                  {t('admin.knowledge.pendingSource')} {docTitle[p.sourceDocId] || p.sourceDocId}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-sub pt-4">
                  {handled[p.id] ? (
                    <StatusPill
                      status={handled[p.id] === 'approve' ? 'done' : 'wrong'}
                      label={t(handled[p.id] === 'approve' ? 'admin.knowledge.approved' : 'admin.knowledge.rejected')}
                    />
                  ) : (
                    <>
                      <Button size="sm" onClick={() => decide(p, 'approve')}>{t('admin.knowledge.approve')}</Button>
                      <Button size="sm" variant="secondary" onClick={() => decide(p, 'edit')}>{t('common.action.edit')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => decide(p, 'reject')}>{t('admin.knowledge.reject')}</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'index' && (index === null ? <Skeleton variant="card" className="h-64" /> : (
        <div className="space-y-4">
          <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <dl className="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <dt className="type-caption text-text-meta">{t('admin.knowledge.lastReindex')}</dt>
                  <dd className="mt-0.5 type-body-sm text-text-pri tabular-nums">{formatDate(index.lastReindexAt, 'datetime')}</dd>
                </div>
                <div>
                  <dt className="type-caption text-text-meta">{t('admin.knowledge.nextReindex')}</dt>
                  <dd className="mt-0.5 type-body-sm text-text-pri tabular-nums">{formatDate(index.nextReindexAt, 'datetime')}</dd>
                </div>
              </dl>
              <Button size="sm" variant="secondary" onClick={reindex}>{t('admin.knowledge.reindexNow')}</Button>
            </div>
          </section>

          <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
            <h2 className="type-h3 text-text-pri">{t('admin.knowledge.indexLog')}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left tabular-nums">
                <thead>
                  <tr className="bg-subtle">
                    {[t('admin.logs.colTime'), t('admin.knowledge.logResult'), t('admin.knowledge.logDocs'), t('admin.knowledge.logChunks'), t('admin.knowledge.logDuration')].map((h) => (
                      <th key={h} className="px-3 py-2 type-caption font-semibold text-text-meta">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(index.logs || []).map((l) => (
                    <tr key={l.at} className="border-t border-line-sub">
                      <td className="px-3 py-2 type-body-sm text-text-pri">{formatDate(l.at, 'datetime')}</td>
                      <td className="px-3 py-2">
                        <StatusPill size="sm" status={l.result === 'success' ? 'indexed' : l.result === 'partial' ? 'pending' : 'failed'}
                          label={l.message || t(`common.status.${l.result === 'success' ? 'indexed' : l.result === 'partial' ? 'pending' : 'failed'}`)} />
                      </td>
                      <td className="px-3 py-2 type-body-sm text-text-sec">{formatNumber(l.docs)}</td>
                      <td className="px-3 py-2 type-body-sm text-text-sec">{formatNumber(l.chunks)}</td>
                      <td className="px-3 py-2 type-body-sm text-text-sec">{formatNumber(l.durationSec)}{t('admin.knowledge.second')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ))}

      <Modal
        open={modal} onClose={() => setModal(false)} title={t('admin.knowledge.upload')}
        footer={<Button type="submit" form="kb-upload">{t('common.action.upload')}</Button>}
      >
        <form id="kb-upload" onSubmit={upload} className="space-y-4">
          <div>
            <label htmlFor="kb-file" className="block type-caption text-text-sec mb-1.5">{t('admin.knowledge.fileName')}</label>
            <div className="rounded-md bg-subtle p-6 text-center">
              <p className="type-body-sm text-text-meta">{t('admin.knowledge.dropHint')}</p>
              <p className="mt-1 type-meta text-text-ter">{t('admin.knowledge.uploadHint')}</p>
              <input
                id="kb-file" type="file" accept={ACCEPT}
                onChange={(e) => setForm((f) => ({ ...f, file: e.target.value }))}
                className="mt-3 block w-full type-body-sm text-text-sec"
              />
            </div>
          </div>
          <Select
            label={t('admin.knowledge.colKind')} value={form.kind}
            onChange={(v) => setForm((f) => ({ ...f, kind: v }))}
            options={KINDS.map((k) => ({ value: k, label: t(`admin.kind.${k}`) }))}
          />
          <MultiSelect
            label={t('admin.knowledge.colFacility')} values={form.facilityIds}
            onChange={(v) => setForm((f) => ({ ...f, facilityIds: v }))}
            options={facilities.map((f) => ({ value: f.id, label: f.name, secondary: f.typeLabel }))}
          />
        </form>
      </Modal>
      <Drawer open={Boolean(openDoc)} onClose={() => setOpenDoc(null)} title={t('admin.docDrawer.title')}>
        {openDoc && (
          <div className="space-y-6">
            {stale && (
              <p className="rounded-md bg-mute px-3 py-2 type-body-sm text-text-sec">{t('admin.docDrawer.stale')}</p>
            )}

            <section>
              <h3 className="type-h3 text-text-pri">{openDoc.title}</h3>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="type-caption text-text-meta">{t('admin.knowledge.colKind')}</dt>
                <dd className="type-body-sm text-text-sec">{t(`admin.kind.${openDoc.kind}`)}</dd>
                <dt className="type-caption text-text-meta">{t('admin.knowledge.colFacility')}</dt>
                <dd className="type-body-sm text-text-sec">{openDoc.facilityIds.map((id) => facilityName[id] || id).join(', ')}</dd>
                <dt className="type-caption text-text-meta">{t('common.meta.updatedAt')}</dt>
                <dd className="type-body-sm text-text-sec tabular-nums">{formatDate(openDoc.updatedAt)}</dd>
                <dt className="type-caption text-text-meta">{t('admin.knowledge.colChunks')}</dt>
                <dd className="type-body-sm text-text-sec tabular-nums">{formatNumber(openDoc.chunks)}</dd>
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill size="sm" status={openDoc.indexStatus} label={t(`common.status.${openDoc.indexStatus}`)} />
                <Button size="sm" variant="secondary" onClick={reindexOne}>{t('admin.docDrawer.reindexOne')}</Button>
              </div>
              {reindexNode && <div className="mt-3"><ToolCard node={reindexNode} /></div>}
            </section>

            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.docDrawer.chunks')}</h3>
              {chunks.length === 0 ? (
                <p className="mt-2 type-body-sm text-text-meta">{t('admin.docDrawer.chunkEmpty')}</p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {chunks.slice((chunkPage - 1) * CHUNK_PAGE, chunkPage * CHUNK_PAGE).map((c) => (
                      <li key={c.no} className="rounded-md bg-subtle p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="type-caption text-text-meta tabular-nums">{t('admin.docDrawer.chunkNo', { n: c.no })}</span>
                          <StatusPill size="sm" status={c.status} label={t(`common.status.${c.status}`)} />
                        </div>
                        <p className="mt-1 type-body-sm text-text-sec line-clamp-2">{c.text.slice(0, 200)}</p>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    className="mt-3" page={chunkPage} total={chunks.length} pageSize={CHUNK_PAGE} onChange={setChunkPage}
                  />
                </>
              )}
            </section>

            <section>
              <h3 className="type-h3 text-text-pri">{t('admin.docDrawer.usedIn')}</h3>
              {usedIn.length === 0 ? (
                <p className="mt-2 type-body-sm text-text-meta">{t('admin.docDrawer.usedEmpty')}</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {usedIn.map((l) => (
                    <li key={l.id}>
                      <Link
                        to={`/admin/logs?id=${l.id}`}
                        className="flex items-center gap-2 min-h-11 px-2 rounded-md hover:bg-mute transition-colors duration-fast"
                      >
                        <span className="min-w-0 flex-1 truncate type-body-sm text-text-sec">{l.question}</span>
                        <span className="shrink-0 type-meta text-text-meta tabular-nums">{formatDate(l.at, 'datetime')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Drawer>
    </div>
  )
}

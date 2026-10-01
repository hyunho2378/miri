// FAQ 관리. 지식베이스 승인분이 여기로 넘어온다. 노출 여부 토글과 드로어 편집.
import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get, post, put } from '../../lib/api.js'
import { formatDate, formatNumber } from '../../lib/format.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Chip from '../../components/ui/Chip.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import Toggle from '../../components/ui/Toggle.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'

const BLANK = { id: '', question: '', answer: '', category: '', facilityId: '', visible: true, sourceDocId: '' }

export default function FaqAdminPage() {
  const { t } = useLang()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat') || ''
  const q = params.get('q') || ''

  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [facilities, setFacilities] = useState([])
  const [docs, setDocs] = useState([])
  const [visible, setVisible] = useState({})
  const [edit, setEdit] = useState(null)

  useTopbar({ title: t('admin.faq.title') })

  useEffect(() => {
    let alive = true
    Promise.all([get('/api/admin/faq'), get('/api/admin/facilities'), get('/api/admin/knowledge/docs')])
      .then(([f, fac, d]) => { if (!alive) return; setRows(f); setFacilities(fac); setDocs(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [reload])

  const facilityName = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f.name])), [facilities])
  const categories = useMemo(() => [...new Set((rows || []).map((r) => r.category))], [rows])

  const setParam = (key, value) => {
    const p = new URLSearchParams(params)
    if (!value) p.delete(key)
    else p.set(key, value)
    setParams(p)
  }

  const filtered = (rows || []).filter((r) =>
    (!cat || r.category === cat) &&
    (!q || r.question.includes(q) || r.answer.includes(q)))

  const toggleVisible = async (row, next) => {
    setVisible((prev) => ({ ...prev, [row.id]: next }))
    const saved = await put(`/api/admin/faq/${row.id}`, { visible: next }).catch(() => null)
    if (saved) setVisible((prev) => ({ ...prev, [row.id]: saved.visible }))
  }

  const save = async (e) => {
    e.preventDefault()
    const body = { ...edit }
    const saved = await (edit.id ? put(`/api/admin/faq/${edit.id}`, body) : post('/api/admin/faq', body)).catch(() => null)
    if (saved) {
      setRows((prev) => (edit.id ? prev.map((r) => (r.id === edit.id ? saved : r)) : [saved, ...prev]))
    }
    setEdit(null)
    toast(t('admin.faq.saved'), 'primary')
  }

  const columns = [
    { key: 'question', label: t('admin.faq.colQuestion'), sortable: true },
    { key: 'answer', label: t('admin.faq.colAnswer'), hideBelow: 'lg', render: (r) => <span className="line-clamp-1 text-text-sec">{r.answer}</span> },
    { key: 'category', label: t('admin.faq.colCategory'), width: 120 },
    { key: 'facilityId', label: t('admin.faq.colFacility'), hideBelow: 'lg', render: (r) => facilityName[r.facilityId] || '' },
    {
      key: 'visible', label: t('admin.faq.colVisible'), width: 130,
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle
            label={t('admin.faq.colVisible')} checked={visible[r.id] ?? r.visible}
            onChange={(v) => toggleVisible(r, v)}
          />
        </span>
      )
    },
    { key: 'hits30d', label: t('admin.faq.colHits'), sortable: true, align: 'right', hideBelow: 'md', width: 120, render: (r) => formatNumber(r.hits30d) },
    { key: 'updatedAt', label: t('common.meta.updatedAt'), sortable: true, hideBelow: 'md', width: 120, render: (r) => formatDate(r.updatedAt) }
  ]

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip variant={!cat ? 'selected' : 'outline'} aria-pressed={!cat} onClick={() => setParam('cat', '')}>
            {t('common.meta.all')}
          </Chip>
          {categories.map((c) => (
            <Chip key={c} variant={c === cat ? 'selected' : 'outline'} aria-pressed={c === cat} onClick={() => setParam('cat', c)}>{c}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-full sm:w-64" placeholder={t('admin.faq.searchPlaceholder')} value={q}
            aria-label={t('common.action.search')} onChange={(e) => setParam('q', e.target.value)}
          />
          <Button size="md" leftIcon={<Plus size={16} aria-hidden="true" />} onClick={() => setEdit({ ...BLANK })}>
            {t('admin.faq.new')}
          </Button>
        </div>
      </div>

      {failed ? (
        <EmptyState tone="error" onRetry={() => { setRows(null); setFailed(false); setReload((n) => n + 1) }} />
      ) : rows === null
        ? <Skeleton variant="card" className="h-64" />
        : <DataTable columns={columns} rows={filtered} caption={t('admin.faq.title')} emptyImage="/images/illustrations/no-results.svg" emptyTitle={t('admin.faq.empty')} emptyDesc={t(q ? 'common.empty.searchDesc' : 'common.empty.filterDesc')} onRowClick={(r) => setEdit({ ...r })} />}

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={t('admin.faq.editTitle')}
        footer={<Button type="submit" form="faq-edit">{t('common.action.save')}</Button>}>
        {edit && (
          <form id="faq-edit" onSubmit={save} className="space-y-4">
            <Input label={t('admin.faq.colQuestion')} value={edit.question} onChange={(e) => setEdit((f) => ({ ...f, question: e.target.value }))} />
            <Textarea rows={5} label={t('admin.faq.colAnswer')} value={edit.answer} onChange={(e) => setEdit((f) => ({ ...f, answer: e.target.value }))} />
            <Input label={t('admin.faq.colCategory')} value={edit.category} onChange={(e) => setEdit((f) => ({ ...f, category: e.target.value }))} />
            <Select
              label={t('admin.faq.colFacility')} value={edit.facilityId}
              onChange={(v) => setEdit((f) => ({ ...f, facilityId: v }))}
              options={facilities.map((f) => ({ value: f.id, label: f.name, secondary: f.typeLabel }))}
            />
            <Select
              label={t('admin.faq.linkedDoc')} value={edit.sourceDocId}
              onChange={(v) => setEdit((f) => ({ ...f, sourceDocId: v }))}
              options={docs.map((d) => ({ value: d.id, label: d.title, secondary: t(`admin.kind.${d.kind}`) }))}
            />
            <Toggle label={t('admin.faq.colVisible')} checked={edit.visible} onChange={(v) => setEdit((f) => ({ ...f, visible: v }))} />
          </form>
        )}
      </Drawer>
    </div>
  )
}

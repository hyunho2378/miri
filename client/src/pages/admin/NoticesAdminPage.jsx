// 공지사항 관리. 게시하면 지식베이스에 바로 색인해 상담 답변에 쓰인다.
// mock 쓰기 라우트가 api.js(동결)에 없어 화면은 낙관적으로 갱신한다. 라우트 목록은 PROGRESS 6단계 요청에 있다.
import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get, post, put } from '../../lib/api.js'
import { formatDate } from '../../lib/format.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import Input from '../../components/ui/Input.jsx'
import MultiSelect from '../../components/ui/MultiSelect.jsx'
import Select from '../../components/ui/Select.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import ToolCard from '../../components/chat/agent/ToolCard.jsx'

const STATUSES = ['draft', 'published', 'expired']
// 공지 상태 → StatusPill 상태. 색은 StatusPill 한 곳에서만 나온다
const PILL = { draft: 'pending', published: 'done', expired: 'closed' }
const NEW = '__new__'

// 로컬 날짜다. toISOString 은 UTC 라 새벽에 하루 전으로 밀린다
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = () => ymd(new Date())
const plusDays = (n) => ymd(new Date(Date.now() + n * 864e5))

export default function NoticesAdminPage() {
  const { t } = useLang()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [facilities, setFacilities] = useState([])
  const [form, setForm] = useState(null)
  const [indexNode, setIndexNode] = useState(null)

  useTopbar({ title: t('admin.notices.title') })

  useEffect(() => {
    let alive = true
    Promise.all([get('/api/notices'), get('/api/admin/facilities')])
      .then(([n, f]) => {
        if (!alive) return
        // 시민 면 공지에는 관리 필드가 없다. 화면에서 쓰는 값을 채워 준다
        setRows(n.map((x) => ({
          ...x,
          facilityIds: x.facilityId ? [x.facilityId] : [],
          from: x.publishedAt, to: plusDays(30),
          status: 'published', indexStatus: 'indexed', updatedAt: x.publishedAt
        })))
        setFacilities(f)
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [reload])

  const facilityName = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f.name])), [facilities])
  const openId = params.get('id')
  const setOpen = (id) => {
    const p = new URLSearchParams(params)
    if (id) p.set('id', id)
    else p.delete('id')
    setParams(p)
  }

  useEffect(() => {
    if (!openId || !rows) { setForm(null); setIndexNode(null); return }
    if (openId === NEW) {
      setForm({ id: null, title: '', body: '', facilityIds: [], from: today(), to: plusDays(30), status: 'draft' })
      return
    }
    const row = rows.find((r) => r.id === openId)
    setForm(row ? { ...row } : null)
  }, [openId, rows])

  // 저장은 서버가 한다. 응답이 공지 목록과 지식베이스 색인을 함께 갱신한 결과다
  const save = async () => {
    if (!form.title.trim()) { toast(t('admin.notices.requiredTitle'), 'danger'); return }
    setIndexNode({ kind: 'tool', id: 'ix', tool: 'knowledge', phase: 'running', label: t('admin.notices.indexing'), detail: form.title })
    const body = {
      title: form.title, body: form.body, facilityIds: form.facilityIds,
      from: form.from, to: form.to, status: form.status
    }
    try {
      const saved = form.id
        ? await put(`/api/admin/notices/${form.id}`, body)
        : await post('/api/admin/notices', body)
      setRows((prev) => (form.id ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev]))
      setForm(saved)
      setIndexNode({ kind: 'tool', id: 'ix', tool: 'knowledge', phase: 'done', label: t('admin.notices.indexing'), summary: t('admin.notices.indexDone') })
      toast(t('admin.notices.saved'), 'primary')
    } catch (e) {
      setIndexNode({ kind: 'tool', id: 'ix', tool: 'knowledge', phase: 'error', label: t('admin.notices.indexing'), message: e.error?.message })
      toast(e.error?.message || t('common.error.network'), 'danger')
    }
  }

  const columns = [
    { key: 'title', label: t('admin.notices.colTitle'), sortable: true },
    {
      key: 'facilityIds', label: t('admin.notices.colFacility'), hideBelow: 'lg', width: 180,
      render: (r) => r.facilityIds.map((id) => facilityName[id] || id).join(', ')
    },
    {
      key: 'from', label: t('admin.notices.colPeriod'), hideBelow: 'md', width: 190, sortable: true,
      render: (r) => <span className="tabular-nums">{formatDate(r.from)} ~ {formatDate(r.to)}</span>
    },
    {
      key: 'status', label: t('admin.notices.colStatus'), width: 110,
      render: (r) => <StatusPill size="sm" status={PILL[r.status]} label={t(`admin.notices.status${r.status[0].toUpperCase()}${r.status.slice(1)}`)} />
    },
    {
      key: 'indexStatus', label: t('admin.notices.colIndex'), width: 110, hideBelow: 'md',
      render: (r) => <StatusPill size="sm" status={r.indexStatus} label={t(`common.status.${r.indexStatus}`)} />
    }
  ]

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex justify-end">
        <Button size="md" leftIcon={<Plus size={16} aria-hidden="true" />} onClick={() => setOpen(NEW)}>
          {t('admin.notices.create')}
        </Button>
      </div>

      {failed ? (
        <EmptyState tone="error" onRetry={() => { setRows(null); setFailed(false); setReload((n) => n + 1) }} />
      ) : rows === null
        ? <Skeleton variant="card" className="h-64" />
        : (
          <DataTable
            columns={columns} rows={rows} onRowClick={(r) => setOpen(r.id)}
            caption={t('admin.notices.title')}
            emptyTitle={t('admin.notices.empty')} emptyDesc={t('admin.notices.emptyDesc')}
          />
        )}

      <Drawer
        open={Boolean(form)} onClose={() => setOpen(null)}
        title={form?.id ? t('admin.notices.edit') : t('admin.notices.create')}
        footer={<Button onClick={save}>{t('common.action.save')}</Button>}
      >
        {form && (
          <div className="space-y-4">
            <Input label={t('admin.notices.colTitle')} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea rows={8} label={t('admin.notices.body')} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            <MultiSelect
              label={t('admin.notices.facilities')} value={form.facilityIds}
              onChange={(v) => setForm((f) => ({ ...f, facilityIds: v }))}
              options={facilities.map((f) => ({ value: f.id, label: f.name }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {/* 네이티브 date 는 OS 마다 다르게 보인다(PITFALLS 21). 문자열 입력으로 받는다 */}
              <Input
                label={t('admin.notices.from')} value={form.from} inputMode="numeric" placeholder="2026-09-07"
                onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
              />
              <Input
                label={t('admin.notices.to')} value={form.to} inputMode="numeric" placeholder="2026-10-07"
                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
            <Select
              label={t('admin.notices.status')} value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              options={STATUSES.map((v) => ({ value: v, label: t(`admin.notices.status${v[0].toUpperCase()}${v.slice(1)}`) }))}
            />

            {indexNode && (
              <div className="border-t border-line-sub pt-4">
                <ToolCard node={indexNode} />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}

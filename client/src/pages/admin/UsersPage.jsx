// 사용자. 기관 관리자만 들어온다(ROUTES.md 가드).
import { useEffect, useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import { get, post } from '../../lib/api.js'
import { formatDate } from '../../lib/format.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Modal from '../../components/ui/Modal.jsx'
import MultiSelect from '../../components/ui/MultiSelect.jsx'
import Select from '../../components/ui/Select.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'

const ROLES = ['admin', 'operator', 'reviewer']
// 역할별 권한. 검토자는 로그 인계 분석 대시보드 예약만 본다(IA.md 역할 3종)
const PERMS = [
  { key: 'admin.nav.dashboard', admin: 'read', operator: 'read', reviewer: 'read' },
  { key: 'admin.nav.logs', admin: 'write', operator: 'write', reviewer: 'write' },
  { key: 'admin.nav.handoff', admin: 'write', operator: 'write', reviewer: 'read' },
  { key: 'admin.nav.knowledge', admin: 'write', operator: 'write', reviewer: 'none' },
  { key: 'admin.nav.faq', admin: 'write', operator: 'write', reviewer: 'none' },
  { key: 'admin.nav.facilities', admin: 'write', operator: 'write', reviewer: 'none' },
  { key: 'admin.nav.reservations', admin: 'read', operator: 'read', reviewer: 'read' },
  { key: 'admin.nav.analytics', admin: 'read', operator: 'read', reviewer: 'read' },
  { key: 'admin.nav.users', admin: 'write', operator: 'none', reviewer: 'none' },
  { key: 'admin.nav.settings', admin: 'write', operator: 'none', reviewer: 'none' }
]
const PERM_KEY = { read: 'admin.users.permRead', write: 'admin.users.permWrite', none: 'admin.users.permNone' }

export default function UsersPage() {
  const { t } = useLang()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [facilities, setFacilities] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'operator', facilities: [] })

  useTopbar({ title: t('admin.users.title') })

  useEffect(() => {
    let alive = true
    Promise.all([get('/api/admin/users'), get('/api/admin/facilities')])
      .then(([u, f]) => { if (!alive) return; setRows(u); setFacilities(f) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [reload])

  const facilityName = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f.name])), [facilities])

  const invite = async (e) => {
    e.preventDefault()
    await post('/api/admin/users/invite', form).catch(() => {})
    setModal(false)
    toast(t('admin.users.invited'), 'primary')
  }

  const columns = [
    { key: 'name', label: t('admin.users.colName'), sortable: true, width: 140 },
    { key: 'email', label: t('admin.users.colEmail'), sortable: true },
    { key: 'role', label: t('admin.users.colRole'), width: 140, render: (r) => t(`admin.role.${r.role}`) },
    { key: 'facilities', label: t('admin.users.colFacility'), hideBelow: 'lg', render: (r) => (r.facilities.length ? r.facilities.map((id) => facilityName[id] || id).join(', ') : t('common.meta.all')) },
    { key: 'lastLoginAt', label: t('admin.users.colLastLogin'), sortable: true, hideBelow: 'md', width: 150, render: (r) => formatDate(r.lastLoginAt, 'datetime') },
    { key: 'status', label: t('admin.users.colStatus'), width: 110, render: (r) => <StatusPill size="sm" status={r.status === 'active' ? 'normal' : 'closed'} label={t(`common.status.${r.status === 'active' ? 'normal' : 'closed'}`)} /> }
  ]

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="flex justify-end">
        <Button size="md" leftIcon={<UserPlus size={16} aria-hidden="true" />} onClick={() => setModal(true)}>
          {t('admin.users.invite')}
        </Button>
      </div>

      {failed ? (
        <EmptyState tone="error" onRetry={() => { setRows(null); setFailed(false); setReload((n) => n + 1) }} />
      ) : rows === null
        ? <Skeleton variant="card" className="h-64" />
        : <DataTable columns={columns} rows={rows} caption={t('admin.users.title')} />}

      <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
        <h2 className="type-h3 text-text-pri">{t('admin.users.permissions')}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-subtle">
                <th className="px-3 py-2 type-caption font-semibold text-text-meta">{t('admin.users.permFeature')}</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-2 type-caption font-semibold text-text-meta">{t(`admin.role.${r}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMS.map((p) => (
                <tr key={p.key} className="border-t border-line-sub">
                  <td className="px-3 py-2 type-body-sm text-text-pri whitespace-nowrap">{t(p.key)}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2 type-body-sm text-text-sec whitespace-nowrap">{t(PERM_KEY[p[r]])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={modal} onClose={() => setModal(false)} title={t('admin.users.inviteTitle')}
        footer={<Button type="submit" form="user-invite">{t('admin.users.invite')}</Button>}
      >
        <form id="user-invite" onSubmit={invite} className="space-y-4">
          <Input label={t('admin.users.colEmail')} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Select
            label={t('admin.users.colRole')} value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))}
            options={ROLES.map((r) => ({ value: r, label: t(`admin.role.${r}`) }))}
          />
          <MultiSelect
            label={t('admin.users.colFacility')} values={form.facilities}
            onChange={(v) => setForm((f) => ({ ...f, facilities: v }))}
            options={facilities.map((f) => ({ value: f.id, label: f.name, secondary: f.typeLabel }))}
          />
        </form>
      </Modal>
    </div>
  )
}

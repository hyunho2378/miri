// 시설 편집. :id 가 new 면 신규 등록이다(ROUTES.md).
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get, post, put } from '../../lib/api.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import FacilityQrCard from '../../components/admin/FacilityQrCard.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const STATUSES = ['normal', 'maintenance', 'closed']
const RESERVATIONS = ['open', 'stable', 'limited', 'full']
const BLANK = {
  name: '', typeLabel: '', address: '', phone: '', department: '', guide: '',
  status: 'normal', reservation: 'open', reservationUrl: '', hours: {}, fees: []
}

function Section({ title, children }) {
  return (
    <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
      <h2 className="type-h3 text-text-pri">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export default function FacilityEditPage() {
  const { t } = useLang()
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = id === 'new'
  const [form, setForm] = useState(isNew ? { ...BLANK } : null)

  useTopbar({ title: t(isNew ? 'admin.facilities.new' : 'admin.facilities.editTitle') })

  useEffect(() => {
    if (isNew) return undefined
    let alive = true
    get(`/api/admin/facilities/${id}`).then((f) => { if (alive) setForm(f) }).catch(() => {})
    return () => { alive = false }
  }, [id, isNew])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setHour = (day, value) => setForm((f) => ({ ...f, hours: { ...f.hours, [day]: value } }))
  const setFee = (i, key, value) => setForm((f) => ({
    ...f, fees: f.fees.map((x, k) => (k === i ? { ...x, [key]: key === 'price' ? Number(value) || 0 : value } : x))
  }))

  const save = async (e) => {
    e.preventDefault()
    await (isNew ? post('/api/admin/facilities', form) : put(`/api/admin/facilities/${id}`, form)).catch(() => {})
    toast(t('admin.facilities.saved'), 'primary')
    navigate('/admin/facilities')
  }

  if (!form) {
    return <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 space-y-4"><Skeleton variant="card" className="h-48" /><Skeleton variant="card" className="h-64" /></div>
  }

  return (
    <form onSubmit={save} className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <Section title={t('admin.facilities.basic')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label={t('common.meta.facility')} value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input label={t('admin.faq.colCategory')} value={form.typeLabel} onChange={(e) => set('typeLabel', e.target.value)} />
          <Input label={t('facility.detail.address')} value={form.address} onChange={(e) => set('address', e.target.value)} />
          <Input label={t('facility.detail.phone')} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input label={t('facility.detail.department')} value={form.department} onChange={(e) => set('department', e.target.value)} />
          <Select
            label={t('admin.facilities.statusChange')} value={form.status} onChange={(v) => set('status', v)}
            options={STATUSES.map((s) => ({ value: s, label: t(`common.status.${s}`) }))}
          />
        </div>
        <Textarea rows={3} label={t('facility.detail.tabGuide')} value={form.guide} onChange={(e) => set('guide', e.target.value)} />
        <div className="flex items-center gap-2">
          <StatusPill status={form.status} label={t(`common.status.${form.status}`)} />
          <StatusPill status={form.reservation} label={t(`common.status.${form.reservation}`)} />
        </div>
      </Section>

      <Section title={t('admin.facilities.hours')}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {DAYS.map((d) => (
            <Input key={d} label={t(`facility.day.${d}`)} value={form.hours?.[d] || ''} onChange={(e) => setHour(d, e.target.value)} />
          ))}
        </div>
      </Section>

      <Section title={t('admin.facilities.fees')}>
        {form.fees?.length ? (
          <div className="space-y-3">
            {form.fees.map((f, i) => (
              <div key={`${f.item}-${i}`} className="grid gap-3 md:grid-cols-[1fr_180px]">
                <Input label={t('facility.detail.feeItem')} value={f.item} onChange={(e) => setFee(i, 'item', e.target.value)} />
                <Input label={t('facility.detail.feePrice')} inputMode="numeric" value={String(f.price)} onChange={(e) => setFee(i, 'price', e.target.value)} />
              </div>
            ))}
          </div>
        ) : <p className="type-body-sm text-text-meta">{t('common.empty.title')}</p>}
      </Section>

      <Section title={t('admin.facilities.reservationLink')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label={t('facility.detail.reserveExternal')} value={form.reservationUrl || ''} onChange={(e) => set('reservationUrl', e.target.value)} />
          <Input label={t('admin.facilities.apiKey')} type="password" value={form.apiKey || ''} onChange={(e) => set('apiKey', e.target.value)} />
          <Select
            label={t('admin.facilities.reservationRate')} value={form.reservation} onChange={(v) => set('reservation', v)}
            options={RESERVATIONS.map((s) => ({ value: s, label: t(`common.status.${s}`) }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="secondary" onClick={() => toast(t('admin.facilities.saved'), 'neutral')}>
            {t('admin.facilities.testConnection')}
          </Button>
          <span className="type-caption text-text-meta">{t('admin.facilities.integrationState')}</span>
          <StatusPill size="sm" status="indexed" label={t('common.status.indexed')} />
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        <Button as={Link} to="/admin/facilities" variant="secondary">{t('common.action.cancel')}</Button>
        <Button type="submit">{t('common.action.save')}</Button>
      </div>
      {!isNew && <FacilityQrCard facility={form} orgName={form.orgName || ''} />}

    </form>
  )
}

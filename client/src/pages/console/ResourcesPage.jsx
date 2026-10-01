// 차량과 도우미(IA 4.4). 탭 두 개. ?tab=helpers. 차종 탑승 정원은 자문 전 가정값.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DataTable from '../../components/dashboard/DataTable.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import EditPencil from '../../components/edit/EditPencil.jsx'
import EntityForm, { msToYmd, validate, ymdToMs } from '../../components/edit/EntityForm.jsx'
import InlineEditBar from '../../components/edit/InlineEditBar.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import { GRADE_OPTIONS } from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import Toggle from '../../components/ui/Toggle.jsx'
import useToast from '../../hooks/useToast.js'
import { GRADES, OWNERS, VEHICLE_TYPES, gradeOf, typeOf } from '../../lib/shortage.js'
import { fmtDate } from '../../lib/time.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const DAY = 86400000
const capText = (type) => Object.entries(typeOf(type)?.capacity || {}).map(([g, n]) => `${gradeOf(g).label} ${n}명`).join(' ')

export default function ResourcesPage() {
  const vehicles = useMiriStore((s) => s.vehicles)
  const helpers = useMiriStore((s) => s.helpers)
  const villages = useMiriStore((s) => s.villages)
  const dongs = useMiriStore((s) => s.dongs)
  const today = useMiriStore((s) => s.today)
  const warnDays = useMiriStore((s) => s.settings.contractWarnDays)
  const upsertVehicle = useMiriStore((s) => s.upsertVehicle)
  const removeVehicle = useMiriStore((s) => s.removeVehicle)
  const upsertHelper = useMiriStore((s) => s.upsertHelper)
  const removeHelper = useMiriStore((s) => s.removeHelper)
  const canVehicle = useAuthStore((s) => s.canEdit('vehicles'))
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'helpers' ? 'helpers' : 'vehicles'
  const [form, setForm] = useState(null)   // { kind, mode, value }
  const [errors, setErrors] = useState({})

  const dongName = (c) => dongs.find((d) => d.code === c)?.name || c
  const vlabel = (c) => villages.find((v) => v.code === c)?.label || c

  const contractStatus = (v) => {
    if (!v.contractUntil) return null
    const left = (v.contractUntil - today) / DAY
    if (left < 0) return 'expired'
    if (left <= warnDays) return 'expiring'
    return null
  }

  const vehicleFields = [
    { key: 'code', label: '차량 코드', kind: 'text', required: true, disabled: form?.mode === 'edit', placeholder: 'V-21' },
    { key: 'type', label: '차종', kind: 'select', required: true, options: VEHICLE_TYPES.map((t) => ({ value: t.key, label: t.label, secondary: capText(t.key) })) },
    { key: 'owner', label: '소속', kind: 'select', required: true, options: Object.entries(OWNERS).map(([value, label]) => ({ value, label })) },
    { key: 'baseDong', label: '대기 동', kind: 'select', required: true, options: dongs.map((d) => ({ value: d.code, label: d.name })) },
    { key: 'contractUntil', label: '협약 만료일', kind: 'date', hint: '민간 협약 차량만. YYYY-MM-DD' },
    { key: 'note', label: '비고', kind: 'text' },
    { key: 'available', label: '대피 이송 가용', kind: 'toggle' }
  ]
  const helperFields = [
    { key: 'code', label: '도우미 코드', kind: 'text', required: true, disabled: form?.mode === 'edit', placeholder: 'H-029' },
    { key: 'villages', label: '담당 마을', kind: 'multiselect', required: true, options: villages.map((v) => ({ value: v.code, label: v.label })) },
    { key: 'grades', label: '지원 가능 등급', kind: 'multiselect', required: true, options: GRADE_OPTIONS.filter((g) => g.value !== 'bed') },
    { key: 'active', label: '활동 중', kind: 'toggle' }
  ]
  const fields = form?.kind === 'helper' ? helperFields : vehicleFields

  const save = () => {
    const errs = validate(fields, form.value)
    const list = form.kind === 'helper' ? helpers : vehicles
    if (form.mode === 'add' && list.some((x) => x.code === form.value.code)) errs.code = '이미 있는 코드'
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (form.kind === 'helper') upsertHelper({ channel: 'sms', ...form.value })
    else upsertVehicle({ ...form.value, contractUntil: form.value.contractUntil ? ymdToMs(form.value.contractUntil) : undefined })
    toast(`${form.value.code} 저장 완료`, 'primary')
    setForm(null)
  }
  const remove = () => {
    if (form.kind === 'helper') removeHelper(form.value.code)
    else removeVehicle(form.value.code)
    toast(`${form.value.code} 삭제 완료`)
    setForm(null)
  }
  const openVehicle = (v) => { setErrors({}); setForm({ kind: 'vehicle', mode: 'edit', value: { ...v, contractUntil: msToYmd(v.contractUntil) } }) }
  const openHelper = (h) => { setErrors({}); setForm({ kind: 'helper', mode: 'edit', value: { ...h } }) }

  const vehicleColumns = [
    { key: 'code', label: '차량 코드', sortable: true, render: (v) => <span className="type-strong tabular-nums">{v.code}</span> },
    { key: 'type', label: '차종', sortable: true, render: (v) => typeOf(v.type)?.label },
    { key: 'cap', label: '회차당 정원', hideBelow: 'lg', render: (v) => <span className="type-meta text-text-sec">{capText(v.type)}</span> },
    { key: 'owner', label: '소속', sortable: true, render: (v) => OWNERS[v.owner] },
    {
      key: 'contractUntil', label: '협약 만료일', sortable: true, sortValue: (v) => v.contractUntil || Infinity, hideBelow: 'md',
      render: (v) => (v.contractUntil ? (
        <span className="inline-flex flex-wrap items-center gap-2 tabular-nums">{fmtDate(v.contractUntil)}{contractStatus(v) && <StatusPill status={contractStatus(v)} size="sm" />}</span>
      ) : <span className="text-text-meta">해당 없음</span>)
    },
    { key: 'baseDong', label: '대기 동', hideBelow: 'lg', render: (v) => dongName(v.baseDong) },
    {
      key: 'available', label: '가용',
      render: (v) => (canVehicle
        ? <Toggle checked={v.available !== false} label={v.available !== false ? '가용' : (v.note || '불가')} onChange={(x) => upsertVehicle({ code: v.code, available: x })} />
        : <StatusPill status={v.available !== false ? 'available' : 'unavailable'} label={v.available !== false ? '가용' : (v.note || '불가')} />)
    },
    { key: 'edit', label: '편집', render: (v) => <EditPencil resource="vehicles" label={`${v.code} 수정`} onClick={() => openVehicle(v)} /> }
  ]
  const helperColumns = [
    { key: 'code', label: '도우미 코드', sortable: true, render: (h) => <span className="type-strong tabular-nums">{h.code}</span> },
    { key: 'villages', label: '담당 마을', render: (h) => <span className="type-body-sm">{h.villages.map(vlabel).join(', ')}</span> },
    { key: 'grades', label: '지원 등급', hideBelow: 'md', render: (h) => <span className="flex flex-wrap gap-1">{GRADES.filter((g) => h.grades.includes(g.key)).map((g) => <GradeChip key={g.key} grade={g.key} size="sm" />)}</span> },
    { key: 'channel', label: '연락 수단', hideBelow: 'lg', render: () => '문자' },
    { key: 'active', label: '상태', render: (h) => <StatusPill status={h.active !== false ? 'accept' : 'unavailable'} label={h.active !== false ? '활동 중' : '휴면'} /> },
    { key: 'edit', label: '편집', render: (h) => <EditPencil resource="helpers" label={`${h.code} 수정`} onClick={() => openHelper(h)} /> }
  ]

  const usable = vehicles.filter((v) => v.available !== false).length
  return (
    <PageShell title="차량과 도우미">
      <Tabs
        className="mb-4" value={tab}
        onChange={(t) => setParams(t === 'helpers' ? { tab: 'helpers' } : {})}
        items={[{ value: 'vehicles', label: `차량 ${vehicles.length}` }, { value: 'helpers', label: `도우미 ${helpers.length}` }]}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="type-body-sm text-text-sec tabular-nums">
          {tab === 'vehicles' ? `가용 ${usable}대 / 전체 ${vehicles.length}대` : `활동 중 ${helpers.filter((h) => h.active !== false).length}명. 침상 등급은 구급대원 담당이라 도우미 배정 제외`}
        </p>
        {tab === 'vehicles'
          ? <InlineEditBar resource="vehicles" addLabel="차량 추가" onAdd={() => { setErrors({}); setForm({ kind: 'vehicle', mode: 'add', value: { code: '', type: 'car', owner: 'contract', baseDong: 'MS', available: true, contractUntil: '', note: '' } }) }} />
          : <InlineEditBar resource="helpers" addLabel="도우미 추가" onAdd={() => { setErrors({}); setForm({ kind: 'helper', mode: 'add', value: { code: '', villages: [], grades: ['assist', 'walk'], active: true } }) }} />}
      </div>
      {tab === 'vehicles'
        ? <DataTable columns={vehicleColumns.filter((c) => c.key !== 'edit' || canVehicle)} rows={vehicles} rowKey={(v) => v.code} caption="차량 목록" />
        : <DataTable columns={helperColumns.filter((c) => c.key !== 'edit' || canVehicle)} rows={helpers} rowKey={(h) => h.code} caption="도우미 목록" />}

      <Drawer
        open={!!form} onClose={() => setForm(null)}
        title={form ? `${form.kind === 'helper' ? '도우미' : '차량'} ${form.mode === 'add' ? '추가' : form.value.code}` : ''}
        footer={form && (
          <>
            {form.mode === 'edit' && <Button variant="ghost" onClick={remove}>삭제</Button>}
            <Button variant="ghost" onClick={() => setForm(null)}>취소</Button>
            <Button variant="primary" onClick={save}>저장</Button>
          </>
        )}
      >
        {form && <EntityForm fields={fields} value={form.value} errors={errors} onChange={(value) => setForm({ ...form, value })} />}
      </Drawer>
    </PageShell>
  )
}

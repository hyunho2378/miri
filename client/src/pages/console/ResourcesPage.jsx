// 차량과 도우미(IA 4.4). 탭 세 개. ?tab=helpers, ?tab=shelters(대피소 승강기 확인). 차종 탑승 정원은 자문 전 가정값.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TableCard from '../../components/dashboard/TableCard.jsx'
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
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import { shelterLiftRows } from '../../lib/tripChecks.js'
import useToast from '../../hooks/useToast.js'
import { COMMITMENTS, GRADES, HELPER_ROLES, HELPER_AFFILIATIONS, affiliationLabel, OWNERS, VEHICLE_TYPES, commitmentOf, gradeOf, typeOf } from '../../lib/shortage.js'
import { vehicleChips } from '../../lib/vehicleSummary.js'
import { fmtDate } from '../../lib/time.js'
import { fmtKDate } from '../../components/miri/BasisLine.jsx'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const DAY = 86400000
const capText = (type) => Object.entries(typeOf(type)?.capacity || {}).map(([g, n]) => `${gradeOf(g).label} ${n}명`).join(' ')

export default function ResourcesPage() {
  const vehicles = useMiriStore((s) => s.vehicles)
  const helpers = useMiriStore((s) => s.helpers)
  const shelters = useMiriStore((s) => s.shelters)
  const persons = useMiriStore((s) => s.persons)
  const updateShelter = useMiriStore((s) => s.updateShelter)
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
  const tab = ['helpers', 'shelters'].includes(params.get('tab')) ? params.get('tab') : 'vehicles'
  const [form, setForm] = useState(null)   // { kind, mode, value }
  const [errors, setErrors] = useState({})
  // 협약을 확인하지 않은 차량을 먼저 본다(공무원 시점 검수: '확인 전 11대'가 첫 줄에 와야 할 일이 보임)
  const [onlyUnconfirmed, setOnlyUnconfirmed] = useState(false)

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
    { key: 'contractUntil', label: '협약 만료일', kind: 'date', hint: '민간 협약 차량에만 고릅니다.' },
    { key: 'commitment', label: '협약 상태', kind: 'select', options: Object.entries(COMMITMENTS).map(([value, label]) => ({ value, label })), hint: '협약이나 소유로 약속된 차량과 아직 확인하지 않은 차량을 나눕니다.' },
    { key: 'note', label: '비고', kind: 'text' },
    { key: 'available', label: '대피 이송 가용', kind: 'toggle' }
  ]
  const helperFields = [
    { key: 'code', label: '도우미 코드', kind: 'text', required: true, disabled: form?.mode === 'edit', placeholder: 'H-029' },
    { key: 'villages', label: '담당 마을', kind: 'multiselect', required: true, options: villages.map((v) => ({ value: v.code, label: v.label })) },
    { key: 'affiliation', label: '소속', kind: 'select', options: Object.entries(HELPER_AFFILIATIONS).map(([value, label]) => ({ value, label })), hint: '시가 1대1로 짝을 지정한 소속입니다. 지정 짝도 수락해야 배정됩니다.' },
    { key: 'grades', label: '지원 가능 등급', kind: 'multiselect', required: true, options: GRADE_OPTIONS.filter((g) => g.value !== 'bed') },
    { key: 'roles', label: '역할', kind: 'multiselect', options: Object.entries(HELPER_ROLES).map(([value, label]) => ({ value, label })), hint: '차량 동행을 고른 사람만 차량 배정 후보입니다.' },
    { key: 'consent', label: '사전 동의', kind: 'toggle', hint: '동의를 철회하면 배정 후보에서 빠집니다. 배정 알림에서 불가를 눌러도 불이익은 없습니다.' },
    { key: 'bls', label: '기본소생술 교육 이수', kind: 'toggle' },
    { key: 'insured', label: '봉사 상해보험 적용 확인', kind: 'toggle' },
    { key: 'active', label: '활동 중', kind: 'toggle' }
  ]
  const fields = form?.kind === 'helper' ? helperFields : vehicleFields

  const save = () => {
    const errs = validate(fields, form.value)
    const list = form.kind === 'helper' ? helpers : vehicles
    if (form.mode === 'add' && list.some((x) => x.code === form.value.code)) errs.code = '이미 등록된 코드입니다.'
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
    { key: 'cap', label: '한 번에 태우는 수', hideBelow: 'lg', render: (v) => <span className="type-meta text-text-sec">{capText(v.type)}</span> },
    { key: 'owner', label: '소속', sortable: true, render: (v) => OWNERS[v.owner] },
    {
      key: 'contractUntil', label: '협약 만료일', sortable: true, sortValue: (v) => v.contractUntil || Infinity, hideBelow: 'md',
      render: (v) => (v.contractUntil ? (
        <span className="inline-flex flex-wrap items-center gap-2 tabular-nums">{fmtDate(v.contractUntil)}{contractStatus(v) && <StatusPill status={contractStatus(v)} size="sm" />}</span>
      ) : <span className="text-text-meta">해당 없음</span>)
    },
    { key: 'baseDong', label: '대기 동', hideBelow: 'lg', render: (v) => dongName(v.baseDong) },
    { key: 'commitment', label: '협약 상태', sortable: true, sortValue: (v) => commitmentOf(v), hideBelow: 'md', render: (v) => <span className="type-body-sm text-text-sec">{COMMITMENTS[commitmentOf(v)]}</span> },
    {
      key: 'available', label: '출동',
      render: (v) => (canVehicle
        ? <Toggle checked={v.available !== false} label={v.available !== false ? '출동 가능' : (v.note || '제외')} onChange={(x) => upsertVehicle({ code: v.code, available: x })} />
        : <StatusPill status={v.available !== false ? 'available' : 'unavailable'} label={v.available !== false ? '출동 가능' : (v.note || '제외')} />)
    },
    { key: 'edit', label: '편집', render: (v) => <EditPencil resource="vehicles" label={`${v.code} 수정`} onClick={() => openVehicle(v)} /> }
  ]
  const helperColumns = [
    { key: 'code', label: '도우미 코드', sortable: true, render: (h) => <span className="type-strong tabular-nums">{h.code}</span> },
    { key: 'villages', label: '담당 마을', render: (h) => <span className="type-body-sm">{h.villages.map(vlabel).join(', ')}</span> },
    { key: 'affiliation', label: '소속', sortable: true, sortValue: (h) => affiliationLabel(h), hideBelow: 'md', render: (h) => <span className="type-body-sm text-text-sec">{affiliationLabel(h)}</span> },
    { key: 'grades', label: '지원 등급', hideBelow: 'md', render: (h) => <span className="flex flex-wrap gap-1">{GRADES.filter((g) => h.grades.includes(g.key)).map((g) => <GradeChip key={g.key} grade={g.key} size="sm" />)}</span> },
    { key: 'channel', label: '연락 수단', hideBelow: 'lg', render: () => '문자' },
    {
      key: 'consent', label: '동의와 교육', hideBelow: 'md',
      render: (h) => (
        <span className="type-body-sm text-text-sec">
          {h.consent === false ? '동의 철회' : h.consentAt ? '동의' : '동의 기록 없음'}
          {Array.isArray(h.roles) && h.roles.length ? `, ${h.roles.map((r) => HELPER_ROLES[r] || r).join(', ')}` : ''}
          {h.bls ? ', 기본소생술 이수' : ''}{h.insured ? ', 상해보험 확인' : ''}
        </span>
      )
    },
    { key: 'active', label: '상태', render: (h) => <StatusPill status={h.active !== false ? 'accept' : 'unavailable'} label={h.active !== false ? '활동 중' : '휴면'} /> },
    { key: 'edit', label: '편집', render: (h) => <EditPencil resource="helpers" label={`${h.code} 수정`} onClick={() => openHelper(h)} /> }
  ]

  const shelterRows = shelterLiftRows(shelters, villages, persons)
  const liftAlerts = shelterRows.filter((r) => r.liftAlert).length
  const LIFT_LABEL = { yes: '있음', no: '없음', unchecked: '승강기 확인 필요' }
  const shelterColumns = [
    { key: 'name', label: '대피소', render: (r) => <span className="type-strong">{r.name}</span> },
    { key: 'capacity', label: '수용', hideBelow: 'md', render: (r) => <span className="tabular-nums">{(r.capacity || 0).toLocaleString('ko-KR')}명</span> },
    { key: 'liftNeed', label: '휠체어와 침상 대상자', render: (r) => <span className="tabular-nums">{r.liftNeed ? `${r.liftNeed.toLocaleString('ko-KR')}명` : '없음'}</span> },
    {
      key: 'lift', label: '승강기와 진입로',
      render: (r) => (canVehicle
        ? <SegmentControl label={`${r.name} 승강기와 진입로`} value={r.liftStatus} onChange={(x) => { updateShelter(r.code, { liftAccess: x === 'yes' ? true : x === 'no' ? false : null }); toast(`${r.name}: ${LIFT_LABEL[x]}`) }} items={[{ value: 'unchecked', label: '미확인' }, { value: 'yes', label: '있음' }, { value: 'no', label: '없음' }]} />
        : <StatusPill status={r.liftStatus === 'yes' ? 'available' : r.liftStatus === 'no' ? 'unavailable' : 'expiring'} label={LIFT_LABEL[r.liftStatus]} />)
    },
    {
      key: 'checked', label: '확인 날짜', hideBelow: 'md',
      render: (r) => (r.liftAlert
        ? <span className="type-body-sm text-danger-text">{r.liftStatus === 'no' ? '없음, 배정 전 다른 대피소 검토' : '승강기 확인 필요'}</span>
        : <span className="type-body-sm text-text-sec tabular-nums">{r.liftCheckedAt ? fmtDate(r.liftCheckedAt) : '기록 없음'}</span>)
    }
  ]

  const unconfirmedCount = vehicles.filter((v) => commitmentOf(v) === 'unconfirmed').length
  const vehicleRows = vehicles
    .filter((v) => !onlyUnconfirmed || commitmentOf(v) === 'unconfirmed')
    .slice().sort((a, b) => (commitmentOf(a) === 'unconfirmed' ? 0 : 1) - (commitmentOf(b) === 'unconfirmed' ? 0 : 1))

  return (
    <PageShell title="차량과 도우미">
      <Tabs
        className="mb-4" value={tab}
        onChange={(t) => setParams(t === 'vehicles' ? {} : { tab: t })}
        items={[{ value: 'vehicles', label: `차량 ${vehicles.length}` }, { value: 'helpers', label: `도우미 ${helpers.length}` }, { value: 'shelters', label: liftAlerts ? `대피소 확인 ${liftAlerts}` : `대피소 ${shelters.length}` }]}
      />
      {tab === 'shelters' ? (
        <TableCard
          key="shelters" title="대피소 승강기와 진입로" count={`확인 필요 ${liftAlerts}곳 / 전체 ${shelters.length}곳`}
         
          columns={shelterColumns} rows={shelterRows} rowKey={(r) => r.code} caption="대피소 승강기 확인 목록"
        />
      ) : tab === 'vehicles' ? (
        <>
        {unconfirmedCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="type-body text-text-pri">협약 미확정 차량 <strong className="type-strong tabular-nums">{unconfirmedCount}대</strong></p>
            <Button variant={onlyUnconfirmed ? 'secondary' : 'primary'} size="sm" onClick={() => setOnlyUnconfirmed((v) => !v)}>
              {onlyUnconfirmed ? '전체 차량 보기' : '협약 확인'}
            </Button>
          </div>
        )}
        <TableCard
          key="vehicles" title="차량" count={vehicleChips(vehicles)}
          actions={<InlineEditBar resource="vehicles" addLabel="차량 추가" onAdd={() => { setErrors({}); setForm({ kind: 'vehicle', mode: 'add', value: { code: '', type: 'car', owner: 'request', baseDong: 'MS', available: true, contractUntil: '', note: '', commitment: 'unconfirmed' } }) }} />}
          columns={vehicleColumns.filter((c) => c.key !== 'edit' || canVehicle)} rows={vehicleRows} rowKey={(v) => v.code} caption="차량 목록"
        />
        </>
      ) : (
        <TableCard
          key="helpers" title="도우미" count={`활동 중 ${helpers.filter((h) => h.active !== false).length} / 전체 ${helpers.length}명`}
          actions={<InlineEditBar resource="helpers" addLabel="도우미 추가" onAdd={() => { setErrors({}); setForm({ kind: 'helper', mode: 'add', value: { code: '', villages: [], grades: ['assist', 'walk'], roles: ['ride'], consent: true, consentAt: Date.now(), bls: false, insured: false, active: true } }) }} />}
          columns={helperColumns.filter((c) => c.key !== 'edit' || canVehicle)} rows={helpers} rowKey={(h) => h.code} caption="도우미 목록"
        />
      )}

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

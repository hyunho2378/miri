// 차량과 도우미(IA 4.4). 탭 세 개. ?tab=helpers, ?tab=shelters(대피소 승강기 확인). 차종 탑승 정원은 자문 전 가정값.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import DataList from '../../components/console/DataList.jsx'
import InfoRows from '../../components/console/InfoRows.jsx'
import PageHeader from '../../components/console/PageHeader.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import EntityForm, { msToYmd, validate, ymdToMs } from '../../components/edit/EntityForm.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import { GRADE_OPTIONS } from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
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
  // 목록에서 고른 줄(탭마다 따로). 고르지 않으면 첫 줄
  const [selVehicle, setSelVehicle] = useState(null)
  const [selHelper, setSelHelper] = useState(null)
  const [selShelter, setSelShelter] = useState(null)

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

  // 목록 열은 필수만. 소속, 협약 만료일, 대기 동, 한 번에 태우는 수, 비고는 오른쪽 상세
  const vehicleColumns = [
    { key: 'code', label: '차량 코드', sortable: true, render: (v) => <span className="type-strong tabular-nums">{v.code}</span> },
    { key: 'type', label: '차종', sortable: true, render: (v) => typeOf(v.type)?.label },
    { key: 'commitment', label: '협약 상태', sortable: true, sortValue: (v) => commitmentOf(v), render: (v) => <span className={commitmentOf(v) === 'unconfirmed' ? 'type-strong text-text-pri' : 'text-text-sec'}>{COMMITMENTS[commitmentOf(v)]}</span> },
    { key: 'contractUntil', label: '협약 만료일', sortable: true, sortValue: (v) => v.contractUntil || Infinity, render: (v) => (v.contractUntil ? <span className={contractStatus(v) ? 'type-strong text-danger-text' : 'text-text-sec'}>{fmtDate(v.contractUntil)}</span> : <span className="text-text-meta">해당 없음</span>) },
    { key: 'available', label: '출동', render: (v) => <span className={v.available !== false ? 'text-text-sec' : 'type-strong text-text-pri'}>{v.available !== false ? '출동 가능' : (v.note || '제외')}</span> }
  ]
  const vehicleGrid = 'minmax(5.5rem,1fr) minmax(6.5rem,1.3fr) minmax(5.5rem,1fr) minmax(6.5rem,1.1fr) minmax(5.5rem,1fr)'
  const helperColumns = [
    { key: 'code', label: '도우미 코드', sortable: true, render: (h) => <span className="type-strong tabular-nums">{h.code}</span> },
    { key: 'villages', label: '담당 마을', render: (h) => <span className="type-body-sm">{h.villages.map(vlabel).join(', ')}</span> },
    { key: 'affiliation', label: '소속', sortable: true, sortValue: (h) => affiliationLabel(h), render: (h) => <span className="type-body-sm text-text-sec">{affiliationLabel(h)}</span> },
    { key: 'grades', label: '지원 등급', render: (h) => <span className="type-body-sm text-text-sec">{GRADES.filter((g) => h.grades.includes(g.key)).map((g) => g.label).join(', ')}</span> },
    { key: 'active', label: '상태', render: (h) => <span className={h.active !== false ? 'text-text-sec' : 'type-strong text-text-pri'}>{h.active !== false ? '활동 중' : '휴면'}</span> }
  ]
  const helperGrid = 'minmax(5.5rem,1fr) minmax(6.5rem,1.2fr) minmax(5.5rem,1fr) minmax(8rem,1.4fr) minmax(4.5rem,0.7fr)'

  const shelterRows = shelterLiftRows(shelters, villages, persons)
  const liftAlerts = shelterRows.filter((r) => r.liftAlert).length
  const LIFT_LABEL = { yes: '있음', no: '없음', unchecked: '승강기 확인 필요' }
  const shelterColumns = [
    { key: 'name', label: '대피소', render: (r) => <span className="type-strong">{r.name}</span> },
    { key: 'capacity', label: '수용', sortValue: (r) => r.capacity || 0, sortable: true, render: (r) => <span className="font-normal tabular-nums text-text-sec">{(r.capacity || 0).toLocaleString('ko-KR')}명</span> },
    { key: 'liftNeed', label: '휠체어와 침상', sortValue: (r) => r.liftNeed || 0, sortable: true, render: (r) => <span className="font-normal tabular-nums text-text-sec">{r.liftNeed ? `${r.liftNeed.toLocaleString('ko-KR')}명` : '없음'}</span> },
    { key: 'lift', label: '승강기와 진입로', render: (r) => <span className={r.liftAlert ? 'type-strong text-danger-text' : 'text-text-sec'}>{LIFT_LABEL[r.liftStatus]}</span> }
  ]
  const shelterGrid = 'minmax(8rem,1.6fr) minmax(5rem,0.8fr) minmax(6.5rem,1fr) minmax(8rem,1.3fr)'

  const unconfirmedCount = vehicles.filter((v) => commitmentOf(v) === 'unconfirmed').length
  // 차종별로 풀어 보여, 부족분 계산의 협약 대수와 어떤 관계인지 한 줄로 읽히게 한다
  const unconfirmedByType = Object.entries(vehicles.filter((v) => commitmentOf(v) === 'unconfirmed').reduce((a, v) => { const l = typeOf(v.type)?.label || v.type; a[l] = (a[l] || 0) + 1; return a }, {})).map(([l, n]) => `${l} ${n}대`).join(', ')
  const vehicleRows = vehicles
    .filter((v) => !onlyUnconfirmed || commitmentOf(v) === 'unconfirmed')
    .slice().sort((a, b) => (commitmentOf(a) === 'unconfirmed' ? 0 : 1) - (commitmentOf(b) === 'unconfirmed' ? 0 : 1))

  const vehicle = vehicleRows.find((v) => v.code === selVehicle) || vehicleRows[0] || null
  const helper = helpers.find((h) => h.code === selHelper) || helpers[0] || null
  const shelter = shelterRows.find((r) => r.code === selShelter) || shelterRows[0] || null

  // 오른쪽 상세 공통 틀: 머리(이름과 상태), 본문(내부 스크롤), 아래 고정 단추
  const pane = (label, head, body, foot) => (
    <section aria-label={label} className="flex min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 pb-3">{head}</div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">{body}</div>
      {foot && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-3">{foot}</div>}
    </section>
  )
  const listHead = (title, count, sub) => (
    <h2 className="shrink-0 pb-2 type-title text-text-pri">
      {title} <span className="font-normal tabular-nums text-text-sec">{count}</span>
      {sub && <span className="font-normal text-text-sec tabular-nums">, {sub}</span>}
    </h2>
  )

  const vehicleDetail = vehicle ? pane('선택한 차량',
    <>
      <h2 className="type-title tabular-nums text-text-pri">{vehicle.code}</h2>
      <span className="type-body text-text-sec">{typeOf(vehicle.type)?.label}</span>
      <StatusPill status={commitmentOf(vehicle) === 'unconfirmed' ? 'expiring' : 'available'} label={COMMITMENTS[commitmentOf(vehicle)]} />
    </>,
    <InfoRows rows={[
      { label: '협약 상태', value: COMMITMENTS[commitmentOf(vehicle)], strong: true },
      { label: '소속', value: OWNERS[vehicle.owner] || '소속 확인 필요' },
      { label: '협약 만료일', value: vehicle.contractUntil ? <span className="inline-flex flex-wrap items-center gap-2">{fmtDate(vehicle.contractUntil)}{contractStatus(vehicle) && <StatusPill status={contractStatus(vehicle)} size="sm" />}</span> : '해당 없음' },
      { label: '대기 동', value: dongName(vehicle.baseDong) },
      { label: '한 번에 태우는 수', value: capText(vehicle.type) },
      { label: '출동', value: canVehicle
        ? <Toggle checked={vehicle.available !== false} label={vehicle.available !== false ? '출동 가능' : (vehicle.note || '제외')} onChange={(x) => upsertVehicle({ code: vehicle.code, available: x })} />
        : (vehicle.available !== false ? '출동 가능' : (vehicle.note || '제외')) },
      { label: '비고', value: vehicle.note || '없음' }
    ]} />,
    <>
      {commitmentOf(vehicle) === 'unconfirmed' && <Button as={Link} to="/console/shortage" variant="secondary">필요한 협약 대수 보기</Button>}
      {canVehicle && <Button variant="primary" onClick={() => openVehicle(vehicle)}>수정</Button>}
    </>
  ) : <EmptyState compact title="표시할 차량 없음" />

  const helperDetail = helper ? pane('선택한 도우미',
    <>
      <h2 className="type-title tabular-nums text-text-pri">{helper.code}</h2>
      <span className="type-body text-text-sec">{affiliationLabel(helper)}</span>
      <StatusPill status={helper.active !== false ? 'accept' : 'unavailable'} label={helper.active !== false ? '활동 중' : '휴면'} />
    </>,
    <InfoRows rows={[
      { label: '담당 마을', value: helper.villages.map(vlabel).join(', '), strong: true },
      { label: '지원 가능 등급', value: <span className="inline-flex flex-wrap gap-1">{GRADES.filter((g) => helper.grades.includes(g.key)).map((g) => <GradeChip key={g.key} grade={g.key} size="sm" />)}</span> },
      { label: '역할', value: Array.isArray(helper.roles) && helper.roles.length ? helper.roles.map((r) => HELPER_ROLES[r] || r).join(', ') : '없음' },
      { label: '연락 수단', value: '문자' },
      { label: '사전 동의', value: helper.consent === false ? '동의 철회' : helper.consentAt ? '동의' : '동의 기록 없음' },
      { label: '기본소생술 교육', value: helper.bls ? '이수' : '미이수' },
      { label: '봉사 상해보험', value: helper.insured ? '적용 확인' : '확인 전' }
    ]} />,
    canVehicle && <Button variant="primary" onClick={() => openHelper(helper)}>수정</Button>
  ) : <EmptyState compact title="표시할 도우미 없음" />

  const shelterDetail = shelter ? pane('선택한 대피소',
    <>
      <h2 className="type-title text-text-pri">{shelter.name}</h2>
      <StatusPill status={shelter.liftStatus === 'yes' ? 'available' : shelter.liftStatus === 'no' ? 'unavailable' : 'expiring'} label={LIFT_LABEL[shelter.liftStatus]} />
    </>,
    <InfoRows rows={[
      { label: '수용', value: `${(shelter.capacity || 0).toLocaleString('ko-KR')}명` },
      { label: '휠체어와 침상 대상자', value: shelter.liftNeed ? `${shelter.liftNeed.toLocaleString('ko-KR')}명` : '없음' },
      { label: '승강기와 진입로', strong: true, value: canVehicle
        ? <SegmentControl label={`${shelter.name} 승강기와 진입로`} value={shelter.liftStatus} onChange={(x) => { updateShelter(shelter.code, { liftAccess: x === 'yes' ? true : x === 'no' ? false : null }); toast(`${shelter.name}: ${LIFT_LABEL[x]}`) }} items={[{ value: 'unchecked', label: '미확인' }, { value: 'yes', label: '있음' }, { value: 'no', label: '없음' }]} />
        : LIFT_LABEL[shelter.liftStatus] },
      { label: '확인 날짜', value: shelter.liftAlert ? (shelter.liftStatus === 'no' ? '없음, 배정 전 다른 대피소 검토' : '승강기 확인 필요') : (shelter.liftCheckedAt ? fmtDate(shelter.liftCheckedAt) : '기록 없음') }
    ]} />,
    null
  ) : <EmptyState compact title="표시할 대피소 없음" />

  const tabItems = [{ value: 'vehicles', label: `차량 ${vehicles.length}` }, { value: 'helpers', label: `도우미 ${helpers.length}` }, { value: 'shelters', label: liftAlerts ? `대피소 확인 ${liftAlerts}` : `대피소 ${shelters.length}` }]
  const addAction = canVehicle && tab !== 'shelters' && (
    <Button variant="primary" leftIcon={<Plus size={16} aria-hidden="true" />} onClick={() => {
      setErrors({})
      if (tab === 'helpers') setForm({ kind: 'helper', mode: 'add', value: { code: '', villages: [], grades: ['assist', 'walk'], roles: ['ride'], consent: true, consentAt: Date.now(), bls: false, insured: false, active: true } })
      else setForm({ kind: 'vehicle', mode: 'add', value: { code: '', type: 'car', owner: 'request', baseDong: 'MS', available: true, contractUntil: '', note: '', commitment: 'unconfirmed' } })
    }}>{tab === 'helpers' ? '도우미 추가' : '차량 추가'}</Button>
  )
  const grid = 'grid min-h-0 flex-1 gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(380px,1fr)]'
  const listCls = 'flex min-h-0 flex-col max-lg:max-h-[50vh]'

  return (
    <PageShell title="차량과 도우미" hideHeader className="flex flex-col lg:h-full lg:pb-4">
      <PageHeader
        title="차량과 도우미" className="!mb-3 shrink-0"
        action={(
          <>
            <SegmentControl label="보기" value={tab} onChange={(t) => setParams(t === 'vehicles' ? {} : { tab: t })} items={tabItems} />
            {addAction}
          </>
        )}
      />
      {tab === 'shelters' ? (
        <div className={grid}>
          <section aria-label="대피소 목록" className={listCls}>
            {listHead('대피소', `${shelters.length}곳`, `승강기 확인 필요 ${liftAlerts}곳`)}
            <DataList label="대피소 목록" columns={shelterColumns} grid={shelterGrid} rows={shelterRows} rowKey={(r) => r.code} selectedKey={shelter?.code} onSelect={setSelShelter} />
          </section>
          {shelterDetail}
        </div>
      ) : tab === 'vehicles' ? (
        <>
          {unconfirmedCount > 0 && (
            <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
              <p className="type-body text-text-pri tabular-nums">협약 미확정 차량 <strong className="type-strong">{unconfirmedCount}대</strong>({unconfirmedByType})</p>
              <Button variant={onlyUnconfirmed ? 'secondary' : 'primary'} size="sm" onClick={() => setOnlyUnconfirmed((v) => !v)}>
                {onlyUnconfirmed ? '전체 차량 보기' : '미확정 차량만 보기'}
              </Button>
              <Button as={Link} to="/console/shortage" variant="secondary" size="sm">필요한 협약 대수 보기</Button>
            </div>
          )}
          <div className={grid}>
            <section aria-label="차량 목록" className={listCls}>
              {listHead('차량', `${vehicleRows.length}대`, vehicleChips(vehicles))}
              <DataList label="차량 목록" columns={vehicleColumns} grid={vehicleGrid} rows={vehicleRows} rowKey={(v) => v.code} selectedKey={vehicle?.code} onSelect={setSelVehicle} emptyTitle="조건에 맞는 차량 없음" />
            </section>
            {vehicleDetail}
          </div>
        </>
      ) : (
        <div className={grid}>
          <section aria-label="도우미 목록" className={listCls}>
            {listHead('도우미', `${helpers.length}명`, `활동 중 ${helpers.filter((h) => h.active !== false).length}명`)}
            <DataList label="도우미 목록" columns={helperColumns} grid={helperGrid} rows={helpers} rowKey={(h) => h.code} selectedKey={helper?.code} onSelect={setSelHelper} emptyTitle="등록된 도우미 없음" />
          </section>
          {helperDetail}
        </div>
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

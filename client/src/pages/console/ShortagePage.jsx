// 부족분 계산(IA 4.5). 위에서 아래 한 흐름: 결론 문장, 왜 그런지, 무엇을 늘리면 줄어드는지, 마을별 표, 접힌 계산 방법과 근거.
// 마을별 값은 배정 규칙으로 시뮬레이션한 미이송 수. 조건을 바꾸면 결과가 바로 다시 계산된다.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Save, SlidersHorizontal, Star } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import { PageHeader, StatusBand, NumberFlow, ListItem, Section, InfoRows } from '../../components/console/index.js'
import TableCard from '../../components/dashboard/TableCard.jsx'
import { basisText } from '../../components/miri/BasisLine.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ShortageTable from '../../components/miri/ShortageTable.jsx'
import ShortageValue from '../../components/miri/ShortageValue.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Disclosure from '../../components/ui/Disclosure.jsx'
import Input from '../../components/ui/Input.jsx'
import NumberStepper from '../../components/ui/NumberStepper.jsx'
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import Select from '../../components/ui/Select.jsx'
import useToast from '../../hooks/useToast.js'
import { OWNERS, EXTRA_TYPE, GRADES, commitmentOf, typeOf } from '../../lib/shortage.js'
import { BOTTLENECK_LABEL, TIME_BANDS, bandOf, bottleneck, computeShortage, requiredExtraVehicles } from '../../lib/shortageCalc.js'
import { vehicleChips } from '../../lib/vehicleSummary.js'
import { BOARDING_STEPS, boardingLabel } from '../../lib/boardingSensitivity.js'
import { agreedOnlyPlan } from '../../lib/agreedPlan.js'
import { calcStamp } from '../../lib/basis.js'
import useNow from '../../hooks/useNow.js'
import useBoardingRecommended from '../../hooks/useBoardingRecommended.js'
import { Link } from 'react-router-dom'
import { fireScenario } from '../../lib/scenario.js'
import { fmtElapsed } from '../../lib/geo.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import { LTC } from '../../mock/donghaeData.js'

const LTC_DAYCARE = LTC.dayCareUsers?.['계'] || 0

const MAX_SCENARIOS = 5
// 기본 시나리오(시드)는 저장 한도에서 빼고 사용자가 저장한 것만 센다
export const userScenarioCount = (list) => list.filter((x) => !x.builtin).length
// 탑승과 하차 시간 민감도. 현재 가정값(설정)을 가운데에 두고 앞뒤로 본다
const EXTRA_TYPES = [...new Set(Object.values(EXTRA_TYPE))]

const offsetText = (h) => `+${fmtElapsed(h)}`
const completeText = (h) => (h ? `산불 도달 ${h}시간 전까지` : '산불 도달 시각까지')
const prepText = (m) => (m === 60 ? '1시간' : m === 90 ? '1시간 30분' : `${m}분`)

export default function ShortagePage() {
  const persons = useMiriStore((s) => s.persons)
  const villages = useMiriStore((s) => s.villages)
  const vehicles = useMiriStore((s) => s.vehicles)
  const helpers = useMiriStore((s) => s.helpers)
  const settings = useMiriStore((s) => s.settings)
  const dongs = useMiriStore((s) => s.dongs)
  const today = useMiriStore((s) => s.today)
  const now = useNow(60000)
  const scenarios = useMiriStore((s) => s.scenarios)
  const activeId = useMiriStore((s) => s.activeScenarioId)
  const saveScenario = useMiriStore((s) => s.saveScenario)
  const removeScenario = useMiriStore((s) => s.removeScenario)
  const setActiveScenario = useMiriStore((s) => s.setActiveScenario)
  const canEdit = useAuthStore((s) => s.canEdit('scenarios'))
  const toast = useToast()
  const panelId = useId()

  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(activeId)
  const base = scenarios.find((s) => s.id === selectedId) || scenarios[0]
  const [draft, setDraft] = useState(() => structuredClone(base))
  const [name, setName] = useState('')
  // 처음 열 때는 draft 가 이미 base 와 같으므로 다시 넣지 않는다(같은 계산을 두 번 하지 않게)
  const shownId = useRef(selectedId)
  useEffect(() => {
    if (shownId.current === selectedId) return
    shownId.current = selectedId
    setDraft(structuredClone(base)); setName('')
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const input = { persons, villages, vehicles, helpers, settings, scenario: draft, t0: today }
  const result = useMemo(() => computeShortage(input), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const extra = useMemo(() => requiredExtraVehicles(input, result), [result]) // eslint-disable-line react-hooks/exhaustive-deps
  const compare = useMemo(() => scenarios.map((sc) => ({ sc, r: computeShortage({ ...input, scenario: sc }) })), [scenarios, persons, villages, vehicles, helpers, settings, today]) // eslint-disable-line react-hooks/exhaustive-deps
  // 계산 방법과 근거(회신 R17, R24, R27). 지금 조건에서 시간대와 탑승 시간만 바꿔 다시 계산한다
  const bandCompare = useMemo(() => TIME_BANDS.map((b) => ({ b, r: computeShortage({ ...input, scenario: { ...draft, timeBand: b.value } }) })), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const boardingNow = settings.boardingMinutes ?? 20
  const boardingCompare = useMemo(() => [...new Set([...BOARDING_STEPS, boardingNow])].sort((a, b) => a - b).map((m) => ({ m, r: computeShortage({ ...input, settings: { ...settings, boardingMinutes: m } }) })), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  // 추천 배정 값은 탐색이 무거워 화면을 먼저 그린 뒤 따로 채운다(값은 같음)
  const boardingRec = useBoardingRecommended(input, boardingCompare.map((x) => x.m))
  // 결론 먼저: 지금 조건의 1.5배가 걸리면 몇 명이 더 못 옮기는지
  const boardingLead = (() => {
    const now1 = boardingCompare.find((x) => x.m === boardingNow)
    const slow = boardingCompare.find((x) => x.m === Math.round(boardingNow * 1.5))
    return now1 && slow && slow.m !== now1.m ? `태우고 내리는 시간이 ${slow.m}분으로 1.5배가 되면 못 옮기는 사람이 ${now1.r.total}명에서 ${slow.r.total}명으로 늘어납니다.` : ''
  })()
  // 차량 가용 확실성(회신 R01): 약속된 차량만 쓸 때의 결과를 나란히 본다
  const agreedCompare = useMemo(() => {
    const agreed = vehicles.filter((v) => commitmentOf(v) !== 'unconfirmed')
    return { all: result.total, agreed: computeShortage({ ...input, vehicles: agreed }).total, unconfirmed: vehicles.length - agreed.length }
  }, [result, persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  // 약속된 차량만 쓸 때 필요한 협약 구성(플랫폼 46회차, 1026 복지관 면담)
  const agreedPlan = useMemo(() => agreedOnlyPlan(input), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  // 병목 확인(회신 R45): 차량 1대와 도우미 1명을 각각 더해 같은 규칙으로 다시 계산
  const neck = useMemo(() => bottleneck(input), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(base)

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  // 확산 조건(속도, 사전 발령, 범위)을 바꾸면 도달 시각과 대피 대상 구역을 다시 만든다. 마을별 수동 조정은 초기화된다
  const setFire = (patch) => setDraft((d) => {
    const next = fireScenario({ ...d, ...patch, villages })
    return { ...d, ...patch, windowHours: next.windowHours, offsetHours: next.offsetHours, affected: next.affected, alongKm: next.alongKm, manual: {} }
  })
  const setOffset = (code, h) => setDraft((d) => ({ ...d, offsetHours: { ...d.offsetHours, [code]: h }, manual: { ...d.manual, [code]: true } }))
  const setExtra = (type, n) => setDraft((d) => ({ ...d, extraVehicles: { ...d.extraVehicles, [type]: n } }))

  const saveAsNew = () => {
    if (userScenarioCount(scenarios) >= MAX_SCENARIOS) { toast(`시나리오는 최대 ${MAX_SCENARIOS}개까지 저장합니다. 기존 시나리오를 삭제한 뒤 저장해 주십시오.`, 'danger'); return }
    const id = `S-${Math.max(0, ...scenarios.map((s) => Number(s.id.split('-')[1]) || 0)) + 1}`
    saveScenario({ ...draft, id, name: name.trim() || `${base.name} 변형` })
    setSelectedId(id)
    toast('시나리오를 저장했습니다.', 'primary')
  }
  const overwrite = () => { saveScenario({ ...draft, id: base.id }); toast(`${base.name} 시나리오를 갱신했습니다.`, 'primary') }

  const compareCols = [
    {
      key: 'name', label: '시나리오',
      render: ({ sc }) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="type-strong text-text-pri">{sc.name}</span>
          {sc.id === activeId && <Badge tone="primary">현황판 기준</Badge>}
        </span>
      )
    },
    { key: 'scope', label: '대피 대상', render: ({ r }) => <span className="whitespace-nowrap tabular-nums">{r.scopeVillages}곳 {r.scopeTargets}명</span> },
    { key: 'first', label: '첫 도달', hideBelow: 'md', render: ({ sc }) => <span className="whitespace-nowrap">발령 후 {fmtElapsed(sc.windowHours)}</span> },
    { key: 'prep', label: '준비 시간', hideBelow: 'lg', render: ({ sc }) => <span className="whitespace-nowrap">{sc.prepMinutes}분</span> },
    { key: 'band', label: '시간대', hideBelow: 'lg', render: ({ sc }) => <span className="whitespace-nowrap">{bandOf(sc).label}{(sc.availability ?? 100) < 100 ? `, 차량 ${sc.availability}%` : ''}</span> },
    { key: 'complete', label: '완료 기한', hideBelow: 'lg', render: ({ sc }) => <span className="whitespace-nowrap">{completeText(sc.completeBeforeHours)}</span> },
    { key: 'extra', label: '추가 차량', hideBelow: 'lg', render: ({ sc }) => <span className="type-meta text-text-sec">{Object.entries(sc.extraVehicles || {}).filter(([, n]) => n).map(([t, n]) => `${typeOf(t).label} ${n}대`).join(', ') || '없음'}</span> },
    ...GRADES.map((g) => ({ key: g.key, label: g.label, align: 'right', hideBelow: 'md', render: ({ r }) => r.byGrade[g.key] || '-' })),
    {
      key: 'total', label: '못 옮기는 사람', align: 'right',
      render: ({ r }) => <span className={`type-strong whitespace-nowrap ${r.total ? 'text-danger-text' : 'text-text-sec'}`}>{r.total}명</span>
    },
    ...(canEdit ? [{
      key: 'actions', label: '관리', align: 'right',
      render: ({ sc }) => (sc.id !== activeId ? (
        <span className="inline-flex gap-1">
          <Button size="sm" variant="ghost" aria-label={`${sc.name} 현황판 기준 지정`} leftIcon={<Star size={14} aria-hidden="true" />} onClick={() => { setActiveScenario(sc.id); toast(`현황판 기준 지정: ${sc.name}`, 'primary') }}>기준 지정</Button>
          {scenarios.length > 1 && <Button size="sm" variant="ghost" aria-label={`${sc.name} 시나리오 삭제`} onClick={() => { removeScenario(sc.id); if (selectedId === sc.id) setSelectedId(activeId); toast('시나리오를 삭제했습니다.') }}>삭제</Button>}
        </span>
      ) : null)
    }] : [])
  ]

  const extraLine = extra.length ? extra.map((e) => `${e.typeLabel} ${e.count}대`).join(', ') : null
  const extraSummary = Object.entries(draft.extraVehicles || {}).filter(([, n]) => n).map(([t, n]) => `${typeOf(t).label} ${n}대`).join(', ') || '없음'
  const changedVillages = Object.keys(draft.manual || {}).length
  const scopeSet = new Set(draft.affected || villages.map((v) => v.code))
  const fireLine = draft.kind === 'fire' ? `발화 ${draft.originLabel}, 확산 시속 ${draft.speedKmh}km, 첫 도달 발령 후 ${fmtElapsed(draft.windowHours)}, 대피 대상 ${result.scopeVillages}곳 ${result.scopeTargets}명, ` : `대피 대상 ${result.scopeVillages}곳 ${result.scopeTargets}명, `
  const bandLine = `${bandOf(draft).label}${(draft.availability ?? 100) < 100 ? `, 차량 가용률 ${draft.availability}%` : ''}, `
  const summary = `${fireLine}${bandLine}준비 ${prepText(draft.prepMinutes)}, 이송 완료 기한 ${completeText(draft.completeBeforeHours ?? 0)}, 추가 협약 차량 ${extraSummary}${changedVillages ? `, 도달 가정 변경 ${changedVillages}곳` : ''}`

  const conditions = (
    <div id={panelId} aria-label="계산 조건">
      <div className="space-y-5">
        <div>
          <Select label="시나리오" value={selectedId} onChange={setSelectedId}
            options={scenarios.map((s) => ({ value: s.id, label: s.name, secondary: s.id === activeId ? '현황판 기준' : s.id }))} />
          {dirty && <p className="mt-2 type-meta text-primary-text">저장하지 않은 변경이 있습니다.</p>}
        </div>
        {draft.kind === 'fire' && (
          <div className="space-y-4">
            <p className="type-caption text-text-sec">확산 가정</p>
            <NumberStepper label="확산 속도" value={draft.speedKmh} min={0.5} max={10} step={0.5} unit="km/h" format={(v) => `시속 ${v}km`} onChange={(v) => setFire({ speedKmh: v })} />
            <NumberStepper label="발화 전 사전 발령" value={draft.leadHours ?? 0} min={0} max={6} step={0.5} unit="시간" onChange={(v) => setFire({ leadHours: v })} />
            <NumberStepper label="대피 대상 범위(첫 도달 뒤)" value={draft.scopeHours} min={0.5} max={8} step={0.5} unit="시간" onChange={(v) => setFire({ scopeHours: v })} />
            <p className="type-meta leading-5 text-text-meta">발화 가정 지점 {draft.originLabel}. 확산 방향 띠 안 마을에 앞쪽 거리 ÷ 속도만큼 늦게 도달한다고 계산합니다.</p>
          </div>
        )}
        <div>
          <p className="mb-1.5 type-caption text-text-sec">발령 시간대</p>
          <SegmentControl label="발령 시간대" value={draft.timeBand || 'home'} onChange={(v) => set({ timeBand: v })}
            items={TIME_BANDS.map((b) => ({ value: b.value, label: b.label }))} />
          <p className="mt-1.5 type-meta leading-5 text-text-meta">{bandOf(draft).desc} 주야간보호 이용 {LTC_DAYCARE.toLocaleString('ko-KR')}명은 공단 통계이고, 누가 이용자인지는 시연 명부 기준입니다.</p>
        </div>
        <div>
          <NumberStepper label="차량 가용률" value={draft.availability ?? 100} min={30} max={100} step={10} unit="%" format={(v) => `${v}%`} onChange={(v) => set({ availability: v })}
            hint="야간이나 휴일에 모을 수 있는 차량 비율" />
        </div>
        <div>
          <p className="mb-1.5 type-caption text-text-sec">준비 시간</p>
          <SegmentControl label="준비 시간" value={draft.prepMinutes} onChange={(v) => set({ prepMinutes: v })}
            items={[{ value: 30, label: '30분' }, { value: 60, label: '1시간' }, { value: 90, label: '1시간 30분' }]} />
        </div>
        <div>
          <p className="mb-1.5 type-caption text-text-sec">이송 완료 기한</p>
          <SegmentControl label="이송 완료 기한" value={draft.completeBeforeHours ?? 0} onChange={(v) => set({ completeBeforeHours: v })}
            items={[{ value: 0, label: '도달 시각' }, { value: 5, label: '도달 5시간 전' }]} />
          <p className="mt-1.5 type-meta text-text-meta tabular-nums">첫 도달 마을 가용 시간 {Math.max(0, Math.round((draft.windowHours - (draft.completeBeforeHours ?? 0)) * 60 - draft.prepMinutes))}분</p>
        </div>
        <div>
          <p className="mb-1.5 type-caption text-text-sec">추가 협약 차량</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {EXTRA_TYPES.map((t) => (
              <NumberStepper key={t} label={typeOf(t).label} value={draft.extraVehicles?.[t] || 0} min={0} max={20} unit="대" onChange={(n) => setExtra(t, n)} />
            ))}
          </div>
        </div>
        <Disclosure summary={`마을별 첫 도달 뒤 도달 시간${changedVillages ? ` (변경 ${changedVillages}곳)` : ''}`}>
          <ul className="grid gap-y-2 max-h-[420px] overflow-y-auto pr-1">
            {villages.filter((v) => scopeSet.has(v.code)).map((v) => (
              <li key={v.code} className="min-w-0">
                <NumberStepper layout="inline" label={v.label} value={draft.offsetHours?.[v.code] || 0} min={0} max={12} step={0.25} unit="시간" format={offsetText} onChange={(h) => setOffset(v.code, h)} />
              </li>
            ))}
          </ul>
        </Disclosure>
      </div>
    </div>
  )

  // 담당자가 읽을 결론 문장. 숫자를 먼저, 짧게
  const unresolved = extra.some((e) => !e.resolved)
  const headline = result.total > 0
    ? `기준 배정 시 이동 불가 인원 ${result.total}명`
    : `대피 대상 ${result.scopeTargets}명 전원 기한 내 이송 가능`
  const fixLine = result.total > 0 && extraLine ? `협약 ${extraLine}${unresolved ? ' 이상' : ''} 추가 시 이동 불가 인원 ${unresolved ? '대폭 감소' : '0명'}` : null
  const firstMinutes = Math.max(0, Math.round((draft.windowHours - (draft.completeBeforeHours ?? 0)) * 60 - draft.prepMinutes))
  // 계산 경고: 경로 정보 없는 마을, 필요 차종이 없는 등급(숫자 산식은 그대로, 까닭만 따로 보임)
  const routeMissing = result.routeMissing || []
  const noType = result.noVehicleType || {}
  const noTypeTotal = Object.values(noType).reduce((s, x) => s + x, 0)
  const neckSentence = {
    vehicle: '부족 원인: 차량',
    helper: '부족 원인: 도우미',
    both: '부족 원인: 차량과 도우미',
    other: '부족 원인: 남은 시간 또는 대피소 자리',
    none: '부족 없음'
  }[neck.limit] || BOTTLENECK_LABEL[neck.limit]
  const Row = ({ label, value, strong }) => (
    <li className="grid min-h-12 grid-cols-[minmax(6rem,12rem)_1fr] items-baseline gap-x-6 py-2">
      <span className="type-body-sm text-text-sec">{label}</span>
      <span className={`tabular-nums ${strong ? 'type-strong text-text-pri' : 'type-body-sm text-text-pri'}`}>{value}</span>
    </li>
  )
  const [method, setMethod] = useState(null)
  const [modal, setModal] = useState(null) // 'cond' | 'basis' | 'compare'
  const lines = (n) => n.map((x) => `${x.typeLabel} ${x.count}대`).join(', ')
  const methods = [
    ...(fixLine ? [{ id: 'extra', title: '협약 차량 추가', sub: extraLine, trailing: unresolved ? '' : '0명' }] : []),
    { id: 'vehicle', title: `${typeOf(neck.vehicleType)?.label || neck.vehicleType} 1대 추가`, sub: `${neck.vehicleGain}명 감소`, trailing: `${neck.plusVehicle}명` },
    { id: 'helper', title: '도우미 1명 추가', sub: `${neck.helperGain}명 감소`, trailing: `${neck.plusHelper}명` },
    { id: 'unconfirmed', title: `미확정 차량 ${agreedCompare.unconfirmed}대 제외`, sub: '확정 차량만 사용', trailing: `${agreedCompare.agreed}명` },
    ...(agreedPlan.alone > 0 && agreedPlan.total === 0 ? [{ id: 'agreed', title: '확정 차량만 사용 시 협약', sub: lines(agreedPlan.need), trailing: '0명' }] : [])
  ]
  const methodId = methods.some((m) => m.id === method) ? method : methods[0].id
  const goResources = <Button as={Link} to="/console/resources">협약 차량 확인</Button>
  const goDraft = <Button as={Link} to="/console/workspace?kind=doc&new=gian-simple" variant="secondary">협약 추진 기안</Button>
  const methodView = {
    extra: fixLine && { head: fixLine, todo: <>{goResources}{goDraft}</>, basis: extra.map((e) => <Row key={e.grade} label={<GradeChip grade={e.grade} size="sm" />} value={`${result.byGrade[e.grade]}명, ${e.typeLabel} ${e.count}대${e.resolved ? '' : ' 이상'} 필요`} />) },
    vehicle: { head: `${typeOf(neck.vehicleType)?.label || neck.vehicleType} 1대 추가 시 이동 불가 인원 ${neck.plusVehicle}명, ${neck.vehicleGain}명 감소`, todo: goResources, basis: [<Row key="n" label="현재 부족 원인" value={neckSentence.replace('부족 원인: ', '')} strong />] },
    helper: { head: `도우미 1명 추가 시 이동 불가 인원 ${neck.plusHelper}명, ${neck.helperGain}명 감소`, todo: <Button as={Link} to="/console/resources">차량과 도우미</Button>, basis: [<Row key="n" label="현재 부족 원인" value={neckSentence.replace('부족 원인: ', '')} strong />] },
    unconfirmed: { head: `미확정 차량 ${agreedCompare.unconfirmed}대 제외 시 이동 불가 인원 ${agreedCompare.agreed}명`, todo: goResources, basis: [<Row key="a" label="전체 차량 사용" value={`${agreedCompare.all}명`} />, <Row key="b" label="확정 차량만 사용" value={`${agreedCompare.agreed}명`} strong />] },
    agreed: { head: `확정 차량만 사용 시 이동 불가 인원 ${agreedPlan.alone}명, ${lines(agreedPlan.need)} 협약 시 0명`, todo: <>{goResources}{goDraft}</>, basis: agreedPlan.lessOne.map((x) => <Row key={x.type} label={`협약 ${x.label} ${x.count - 1}대로 감축`} value={`이동 불가 ${x.left}명`} strong />) }
  }[methodId]
  const flow = [
    { label: '대피 대상 인원', value: result.scopeTargets, unit: '명', note: `${result.scopeVillages}개 마을` },
    { label: '기준 배정 시 이동 불가 인원', value: result.total, unit: '명', note: '발령 전, 현재 차량 기준', tone: result.total ? 'danger' : undefined },
    { label: '추천 배정 시 이동 불가 인원', value: boardingNow in boardingRec ? boardingRec[boardingNow] : '조회 중', unit: boardingNow in boardingRec ? '명' : '', note: '발령 전, 현재 차량 기준' },
    ...(fixLine && !unresolved ? [{ label: '협약 후 이동 불가 인원', value: 0, unit: '명', note: `현재 차량 기준, ${extraLine} 추가` }] : [])
  ]

  return (
    <PageShell title="부족분 계산" hideHeader>
      <PageHeader
        title="부족분 계산" className="mb-3"
        action={(
          <>
            <Button variant="secondary" onClick={() => setModal('basis')}>계산 근거</Button>
            <Button variant="secondary" onClick={() => setModal('compare')}>저장과 비교</Button>
            <Button variant="primary" leftIcon={<SlidersHorizontal size={16} aria-hidden="true" />} onClick={() => setModal('cond')}>계산 조건 변경</Button>
          </>
        )}
      />

      <div className="grid min-w-0 gap-4">
        <StatusBand
          aria-live="polite"
          tag={result.total > 0 ? '기한 초과 우려' : '이상 없음'} tone={result.total > 0 ? 'danger' : 'primary'}
          action={fixLine ? <>{goResources}{goDraft}</> : null}
        >
          {result.total > 0 ? `${draft.name} 기준 배정 시 이동 불가 인원 ${result.total}명${result.provisional > 0 ? ` (확인 대기 서류 ${result.provisional}건 포함)` : ''}` : headline}
        </StatusBand>

        <NumberFlow items={flow} />

        <div className="grid min-w-0 gap-x-12 gap-y-6 cq-xl:grid-cols-[5fr_7fr] cq-xl:items-start">
          <div className="grid min-w-0 gap-4">
            <Section id="sh-methods" title="이동 불가 인원 감소 방안">
              <ul role="listbox" aria-label="이동 불가 인원 감소 방안">
                {methods.map((m) => <ListItem key={m.id} dense id={m.id} title={m.title} sub={m.sub} trailing={m.trailing} selected={m.id === methodId} tabIndex={m.id === methodId ? 0 : -1} onSelect={() => setMethod(m.id)} />)}
              </ul>
            </Section>
            <section aria-live="polite" className="min-w-0 px-3">
              <p className="type-body-strong text-text-pri tabular-nums">{methodView.head}</p>
              <ul className="mt-1">{methodView.basis}</ul>
            </section>
          </div>
          <div className="min-w-0 max-h-[34rem] overflow-y-auto">
            <ShortageTable compact tone="flat" title="마을별 이동 불가 인원" basis={basisText({ scenario: draft.name, today })} villages={result.villages.filter((v) => v.inScope)} dongs={dongs} byVillage={result.byVillage} arrivals={result.arrivals} t0={today} pageSize={30} />
          </div>
        </div>
      </div>

      <Modal open={modal === 'cond'} onClose={() => setModal(null)} title="계산 조건 변경" className="max-w-[640px]">{conditions}</Modal>

      <Modal open={modal === 'basis'} onClose={() => setModal(null)} title="계산 근거" className="max-w-[760px]">
        <div className="grid gap-6">
          <InfoRows rows={[
            { key: 't', label: '대피 대상', value: `${result.scopeVillages}개 마을 ${result.scopeTargets}명`, strong: true },
            { key: 'v', label: '출동 가능 차량', value: vehicleChips(vehicles) },
            { key: 'a', label: '첫 마을 산불 도달', value: `발령 후 ${fmtElapsed(draft.windowHours)}`, note: `출발 준비 ${prepText(draft.prepMinutes)} 제외 ${firstMinutes}분` },
            { key: 'c', label: '이송 완료 기한', value: completeText(draft.completeBeforeHours ?? 0) },
            { key: 'b', label: '발령 시간대', value: `${bandOf(draft).label}${(draft.availability ?? 100) < 100 ? `, 차량 ${draft.availability}%` : ''}` },
            routeMissing.length > 0 && { key: 'r', label: '경로 정보 없음, 이동 불가 처리 마을', value: `${routeMissing.map((v) => v.name).join(', ')}, ${routeMissing.reduce((s, v) => s + v.persons, 0)}명` },
            noTypeTotal > 0 && { key: 'n', label: '차종 없음, 이동 불가 처리', value: GRADES.filter((g) => noType[g.key] > 0).map((g) => `${g.label} ${noType[g.key]}명`).join(', ') }
          ]} />
          <p className="type-meta text-text-sec tabular-nums">{calcStamp({ at: now, rosterAt: today })}</p>
          <section aria-labelledby="chk-band">
            <h3 id="chk-band" className="type-strong text-text-sec">발령 시간대별 이동 불가 인원</h3>
            <ul className="mt-1">
              {bandCompare.map(({ b, r }) => (
                <Row key={b.value} label={`${b.label}${b.value === (draft.timeBand || 'home') ? ' (현재)' : ''}`} value={`${r.total}명${r.dayCareAway ? `, 센터 대피 ${r.dayCareAway}명 제외` : ''}`} strong />
              ))}
            </ul>
          </section>
          <section aria-labelledby="chk-board">
            <h3 id="chk-board" className="type-strong text-text-sec">승하차 시간별 이동 불가 인원</h3>
            {boardingLead && <p className="mt-1 type-body-sm text-text-sec">{boardingLead}</p>}
            <ul className="mt-1">
              {boardingCompare.map(({ m, r }) => (
                <Row key={m} label={boardingLabel(m, boardingNow)} value={`${r.total}명 (추천 배정 ${m in boardingRec ? `${boardingRec[m]}명` : '조회 중'})`} strong />
              ))}
            </ul>
          </section>
          <section aria-labelledby="chk-owner">
            <h3 id="chk-owner" className="type-strong text-text-sec">차량 구분</h3>
            <p className="mt-1 type-body-sm text-text-pri">{Object.values(OWNERS).join(', ')}</p>
          </section>
        </div>
      </Modal>

      <Modal open={modal === 'compare'} onClose={() => setModal(null)} title={`계산 조건 저장과 비교 (저장 ${userScenarioCount(scenarios)} / ${MAX_SCENARIOS}개)`} className="max-w-[1040px]">
        <TableCard
          tone="flat" title="계산 조건 비교" count={`저장 ${userScenarioCount(scenarios)} / ${MAX_SCENARIOS}개`}
          actions={canEdit && (
            <>
              {dirty && <Button variant="secondary" onClick={overwrite}>현재 조건 갱신</Button>}
              <Button variant="primary" onClick={saveAsNew} leftIcon={<Save size={16} aria-hidden="true" />}>조건 저장</Button>
            </>
          )}
          filters={canEdit && <Input compact label="새 조건 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${base.name} 변형`} className="w-full max-w-md" />}
          columns={compareCols} rows={compare} rowKey={({ sc }) => sc.id} pageSize={10} caption="계산 조건 비교"
        />
      </Modal>
    </PageShell>
  )
}

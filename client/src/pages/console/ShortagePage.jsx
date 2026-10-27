// 부족분 계산(IA 4.5). 위에서 아래 한 흐름: 결론 문장, 왜 그런지, 무엇을 늘리면 줄어드는지, 마을별 표, 접힌 계산 방법과 근거.
// 마을별 값은 배정 규칙으로 시뮬레이션한 미이송 수. 조건을 바꾸면 결과가 바로 다시 계산된다.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Save, SlidersHorizontal, Star } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'
import BasisLine, { basisText } from '../../components/miri/BasisLine.jsx'
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
import { vehicleSummaryLong } from '../../lib/vehicleSummary.js'
import { BOARDING_STEPS, boardingLabel } from '../../lib/boardingSensitivity.js'
import { agreedOnlyPlan } from '../../lib/agreedPlan.js'
import { calcStamp } from '../../lib/basis.js'
import useNow from '../../hooks/useNow.js'
import useBoardingRecommended from '../../hooks/useBoardingRecommended.js'
import { Link } from 'react-router-dom'
import { DISABLED_NOTE } from '../../lib/rosterCount.js'
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
      key: 'total', label: '미이송 예상', align: 'right',
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
    <Card
      as="aside" id={panelId} title="계산 조건" aria-label="계산 조건"
      actions={<Button size="sm" variant="ghost" onClick={() => setPanelOpen(false)}>닫기</Button>}
          >
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
            hint="야간이나 휴일에 차량과 운전 인력을 다 모으지 못하는 경우를 봅니다. 기관 조사 전 담당자 입력값입니다." />
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
    </Card>
  )

  // 담당자가 읽을 결론 문장. 숫자를 먼저, 짧게
  const unresolved = extra.some((e) => !e.resolved)
  const headline = result.total > 0
    ? `이 조건이면 기한 안에 옮기지 못하는 사람이 ${result.total}명입니다.`
    : `이 조건이면 대피 대상 ${result.scopeTargets}명을 기한 안에 모두 옮길 수 있습니다.`
  const fixLine = result.total > 0 && extraLine ? `${extraLine}${unresolved ? ' 이상을' : '를'} 더 확보하면 ${unresolved ? '크게 줄어듭니다' : '0명이 됩니다'}.` : null
  const firstMinutes = Math.max(0, Math.round((draft.windowHours - (draft.completeBeforeHours ?? 0)) * 60 - draft.prepMinutes))
  // 계산 경고: 경로 정보 없는 마을, 필요 차종이 없는 등급(숫자 산식은 그대로, 까닭만 따로 보임)
  const routeMissing = result.routeMissing || []
  const noType = result.noVehicleType || {}
  const noTypeTotal = Object.values(noType).reduce((s, x) => s + x, 0)
  const neckSentence = {
    vehicle: '지금은 차량이 모자라 막혀 있습니다. 도우미를 늘려도 줄지 않고, 차량을 늘려야 줄어듭니다.',
    helper: '지금은 함께 탈 도우미가 모자랍니다. 도우미를 늘려야 줄어듭니다.',
    both: '차량과 도우미가 함께 모자랍니다. 둘 다 늘려야 줄어듭니다.',
    other: '차량과 도우미를 더해도 줄지 않습니다. 남은 시간이나 대피소 자리가 막고 있습니다.',
    none: '못 옮기는 사람이 없습니다.'
  }[neck.limit] || BOTTLENECK_LABEL[neck.limit]
  const Row = ({ label, value, strong }) => (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md bg-page px-4 py-3">
      <span className="type-body-sm text-text-sec">{label}</span>
      <span className={`tabular-nums ${strong ? 'type-strong text-text-pri' : 'type-body-sm text-text-pri'}`}>{value}</span>
    </li>
  )

  return (
    <PageShell title="부족분 계산" desc="산불이 번지는 조건을 정하면, 지금 있는 차량과 도우미로 기한 안에 못 옮기는 사람이 몇 명인지 계산합니다.">
      {panelOpen && <div className="mb-4">{conditions}</div>}

      <div className="grid gap-4 min-w-0">
        <Card aria-live="polite" title="결론" meta={draft.name}>
          <p className="type-h2 text-text-pri">{headline}</p>
          {fixLine && <p className="mt-2 type-body text-text-pri">{fixLine}</p>}
          {fixLine && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button as={Link} to="/console/resources" size="sm">차량과 도우미에서 협약 차량 확인</Button>
              <Button as={Link} to="/console/workspace?kind=doc" size="sm" variant="secondary">문서함에서 협약 추진 기안 작성</Button>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
            <ShortageValue value={result.total} byGrade={result.byGrade} provisional={result.provisional} label="기한 안에 못 옮기는 사람">
              <BasisLine scenario={draft.name} />
              <p className="type-meta text-text-meta tabular-nums">({calcStamp({ at: now, rosterAt: today })})</p>
            </ShortageValue>
            {extra.length > 0 && (
              <ul aria-label="등급별 더 필요한 차량" className="flex flex-wrap gap-2">
                {extra.map((e) => (
                  <li key={e.grade} className="inline-flex items-center gap-2 rounded-md bg-subtle px-3 py-2">
                    <GradeChip grade={e.grade} size="sm" />
                    <span className="type-meta text-text-sec tabular-nums">{result.byGrade[e.grade]}명, {e.typeLabel} {e.count}대{e.resolved ? '' : ' 이상'} 더 필요</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="왜 이런 결과가 나오나">
          <ul className="grid gap-2">
            <Row label="대피해야 하는 사람" value={`${result.scopeVillages}개 마을 ${result.scopeTargets}명`} strong />
            <Row label="쓸 수 있는 차량" value={vehicleSummaryLong(vehicles)} />
            <Row label="첫 마을에 산불이 닿기까지" value={`발령 후 ${fmtElapsed(draft.windowHours)}, 출발 준비 ${prepText(draft.prepMinutes)} 빼면 ${firstMinutes}분`} />
            <Row label="이송을 끝내야 하는 때" value={completeText(draft.completeBeforeHours ?? 0)} />
            <Row label="발령 시간대" value={`${bandOf(draft).label}${(draft.availability ?? 100) < 100 ? `, 차량 ${draft.availability}%만 모임` : ''}`} />
            {routeMissing.length > 0 && (
              <Row label="경로 정보가 없어 못 옮기는 것으로 센 마을" value={`${routeMissing.map((v) => v.name).join(', ')}, ${routeMissing.reduce((s, v) => s + v.persons, 0)}명`} />
            )}
            {noTypeTotal > 0 && (
              <Row label="태울 차종이 없어 못 옮기는 것으로 센 사람" value={GRADES.filter((g) => noType[g.key] > 0).map((g) => `${g.label} ${noType[g.key]}명`).join(', ')} />
            )}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="type-meta text-text-meta">조건을 바꾸면 결과가 바로 다시 계산됩니다.</p>
            <Button
              variant={panelOpen ? 'primary' : 'secondary'} aria-expanded={panelOpen} aria-controls={panelId}
              leftIcon={<SlidersHorizontal size={16} aria-hidden="true" />} onClick={() => setPanelOpen((v) => !v)}
            >
              계산 조건 바꾸기
            </Button>
          </div>
        </Card>

        <Card title="무엇을 늘리면 줄어드나">
          <p className="type-strong text-text-pri">{neckSentence}</p>
          <ul aria-label="하나씩 더했을 때" className="mt-3 grid gap-2">
            <Row label={`차량 1대 더(${typeOf(neck.vehicleType)?.label || neck.vehicleType})`} value={`${neck.vehicleGain}명 줄어 ${neck.plusVehicle}명`} strong />
            <Row label="도우미 1명 더" value={`${neck.helperGain}명 줄어 ${neck.plusHelper}명`} strong />
            <Row label={`확인 전 차량 ${agreedCompare.unconfirmed}대가 오지 않으면`} value={`${agreedCompare.agreed}명`} strong />
          </ul>
          <p className="mt-3 type-meta leading-5 text-text-meta">택시와 버스는 재난 때 교통 부서가 그때 요청하므로, 확정되기 전까지 확인 전 차량으로 따로 셉니다. 평소에 협약해 두면 약속된 차량으로 바뀝니다.</p>
        </Card>

        {agreedPlan.alone > 0 && agreedPlan.total === 0 && (
          <Card title="약속된 차량만 쓸 때 필요한 협약">
            <p className="type-strong text-text-pri">{`확인 전 차량 ${agreedPlan.unconfirmed}대를 빼면 ${agreedPlan.alone}명이 남고, ${agreedPlan.need.map((n) => `${n.typeLabel} ${n.count}대`).join(', ')}를 더 협약하면 0명이 됩니다.`}</p>
            <ul aria-label="하나씩 줄이면" className="mt-3 grid gap-2">
              {agreedPlan.lessOne.map((x) => <Row key={x.type} label={`${x.label} ${x.count - 1}대로 줄이면`} value={`${x.left}명 남음`} strong />)}
            </ul>
            <p className="mt-3 type-meta leading-5 text-text-meta">요양시설과 주야간보호기관 차량은 낮에는 이용 어르신이 먼저이고 근무 시간 밖에는 쓰기 어렵습니다. 같은 규칙으로 다시 계산한 값입니다(출처: 동해시노인종합복지관 주간보호센터 면담, 2026. 10. 26.)</p>
          </Card>
        )}

        <ShortageTable basis={basisText({ scenario: draft.name, today })} villages={result.villages.filter((v) => v.inScope)} dongs={dongs} byVillage={result.byVillage} arrivals={result.arrivals} t0={today} />

        <Disclosure summary="계산 방법과 근거">
          <div className="grid gap-6">
            <section aria-labelledby="chk-cond">
              <h3 id="chk-cond" className="type-h3 text-text-pri">지금 계산 조건</h3>
              <p className="mt-2 type-body-sm text-text-pri tabular-nums">{summary}</p>
              <p className="mt-1 type-meta text-text-meta">대상자 수는 장기요양 재가 수급자 2025년 통계, 명부는 시연용 자료입니다. 계산 규칙 1.2판(2026. 10. 20.)</p>
            </section>
            <section aria-labelledby="chk-band">
              <h3 id="chk-band" className="type-h3 text-text-pri">발령 시간대에 따라</h3>
              <p className="mt-1 type-body-sm text-text-sec">낮에는 주야간보호 이용자가 센터에 있어 센터 차량으로 대피합니다. 밤과 휴일에는 차량과 운전 인력을 다 모으기 어렵습니다.</p>
              <ul className="mt-2 grid gap-2">
                {bandCompare.map(({ b, r }) => (
                  <Row key={b.value} label={`${b.label}${b.value === (draft.timeBand || 'home') ? ' (지금 조건)' : ''}`} value={`${r.total}명${r.dayCareAway ? `, 센터 대피 ${r.dayCareAway}명 제외` : ''}`} strong />
                ))}
              </ul>
              <p className="mt-2 type-meta text-text-meta">근거: 재난문자 서비스 개발자, 행정학 교수 자문</p>
            </section>
            <section aria-labelledby="chk-board">
              <h3 id="chk-board" className="type-h3 text-text-pri">한 번 태우고 내리는 시간에 따라</h3>
              <p className="mt-1 type-body-sm text-text-sec">{boardingLead ? `${boardingLead} ` : ''}휠체어 이용자는 리프트 승합차와 도우미 2명으로 옮기고, 한 번에 태우고 내리는 데 {boardingNow}분으로 계산합니다. 숙련된 운전자는 5분 안에 태운다는 의견이 있고, 요구조자가 몰리면 더 걸린다는 의견도 있어 시간을 바꿨을 때를 함께 보여 드립니다.</p>
              <ul className="mt-2 grid gap-2">
                {boardingCompare.map(({ m, r }) => (
                  <Row key={m} label={boardingLabel(m, boardingNow)} value={`${r.total}명 (추천 배정 ${m in boardingRec ? `${boardingRec[m]}명` : '계산 중'})`} strong />
                ))}
              </ul>
              <p className="mt-2 type-meta text-text-meta">장애인 단체 자문을 근거로 했습니다. 함께 탈 도우미가 모자라면 그 사람도 못 옮기는 사람에 들어가고, 발령 때 배정도 같은 조건을 씁니다.</p>
            </section>
            <section aria-labelledby="chk-owner">
              <h3 id="chk-owner" className="type-h3 text-text-pri">차량을 나누는 기준</h3>
              <p className="mt-1 type-body-sm text-text-sec">{Object.values(OWNERS).join(', ')}</p>
              <p className="mt-1 type-meta leading-5 text-text-meta">개인 차량은 등록하지 않습니다. 소방 구급차는 시 차량과 따로 운용합니다. 요양시설과 주야간보호기관 차량은 협약 전까지 확인 전 차량으로 둡니다. 근거: 동해시 재난안전 담당 부서 답변, 재난안전 자문</p>
            </section>
            <p className="rounded-md bg-page px-4 py-3 type-meta leading-5 text-text-sec">{DISABLED_NOTE}</p>
          </div>
        </Disclosure>

        <Disclosure summary={`시나리오 저장과 비교 (기본 ${scenarios.length - userScenarioCount(scenarios)}개, 저장 ${userScenarioCount(scenarios)} / ${MAX_SCENARIOS}개)`}>
          <TableCard
            title="시나리오 비교" count={`저장 ${userScenarioCount(scenarios)} / ${MAX_SCENARIOS}개`}
            actions={canEdit && (
              <>
                {dirty && <Button variant="secondary" onClick={overwrite}>현재 시나리오 갱신</Button>}
                <Button variant="primary" onClick={saveAsNew} leftIcon={<Save size={16} aria-hidden="true" />}>시나리오 저장</Button>
              </>
            )}
            filters={canEdit && <Input compact label="새 시나리오 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${base.name} 변형`} className="w-full max-w-md" />}
            columns={compareCols} rows={compare} rowKey={({ sc }) => sc.id} pageSize={10} caption="시나리오 비교"
          />
        </Disclosure>
      </div>
    </PageShell>
  )
}

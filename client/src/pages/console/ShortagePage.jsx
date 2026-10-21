// 부족분 계산(IA 4.5). 결과를 먼저 보이고, 계산 조건은 오른쪽 접이식 패널에 둔다(PRD v2 F2).
// 마을별 값은 배정 규칙으로 시뮬레이션한 미이송 수. 조건을 바꾸면 결과가 바로 다시 계산된다.
import { useEffect, useId, useMemo, useState } from 'react'
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
import { EXTRA_TYPE, GRADES, typeOf } from '../../lib/shortage.js'
import { TIME_BANDS, bandOf, computeShortage, requiredExtraVehicles } from '../../lib/shortageCalc.js'
import { DISABLED_NOTE } from '../../lib/rosterCount.js'
import { fireScenario } from '../../lib/scenario.js'
import { fmtElapsed } from '../../lib/geo.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import { LTC } from '../../mock/donghaeData.js'

const LTC_DAYCARE = LTC.dayCareUsers?.['계'] || 0

const MAX_SCENARIOS = 5
// 탑승과 하차 시간 민감도. 현재 가정값(설정)을 가운데에 두고 앞뒤로 본다
const BOARDING_STEPS = [10, 15, 20, 25, 30]
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
  useEffect(() => { setDraft(structuredClone(base)); setName('') }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const input = { persons, villages, vehicles, helpers, settings, scenario: draft, t0: today }
  const result = useMemo(() => computeShortage(input), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const extra = useMemo(() => requiredExtraVehicles(input, result), [result]) // eslint-disable-line react-hooks/exhaustive-deps
  const compare = useMemo(() => scenarios.map((sc) => ({ sc, r: computeShortage({ ...input, scenario: sc }) })), [scenarios, persons, villages, vehicles, helpers, settings, today]) // eslint-disable-line react-hooks/exhaustive-deps
  // 가정값 점검(회신 R17, R24, R27). 지금 조건에서 시간대와 탑승 시간만 바꿔 다시 계산한다
  const bandCompare = useMemo(() => TIME_BANDS.map((b) => ({ b, r: computeShortage({ ...input, scenario: { ...draft, timeBand: b.value } }) })), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const boardingNow = settings.boardingMinutes ?? 20
  const boardingCompare = useMemo(() => [...new Set([...BOARDING_STEPS, boardingNow])].sort((a, b) => a - b).map((m) => ({ m, r: computeShortage({ ...input, settings: { ...settings, boardingMinutes: m } }) })), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
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
    if (scenarios.length >= MAX_SCENARIOS) { toast(`시나리오는 최대 ${MAX_SCENARIOS}개까지 저장합니다. 기존 시나리오를 삭제한 뒤 저장해 주십시오.`, 'danger'); return }
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
      className="xl:sticky xl:top-20"
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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

  return (
    <PageShell title="부족분 계산">
      <Card as="div" padding="sm" className="mb-4" bodyClassName="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="type-caption text-text-sec">계산 조건</p>
          <p className="mt-0.5 type-body-sm text-text-pri tabular-nums">{summary}</p>
          <p className="mt-1 type-meta text-text-sec">입력 기준: 장기요양 재가 수급자 2025년 통계, 명부는 가상 자료. 등록장애인은 명부 확인 뒤 포함. 계산 규칙 1.2판(2026. 10. 20.)</p>
        </div>
        <Button
          variant={panelOpen ? 'primary' : 'secondary'} aria-expanded={panelOpen} aria-controls={panelId}
          leftIcon={<SlidersHorizontal size={16} aria-hidden="true" />} onClick={() => setPanelOpen((v) => !v)}
        >
          계산 조건
        </Button>
      </Card>

      <div className={panelOpen ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:items-start' : ''}>
        {panelOpen && <div className="xl:order-2">{conditions}</div>}

        <div className="grid gap-4 content-start min-w-0 xl:order-1">
          <Card aria-live="polite">
            <div className="grid gap-5 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
              <ShortageValue value={result.total} byGrade={result.byGrade} provisional={result.provisional} label="미이송 예상">
                <BasisLine scenario={draft.name} today={today} />
              </ShortageValue>
              <div className="min-w-0">
                <p className="type-caption text-text-sec">필요 추가 차량</p>
                <p className="mt-2 type-h3 text-text-pri">{extraLine || '없음'}</p>
                <p className="mt-1 type-meta text-text-meta">{extraLine ? '필요 추가 차량을 모두 더하면 미이송 예상이 0명이 됩니다.' : '현재 보유 차량으로 미이송 예상이 0명입니다.'}</p>
                {extra.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {extra.map((e) => (
                      <li key={e.grade} className="inline-flex items-center gap-2 rounded-md bg-subtle px-3 py-2">
                        <GradeChip grade={e.grade} size="sm" />
                        <span className="type-meta text-text-sec tabular-nums">미이송 {result.byGrade[e.grade]}명, 추가 {e.typeLabel} {e.count}대{e.resolved ? '' : ' 이상'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          <ShortageTable basis={basisText({ scenario: draft.name, today })} villages={result.villages.filter((v) => v.inScope)} dongs={dongs} byVillage={result.byVillage} arrivals={result.arrivals} t0={today} />

          <Card title="가정값 점검" meta="외부 자문 반영">
            <p className="mb-4 type-body-sm text-text-sec">자문 회신으로 받은 의견과 계산 가정을 나란히 둡니다. 근거가 한 곳뿐인 값은 가정을 바꾸지 않고 바꿨을 때의 결과만 보여 줍니다.</p>
            <div className="grid gap-5 lg:grid-cols-2">
              <section aria-labelledby="chk-band" className="min-w-0">
                <h3 id="chk-band" className="type-h3 text-text-pri">발령 시간대</h3>
                <ul className="mt-2 grid gap-2">
                  {bandCompare.map(({ b, r }) => (
                    <li key={b.value} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md bg-page px-3 py-2">
                      <span className="type-body-sm text-text-sec">{b.label}{b.value === (draft.timeBand || 'home') ? ' (지금 조건)' : ''}</span>
                      <span className="type-strong text-text-pri tabular-nums">미이송 예상 {r.total}명{r.dayCareAway ? <span className="ml-1 type-meta text-text-sec">센터 대피 {r.dayCareAway}명 제외</span> : null}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 type-meta leading-5 text-text-meta">개발자 자문: 주야간보호 이용자는 낮에 센터에 있고 센터는 송영 차량을 갖고 있어 시간대 변수가 필요함. 행정학 자문: 야간이나 휴일에는 인력과 차량 확보가 어려울 수 있어 별도 시나리오가 필요함.</p>
              </section>
              <section aria-labelledby="chk-board" className="min-w-0">
                <h3 id="chk-board" className="type-h3 text-text-pri">탑승과 하차 시간</h3>
                <ul className="mt-2 grid gap-2">
                  {boardingCompare.map(({ m, r }) => (
                    <li key={m} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md bg-page px-3 py-2">
                      <span className="type-body-sm text-text-sec tabular-nums">회차당 {m}분{m === boardingNow ? ' (지금 가정)' : ''}</span>
                      <span className="type-strong text-text-pri tabular-nums">미이송 예상 {r.total}명</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 grid gap-2">
                  <div className="rounded-md bg-page px-3 py-2">
                    <dt className="type-caption text-text-sec">계산 가정</dt>
                    <dd className="mt-0.5 type-body-sm text-text-pri">휠체어는 리프트 승합차와 도우미 2명, 회차마다 탑승과 하차 {boardingNow}분</dd>
                  </div>
                  <div className="rounded-md bg-page px-3 py-2">
                    <dt className="type-caption text-text-sec">장애인 단체 자문, 개인 경험 기준</dt>
                    <dd className="mt-0.5 type-body-sm text-text-pri">특장차량은 슬로프와 안전벨트가 있어 운전자 1명으로 가능하고, 숙련자는 탑승과 안전벨트 착용이 5분 이내. 경수 장애는 보호자가 함께할 수 있고, 전동 휠체어는 경차 개조 특장차에 타기 어려울 수 있음</dd>
                  </div>
                </dl>
                <p className="mt-2 type-meta leading-5 text-text-meta">근거가 한 곳뿐이라 가정값은 바꾸지 않았습니다. 도우미 수와 지원 등급도 차량과 함께 계산 조건이며, 함께 탈 도우미가 모자란 대상자는 '도우미 부족'으로 미이송 예상에 들어갑니다. 발령 배정도 같은 조건을 씁니다.</p>
              </section>
            </div>
            <p className="mt-4 rounded-md bg-page px-3 py-2 type-meta leading-5 text-text-sec">{DISABLED_NOTE}</p>
          </Card>

          <Disclosure summary={`시나리오 저장과 비교 (${scenarios.length} / ${MAX_SCENARIOS}개)`}>
            <TableCard
              title="시나리오 비교" count={`${scenarios.length} / ${MAX_SCENARIOS}개`}
              actions={canEdit && (
                <>
                  {dirty && <Button variant="secondary" onClick={overwrite}>현재 시나리오 갱신</Button>}
                  <Button variant="primary" onClick={saveAsNew} leftIcon={<Save size={16} aria-hidden="true" />}>시나리오 저장</Button>
                </>
              )}
              filters={canEdit && <Input compact label="새 시나리오 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${base.name} 변형`} className="w-full max-w-md" />}
              columns={compareCols} rows={compare} rowKey={({ sc }) => sc.id} pageSize={MAX_SCENARIOS} caption="시나리오 비교"
            />
          </Disclosure>
        </div>
      </div>
    </PageShell>
  )
}

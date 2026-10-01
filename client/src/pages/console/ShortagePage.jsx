// 부족분 계산(IA 4.5). 마을별 값은 배정 규칙으로 시뮬레이션한 미이송 수.
import { useEffect, useMemo, useState } from 'react'
import { Save, Star } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ShortageTable from '../../components/miri/ShortageTable.jsx'
import ShortageValue from '../../components/miri/ShortageValue.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import NumberStepper from '../../components/ui/NumberStepper.jsx'
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import Select from '../../components/ui/Select.jsx'
import useToast from '../../hooks/useToast.js'
import { EXTRA_TYPE, GRADES, typeOf } from '../../lib/shortage.js'
import { computeShortage, requiredExtraVehicles } from '../../lib/shortageCalc.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const MAX_SCENARIOS = 5
const EXTRA_TYPES = [...new Set(Object.values(EXTRA_TYPE))]

const offsetText = (h) => (h === 0 ? '기준' : `${h > 0 ? '+' : ''}${h}시간`)

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

  const [selectedId, setSelectedId] = useState(activeId)
  const base = scenarios.find((s) => s.id === selectedId) || scenarios[0]
  const [draft, setDraft] = useState(() => structuredClone(base))
  const [name, setName] = useState('')
  useEffect(() => { setDraft(structuredClone(base)); setName('') }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const input = { persons, villages, vehicles, helpers, settings, scenario: draft, t0: today }
  const result = useMemo(() => computeShortage(input), [persons, villages, vehicles, helpers, settings, draft, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const extra = useMemo(() => requiredExtraVehicles(input, result), [result]) // eslint-disable-line react-hooks/exhaustive-deps
  const compare = useMemo(() => scenarios.map((sc) => ({ sc, r: computeShortage({ ...input, scenario: sc }) })), [scenarios, persons, villages, vehicles, helpers, settings, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(base)

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setOffset = (code, h) => setDraft((d) => ({ ...d, offsetHours: { ...d.offsetHours, [code]: h } }))
  const setExtra = (type, n) => setDraft((d) => ({ ...d, extraVehicles: { ...d.extraVehicles, [type]: n } }))

  const saveAsNew = () => {
    if (scenarios.length >= MAX_SCENARIOS) { toast(`시나리오는 최대 ${MAX_SCENARIOS}개. 기존 시나리오 삭제 필요`, 'danger'); return }
    const id = `S-${Math.max(0, ...scenarios.map((s) => Number(s.id.split('-')[1]) || 0)) + 1}`
    saveScenario({ ...draft, id, name: name.trim() || `${base.name} 변형` })
    setSelectedId(id)
    toast('시나리오 저장 완료', 'primary')
  }
  const overwrite = () => { saveScenario({ ...draft, id: base.id }); toast(`${base.name} 갱신 완료`, 'primary') }

  const extraLine = extra.length
    ? extra.map((e) => `${e.typeLabel} ${e.count}대`).join(', ')
    : null

  return (
    <PageShell title="부족분 계산">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="grid gap-4 content-start">
          <Card title="시나리오">
            <Select label="저장 시나리오" value={selectedId} onChange={setSelectedId}
              options={scenarios.map((s) => ({ value: s.id, label: s.name, secondary: s.id === activeId ? '현황판 기준' : s.id }))} />
            {dirty && <p className="mt-2 type-meta text-primary-text">저장하지 않은 변경 있음</p>}
          </Card>

          <Card title="계산 조건">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 type-caption text-text-sec">준비 시간</p>
                <SegmentControl label="준비 시간" value={draft.prepMinutes} onChange={(v) => set({ prepMinutes: v })}
                  items={[{ value: 30, label: '30분' }, { value: 60, label: '1시간' }, { value: 90, label: '1시간 30분' }]} />
              </div>
              <div>
                <p className="mb-1.5 type-caption text-text-sec">이송 완료 기한</p>
                <SegmentControl label="이송 완료 기한" value={draft.completeBeforeHours ?? 0} onChange={(v) => set({ completeBeforeHours: v })}
                  items={[{ value: 0, label: '도달 시각' }, { value: 5, label: '도달 5시간 전' }]} />
                <p className="mt-1.5 type-meta text-text-meta tabular-nums">가용 시간 {(draft.windowHours - (draft.completeBeforeHours ?? 0)) * 60 - draft.prepMinutes}분</p>
              </div>
            </div>
          </Card>

          <Card title="추가 협약 차량" desc="부족 등급에 맞는 차종을 더해 재계산">
            <div className="grid gap-4 sm:grid-cols-2">
              {EXTRA_TYPES.map((t) => (
                <NumberStepper key={t} label={typeOf(t).label} value={draft.extraVehicles?.[t] || 0} min={0} max={20} unit="대" onChange={(n) => setExtra(t, n)} />
              ))}
            </div>
          </Card>

          <Card title="마을별 산불 도달 가정" desc="기준 대비 늦게 도달하면 + 시간">
            <ul className="grid gap-y-2 max-h-[420px] overflow-y-auto pr-1">
              {villages.map((v) => (
                <li key={v.code} className="min-w-0">
                  <NumberStepper layout="inline" label={v.label} value={draft.offsetHours?.[v.code] || 0} min={-2} max={8} step={0.5} unit="시간" format={offsetText} onChange={(h) => setOffset(v.code, h)} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid gap-4 content-start min-w-0">
          <Card>
            <div className="grid gap-5 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
              <ShortageValue value={result.total} byGrade={result.byGrade} provisional={result.provisional} label="총 부족분" />
              <div className="min-w-0">
                <p className="type-caption text-text-sec">필요 추가 차량</p>
                {extraLine ? (
                  <p className="mt-2 type-h3 text-text-pri">{extraLine} 추가 시 부족분 0</p>
                ) : (
                  <p className="mt-2 type-h3 text-text-pri">추가 차량 불필요</p>
                )}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {extra.map((e) => (
                    <li key={e.grade} className="inline-flex items-center gap-2 rounded-md bg-subtle px-3 py-2">
                      <GradeChip grade={e.grade} size="sm" />
                      <span className="type-meta text-text-sec tabular-nums">부족 {result.byGrade[e.grade]}명 → {e.typeLabel} {e.count}대{e.resolved ? '' : ' 이상'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card title="마을별 부족분">
            <ShortageTable villages={villages} dongs={dongs} byVillage={result.byVillage} />
          </Card>

          <Card
            title="시나리오 저장과 비교"
            desc={`최대 ${MAX_SCENARIOS}개. 현황판 기준 하나 지정`}
            actions={canEdit && (
              <>
                {dirty && <Button variant="secondary" onClick={overwrite}>현재 시나리오 갱신</Button>}
                <Button variant="primary" onClick={saveAsNew} leftIcon={<Save size={16} aria-hidden="true" />}>시나리오 저장</Button>
              </>
            )}
          >
            {canEdit && <Input label="새 시나리오 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${base.name} 변형`} className="mb-4 max-w-md" />}
            <div className="overflow-x-auto">
              <table className="w-full text-left tabular-nums">
                <caption className="sr-only">시나리오 비교</caption>
                <thead>
                  <tr className="bg-subtle">
                    {['시나리오', '준비', '완료 기한', '추가 차량', ...GRADES.map((g) => g.label), '총 부족분', ''].map((h, i) => (
                      <th key={`${h}${i}`} scope="col" className="px-3 py-2 type-caption text-text-meta whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compare.map(({ sc, r }) => (
                    <tr key={sc.id} className="border-t border-line-sub">
                      <td className="px-3 py-2 type-body-sm min-w-48">
                        <span className="type-strong text-text-pri">{sc.name}</span>
                        {sc.id === activeId && <Badge tone="primary" className="ml-2">현황판 기준</Badge>}
                      </td>
                      <td className="px-3 py-2 type-body-sm whitespace-nowrap">{sc.prepMinutes}분</td>
                      <td className="px-3 py-2 type-body-sm whitespace-nowrap">{sc.completeBeforeHours ? `도달 ${sc.completeBeforeHours}시간 전` : '도달 시각'}</td>
                      <td className="px-3 py-2 type-meta text-text-sec whitespace-nowrap">{Object.entries(sc.extraVehicles || {}).filter(([, n]) => n).map(([t, n]) => `${typeOf(t).label} ${n}`).join(', ') || '없음'}</td>
                      {GRADES.map((g) => <td key={g.key} className="px-3 py-2 type-body-sm">{r.byGrade[g.key] || '-'}</td>)}
                      <td className={`px-3 py-2 type-strong whitespace-nowrap ${r.total ? 'text-danger-text' : 'text-text-sec'}`}>{r.total ? `부족 ${r.total}명` : '부족 없음'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {canEdit && sc.id !== activeId && (
                          <span className="inline-flex gap-1">
                            <Button size="sm" variant="ghost" leftIcon={<Star size={14} aria-hidden="true" />} onClick={() => { setActiveScenario(sc.id); toast(`${sc.name} 현황판 기준 지정`, 'primary') }}>기준 지정</Button>
                            {scenarios.length > 1 && <Button size="sm" variant="ghost" onClick={() => { removeScenario(sc.id); if (selectedId === sc.id) setSelectedId(activeId); toast('시나리오 삭제 완료') }}>삭제</Button>}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}

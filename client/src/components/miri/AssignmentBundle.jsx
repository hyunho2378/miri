// 배정표의 차량 단위 묶음(PATTERNS 33). 회차별 대상자, 출발과 완료 시각, AI 배정 사유.
// 수동 조정: 같은 마을 같은 등급, 정원 여유가 있는 다른 회차로 이동(회차 시간이 마을 왕복 기준이라 같은 마을만 허용).
import { Route, Truck, Users } from 'lucide-react'
import { capOf, typeOf } from '../../lib/shortage.js'
import { fmtHM } from '../../lib/time.js'
import Card from '../ui/Card.jsx'
import Disclosure from '../ui/Disclosure.jsx'
import Select from '../ui/Select.jsx'
import GradeChip from './GradeChip.jsx'

export function moveOptions(assignments, vehicles, code, fromTrip) {
  const opts = []
  for (const a of assignments) {
    const v = vehicles.find((x) => x.code === a.vehicleCode)
    if (!v) continue
    for (const t of a.trips) {
      if (t === fromTrip || t.grade !== fromTrip.grade || t.village !== fromTrip.village) continue
      if (t.personCodes.length >= capOf(v, t.grade)) continue
      opts.push({ value: `${a.vehicleCode}|${t.index}`, label: `${a.vehicleCode} ${t.index}회차`, secondary: `${fmtHM(t.departAt)} 출발 ${t.personCodes.length}/${capOf(v, t.grade)}명` })
    }
  }
  return opts
}

export default function AssignmentBundle({ assignment, vehicle, villageLabel = (c) => c, assignments, vehicles, onMove, editable = false }) {
  const type = typeOf(vehicle?.type)
  const last = assignment.trips[assignment.trips.length - 1]
  const persons = assignment.trips.reduce((s, t) => s + t.personCodes.length, 0)
  return (
    <Card padding="none" className="animate-flow-down">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 lg:p-5 border-b border-line-sub">
        <Truck size={20} aria-hidden="true" className="text-text-sec" />
        <h3 className="type-h3 text-text-pri tabular-nums">{assignment.vehicleCode}</h3>
        <span className="type-meta text-text-meta">{type?.label}</span>
        <span className="ml-auto type-meta text-text-meta tabular-nums">{assignment.trips.length}회차 {persons}명 완료 {fmtHM(last?.finishAt)}</span>
        <p className="basis-full flex items-center gap-1 type-meta text-text-sec">
          <Users size={14} aria-hidden="true" />
          {assignment.helperCodes.length ? `도우미 ${assignment.helperCodes.join(' ')}` : '도우미 없음 (구급대원 탑승)'}
        </p>
      </header>
      <ol className="divide-y divide-line-sub">
        {assignment.trips.map((t) => (
          <li key={`${t.index}-${t.departAt}`} className="px-4 lg:px-5 py-3">
            <p className="flex flex-wrap items-center gap-2 type-caption text-text-sec tabular-nums">
              <span className="type-strong text-text-pri">{t.index}회차</span>
              <span>{villageLabel(t.village)}</span>
              <span className="text-text-meta">출발 {fmtHM(t.departAt)} 완료 {fmtHM(t.finishAt)}</span>
              {t.added && <span className="text-primary-text">재배정 추가</span>}
            </p>
            <ul className="mt-2 space-y-1.5">
              {t.personCodes.map((code) => {
                const opts = editable ? moveOptions(assignments, vehicles, code, t) : []
                return (
                  <li key={code} className="flex flex-wrap items-center gap-2">
                    <GradeChip grade={t.grade} size="sm" />
                    <span className="type-body-sm text-text-pri tabular-nums">{code}</span>
                    {editable && (
                      <span className="ml-auto w-full sm:w-48">
                        {opts.length ? (
                          <Select
                            compact label="회차 이동" value="" placeholder="선택"
                            options={opts}
                            onChange={(v) => { const [veh, idx] = v.split('|'); onMove?.(code, veh, Number(idx)) }}
                          />
                        ) : (
                          <span className="block text-right type-meta text-text-meta">이동 가능 회차 없음</span>
                        )}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
      {assignment.reasons?.length > 0 && (
        <Disclosure
          className="px-4 lg:px-5 py-3 border-t border-line-sub"
          summary={<span className="inline-flex items-center gap-1"><Route size={14} aria-hidden="true" />AI 배정 사유</span>}
        >
          <ul className="space-y-1 type-body-sm text-text-sec">
            {assignment.reasons.map((r) => <li key={r}>- {r}</li>)}
          </ul>
        </Disclosure>
      )}
    </Card>
  )
}

// 상황판 왼쪽 사실 요약. 수치마다 기준을 바로 아래에 적는다(PRD 4.1 2항). 가정형과 설득형 문장 없음.
import { ChevronRight } from 'lucide-react'
import AnimatedNumber from '../motion/AnimatedNumber.jsx'
import Select from '../ui/Select.jsx'
import { GRADES } from '../../lib/shortage.js'
import { fmtElapsed } from '../../lib/geo.js'

const gradeLine = (byGrade) => {
  const parts = GRADES.filter((g) => byGrade?.[g.key]).map((g) => `${g.label} ${byGrade[g.key]}명`)
  return parts.length ? parts.join(', ') : '등급별 부족 없음'
}

function Metric({ label, children, basis }) {
  return (
    <div className="py-3 first:pt-0">
      <p className="type-caption text-text-sec">{label}</p>
      <div className="mt-1">{children}</div>
      {basis && <p className="mt-1 type-meta text-text-meta">{basis}</p>}
    </div>
  )
}

export default function SummaryPanel({
  scenario, scenarios, onScenario, dateLabel, result, extra, villageCount, scopeCount, shortList, onPick, onWindScenario
}) {
  const shortCount = shortList.length
  const extraTotal = extra.reduce((s, x) => s + x.count, 0)
  const unresolved = extra.some((x) => !x.resolved)
  const top = shortList[0]
  const scopeLine = scopeCount === villageCount
    ? `시 전체 ${villageCount}개 마을, 대상자 ${result.scopeTargets}명이 대피 대상입니다.`
    : `대피 대상 구역은 ${villageCount}개 마을 중 ${scopeCount}곳이며 대상자는 ${result.scopeTargets}명입니다.`
  const facts = result.total
    ? [
      scopeLine,
      `${scopeCount}곳 중 ${shortCount}곳에서 부족분이 발생합니다.`,
      top ? `부족분이 가장 큰 마을은 ${top.label}이며 ${top.shortage}명입니다.` : null,
      result.timeTotal ? `${result.timeTotal}명은 준비 시간 뒤 첫 왕복도 도달 전에 끝나지 않아 차량을 늘려도 해소되지 않습니다.` : null
    ].filter(Boolean)
    : [scopeLine, `${scopeCount}곳 모두 도달 시각 전에 이송이 끝나는 것으로 계산됩니다.`]

  return (
    <div>
      <div className="pb-3">
        <Select
          label="기준 시나리오" compact value={scenario.id} onChange={onScenario}
          options={scenarios.map((s) => ({ value: s.id, label: s.name }))}
        />
        {onWindScenario && scenario.id !== 'S-W' && (
          <button type="button" onClick={onWindScenario} className="mt-2 inline-flex min-h-9 items-center rounded-md px-1 type-strong text-primary-text hover:underline">
            오늘 예보 바람으로 다시 계산
          </button>
        )}
        {scenario.basis && <p className="mt-2 type-meta leading-5 text-text-sec">{scenario.basis}</p>}
        <p className="mt-1.5 type-meta text-text-meta">
          {scenario.kind === 'fire' ? `발령 후 첫 도달 ${fmtElapsed(scenario.windowHours)}, 확산 시속 ${scenario.speedKmh}km, ` : ''}명부 기준일 {dateLabel}
        </p>
      </div>

      <div className="divide-y divide-line-sub">
        <Metric label="미이송 예상" basis={`기준: 대피 대상 구역 대상자를 도달 시각까지 배정 기준선 규칙으로 옮기지 못하는 인원`}>
          <p className={result.total ? 'type-kpi text-danger-text' : 'type-kpi text-text-pri'}>
            <AnimatedNumber value={result.total} />
            <span className="ml-1 type-h3">명</span>
          </p>
          <p className="mt-1 type-body-sm text-text-sec">{gradeLine(result.byGrade)}</p>
          {result.provisional > 0 && <p className="mt-1 type-meta text-primary-text">확인 대기 판독 {result.provisional}건 포함 잠정값</p>}
        </Metric>

        <Metric label="부족 마을" basis="기준: 도달 시각까지 부족분 1명 이상인 마을">
          <p className="type-h2 text-text-pri tabular-nums">
            <AnimatedNumber value={shortCount} />곳
            <span className="ml-2 type-body-sm text-text-meta">대피 대상 {scopeCount}곳</span>
          </p>
        </Metric>

        <Metric label="필요 추가 차량" basis="기준: 차량으로 풀 수 있는 등급별 부족분이 0이 되는 최소 협약 차량 수를 다시 계산해 구함">
          <p className="type-h2 text-text-pri tabular-nums"><AnimatedNumber value={extraTotal} />대{unresolved && <span className="ml-1 type-body-sm text-text-meta">이상</span>}</p>
          {extra.length > 0 && (
            <p className="mt-1 type-body-sm text-text-sec">{extra.map((x) => `${x.typeLabel} ${x.count}대${x.resolved ? '' : ' 이상'}`).join(', ')}</p>
          )}
        </Metric>

        <div className="py-3">
          <ul className="space-y-1.5">
            {facts.map((s) => <li key={s} className="type-body-sm leading-6 text-text-pri">{s}</li>)}
          </ul>
        </div>

        {shortCount > 0 && (
          <div className="pt-3">
            <p className="type-caption text-text-sec">부족 마을 상위 {Math.min(5, shortCount)}곳</p>
            <ul className="mt-2 space-y-1">
              {shortList.slice(0, 5).map((v) => (
                <li key={v.code}>
                  <button
                    type="button" onClick={() => onPick(v.code)}
                    className="pressable flex w-full min-h-11 md:min-h-0 items-center gap-3 rounded-sm px-2 py-2 text-left hover:bg-mute"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate type-strong text-text-pri">{v.label}</span>
                      <span className="block type-meta text-text-meta">{v.dongName}, 왕복 {v.roundTripMin}분</span>
                    </span>
                    <span className="type-strong text-danger-text tabular-nums">부족 {v.shortage}명</span>
                    <ChevronRight size={16} aria-hidden="true" className="text-text-meta" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

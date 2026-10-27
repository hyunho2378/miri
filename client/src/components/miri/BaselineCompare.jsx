// 기본 순서 배정 대비 추천 배정 비교. 차이가 없으면 같다고 표기. 표면은 Card 하나(카드 안 카드 금지).
import { useMemo } from 'react'
import { fmtHM } from '../../lib/time.js'
import Disclosure from '../ui/Disclosure.jsx'

const sign = (n, unit) => (n > 0 ? `${n}${unit} 증가` : `${Math.abs(n)}${unit} 감소`)

export default function BaselineCompare({ result, villageLabel = (c) => c, basisText }) {
  const { diff, baseline, metrics } = result
  const same = diff.unserved === 0 && diff.weightedUnserved === 0 && diff.lastFinishMinutes === 0
  const rows = useMemo(() => {
    const map = {}
    for (const u of baseline.unserved) (map[u.village] = map[u.village] || { base: 0, opt: 0 }).base += 1
    for (const u of result.unassigned) (map[u.village] = map[u.village] || { base: 0, opt: 0 }).opt += 1
    return Object.entries(map).sort((a, b) => b[1].base - a[1].base || a[0].localeCompare(b[0]))
  }, [baseline.unserved, result.unassigned])

  return (
    <section aria-label="기본 순서 대비 추천 배정">
      <h2 className="type-title text-text-pri">기본 순서 대비 추천 배정</h2>
      {basisText && <p className="mt-1 type-body-sm text-text-sec">{basisText}</p>}
      {same ? (
        <p className="type-body-sm text-text-sec">기본 순서와 추천 배정의 결과가 같습니다.</p>
      ) : (
        <ul className="mt-3 grid">
          <li className="py-2">
            <p className="type-caption text-text-sec">이동 불가 인원</p>
            <p className="mt-1 type-strong text-text-pri tabular-nums">{diff.unserved === 0 ? '차이 없음' : sign(diff.unserved, '명')}</p>
            <p className="type-meta text-text-meta tabular-nums">기본 순서 {baseline.metrics.unserved}명, 추천 배정 {metrics.unserved}명</p>
          </li>
          <li className="py-2">
            <p className="type-caption text-text-sec">마지막 이송 완료</p>
            <p className="mt-1 type-strong text-text-pri tabular-nums">{diff.lastFinishMinutes === 0 ? '차이 없음' : diff.lastFinishMinutes < 0 ? `${-diff.lastFinishMinutes}분 단축` : `${diff.lastFinishMinutes}분 지연`}</p>
            <p className="type-meta text-text-meta tabular-nums">기본 순서 {fmtHM(baseline.metrics.lastFinishAt)}, 추천 배정 {fmtHM(metrics.lastFinishAt)}</p>
          </li>
        </ul>
      )}
      {rows.length > 0 && (
        <Disclosure className="mt-3" summary="마을별 이동 불가 인원 비교">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-6 px-1 pb-2 type-caption text-text-meta" aria-hidden="true">
            <span>마을</span><span className="text-right">기본 순서</span><span className="text-right">추천 배정</span>
          </div>
          <ul className="divide-y divide-line-sub">
            {rows.map(([code, r]) => (
              <li key={code} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-6 px-1 py-2 tabular-nums">
                <span className="min-w-0 truncate type-body-sm text-text-pri">{villageLabel(code)}</span>
                <span className="text-right type-body-sm text-text-sec"><span className="sr-only">기본 순서 </span>{r.base}명</span>
                <span className="text-right type-strong text-text-pri"><span className="sr-only">추천 배정 </span>{r.opt}명</span>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </section>
  )
}

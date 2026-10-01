// 규칙 순서 배정(원문 배정 규칙) 대비 AI 배정 최적화 비교. 차이가 없으면 같다고 표기.
import { useMemo } from 'react'
import { Route } from 'lucide-react'
import { GRADES } from '../../lib/shortage.js'
import { fmtHM } from '../../lib/time.js'
import Card from '../ui/Card.jsx'
import Disclosure from '../ui/Disclosure.jsx'

const sign = (n, unit) => (n > 0 ? `${n}${unit} 증가` : `${Math.abs(n)}${unit} 감소`)

export default function BaselineCompare({ result, villageLabel = (c) => c }) {
  const { diff, baseline, metrics } = result
  const same = diff.unserved === 0 && diff.weightedUnserved === 0 && diff.lastFinishMinutes === 0
  const rows = useMemo(() => {
    const map = {}
    for (const u of baseline.unserved) (map[u.village] = map[u.village] || { base: 0, opt: 0 }).base += 1
    for (const u of result.unassigned) (map[u.village] = map[u.village] || { base: 0, opt: 0 }).opt += 1
    return Object.entries(map).sort((a, b) => b[1].base - a[1].base || a[0].localeCompare(b[0]))
  }, [baseline.unserved, result.unassigned])
  const weightNote = GRADES.map((g) => `${g.label} ${g.weight}`).join(' ')

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 type-caption text-primary-text"><Route size={16} aria-hidden="true" />AI 배정</span>
        <h2 className="type-h3 text-text-pri">규칙 순서 배정 대비 결과</h2>
      </div>
      {same ? (
        <p className="mt-3 type-body-sm text-text-sec">규칙 순서와 동일한 결과</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          <li className="rounded-md bg-subtle p-3">
            <p className="type-caption text-text-sec">미이송</p>
            <p className="mt-1 type-strong text-text-pri tabular-nums">{diff.unserved === 0 ? '차이 없음' : sign(diff.unserved, '명')}</p>
            <p className="type-meta text-text-meta tabular-nums">규칙 순서 {baseline.metrics.unserved}명 → AI 배정 {metrics.unserved}명</p>
          </li>
          <li className="rounded-md bg-subtle p-3">
            <p className="type-caption text-text-sec">등급 가중 미이송</p>
            <p className="mt-1 type-strong text-text-pri tabular-nums">{diff.weightedUnserved === 0 ? '차이 없음' : sign(diff.weightedUnserved, '점')}</p>
            <p className="type-meta text-text-meta tabular-nums">{baseline.metrics.weightedUnserved}점 → {metrics.weightedUnserved}점</p>
          </li>
          <li className="rounded-md bg-subtle p-3">
            <p className="type-caption text-text-sec">마지막 이송 완료</p>
            <p className="mt-1 type-strong text-text-pri tabular-nums">{diff.lastFinishMinutes === 0 ? '차이 없음' : diff.lastFinishMinutes < 0 ? `${-diff.lastFinishMinutes}분 단축` : `${diff.lastFinishMinutes}분 늦어짐`}</p>
            <p className="type-meta text-text-meta tabular-nums">{fmtHM(baseline.metrics.lastFinishAt)} → {fmtHM(metrics.lastFinishAt)}</p>
          </li>
        </ul>
      )}
      <p className="mt-3 type-meta text-text-meta">
        제약 조건 최적화: 차량 정원과 회차 순서와 마을별 이송 완료 기한 안에서 등급 가중 미이송이 가장 적은 조합 탐색. 가중치 {weightNote}. 규칙 순서는 침상부터 도보 순, 같은 등급 안 도달 시각 빠른 마을 우선
      </p>
      {rows.length > 0 && (
        <Disclosure className="mt-3" summary="마을별 미이송 비교">
          <div className="overflow-x-auto">
            <table className="w-full text-left tabular-nums">
              <thead>
                <tr className="bg-subtle">
                  <th scope="col" className="px-3 py-2 type-caption text-text-meta">마을</th>
                  <th scope="col" className="px-3 py-2 type-caption text-text-meta text-right">규칙 순서</th>
                  <th scope="col" className="px-3 py-2 type-caption text-text-meta text-right">AI 배정</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([code, r]) => (
                  <tr key={code} className="border-t border-line-sub">
                    <td className="px-3 py-2 type-body-sm text-text-pri">{villageLabel(code)}</td>
                    <td className="px-3 py-2 type-body-sm text-text-sec text-right">{r.base}명</td>
                    <td className="px-3 py-2 type-body-sm text-text-pri text-right">{r.opt}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      )}
    </Card>
  )
}

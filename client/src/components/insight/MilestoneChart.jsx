// 자동처리율 상승 곡선. 계획서 4-1 ① 의 60→80→90 마일스톤을 목표선으로, 실측을 실선으로 그린다.
// 라이브러리 없이 SVG 직접(DESIGN.md). 색으로만 구분하지 않고 파선과 범례를 같이 둔다.
import clsx from 'clsx'
import { labelStep, useChartSize, useEnterOnce } from '../dashboard/chartUtils.js'

const PAD = { l: 36, r: 12, t: 14, b: 26 }
const TICKS = [0, 25, 50, 75, 100]

export default function MilestoneChart({
  labels = [], actual = [], target = [], milestones = [],
  actualName, targetName, milestoneLabel = () => '', height = 240, ariaLabel
}) {
  const { ref, width } = useChartSize(height)
  const entered = useEnterOnce()

  const innerW = Math.max(0, width - PAD.l - PAD.r)
  const innerH = height - PAD.t - PAD.b
  const n = labels.length
  const x = (i) => PAD.l + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const y = (v) => PAD.t + innerH - (innerH * v) / 100
  const step = labelStep(n, innerW, 48)

  // 실측은 아직 지나온 구간까지만 있다. null 뒤는 그리지 않는다
  const measured = actual.map((v, i) => ({ v, i })).filter((p) => typeof p.v === 'number')
  const path = (points) => points.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i)},${y(p.v)}`).join(' ')
  const last = measured[measured.length - 1]

  return (
    <div>
      <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-chart-1" />
          <span className="type-caption text-text-sec">{actualName}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-chart-4" />
          <span className="type-caption text-text-sec">{targetName}</span>
        </li>
      </ul>

      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel} className="overflow-visible">
            {TICKS.map((tk) => (
              <g key={tk}>
                <line x1={PAD.l} x2={width - PAD.r} y1={y(tk)} y2={y(tk)} className="stroke-line-sub" strokeWidth="1" />
                <text x={PAD.l - 8} y={y(tk) + 4} textAnchor="end" className="fill-text-meta tabular-nums" fontSize="12">{tk}</text>
              </g>
            ))}

            {labels.map((l, i) => (i % step === 0 ? (
              <text key={l} x={x(i)} y={height - 6} textAnchor="middle" className="fill-text-meta tabular-nums" fontSize="12">{l}</text>
            ) : null))}

            {/* 목표선. 파선이라 그려 들어오는 대신 페이드로 진입한다(TrendChart 와 같은 이유) */}
            <path
              d={path(target.map((v, i) => ({ v, i })))} fill="none" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="stroke-chart-4" strokeDasharray="6 4"
              opacity={entered ? 1 : 0} style={{ transition: 'opacity var(--dur) var(--ease-out)' }}
            />

            {milestones.map((m) => (
              <g key={m.year}>
                <rect
                  x={x(m.index) - 4} y={y(m.target) - 4} width="8" height="8" rx="2"
                  className="fill-chart-4 stroke-page" strokeWidth="2"
                />
                <text
                  x={x(m.index)} y={y(m.target) - 12} textAnchor="middle"
                  className="fill-text-sec tabular-nums" fontSize="12"
                >
                  {m.target}
                </text>
              </g>
            ))}

            <path
              d={path(measured)} fill="none" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="stroke-chart-1"
              pathLength="1" strokeDasharray="1" strokeDashoffset={entered ? 0 : 1}
              style={{ transition: 'stroke-dashoffset var(--dur) var(--ease-out)' }}
            />

            {last && (
              <circle cx={x(last.i)} cy={y(last.v)} r="4" className="fill-chart-1 stroke-page" strokeWidth="2" />
            )}
          </svg>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {milestones.map((m) => (
          <li key={m.year} className={clsx('type-meta text-text-meta tabular-nums')}>
            {milestoneLabel(m)}
          </li>
        ))}
      </ul>
    </div>
  )
}

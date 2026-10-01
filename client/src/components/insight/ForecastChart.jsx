// 민원량 예측. 계획서 4-1 ③.
// 예측 구간은 색이 아니라 파선과 음영으로 구분한다(IA_PHASE5 요구). 실측과 예측은 같은 chart-1 이다.
import clsx from 'clsx'
import { formatNumber } from '../../lib/format.js'
import { niceMax, useChartSize, useEnterOnce } from '../dashboard/chartUtils.js'

const PAD = { l: 40, r: 12, t: 16, b: 26 }

export default function ForecastChart({
  actualLabels = [], forecastLabels = [], actual = [], forecast = [], lower = [], upper = [],
  eventIndex = null, eventLabel, actualName, forecastName, bandName, peakName,
  height = 260, ariaLabel
}) {
  const { ref, width } = useChartSize(height)
  const entered = useEnterOnce()

  const labels = [...actualLabels, ...forecastLabels]
  const n = labels.length
  const split = actual.length - 1               // 실측 마지막 점. 예측은 여기서 이어 붙는다
  const max = niceMax(Math.max(1, ...actual, ...upper))
  const innerW = Math.max(0, width - PAD.l - PAD.r)
  const innerH = height - PAD.t - PAD.b
  const x = (i) => PAD.l + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const y = (v) => PAD.t + innerH - (innerH * v) / max
  const ticks = [0, 0.5, 1]

  const line = (pts, from) => pts.map((v, k) => `${k === 0 ? 'M' : 'L'}${x(from + k)},${y(v)}`).join(' ')
  // 예측선은 실측 마지막 점에서 출발한다. 끊어 그리면 두 구간이 다른 데이터로 보인다
  const fcPts = [actual[split], ...forecast]
  const band = [
    ...[actual[split], ...upper].map((v, k) => `${k === 0 ? 'M' : 'L'}${x(split + k)},${y(v)}`),
    ...[...lower].reverse().map((v, k) => `L${x(n - 1 - k)},${y(v)}`),
    `L${x(split)},${y(actual[split])}`, 'Z'
  ].join(' ')

  return (
    <div>
      <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-chart-1" />
          <span className="type-caption text-text-sec">{actualName}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          {/* 예측은 파선이다. 범례 표식도 파선으로 보여야 색만으로 구분하지 않는다 */}
          <span aria-hidden="true" className="inline-flex items-center gap-0.5">
            <span className="h-0.5 w-1.5 rounded-full bg-chart-1" />
            <span className="h-0.5 w-1.5 rounded-full bg-chart-1" />
          </span>
          <span className="type-caption text-text-sec">{forecastName}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-4 rounded-xs bg-chart-1 opacity-20" />
          <span className="type-caption text-text-sec">{bandName}</span>
        </li>
      </ul>

      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel} className="overflow-visible">
            {ticks.map((tk) => (
              <g key={tk}>
                <line x1={PAD.l} x2={width - PAD.r} y1={y(max * tk)} y2={y(max * tk)} className="stroke-line-sub" strokeWidth="1" />
                <text x={PAD.l - 8} y={y(max * tk) + 4} textAnchor="end" className="fill-text-meta tabular-nums" fontSize="12">
                  {formatNumber(Math.round(max * tk))}
                </text>
              </g>
            ))}

            {labels.map((l, i) => (
              <text key={l} x={x(i)} y={height - 6} textAnchor="middle" className="fill-text-meta tabular-nums" fontSize="12">{l}</text>
            ))}

            {/* 신뢰구간 음영. 색이 아니라 채움 투명도로 구분한다 */}
            <path
              d={band} className="fill-chart-1" fillOpacity="0.16" stroke="none"
              opacity={entered ? 1 : 0} style={{ transition: 'opacity var(--dur) var(--ease-out)' }}
            />

            {/* 실측과 예측의 경계 */}
            <line
              x1={x(split)} x2={x(split)} y1={PAD.t} y2={PAD.t + innerH}
              className="stroke-line-def" strokeWidth="1" strokeDasharray="3 3"
            />

            {eventIndex !== null && (
              <line
                x1={x(eventIndex)} x2={x(eventIndex)} y1={PAD.t} y2={PAD.t + innerH}
                className="stroke-chart-4" strokeWidth="2" strokeDasharray="2 4"
              />
            )}

            <path
              d={line(fcPts, split)} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="stroke-chart-1" strokeDasharray="6 4"
              opacity={entered ? 1 : 0} style={{ transition: 'opacity var(--dur) var(--ease-out)' }}
            />

            <path
              d={line(actual, 0)} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="stroke-chart-1"
              pathLength="1" strokeDasharray="1" strokeDashoffset={entered ? 0 : 1}
              style={{ transition: 'stroke-dashoffset var(--dur) var(--ease-out)' }}
            />

            {forecast.map((v, i) => (
              <circle key={forecastLabels[i]} cx={x(split + 1 + i)} cy={y(v)} r="3" className="fill-page stroke-chart-1" strokeWidth="2" />
            ))}
          </svg>
        )}
      </div>

      {eventIndex !== null && (
        <p className={clsx('mt-2 type-meta text-text-meta tabular-nums')}>
          <span className="mr-1.5 inline-block align-middle h-2 w-2 rounded-full bg-chart-4" aria-hidden="true" />
          {peakName} {eventLabel}
        </p>
      )}
    </div>
  )
}

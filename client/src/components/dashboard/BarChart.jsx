// 그룹 막대. 도입 전 사후 비교에 쓴다. 진입은 scaleY 0→1 한 번(transform-origin bottom).
import clsx from 'clsx'
import { formatNumber } from '../../lib/format.js'
import { niceMax, useChartSize, useEnterOnce } from './chartUtils.js'

const PAD = { l: 40, r: 12, t: 8, b: 28 }

// groups: [{ label, bars: [{ key, name, value, fill, dot }] }]
export default function BarChart({ groups = [], height = 240, ariaLabel }) {
  const { ref, width } = useChartSize(height)
  const entered = useEnterOnce()

  const values = groups.flatMap((g) => g.bars.map((b) => b.value))
  const min = Math.min(0, ...values)
  const max = niceMax(Math.max(1, ...values))
  const span = max - min
  const innerW = Math.max(0, width - PAD.l - PAD.r)
  const innerH = height - PAD.t - PAD.b
  const y = (v) => PAD.t + innerH - (innerH * (v - min)) / span
  const zeroY = y(0)
  const groupW = groups.length ? innerW / groups.length : innerW
  const legend = groups[0]?.bars || []
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div>
      <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {legend.map((b) => (
          <li key={b.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={clsx('h-2 w-2 rounded-full', b.dot)} />
            <span className="type-caption text-text-sec">{b.name}</span>
          </li>
        ))}
      </ul>

      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel}>
            {ticks.map((tk) => {
              const v = min + span * tk
              return (
                <g key={tk}>
                  <line x1={PAD.l} x2={width - PAD.r} y1={y(v)} y2={y(v)} className="stroke-line-sub" strokeWidth="1" />
                  <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="fill-text-meta tabular-nums" fontSize="12">
                    {formatNumber(Math.round(v))}
                  </text>
                </g>
              )
            })}

            {groups.map((g, gi) => {
              // 7단계. 막대를 두껍게 했다. 두 그룹 비교 차트라 얇으면 색이 면으로 안 읽힌다
              const barW = Math.min(72, (groupW * 0.78) / Math.max(1, g.bars.length))
              const startX = PAD.l + groupW * gi + (groupW - barW * g.bars.length) / 2
              return (
                <g key={g.label}>
                  {g.bars.map((b, bi) => {
                    const top = Math.min(zeroY, y(b.value))
                    const h = Math.max(1, Math.abs(zeroY - y(b.value)))
                    return (
                      <rect
                        key={b.key} x={startX + barW * bi} y={top} width={barW - 6} height={h} rx="4"
                        className={b.fill}
                        style={{
                          transformOrigin: `0 ${zeroY}px`,
                          transform: `scaleY(${entered ? 1 : 0})`,
                          transition: 'transform var(--dur) var(--ease-out)'
                        }}
                      >
                        <title>{`${g.label} ${b.name} ${formatNumber(b.value)}`}</title>
                      </rect>
                    )
                  })}
                  <text x={PAD.l + groupW * gi + groupW / 2} y={height - 8} textAnchor="middle" className="fill-text-meta" fontSize="12">
                    {g.label}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}

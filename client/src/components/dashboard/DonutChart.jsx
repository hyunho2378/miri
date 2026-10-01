// 도넛 + 범례 표. 조각 색은 chart-1~4 순환, 5개를 넘으면 기타로 합친다(COMPONENTS.md).
import clsx from 'clsx'
import { useLang } from '../../i18n/LangContext.jsx'
import { formatNumber } from '../../lib/format.js'
import { useEnterOnce } from './chartUtils.js'
import StatusPill from './StatusPill.jsx'

const SIZE = 176
const STROKE = 30
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R
// 조각 사이 간격. 모든 조각에서 같은 길이를 빼고 앞뒤로 절반씩 밀어 간격을 일정하게 만든다.
// 링 두께가 30 이라 stroke-linecap round 는 쓸 수 없다. 둥근 캡이 양 끝에 STROKE/2 씩 더 그려져
// 간격을 보이게 하려면 조각마다 34px 넘게 잘라내야 하고, 네 조각이면 원의 30% 가 사라진다
const GAP = 5
const TONE = [
  { arc: 'stroke-chart-1', dot: 'bg-chart-1' },
  { arc: 'stroke-chart-2', dot: 'bg-chart-2' },
  { arc: 'stroke-chart-3', dot: 'bg-chart-3' },
  { arc: 'stroke-chart-4', dot: 'bg-chart-4' }
]
const MAX_SLICES = TONE.length

export default function DonutChart({ items = [], otherLabel, ariaLabel }) {
  const { t } = useLang()
  const entered = useEnterOnce()

  // 색은 chart-1~4 네 가지뿐이다. 기타가 생기면 실제 조각은 셋만 두어 색이 겹치지 않게 한다
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const overflow = sorted.length > MAX_SLICES
  const head = sorted.slice(0, overflow ? MAX_SLICES - 1 : MAX_SLICES)
  const tail = sorted.slice(head.length)
  const slices = tail.length
    ? [...head, { label: otherLabel, value: tail.reduce((s, i) => s + i.value, 0), status: null }]
    : head
  const total = slices.reduce((s, i) => s + i.value, 0) || 1

  // 조각이 하나면 끊을 자리가 없다. 간격을 0 으로 두어 온전한 링을 그린다
  const gap = slices.length > 1 ? GAP : 0
  let offset = 0
  const arcs = slices.map((s, i) => {
    const len = (s.value / total) * C
    const arc = { ...s, len: Math.max(1, len - gap), offset: offset + gap / 2, tone: TONE[i % TONE.length] }
    offset += len
    return arc
  })

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
      <div className="relative shrink-0 self-center">
        <svg width={SIZE} height={SIZE} role="img" aria-label={ariaLabel}>
          {/* circle 의 path 시작점은 3시라 -90 도 돌려 첫 조각이 12시에서 시작하게 맞춘다 */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-mute" />
            {arcs.map((a) => (
              <circle
                key={a.label} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE}
                className={a.tone.arc}
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={entered ? -a.offset : C}
                style={{ transition: 'stroke-dashoffset var(--dur) var(--ease-out)' }}
              >
                <title>{`${a.label} ${formatNumber(a.value)}`}</title>
              </circle>
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="type-kpi text-text-pri tabular-nums">{formatNumber(total)}</span>
          <span className="type-meta text-text-meta">{t('admin.dashboard.total')}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <caption className="sr-only">{t('admin.dashboard.legend')}</caption>
          <thead>
            <tr className="bg-subtle">
              <th className="px-3 py-2 type-caption font-semibold text-text-meta">{t('common.meta.facility')}</th>
              <th className="px-3 py-2 type-caption font-semibold text-text-meta text-right">{t('common.meta.count')}</th>
              <th className="px-3 py-2 type-caption font-semibold text-text-meta text-right">{t('admin.dashboard.share')}</th>
              <th className="px-3 py-2 type-caption font-semibold text-text-meta">{t('admin.users.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {arcs.map((a) => (
              <tr key={a.label} className="border-t border-line-sub">
                <td className="px-3 py-2 type-body-sm text-text-pri">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className={clsx('h-2 w-2 shrink-0 rounded-full', a.tone.dot)} />
                    <span className="truncate">{a.label}</span>
                  </span>
                </td>
                <td className="px-3 py-2 type-body-sm text-text-pri text-right">{formatNumber(a.value)}</td>
                <td className="px-3 py-2 type-body-sm text-text-sec text-right">{((a.value / total) * 100).toFixed(1)}%</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {a.status && <StatusPill size="sm" status={a.status} label={t(`common.status.${a.status}`)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

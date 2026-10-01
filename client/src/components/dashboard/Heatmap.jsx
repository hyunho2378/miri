// 시간대 x 요일 히트맵. 사업계획서 4-1 성수기 시간대 문의 급증 근거 화면이다.
// 넓은 표라 자기 overflow-x-auto 컨테이너 안에서만 스크롤한다(PITFALLS 18. 전역 가로 스크롤 금지).
import clsx from 'clsx'
import { useLang } from '../../i18n/LangContext.jsx'
import { formatNumber } from '../../lib/format.js'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const STEPS = ['bg-mute', 'bg-chart-heat-1', 'bg-chart-heat-2', 'bg-chart-heat-3', 'bg-chart-heat-4']
// 5단계. 색으로만 뜻을 전하지 않도록 셀마다 title 로 건수를 붙인다.
// 7단계. 알파(primary/20 등)를 흰 면에 겹치면 채도가 빠져 단계가 뿌예졌다. tokens 의 실색 4단계로 바꿨다.
// 0 은 데이터 없음이라 색 단계가 아니다

export default function Heatmap({ matrix = [], ariaLabel }) {
  const { t } = useLang()
  const max = Math.max(1, ...matrix.flat())
  const level = (v) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)))

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5" aria-label={ariaLabel}>
          <thead>
            <tr>
              <th className="sticky left-0 z-raised bg-page pr-2 text-left type-caption font-semibold text-text-meta">
                {t('admin.analytics.weekday')}
              </th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="w-6 pb-1 type-meta font-normal text-text-meta tabular-nums">
                  {h % 3 === 0 ? h : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, d) => (
              <tr key={DAYS[d]}>
                <th scope="row" className="sticky left-0 z-raised bg-page pr-2 text-left type-caption font-semibold text-text-meta">
                  {t(`facility.day.${DAYS[d]}`)}
                </th>
                {row.map((v, h) => (
                  <td key={h} className="p-0">
                    <span
                      className={clsx('block h-6 w-6 rounded-xs', STEPS[level(v)])}
                      title={`${t(`facility.day.${DAYS[d]}`)} ${h}${t('admin.analytics.hour')} ${formatNumber(v)}${t('common.meta.count')}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="type-meta text-text-meta tabular-nums">0</span>
        {STEPS.map((s) => <span key={s} aria-hidden="true" className={clsx('h-3 w-6 rounded-xs', s)} />)}
        <span className="type-meta text-text-meta tabular-nums">{formatNumber(max)}</span>
        <span className="type-meta text-text-meta">{t('common.meta.count')}</span>
      </div>
    </div>
  )
}

// 예약 현황 주간 그리드. 연동된 예약 시스템의 읽기 전용 뷰다(IA.md).
// 날짜 이동은 커스텀 버튼이다. 네이티브 date input 을 노출하지 않는다(DESIGN.md 절대 규칙).
// 셀 색은 StatusPill 의 상태 매핑을 그대로 받아 쓴다. 여기서 상태 색을 다시 정의하지 않는다.
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { useLang } from '../../i18n/LangContext.jsx'
import IconButton from '../ui/IconButton.jsx'
import Button from '../ui/Button.jsx'
import { cellFill } from './StatusPill.jsx'
const WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const STATES = ['open', 'booked', 'full', 'maintenance']

export default function WeekCalendar({ from, hours = [], days = [], onPrev, onNext, onToday, ariaLabel }) {
  const { t } = useLang()
  const start = new Date(from)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton size="md" aria-label={t('admin.reservations.prevWeek')} onClick={onPrev}>
            <ChevronLeft size={16} aria-hidden="true" />
          </IconButton>
          <span className="px-2 type-body-sm font-medium text-text-pri tabular-nums">
            {format(start, 'yyyy.MM.dd')} ~ {format(addDays(start, 6), 'MM.dd')}
          </span>
          <IconButton size="md" aria-label={t('admin.reservations.nextWeek')} onClick={onNext}>
            <ChevronRight size={16} aria-hidden="true" />
          </IconButton>
        </div>
        <Button size="sm" variant="ghost" onClick={onToday}>{t('admin.reservations.thisWeek')}</Button>
      </div>

      {/* 넓은 표라 자기 컨테이너 안에서만 가로 스크롤한다 */}
      <div className="mt-4 overflow-x-auto">
        <table className="border-separate border-spacing-0.5" aria-label={ariaLabel}>
          <thead>
            <tr>
              <th className="sticky left-0 z-raised bg-page pr-2 text-left type-caption font-semibold text-text-meta">
                {t('admin.analytics.weekday')}
              </th>
              {hours.map((h) => (
                <th key={h} className="w-10 pb-1 type-meta font-normal text-text-meta tabular-nums">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((row, d) => {
              const date = addDays(start, d)
              return (
                <tr key={d}>
                  <th scope="row" className="sticky left-0 z-raised bg-page pr-2 text-left type-caption font-semibold text-text-meta whitespace-nowrap">
                    {t(`facility.day.${WEEKDAY[date.getDay()]}`)} {format(date, 'MM.dd')}
                  </th>
                  {row.map((state, h) => (
                    <td key={h} className="p-0">
                      <span
                        className={clsx('block h-8 w-10 rounded-xs', cellFill(state))}
                        title={`${format(date, 'MM.dd')} ${hours[h]} ${t(`common.status.${state}`)}`}
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="type-caption text-text-meta">{t('admin.reservations.legend')}</span>
        {/* 범례 견본은 셀과 같은 면을 쓴다. 필을 쓰면 유지보수 셀 색과 범례 색이 어긋난다 */}
        {STATES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 type-caption text-text-sec">
            <span aria-hidden="true" className={clsx('h-3 w-5 rounded-xs', cellFill(s))} />
            {t(`common.status.${s}`)}
          </span>
        ))}
      </div>
    </div>
  )
}

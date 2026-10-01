// 요일별 운영시간. 휴관일은 danger-text, 오늘 행은 primary-soft 배경.
import clsx from 'clsx'
import { useLang } from '../../i18n/LangContext.jsx'
import { hoursText } from '../../lib/lang.js'
import { TONE_TEXT, statusTone } from '../dashboard/StatusPill.jsx'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export default function HoursTable({ hours = {}, className }) {
  const { t } = useLang()
  const today = WEEKDAY[new Date().getDay()]
  // 데이터의 휴관 표기는 언어와 무관한 원문이라 문자열로 비교하지 않는다.
  // 시각 범위가 없으면 그날은 운영하지 않는 것으로 본다
  const isClosed = (v) => !/\d{1,2}:\d{2}/.test(v || '')

  return (
    <table className={clsx('w-full text-left tabular-nums', className)}>
      <caption className="sr-only">{t('facility.detail.hours')}</caption>
      <tbody>
        {DAYS.map((d) => {
          const value = hours[d] || ''
          const closed = isClosed(value)
          return (
            <tr key={d} className={clsx('border-t border-line-sub first:border-t-0', d === today && 'bg-primary-soft')}>
              <th scope="row" className="w-16 px-3 py-2.5 type-caption font-semibold text-text-meta">
                {t(`facility.day.${d}`)}
              </th>
              {/* 데이터의 휴관 표기는 한국어 원문이라 그대로 두면 언어를 바꿔도 남는다. 상태 라벨로 바꿔 그린다 */}
              <td className={clsx('px-3 py-2.5 type-body-sm', closed ? TONE_TEXT[statusTone('closed')] : 'text-text-pri')}>
                {hoursText(value, t)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

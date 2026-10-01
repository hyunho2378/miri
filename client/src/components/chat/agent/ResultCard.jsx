// 실행 결과 카드. 예약 확정과 문의 접수 두 가지다.
// 대화가 이어져도 이 카드는 그 자리에 남는다. 사용자가 나중에 올려 봐도 예약번호를 다시 찾을 수 있어야 한다.
import { CalendarPlus, CheckCircle2 } from 'lucide-react'
import { useLang } from '../../../i18n/LangContext.jsx'
import { formatPrice } from '../../../lib/format.js'
import { downloadIcs } from '../../../lib/ics.js'
import Button from '../../ui/Button.jsx'

const Row = ({ label, children }) => (
  <>
    <dt className="type-caption text-text-meta">{label}</dt>
    <dd className="type-body-sm text-text-sec tabular-nums">{children}</dd>
  </>
)

export default function ResultCard({ result }) {
  const { t } = useLang()
  const r = result.reservation
  const ticket = result.ticket

  if (r) {
    return (
      <section className="mt-4 bg-page rounded-lg shadow-card p-4 lg:p-5 animate-flow-down-late" aria-label={t('chat.agent.resvTitle')}>
        <p className="inline-flex items-center gap-2 type-h3 text-text-pri">
          <CheckCircle2 size={20} aria-hidden="true" className="text-primary" />
          {t('chat.agent.resvTitle')}
        </p>
        <p className="mt-3 type-kpi text-text-pri tabular-nums">{r.code}</p>
        <p className="type-caption text-text-meta">{t('chat.agent.resvCode')}</p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line-sub pt-4">
          <Row label={t('chat.agent.resvWhere')}>{r.facilityName}</Row>
          <Row label={t('chat.agent.resvWhen')}>{r.date} {r.time}</Row>
          <Row label={t('chat.agent.resvTotal')}>{formatPrice(r.total)}</Row>
          <Row label={t('chat.agent.resvCancel')}>{r.cancelBy}</Row>
        </dl>

        {r.guide && <p className="mt-3 type-meta text-text-meta">{r.guide}</p>}

        <div className="mt-4">
          <Button
            variant="secondary" leftIcon={<CalendarPlus size={16} aria-hidden="true" />}
            onClick={() => downloadIcs({
              code: r.code,
              title: `${r.facilityName} ${t('chat.agent.court', { c: r.court })}`,
              date: r.date, time: r.time, location: r.facilityName, description: r.guide
            })}
          >
            {t('chat.agent.resvIcs')}
          </Button>
        </div>
      </section>
    )
  }

  if (ticket) {
    return (
      <section className="mt-4 bg-page rounded-lg shadow-card p-4 lg:p-5 animate-flow-down-late" aria-label={t('chat.agent.ticketTitle')}>
        <p className="inline-flex items-center gap-2 type-h3 text-text-pri">
          <CheckCircle2 size={20} aria-hidden="true" className="text-primary" />
          {t('chat.agent.ticketTitle')}
        </p>
        <p className="mt-3 type-kpi text-text-pri tabular-nums">{ticket.ticketId}</p>
        <p className="type-caption text-text-meta">{t('chat.agent.ticketCode')}</p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line-sub pt-4">
          <Row label={t('chat.handoffCard.department')}>{ticket.department}</Row>
          <Row label={t('chat.handoffCard.phone')}>{ticket.phone}</Row>
          <Row label={t('chat.handoffCard.hours')}>{ticket.hours}</Row>
        </dl>
      </section>
    )
  }

  return null
}

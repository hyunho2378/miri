// 도구별 상세 렌더러 6종. ToolCard 를 펼쳤을 때 나오는 내용이다.
// 파일 하나에 둔 이유는 전부 20줄 안쪽이고 ToolCard 말고는 쓰는 곳이 없기 때문이다.
import { ExternalLink, Phone } from 'lucide-react'
import { useLang } from '../../../i18n/LangContext.jsx'
import { formatPrice } from '../../../lib/format.js'
import StatusPill from '../../dashboard/StatusPill.jsx'
import SourcePanel from '../SourcePanel.jsx'

const Row = ({ label, children }) => (
  <>
    <dt className="type-caption text-text-meta">{label}</dt>
    <dd className="type-body-sm text-text-sec">{children}</dd>
  </>
)

// 1. 예약 가능 시간대
export function SlotList({ result }) {
  const { t } = useLang()
  return (
    <ul className="space-y-1.5">
      {(result.slots || []).map((s) => (
        <li key={`${s.time}-${s.court}`} className="flex items-center gap-3">
          <span className="type-body-sm tabular-nums text-text-pri w-14">{s.time}</span>
          <span className="min-w-0 flex-1 type-body-sm text-text-sec truncate">{t('chat.agent.court', { c: s.court })}</span>
          <span className="type-caption tabular-nums text-text-meta">{formatPrice(s.fee)}</span>
          <StatusPill
            size="sm" status={s.status === 'open' ? 'open' : 'full'}
            label={t(s.status === 'open' ? 'chat.agent.slotOpen' : 'chat.agent.slotFull')}
          />
        </li>
      ))}
    </ul>
  )
}

// 2. 위치. 지도 딥링크는 사용자가 눌러야 열린다(쓰기가 아니라 이동이다)
export function LocationDetail({ result }) {
  const { t } = useLang()
  const link = 'inline-flex items-center gap-1 min-h-11 type-body-sm font-medium text-primary hover:text-primary-hover transition-colors duration-fast'
  return (
    <div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        <Row label={t('chat.agent.locAddress')}>{result.address}</Row>
        {result.transit?.length > 0 && <Row label={t('chat.agent.locTransit')}>{result.transit.join(', ')}</Row>}
        {result.parking && <Row label={t('chat.agent.locParking')}>{result.parking}</Row>}
      </dl>
      {result.links && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          <a href={result.links.naver} target="_blank" rel="noreferrer" className={link}>
            {t('chat.agent.locNaver')}<ExternalLink size={14} aria-hidden="true" />
          </a>
          <a href={result.links.kakao} target="_blank" rel="noreferrer" className={link}>
            {t('chat.agent.locKakao')}<ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  )
}

// 3. 요금 항목별 합계
export function FeeBreakdown({ result }) {
  const { t } = useLang()
  return (
    <table className="w-full text-left">
      <tbody>
        {(result.items || []).map((i) => (
          <tr key={i.label}>
            <td className="py-1 type-body-sm text-text-sec">{i.label}</td>
            <td className="py-1 type-caption text-text-meta tabular-nums">{t('chat.agent.feeCount', { n: i.count })}</td>
            <td className="py-1 type-caption text-text-meta tabular-nums text-right">{t('chat.agent.feeUnit', { n: formatPrice(i.unit) })}</td>
            <td className="py-1 type-body-sm text-text-pri tabular-nums text-right">{formatPrice(i.amount)}</td>
          </tr>
        ))}
        <tr className="border-t border-line-sub">
          <td className="pt-2 type-body-sm font-medium text-text-pri" colSpan={3}>{t('chat.agent.feeTotal')}</td>
          <td className="pt-2 type-h3 text-text-pri tabular-nums text-right">{formatPrice(result.total)}</td>
        </tr>
      </tbody>
    </table>
  )
}

// 4. 근거 목록. 우측 근거 열과 같은 데이터를 같은 컴포넌트로 그린다
export function KnowledgeHits({ result }) {
  return <SourcePanel sources={result.sources || []} />
}

// 5. 담당 부서
export function HandoffDetail({ result }) {
  const { t } = useLang()
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
      <Row label={t('chat.handoffCard.department')}>{result.department}</Row>
      <dt className="type-caption text-text-meta">{t('chat.handoffCard.phone')}</dt>
      <dd className="type-body-sm">
        <a href={`tel:${result.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover transition-colors duration-fast">
          <Phone size={16} aria-hidden="true" />{result.phone}
        </a>
      </dd>
      <Row label={t('chat.handoffCard.hours')}>{result.hours}</Row>
    </dl>
  )
}

// 6. 감지한 언어
export function LangDetect({ result }) {
  const { t } = useLang()
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
      <Row label={t('chat.agent.langDetected')}>{t(`common.lang.${result.detected}`)}</Row>
      <Row label={t('chat.agent.langAnswer')}>{t(`common.lang.${result.answerLang}`)}</Row>
    </dl>
  )
}

export const DETAIL = {
  reservation: SlotList,
  location: LocationDetail,
  fee: FeeBreakdown,
  knowledge: KnowledgeHits,
  handoff: HandoffDetail,
  translate: LangDetect
}

// 발견 패턴 카드. 계획서 4-1 ② 민원 패턴 분석 → 권고 → 예상 효과 구조 그대로.
// 근거 수치는 mock/patterns.json 의 실측값이고 문장은 i18n 이 조립한다.
import { useLang } from '../../i18n/LangContext.jsx'
import { TONE_TEXT } from '../dashboard/StatusPill.jsx'
import Badge from '../ui/Badge.jsx'

// 패턴 키 → i18n 접두어. 사전은 p1~p4 로 두고 데이터는 뜻이 보이는 키를 쓴다
const PREFIX = { parking: 'p1', night: 'p2', fee: 'p3', reserve: 'p4' }

export default function PatternCard({ pattern, facilityName }) {
  const { t } = useLang()
  const p = PREFIX[pattern.key]
  const vars = Object.fromEntries(pattern.evidence.map((e) => [e.key, e.value]))
  const high = pattern.severity === 'high'

  return (
    <article className="flex flex-col bg-page rounded-lg shadow-card p-4 lg:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={high ? 'primary' : 'neutral'}>
          {t(high ? 'admin.pattern.severityHigh' : 'admin.pattern.severityMedium')}
        </Badge>
        {facilityName && <span className="min-w-0 type-meta text-text-meta truncate">{facilityName}</span>}
      </div>

      {/* 한국어 제목이 낱말 중간에서 끊기지 않게 한다 */}
      <h3 className="mt-2 type-h3 text-text-pri break-keep">{t(`admin.pattern.${p}Title`)}</h3>

      <dl className="mt-3 space-y-3">
        <div>
          <dt className="type-caption text-text-meta">{t('admin.pattern.evidenceLabel')}</dt>
          <dd className="mt-0.5 type-body-sm text-text-sec tabular-nums">{t(`admin.pattern.${p}Evidence`, vars)}</dd>
        </div>
        <div>
          <dt className="type-caption text-text-meta">{t('admin.pattern.recoLabel')}</dt>
          <dd className="mt-0.5 type-body-sm text-text-sec">{t(`admin.pattern.${p}Reco`)}</dd>
        </div>
      </dl>

      <p className="mt-4 pt-3 border-t border-line-sub type-caption tabular-nums">
        <span className="text-text-meta">{t('admin.pattern.effectLabel')}</span>
        <span className={`ml-2 ${TONE_TEXT.primary}`}>{t(`admin.pattern.${p}Effect`, { value: pattern.effect.value })}</span>
      </p>
    </article>
  )
}

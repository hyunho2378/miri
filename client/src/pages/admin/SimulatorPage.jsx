// 상담 시뮬레이터. 관리자가 시민 입장으로 물어보고 답변과 근거를 확인한다.
// 여기서 매긴 정답/오답이 H4 응답 정확도의 원천이다. 사업계획서 목업 사이드바의 "AI 챗봇"이 이 화면이다.
import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FilePlus2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang, LANGS } from '../../i18n/LangContext.jsx'
import { get, post } from '../../lib/api.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Select from '../../components/ui/Select.jsx'
import SimulatorChat from '../../components/admin/SimulatorChat.jsx'

const VERDICTS = ['correct', 'wrong', 'hold']
const REASONS = ['source', 'stale', 'facility', 'tone']
const ALL = 'all'

export default function SimulatorPage() {
  const { t } = useLang()
  const toast = useToast()
  const [facilities, setFacilities] = useState([])
  const [kb, setKb] = useState('current')
  const [lang, setLang] = useState('ko')
  const [facilityId, setFacilityId] = useState(ALL)
  const [reviews, setReviews] = useState({})     // { [messageKey]: { verdict, reason } }

  useTopbar({ title: t('admin.simulator.title') })

  useEffect(() => {
    let alive = true
    get('/api/facilities').then((f) => { if (alive) setFacilities(f) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const samples = useMemo(() => {
    const f = facilities.find((x) => x.id === facilityId) || facilities[0]
    if (!f) return []
    return [
      { label: `${f.name} 오늘 운영시간`, question: `${f.name} 오늘 운영시간`, iconName: 'hours' },
      { label: `${f.name} 이용 요금`, question: `${f.name} 이용 요금`, iconName: 'fee' },
      { label: `${f.name} 예약 자리 있나요`, question: `${f.name} 예약 자리 있나요`, iconName: 'reserve' }
    ]
  }, [facilities, facilityId])

  const setReview = (key, patch) => setReviews((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  const asked = Object.keys(reviews).length
  const correct = Object.values(reviews).filter((r) => r.verdict === 'correct').length
  const rate = asked ? Math.round((correct / asked) * 100) : 0

  // FAQ 후보는 지식베이스 승인 대기로 실제로 들어간다
  const toFaq = async (m, question) => {
    try {
      await post(`/api/admin/logs/${m.messageId || 'log-0001'}/to-faq`, {
        question,
        answer: m.content,
        sourceDocId: m.sources?.[0]?.id
      })
      setReview(m.id, { faq: true })
      toast(t('admin.simulator.faqCreated'), 'primary')
    } catch (e) {
      toast(e.error?.message || t('common.error.network'), 'danger')
    }
  }

  const review = (m, question) => {
    const r = reviews[m.id] || {}
    const sourceId = m.sources?.[0]?.id
    return (
      <section className="mt-4 rounded-lg bg-subtle p-3" aria-label={t('admin.simulator.review')}>
        <p className="type-caption text-text-meta">{t('admin.simulator.review')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('admin.simulator.review')}>
          {VERDICTS.map((v) => (
            <button
              key={v} type="button" role="radio" aria-checked={r.verdict === v}
              onClick={() => setReview(m.id, { verdict: v })}
              className={`pressable inline-flex items-center min-h-11 px-3 rounded-md type-body-sm font-medium transition-colors duration-fast ${
                r.verdict === v ? 'bg-primary text-text-inverse' : 'bg-page text-text-sec hover:bg-mute'
              }`}
            >
              {t(`admin.simulator.verdict${v[0].toUpperCase()}${v.slice(1)}`)}
            </button>
          ))}
        </div>

        {r.verdict === 'wrong' && (
          <div className="mt-3 animate-flow-down">
            <Select
              compact className="w-full sm:w-72" label={t('admin.simulator.reason')}
              value={r.reason || ''} onChange={(v) => setReview(m.id, { reason: v })}
              options={REASONS.map((v) => ({ value: v, label: t(`admin.simulator.reason${v[0].toUpperCase()}${v.slice(1)}`) }))}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {sourceId && (
            <Button
              as={Link} to={`/admin/knowledge?id=${sourceId}`} size="sm" variant="secondary"
              rightIcon={<ExternalLink size={16} aria-hidden="true" />}
            >
              {t('admin.simulator.toSource')}
            </Button>
          )}
          <Button
            size="sm" variant="secondary" disabled={r.faq}
            leftIcon={<FilePlus2 size={16} aria-hidden="true" />} onClick={() => toFaq(m, question)}
          >
            {t('admin.simulator.toFaq')}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          compact label={t('admin.simulator.kbVersion')} value={kb} onChange={setKb}
          options={[
            { value: 'current', label: t('admin.simulator.kbCurrent') },
            { value: 'prev', label: t('admin.simulator.kbPrev') }
          ]}
        />
        <Select
          compact label={t('admin.simulator.answerLang')} value={lang} onChange={setLang}
          options={LANGS.map((l) => ({ value: l, label: t(`common.lang.${l}`) }))}
        />
        <Select
          compact label={t('admin.simulator.facility')} value={facilityId} onChange={setFacilityId}
          options={[{ value: ALL, label: t('admin.simulator.facilityAll') }, ...facilities.map((f) => ({ value: f.id, label: f.name }))]}
        />
      </div>

      <SimulatorChat
        key={`${kb}-${lang}-${facilityId}`}
        samples={samples} lang={lang}
        facilityId={facilityId === ALL ? null : facilityId}
        renderReview={review}
      />

      <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
        <h2 className="type-h3 text-text-pri">{t('admin.simulator.summary')}</h2>
        {asked === 0 ? (
          <p className="mt-2 type-body-sm text-text-meta">{t('admin.simulator.summaryEmpty')}</p>
        ) : (
          <p className="mt-2 type-body-sm text-text-sec tabular-nums">
            {t('admin.simulator.summaryAsked', { n: asked })} · {t('admin.simulator.summaryRate', { n: rate })}
          </p>
        )}
      </section>
    </div>
  )
}

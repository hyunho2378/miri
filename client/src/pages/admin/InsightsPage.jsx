// 데이터 자산화 허브. 사업계획서 4-1 ①②③ 을 한 화면에 세운다.
// 표제문과 각 블록 문장은 계획서 문장 그대로다(IA_PHASE5.md). 요약하지 않는다.
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Skeleton from '../../components/ui/Skeleton.jsx'
import { TONE_TEXT } from '../../components/dashboard/StatusPill.jsx'
import MilestoneChart from '../../components/insight/MilestoneChart.jsx'
import PatternCard from '../../components/insight/PatternCard.jsx'

// 5단계 mock. lib/api.js 는 1단계 파일이라 라우트를 넣을 수 없다(PROGRESS 에 추가 요청 등재).
// 백엔드가 붙으면 이 한 줄이 get('/api/admin/insights') 로 바뀐다
const load = () => Promise.all([
  import('../../mock/insights.json').then((m) => m.default),
  import('../../mock/patterns.json').then((m) => m.default)
])

function Section({ index, title, sentence, children, action }) {
  return (
    <section className="min-w-0 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft type-caption font-semibold text-primary-text tabular-nums">
            {index}
          </span>
          <h2 className="type-h2 text-text-pri">{title}</h2>
        </div>
        <p className="mt-2 type-body-sm text-text-sec">{sentence}</p>
      </div>
      {children}
      {action}
    </section>
  )
}

const linkClass = 'inline-flex items-center gap-1 min-h-11 type-body-sm font-medium text-primary hover:text-primary-hover transition-colors duration-fast'

export default function InsightsPage() {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [patterns, setPatterns] = useState([])
  const [facilities, setFacilities] = useState({})
  const [queue, setQueue] = useState(null)

  useTopbar({ title: t('admin.insights.title') })

  useEffect(() => {
    let alive = true
    Promise.all([load(), get('/api/facilities'), get('/api/admin/review-queue')])
      .then(([[ins, pats], facs, q]) => {
        if (!alive) return
        setData(ins)
        setPatterns(pats)
        setFacilities(Object.fromEntries(facs.map((f) => [f.id, f.name])))
        setQueue(q)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <Skeleton variant="card" className="h-24" />
        <Skeleton variant="card" className="h-72" />
      </div>
    )
  }

  const { autoRate, conversion, demand } = data

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-8">
      <p className="max-w-text type-body text-text-pri">{t('admin.insights.headline')}</p>

      {/* ① 응대 고도화 */}
      <Section index="1" title={t('admin.insights.block1')} sentence={t('admin.insights.block1Sentence')}>
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="type-h3 text-text-pri">{t('admin.insights.chartTitle')}</h3>
              <p className="type-caption text-text-meta tabular-nums">
                {t('admin.insights.currentValue')}
                <span className={`ml-1.5 type-h3 ${TONE_TEXT.primary}`}>{autoRate.current}{t('admin.unit.percent')}</span>
              </p>
            </div>
            <div className="mt-3">
              <MilestoneChart
                labels={autoRate.labels} actual={autoRate.actual} target={autoRate.target}
                milestones={autoRate.milestones}
                actualName={t('admin.insights.legendActual')}
                targetName={t('admin.insights.legendTarget')}
                milestoneLabel={(m) => t('admin.insights.milestoneLabel', { year: m.year, n: m.target })}
                ariaLabel={t('admin.insights.chartTitle')}
              />
            </div>
          </div>

          <div className="min-w-0 self-start bg-page rounded-lg shadow-card p-4 lg:p-5">
            <h3 className="type-h3 text-text-pri">{t('admin.insights.conversionTitle')}</h3>
            <p className="mt-2 type-kpi text-text-pri tabular-nums">{conversion.converted}</p>
            <p className="mt-1 type-body-sm text-text-sec tabular-nums">
              {t('admin.insights.conversionDesc', {
                days: conversion.windowDays, unresolved: conversion.unresolved, converted: conversion.converted
              })}
            </p>
            <p className={`mt-2 type-caption tabular-nums ${TONE_TEXT.primary}`}>
              {t('admin.insights.conversionGain', { n: conversion.autoRateGain })}
            </p>
            <p className="mt-1 type-meta text-text-meta tabular-nums">
              {t('admin.insights.conversionPrev', { n: conversion.prevConverted })}
            </p>
            <div className="pt-4">
              {queue?.knowledge > 0 ? (
                <Link to="/admin/knowledge?tab=pending" className={linkClass}>
                  {t('admin.insights.pendingLink', { n: queue.knowledge })}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <p className="type-body-sm text-text-meta">{t('admin.insights.pendingNone')}</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ② 운영 컨설팅 */}
      <Section
        index="2" title={t('admin.insights.block2')} sentence={t('admin.insights.block2Sentence')}
        action={(
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="type-meta text-text-meta">{t('admin.insights.revenueNote')}</p>
            <Link to="/admin/reports" className={linkClass}>
              {t('admin.insights.reportsLink')}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      >
        <p className="type-caption text-text-meta tabular-nums">{t('admin.insights.patternsFound', { n: patterns.length })}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:gap-4 2xl:grid-cols-4">
          {patterns.map((p) => (
            <PatternCard key={p.id} pattern={p} facilityName={p.facilityId ? facilities[p.facilityId] : ''} />
          ))}
        </div>
      </Section>

      {/* ③ 수요 예측 */}
      <Section
        index="3" title={t('admin.insights.block3')} sentence={t('admin.insights.block3Sentence')}
        action={(
          <Link to="/admin/forecast" className={linkClass}>
            {t('admin.insights.forecastLink')}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
          <div className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
            <p className="type-caption text-text-meta">{t('admin.insights.demandNext')}</p>
            <p className="mt-2 type-kpi text-text-pri tabular-nums">
              {demand.expected}
              <span className="ml-1 type-h3 text-text-meta">{t('admin.forecast.countUnit')}</span>
            </p>
            <p className="mt-1 type-meta text-text-meta tabular-nums">{t('admin.insights.demandPrev', { n: demand.prevActual })}</p>
          </div>
          <div className="min-w-0 bg-page rounded-lg shadow-card p-4 lg:p-5">
            <p className="type-caption text-text-meta">{t(`admin.forecast.event${demand.peakEventKey[0].toUpperCase()}${demand.peakEventKey.slice(1)}`)}</p>
            <p className="mt-2 type-kpi text-text-pri tabular-nums">
              {demand.peakExpected}
              <span className="ml-1 type-h3 text-text-meta">{t('admin.forecast.countUnit')}</span>
            </p>
            <p className="mt-1 type-meta text-text-meta tabular-nums">
              {t('admin.insights.demandPeak', { label: demand.peakWeekLabel, n: demand.peakExpected })}
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}

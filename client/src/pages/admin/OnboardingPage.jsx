// 기관 온보딩. 계획서 경쟁사 표의 "운영 매뉴얼 업로드만으로 구축"과 "데이터 교체만으로 신규 기관"을
// 화면 하나로 증명한다. 경쟁사 2~4주 구축을 20분으로 줄인다는 주장이라 소요 시간을 재서 보여 준다.
import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get, post } from '../../lib/api.js'
import { pickText } from '../../lib/lang.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import useNotifications from '../../store/useNotifications.js'
import Button from '../../components/ui/Button.jsx'
import BuildStep from '../../components/admin/onboarding/BuildStep.jsx'
import FacilitiesStep from '../../components/admin/onboarding/FacilitiesStep.jsx'
import ManualStep from '../../components/admin/onboarding/ManualStep.jsx'
import OrgStep from '../../components/admin/onboarding/OrgStep.jsx'
import PreviewStep from '../../components/admin/onboarding/PreviewStep.jsx'

const STEPS = ['Org', 'Facilities', 'Manual', 'Build', 'Preview']

const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

export default function OnboardingPage() {
  const { t, lang } = useLang()
  const toast = useToast()
  const navigate = useNavigate()
  const pushNotification = useNotifications((s) => s.push)

  const [step, setStep] = useState(0)
  const [org, setOrg] = useState({ orgName: '', phone: '', hours: '', logo: null, langs: ['ko'] })
  const [facilities, setFacilities] = useState([])
  const [docs, setDocs] = useState([])
  const [result, setResult] = useState(null)
  const [activated, setActivated] = useState(false)
  const [existing, setExisting] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())

  useTopbar({ title: t('admin.onboarding.title') })

  // 소요 시간. 개통하면 멈춘다
  useEffect(() => {
    if (activated) return undefined
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [activated])

  // 이미 개통한 기관이면 값을 채워 재구축 모드로 연다
  useEffect(() => {
    let alive = true
    Promise.all([get('/api/admin/settings'), get('/api/admin/facilities')])
      .then(([s, f]) => {
        if (!alive || !s?.orgName) return
        setExisting(true)
        setOrg((prev) => ({ ...prev, orgName: pickText(s.orgName, lang), langs: s.languages || ['ko'] }))
        setFacilities(f.map((x) => ({
          id: x.id, name: x.name, type: x.type, address: x.address,
          phone: x.phone, department: x.department, hours: x.hours?.mon || '', errors: []
        })))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [lang])

  const canNext = useMemo(() => {
    if (step === 0) return org.orgName.trim().length > 0
    if (step === 1) return facilities.length > 0
    if (step === 3) return Boolean(result)
    return true
  }, [step, org, facilities, result])

  const next = () => {
    if (step === 0 && !canNext) { toast(t('admin.onboarding.requiredOrg'), 'danger'); return }
    if (step === 1 && !canNext) { toast(t('admin.onboarding.requiredFacility'), 'danger'); return }
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  // 개통. 기관명을 설정에 반영하면 시민 헤드라인과 신뢰 문구가 그 이름으로 바뀐다
  const activate = async () => {
    await post('/api/admin/onboarding', {
      orgName: org.orgName, languages: org.langs,
      docs: result?.docs || 0, chunks: result?.chunks || 0, facilities: result?.facilities || 0
    }).catch(() => {})
    setActivated(true)
    pushNotification({ type: 'onboardingDone', to: '/admin', vars: { org: org.orgName } })
    toast(t('admin.onboarding.activated'), 'primary')
    setTimeout(() => navigate('/admin'), 900)
  }

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                aria-current={i === step ? 'step' : undefined}
                className={clsx(
                  'inline-flex items-center gap-2 min-h-11 px-2 rounded-md type-body-sm',
                  i === step ? 'text-primary-text font-medium' : i < step ? 'text-text-sec' : 'text-text-meta'
                )}
              >
                <span className={clsx(
                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full type-caption tabular-nums',
                  i === step ? 'bg-primary text-text-inverse' : i < step ? 'bg-primary-soft text-primary-text' : 'bg-mute text-text-meta'
                )}>
                  {i < step ? <Check size={14} aria-hidden="true" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{t(`admin.onboarding.step${s}`)}</span>
              </span>
              {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-line-def" />}
            </li>
          ))}
        </ol>
        <p className="type-meta text-text-meta tabular-nums">
          {t('admin.onboarding.elapsed')} {mmss(elapsed)}
        </p>
      </div>

      {existing && step === 0 && (
        <p className="rounded-md bg-primary-soft px-4 py-3 type-body-sm text-primary-text">{t('admin.onboarding.rebuildDesc')}</p>
      )}

      <section className="bg-page rounded-lg shadow-card p-4 lg:p-6">
        {step === 0 && <OrgStep value={org} onChange={setOrg} />}
        {step === 1 && <FacilitiesStep value={facilities} onChange={setFacilities} />}
        {step === 2 && <ManualStep value={docs} onChange={setDocs} facilities={facilities} />}
        {step === 3 && <BuildStep docs={docs} facilities={facilities} result={result} onDone={setResult} />}
        {step === 4 && (
          <PreviewStep orgName={org.orgName} facilities={facilities} onActivate={activate} activated={activated} />
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          {t('admin.onboarding.prev')}
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={next} disabled={step === 3 && !result}>{t('admin.onboarding.next')}</Button>
        )}
      </div>
    </div>
  )
}

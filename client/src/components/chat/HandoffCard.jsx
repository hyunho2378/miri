// 담당자 연결 인라인 카드. 요구사항 3(AI 가 못 풀면 바로 사람에게)에 대한 답이다.
// 답변 아래에서 열리고 페이지를 옮기지 않는다.
import { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { hoursText } from '../../lib/lang.js'
import { get, post } from '../../lib/api.js'
import useToast from '../../hooks/useToast.js'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Textarea from '../ui/Textarea.jsx'
import Toggle from '../ui/Toggle.jsx'
import StatusPill from '../dashboard/StatusPill.jsx'

const WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// "09:00~18:00" 이면 지금 시각이 그 안에 드는지 본다. "휴관" 같은 값은 통화 불가로 본다
function callableNow(hours) {
  const m = /^(\d{2}):(\d{2})\D+(\d{2}):(\d{2})$/.exec((hours || '').trim())
  if (!m) return false
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const from = Number(m[1]) * 60 + Number(m[2])
  const to = Number(m[3]) * 60 + Number(m[4])
  return mins >= from && mins < to
}

export default function HandoffCard({ facilityId, messageId }) {
  const { t } = useLang()
  const toast = useToast()
  const [facility, setFacility] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', content: '' })
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!facilityId) return undefined
    let alive = true
    get(`/api/facilities/${facilityId}`).then((f) => { if (alive) setFacility(f) }).catch(() => {})
    return () => { alive = false }
  }, [facilityId])

  const todayHours = facility?.hours?.[WEEKDAY[new Date().getDay()]] || ''
  const callable = callableNow(todayHours)

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = t('chat.handoffCard.nameRequired')
    if (!form.content.trim()) next.content = t('chat.handoffCard.contentRequired')
    setErrors(next)
    if (Object.keys(next).length) return
    if (!consent) { toast(t('chat.handoffCard.consentRequired'), 'danger'); return }

    setSending(true)
    try {
      const res = await post('/api/handoff', { messageId, facilityId, ...form, consent })
      setResult(res || {})
      toast(t('chat.handoffCard.done'), 'primary')
    } catch (err) {
      toast(err.error?.message || t('common.error.network'), 'danger')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mt-4 bg-page rounded-lg shadow-card p-4 lg:p-5 animate-flow-down-late" aria-label={t('chat.handoffCard.title')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="type-h3 text-text-pri">{t('chat.handoffCard.title')}</h3>
          {facility && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="type-caption text-text-meta">{t('chat.handoffCard.department')}</dt>
              <dd className="type-body-sm text-text-sec">{facility.department}</dd>
              <dt className="type-caption text-text-meta">{t('chat.handoffCard.phone')}</dt>
              <dd className="type-body-sm">
                <a href={`tel:${facility.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover transition-colors duration-fast">
                  <Phone size={16} aria-hidden="true" />{facility.phone}
                </a>
              </dd>
              <dt className="type-caption text-text-meta">{t('chat.handoffCard.hours')}</dt>
              <dd className="type-body-sm text-text-sec">{hoursText(todayHours, t)}</dd>
            </dl>
          )}
        </div>
        {facility && (
          <StatusPill
            status={callable ? 'normal' : 'closed'}
            label={callable ? t('chat.handoffCard.callable') : t('chat.handoffCard.notCallable')}
          />
        )}
      </div>

      {result ? (
        <div className="mt-4 pt-4 border-t border-line-sub">
          <p className="type-body-sm font-medium text-primary-text">{t('chat.handoffCard.done')}</p>
          {result.ticketId && (
            <p className="mt-1 type-meta text-text-meta tabular-nums">
              {t('chat.handoffCard.ticket')} {result.ticketId}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 pt-4 border-t border-line-sub space-y-3">
          <p className="type-caption text-text-meta">{t('chat.handoffCard.formTitle')}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('chat.handoffCard.name')} value={form.name} error={errors.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label={t('chat.handoffCard.contact')} value={form.phone} inputMode="tel"
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <Textarea
            label={t('chat.handoffCard.content')} rows={3} value={form.content} error={errors.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Toggle label={t('chat.handoffCard.consent')} checked={consent} onChange={setConsent} />
            <Link to="/privacy" className="type-meta text-text-meta underline hover:text-text-sec transition-colors duration-fast">
              {t('common.footer.privacy')}
            </Link>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={sending}>{t('common.action.submit')}</Button>
          </div>
        </form>
      )}
    </section>
  )
}

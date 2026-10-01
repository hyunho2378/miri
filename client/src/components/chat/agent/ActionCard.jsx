// 실행 확인 카드. 쓰기 도구는 이 카드를 거치지 않으면 실행되지 않는다.
// 공공 서비스에서 "AI 가 멋대로 예약했다"는 민원을 막는 장치다. 실행 내용을 요금까지 전부 문장으로 보인다.
import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useLang } from '../../../i18n/LangContext.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import Textarea from '../../ui/Textarea.jsx'

// 확인 버튼 라벨은 서버가 보낸 confirmLabel 을 쓴다(API_CONTRACT action 이벤트).
// 없으면 도구별 기본값, 그것도 없으면 중립 라벨이다
const CONFIRM_KEY = {
  reservation: 'chat.agent.confirmReservation',
  handoff: 'chat.agent.confirmHandoff'
}
// 폼 필드 라벨은 담당자 연결 카드가 이미 쓰던 키를 그대로 쓴다
const FIELD_KEY = { name: 'chat.handoffCard.name', phone: 'chat.handoffCard.contact', content: 'chat.handoffCard.content' }

export default function ActionCard({ action, onResolve, disabled }) {
  const { t } = useLang()
  const [args, setArgs] = useState({})
  const [errors, setErrors] = useState({})

  const settled = action.status === 'declined' || action.status === 'approved'

  if (settled) {
    return (
      <section className="mt-4 rounded-lg bg-subtle p-3">
        <p className="type-body-sm text-text-sec">{action.title}</p>
        <p className="mt-0.5 type-meta text-text-meta">
          {t(action.status === 'declined' ? 'chat.agent.declinedNote' : 'chat.agent.approvedNote')}
        </p>
      </section>
    )
  }

  const confirm = () => {
    const next = {}
    for (const f of action.fields || []) {
      if (f.required && !(args[f.key] || '').trim()) next[f.key] = t('common.meta.required')
    }
    setErrors(next)
    if (Object.keys(next).length) return
    onResolve(true, args)
  }

  return (
    <section
      className="mt-4 bg-page rounded-lg shadow-card p-4 lg:p-5 animate-flow-down-late"
      aria-label={action.title}
    >
      <h3 className="type-h3 text-text-pri break-keep">{action.title}</h3>

      {action.lines?.length > 0 && (
        <ul className="mt-3 space-y-1">
          {action.lines.map((l) => (
            <li key={l} className="flex gap-2 type-body-sm text-text-sec tabular-nums">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-ter" />
              {l}
            </li>
          ))}
        </ul>
      )}

      {action.fields?.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="type-caption text-text-meta">{t('chat.agent.formTitle')}</p>
          {action.fields.map((f) => (f.multiline ? (
            <Textarea
              key={f.key} rows={3} label={t(FIELD_KEY[f.key] || f.key)} error={errors[f.key]}
              value={args[f.key] || ''} onChange={(e) => setArgs((a) => ({ ...a, [f.key]: e.target.value }))}
            />
          ) : (
            <Input
              key={f.key} label={t(FIELD_KEY[f.key] || f.key)} error={errors[f.key]}
              value={args[f.key] || ''} onChange={(e) => setArgs((a) => ({ ...a, [f.key]: e.target.value }))}
            />
          )))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={confirm} disabled={disabled}>
          {action.confirmLabel
            ? t(action.confirmLabel)
            : t(CONFIRM_KEY[action.tool] || 'chat.agent.confirmDefault')}
        </Button>
        {(action.alternatives || []).map((alt) => (
          <Button
            key={alt.prompt} variant="secondary" disabled={disabled}
            onClick={() => onResolve(false, null, alt.prompt)}
          >
            {t(`chat.agent.${alt.labelKey || 'otherTime'}`)}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => onResolve(false)} disabled={disabled}>
          {t('chat.agent.decline')}
        </Button>
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 type-meta text-text-meta">
        <Lock size={14} aria-hidden="true" />
        {t('chat.agent.gate')}
      </p>
    </section>
  )
}

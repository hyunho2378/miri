// 설정. 기관 탭의 기관명이 시민 면 헤드라인과 신뢰 문구에 그대로 들어간다.
// 기관명을 코드에 박지 않는 이유가 이 화면이다(PITFALLS 24).
import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { LANGS, useLang } from '../../i18n/LangContext.jsx'
import { get, put } from '../../lib/api.js'
import { pickText } from '../../lib/lang.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import Toggle from '../../components/ui/Toggle.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'

const TABS = ['org', 'policy', 'lang', 'channel', 'alert']
const TAB_KEY = {
  org: 'admin.settings.tabOrg', policy: 'admin.settings.tabPolicy', lang: 'admin.settings.tabLang',
  channel: 'admin.settings.tabChannel', alert: 'admin.settings.tabAlert'
}

function Section({ title, children }) {
  return (
    <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
      <h2 className="type-h3 text-text-pri">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export default function SettingsPage() {
  const { t, lang } = useLang()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'org'
  const [form, setForm] = useState(null)

  const [embedLang, setEmbedLang] = useState('ko')
  const [embedSize, setEmbedSize] = useState('m')

  useTopbar({ title: t('admin.settings.title') })

  // 임베드 코드. 5-F 의 /widget 형식과 같아야 한다(PROGRESS 5-F 기록)
  const orgId = 'donghae'
  const box = embedSize === 'l' ? [520, 780] : [460, 700]
  const embedCode = [
    `<iframe src="${window.location.origin}/widget?org=${orgId}&lang=${embedLang}" title="G-Chat"`,
    `        style="position:fixed;right:0;bottom:0;width:${box[0]}px;height:${box[1]}px;border:0"></iframe>`,
    '<script>',
    "  window.addEventListener('message', function (e) {",
    "    if (!e.data || e.data.source !== 'g-chat-widget') return",
    "    var f = document.querySelector('iframe[title=\"G-Chat\"]')",
    `    f.style.width = e.data.type === 'open' ? '${box[0]}px' : '96px'`,
    `    f.style.height = e.data.type === 'open' ? '${box[1]}px' : '96px'`,
    '  })',
    '</script>'
  ].join('\n')


  useEffect(() => {
    let alive = true
    get('/api/settings/public').then((s) => {
      if (!alive) return
      setForm({
        // 기관명은 4언어지만 입력은 현재 언어 값 한 개를 고친다(lib/lang.js pickText)
        orgName: pickText(s.orgName, lang), contact: '', orgHours: '', privacyText: '',
        suggestions: s.suggestions || [], trustLine: s.trustLine || '', noSource: '', defaultDepartment: '',
        languages: Object.fromEntries((s.languages || []).map((l) => [l, true])),
        headlines: {}, embed: '', kakao: '', alertHandoff: true, alertAccuracy: '85', alertIndex: true
      })
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setTab = (next) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p)
  }

  const save = async (e) => {
    e.preventDefault()
    await put(`/api/admin/settings/${tab}`, form).catch(() => {})
    toast(t('admin.settings.saved'), 'primary')
  }

  if (!form) {
    return <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 space-y-4"><Skeleton className="h-10 w-72" /><Skeleton variant="card" className="h-64" /></div>
  }

  return (
    <form onSubmit={save} className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <Tabs value={tab} onChange={setTab} items={TABS.map((v) => ({ value: v, label: t(TAB_KEY[v]) }))} />

      {tab === 'org' && (
        <Section title={t('admin.settings.tabOrg')}>
          <Input
            label={t('admin.settings.orgName')} value={form.orgName}
            hint={t('chat.headline', { org: form.orgName || '' })}
            onChange={(e) => set('orgName', e.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label={t('admin.settings.orgContact')} value={form.contact} onChange={(e) => set('contact', e.target.value)} />
            <Input label={t('admin.settings.orgHours')} value={form.orgHours} onChange={(e) => set('orgHours', e.target.value)} />
          </div>
          <Textarea rows={6} label={t('admin.settings.privacyText')} value={form.privacyText} onChange={(e) => set('privacyText', e.target.value)} />
        </Section>
      )}

      {tab === 'policy' && (
        <Section title={t('admin.settings.tabPolicy')}>
          <div className="space-y-3">
            <p className="type-caption text-text-meta">{t('admin.settings.suggestions')}</p>
            {form.suggestions.map((s, i) => (
              <div key={i} className="grid gap-3 md:grid-cols-2">
                <Input
                  label={t('admin.settings.suggestionLabel')} value={s.label}
                  onChange={(e) => set('suggestions', form.suggestions.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                />
                <Input
                  label={t('admin.settings.suggestionQuestion')} value={s.question}
                  onChange={(e) => set('suggestions', form.suggestions.map((x, k) => (k === i ? { ...x, question: e.target.value } : x)))}
                />
              </div>
            ))}
          </div>
          <Input label={t('admin.settings.trustLine')} value={form.trustLine} onChange={(e) => set('trustLine', e.target.value)} />
          <Input label={t('admin.settings.tone')} value={t('admin.settings.toneFixed')} readOnly disabled />
          <Textarea rows={3} label={t('admin.settings.noSource')} value={form.noSource} onChange={(e) => set('noSource', e.target.value)} />
          <Input label={t('admin.settings.defaultDepartment')} value={form.defaultDepartment} onChange={(e) => set('defaultDepartment', e.target.value)} />
        </Section>
      )}

      {tab === 'lang' && (
        <Section title={t('admin.settings.tabLang')}>
          <div className="space-y-4">
            {LANGS.map((code) => (
              <div key={code} className="grid gap-3 md:grid-cols-[200px_1fr] md:items-end">
                <Toggle
                  label={`${t(`common.lang.${code}`)} ${t('admin.settings.langEnabled')}`}
                  checked={!!form.languages[code]}
                  onChange={(v) => set('languages', { ...form.languages, [code]: v })}
                />
                <Input
                  label={t('admin.settings.langHeadline')} value={form.headlines[code] || ''}
                  onChange={(e) => set('headlines', { ...form.headlines, [code]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === 'channel' && (
        <>
          <Section title={t('admin.channel.embedTitle')}>
            <p className="type-body-sm text-text-meta break-keep">{t('admin.channel.embedDesc')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label={t('admin.channel.embedLang')} value={embedLang} onChange={setEmbedLang}
                options={LANGS.map((l) => ({ value: l, label: t(`common.lang.${l}`) }))}
              />
              <Select
                label={t('admin.channel.embedSize')} value={embedSize} onChange={setEmbedSize}
                options={[
                  { value: 'm', label: '460 x 700' },
                  { value: 'l', label: '520 x 780' }
                ]}
              />
            </div>
            <pre className="overflow-x-auto rounded-md bg-subtle p-3 type-meta text-text-sec"><code>{embedCode}</code></pre>
            <Button
              type="button" variant="secondary" leftIcon={<Copy size={16} aria-hidden="true" />}
              onClick={() => { navigator.clipboard?.writeText(embedCode); toast(t('admin.channel.copied'), 'primary') }}
            >
              {t('admin.channel.copy')}
            </Button>
          </Section>

          <Section title={t('admin.channel.kakaoTitle')}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="type-caption text-text-meta">{t('admin.channel.kakaoStatus')}</span>
              <StatusPill status="pending" label={t('admin.channel.kakaoNone')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('admin.channel.kakaoId')} value={form.kakao} onChange={(e) => set('kakao', e.target.value)} />
              <Input label={t('admin.channel.kakaoKey')} value={form.kakaoKey || ''} onChange={(e) => set('kakaoKey', e.target.value)} />
            </div>
            <Button type="button" variant="secondary" onClick={() => toast(t('admin.channel.kakaoTestResult'), 'neutral')}>
              {t('admin.channel.kakaoTest')}
            </Button>
          </Section>

          <Section title={t('admin.channel.qrTitle')}>
            <p className="type-body-sm text-text-meta break-keep">{t('admin.channel.qrDesc')}</p>
            <Button as={Link} to="/admin/facilities" variant="secondary">{t('admin.channel.qrGo')}</Button>
          </Section>
        </>
      )}

      {tab === 'alert' && (
        <Section title={t('admin.settings.tabAlert')}>
          <Toggle label={t('admin.settings.alertHandoff')} checked={form.alertHandoff} onChange={(v) => set('alertHandoff', v)} />
          <Input
            label={t('admin.settings.alertAccuracy')} hint={t('admin.settings.alertThreshold')}
            inputMode="numeric" value={form.alertAccuracy} onChange={(e) => set('alertAccuracy', e.target.value)}
          />
          <Toggle label={t('admin.settings.alertIndex')} checked={form.alertIndex} onChange={(v) => set('alertIndex', v)} />
        </Section>
      )}

      <div className="flex justify-end">
        <Button type="submit">{t('common.action.save')}</Button>
      </div>
    </form>
  )
}

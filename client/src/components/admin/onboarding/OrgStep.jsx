// 1단계 기관 정보. 기관명은 시민 헤드라인과 설정 기관 탭이 같이 쓰는 값이다.
import { useLang, LANGS } from '../../../i18n/LangContext.jsx'
import Input from '../../ui/Input.jsx'
import Toggle from '../../ui/Toggle.jsx'

export default function OrgStep({ value, onChange }) {
  const { t } = useLang()
  const set = (k, v) => onChange({ ...value, [k]: v })

  const pickLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 미리보기만 만든다. 실제 업로드는 백엔드가 붙을 때다
    set('logo', { name: file.name, url: URL.createObjectURL(file) })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label={t('admin.onboarding.orgName')} value={value.orgName} onChange={(e) => set('orgName', e.target.value)} />
        <Input label={t('admin.onboarding.orgPhone')} value={value.phone} inputMode="tel" onChange={(e) => set('phone', e.target.value)} />
        <Input label={t('admin.onboarding.orgHours')} value={value.hours} onChange={(e) => set('hours', e.target.value)} />
      </div>

      <div>
        <p className="type-caption text-text-meta">{t('admin.onboarding.orgLogo')}</p>
        <div className="mt-2 flex items-center gap-4">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-mute">
            {value.logo
              ? <img src={value.logo.url} alt="" className="h-full w-full object-contain" />
              : <span className="type-caption text-text-meta">{t('admin.onboarding.orgLogo')}</span>}
          </span>
          <label className="pressable inline-flex items-center min-h-11 px-4 rounded-md bg-page ring-1 ring-inset ring-line-def type-body-sm font-medium text-primary hover:bg-mute transition-colors duration-fast cursor-pointer">
            {t('admin.onboarding.orgLogoPick')}
            <input type="file" accept="image/*" className="sr-only" onChange={pickLogo} />
          </label>
        </div>
      </div>

      <div>
        <p className="type-caption text-text-meta">{t('admin.onboarding.orgLangs')}</p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {LANGS.map((l) => (
            <Toggle
              key={l} label={t(`common.lang.${l}`)}
              checked={value.langs.includes(l)}
              onChange={(on) => set('langs', on ? [...value.langs, l] : value.langs.filter((x) => x !== l))}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

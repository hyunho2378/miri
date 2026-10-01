// 개인정보처리방침. 본문은 i18n legal 네임스페이스에 있다. 기관명은 설정값에서 온다.
import { useOutletContext } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { pickText } from '../../lib/lang.js'

const SECTIONS = ['s1', 's2', 's3', 's4', 's5']

export default function PrivacyPage() {
  const { t, lang } = useLang()
  const { settings } = useOutletContext() || {}
  const org = pickText(settings?.orgName, lang)

  return (
    <div className="page-enter mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16 py-8 lg:py-10">
      <div className="max-w-text">
        <h1 className="type-h1 text-text-pri">{t('legal.privacy.title')}</h1>
        <p className="mt-4 type-body text-text-sec">{t('legal.privacy.intro', { org })}</p>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s}>
              <h2 className="type-h2 text-text-pri">{t(`legal.privacy.${s}Title`)}</h2>
              <p className="mt-2 type-body text-text-sec">{t(`legal.privacy.${s}Body`)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

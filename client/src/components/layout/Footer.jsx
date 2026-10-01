// 시민 푸터. 기관 정보와 개인정보처리방침. 상담 홈(/)에서는 렌더하지 않는다.
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { pickText } from '../../lib/lang.js'

export default function Footer({ settings }) {
  const { t, lang } = useLang()
  const orgName = pickText(settings?.orgName, lang)
  return (
    <footer className="mt-auto border-t border-line-sub bg-canvas">
      <div className="mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16 py-8 lg:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 max-w-text">
            <p className="type-h3 text-text-pri">{orgName}</p>
            <p className="mt-2 type-body-sm text-text-meta">{t('common.footer.desc')}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={t('common.footer.privacy')}>
            <Link to="/faq" className="inline-flex items-center min-h-11 min-w-11 md:min-h-0 md:min-w-0 type-body-sm text-text-sec hover:text-text-pri transition-colors duration-fast">{t('common.nav.faq')}</Link>
            <Link to="/notices" className="inline-flex items-center min-h-11 min-w-11 md:min-h-0 md:min-w-0 type-body-sm text-text-sec hover:text-text-pri transition-colors duration-fast">{t('common.nav.notices')}</Link>
            <Link to="/privacy" className="inline-flex items-center min-h-11 min-w-11 md:min-h-0 md:min-w-0 type-body-sm font-medium text-text-pri hover:text-primary transition-colors duration-fast">{t('common.footer.privacy')}</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

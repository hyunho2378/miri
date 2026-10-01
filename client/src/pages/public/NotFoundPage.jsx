// 라우트 미일치 화면. 1단계에서 만든 스텁의 하드코딩 문구를 i18n 으로 옮겼다.
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

export default function NotFoundPage() {
  const { t } = useLang()
  return (
    <div className="page-enter mx-auto w-full max-w-page px-4 md:px-6">
      <EmptyState
        image="/images/illustrations/not-found.svg"
        title={t('common.error.notFoundPage')}
        desc={t('common.error.notFoundDesc')}
        action={<Button as={Link} to="/">{t('common.nav.home')}</Button>}
      />
    </div>
  )
}

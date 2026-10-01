// 기간 탭. 값은 useAdminUi.range 전역이라 화면을 옮겨도 유지된다.
// Topbar actions 슬롯에 넣기 위해 자기 상태를 스스로 읽는다(슬롯은 stale 될 수 있다).
import { useLang } from '../../i18n/LangContext.jsx'
import useAdminUi from '../../store/useAdminUi.js'
import Tabs from '../ui/Tabs.jsx'

export default function DateRangeTabs({ className }) {
  const { t } = useLang()
  const range = useAdminUi((s) => s.range)
  const setRange = useAdminUi((s) => s.setRange)

  return (
    <Tabs
      variant="pill" className={className} value={range} onChange={setRange}
      items={[
        { value: '7d', label: t('admin.range.d7') },
        { value: '30d', label: t('admin.range.d30') },
        { value: 'quarter', label: t('admin.range.quarter') }
      ]}
    />
  )
}

// 5단계 미리보기와 개통. 방금 구축한 지식베이스로 바로 물어본다.
// 시뮬레이터를 그대로 끼워 쓴다. 관리자가 개통 전에 답변을 확인하는 자리다.
import { useLang } from '../../../i18n/LangContext.jsx'
import Button from '../../ui/Button.jsx'
import SimulatorChat from '../SimulatorChat.jsx'

export default function PreviewStep({ orgName, facilities, onActivate, activated }) {
  const { t } = useLang()
  const first = facilities[0]?.name || ''
  const samples = first ? [
    { label: `${first} 오늘 운영시간`, question: `${first} 오늘 운영시간`, iconName: 'hours' },
    { label: `${first} 이용 요금`, question: `${first} 이용 요금`, iconName: 'fee' },
    { label: `${first} 주차 안내`, question: `${first} 주차 안내`, iconName: 'place' }
  ] : []

  return (
    <div className="space-y-4">
      <p className="type-body-sm text-text-sec">{t('admin.onboarding.previewDesc')}</p>
      <div className="rounded-lg bg-subtle p-3">
        <SimulatorChat samples={samples} lang="ko" facilityId={null} compact />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onActivate} disabled={activated}>{t('admin.onboarding.activate')}</Button>
        {activated && <p className="type-body-sm text-primary-text">{t('admin.onboarding.activated')}</p>}
        {orgName && <p className="type-meta text-text-meta">{orgName}</p>}
      </div>
    </div>
  )
}

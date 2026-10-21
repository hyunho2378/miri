// 현황판 재난문자 카드. 행정안전부 긴급재난문자(재난안전데이터공유플랫폼 dataSn 228)에서 수신지역에 동해시가 들어간 문자만 보인다.
// 단계는 공식 송출 단계(위급, 긴급, 안전안내)를 그대로 쓰고 AI 로 위험도를 판단하지 않는다
// (회신: 재난문자 지도 서비스 개발자, AI 위험도 모델의 과경보 사례). 승인 전에는 승인 대기와 신청일을 보인다.
import { MessageSquareWarning } from 'lucide-react'
import clsx from 'clsx'
import Card from '../ui/Card.jsx'
import useOpenData from '../../hooks/useOpenData.js'
import FreshnessNote from './FreshnessNote.jsx'
import { fmtKst } from '../../lib/freshness.js'

const stepTone = (step) => (/위급/.test(step || '') ? 'bg-danger-soft text-danger-text' : /긴급/.test(step || '') ? 'bg-warning-soft text-warning-text' : 'bg-mute text-text-sec')

export default function DisasterAlertsCard({ className = '' }) {
  const s = useOpenData('alerts')
  const d = s.data
  return (
    <Card title="동해 수신 재난문자" desc="출처: 행정안전부 긴급재난문자(재난안전데이터공유플랫폼), 수신지역 동해시, 최근 7일" className={className}>
      <div className="space-y-2">
        <p className="inline-flex items-center gap-1.5 type-caption text-text-sec"><MessageSquareWarning size={16} aria-hidden="true" />공식 송출 단계 그대로 표시, 위험도 자체 판단 없음</p>
        {s.loading ? <p className="type-body-sm text-text-meta">조회 중입니다.</p>
          : s.error ? <p className="type-body-sm text-text-meta">응답을 받지 못했습니다({s.error}).</p>
          : d?.status === 'pending' ? <p className="type-body-sm text-text-pri">활용 승인 대기(신청 {d.appliedAt}). 승인 뒤 동해시 수신 문자를 이 자리에 표시</p>
          : d?.list?.length ? (
            <ul className="space-y-2">
              {d.list.map((m) => (
                <li key={m.id} className="type-body-sm text-text-pri">
                  <span className={clsx('mr-1.5 rounded-xs px-1.5 py-0.5 type-caption', stepTone(m.step))}>{m.step || '단계 없음'}</span>
                  <span className="type-caption text-text-meta">{fmtKst(m.at)}{m.kind ? `, ${m.kind}` : ''}</span>
                  <span className="mt-0.5 block line-clamp-2">{m.text}</span>
                </li>
              ))}
            </ul>
          ) : <p className="type-body-sm text-text-meta">최근 7일 동해시 수신 문자 없음</p>}
        {d?.status === 'pending' ? null : <FreshnessNote kind="alerts" state={s} />}
      </div>
    </Card>
  )
}

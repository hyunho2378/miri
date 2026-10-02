// 현황판 공공데이터 카드. 산불위험예보(산림청)와 동해시 민방위대피시설(행정안전부) 실데이터.
import { Flame, Building } from 'lucide-react'
import Card from '../ui/Card.jsx'
import KeyValue from '../ui/KeyValue.jsx'
import useOpenData from '../../hooks/useOpenData.js'

export default function OpenDataCard() {
  const fire = useOpenData('fire')
  const shelters = useOpenData('shelters')
  const none = (s) => (s.loading ? '불러오는 중' : '연결 안 됨')

  return (
    <Card title="공공데이터 연계" meta="공공데이터포털">
      <div className="space-y-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 type-caption text-text-sec"><Flame size={16} aria-hidden="true" />동해시 산불위험예보</p>
          {fire.data?.analyzedAt ? (
            <KeyValue dense items={[
              { label: '평균 지수', value: `${fire.data.mean}`, strong: true },
              { label: '최대 지수', value: `${fire.data.max}` },
              { label: '분석 시각', value: fire.data.analyzedAt }
            ]} />
          ) : <p className="type-body-sm text-text-meta">{none(fire)}</p>}
        </div>
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 type-caption text-text-sec"><Building size={16} aria-hidden="true" />민방위대피시설</p>
          {Number.isFinite(shelters.data?.count) ? (
            <KeyValue dense items={[
              { label: '사용 중 시설', value: `${shelters.data.count}곳`, strong: true },
              { label: '수용 인원 합계', value: `${(shelters.data.capacity || 0).toLocaleString('ko-KR')}명` }
            ]} />
          ) : <p className="type-body-sm text-text-meta">{none(shelters)}</p>}
        </div>
      </div>
    </Card>
  )
}

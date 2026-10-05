// 마을 상세. 막대나 표식을 고르면 왼쪽 패널에 열린다(PRD F1 수용 기준: 등급별 대상자, 부족분, 왕복 시간).
import { ArrowLeft } from 'lucide-react'
import Button from '../ui/Button.jsx'
import KeyValue from '../ui/KeyValue.jsx'
import { GRADES } from '../../lib/shortage.js'
import { fmtHM } from '../../lib/time.js'
import { fmtElapsed } from '../../lib/geo.js'

const byGrade = (obj) => {
  const parts = GRADES.filter((g) => obj?.[g.key]).map((g) => `${g.label} ${obj[g.key]}명`)
  return parts.length ? parts.join(', ') : '없음'
}

export default function VillageDetail({ village, onBack }) {
  const v = village
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} aria-hidden="true" />} className="-ml-2">
        요약으로 돌아가기
      </Button>
      <p className="mt-3 type-caption text-text-meta">{v.dongName}, {v.code}, 가상 위치</p>
      <h2 className="mt-1 type-h3 text-text-pri">{v.label}</h2>

      <div className="mt-4">
        <p className="type-caption text-text-sec">부족분</p>
        {v.shortage
          ? <p className="mt-1 type-kpi text-danger-text tabular-nums">부족 {v.shortage}<span className="ml-1 type-h3">명</span></p>
          : <p className="mt-1 type-h2 text-text-pri">부족 없음</p>}
        {v.shortage > 0 && <p className="mt-1 type-body-sm text-text-sec">{byGrade(v.shortageByGrade)}</p>}
        <p className="mt-1 type-meta text-text-meta">기준: 이송 완료 기한까지 배정 기준선 규칙으로 옮기지 못하는 인원</p>
      </div>

      <KeyValue
        className="mt-4"
        items={[
          { label: '대상자', value: `${v.target}명`, strong: true },
          { label: '등급별', value: byGrade(v.targets) },
          { label: '왕복 시간', value: `${v.roundTripMin}분` },
          { label: '도달 시각', value: `발령 후 ${fmtElapsed(v.arrivalH)}, ${fmtHM(v.arrivalAt)}` },
          { label: '대피소', value: v.shelterName || '미지정' },
          { label: '선택 시점', value: `대기 ${v.waiting}명, 이송 완료 추정 ${v.moved}명` }
        ]}
      />
      {v.provisional > 0 && <p className="mt-3 type-meta text-primary-text">확인 대기 판독 {v.provisional}건 포함 잠정값</p>}
    </div>
  )
}

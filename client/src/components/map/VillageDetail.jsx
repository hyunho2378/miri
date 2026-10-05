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
      <p className="mt-3 type-caption text-text-meta">{v.dongName}, {v.code}{v.inScope ? '' : ', 대피 대상 구역 밖'}</p>
      <h2 className="mt-1 type-h3 text-text-pri">{v.label}</h2>
      {v.pickup && <p className="mt-1 type-body-sm text-text-sec">집결지 {v.pickup.name}, {v.pickup.road.replace('동해시 ', '')}</p>}

      <div className="mt-4">
        <p className="type-caption text-text-sec">부족분</p>
        {!v.inScope
          ? <p className="mt-1 type-h2 text-text-pri">계산 제외</p>
          : v.shortage
            ? <p className="mt-1 type-kpi text-danger-text tabular-nums">부족 {v.shortage}<span className="ml-1 type-h3">명</span></p>
            : <p className="mt-1 type-h2 text-text-pri">부족 없음</p>}
        {v.shortage > 0 && <p className="mt-1 type-body-sm text-text-sec">{byGrade(v.shortageByGrade)}</p>}
        {v.timeOnly > 0 && <p className="mt-1 type-body-sm text-danger-text">이 가운데 {v.timeOnly}명은 준비 시간 뒤 첫 왕복도 도달 전에 끝나지 않습니다.</p>}
        <p className="mt-1 type-meta text-text-meta">기준: 이송 완료 기한까지 배정 기준선 규칙으로 옮기지 못하는 인원</p>
      </div>

      <KeyValue
        className="mt-4"
        items={[
          { label: '대상자', value: `${v.target}명`, strong: true },
          { label: '등급별', value: byGrade(v.targets) },
          { label: '대피소', value: v.shelterName || '미지정' },
          { label: '왕복 시간', value: v.driveMin != null ? `${v.roundTripMin}분(편도 주행 ${v.driveMin}분, 탑승과 하차 포함)` : `${v.roundTripMin}분` },
          ...(v.inScope ? [
            { label: '도달 시각', value: `발령 후 ${fmtElapsed(v.arrivalH)}, ${fmtHM(v.arrivalAt)}` },
            { label: '선택 시점', value: `대기 ${v.waiting}명, 이송 완료 추정 ${v.moved}명` }
          ] : [])
        ]}
      />
      {v.shelterNote && (
        <div className="mt-3 rounded-md bg-mute px-3 py-2.5">
          <p className="type-body-sm leading-6 text-text-pri">{v.shelterNote}</p>
          <p className="mt-0.5 type-meta text-text-meta">평시 지정 시설 {v.plannedShelterName}</p>
          {v.shelterParts.length > 1 && <p className="mt-0.5 type-meta text-text-meta">나눠 배정: {v.shelterParts.join(', ')}</p>}
        </div>
      )}
      {v.provisional > 0 && <p className="mt-3 type-meta text-primary-text">확인 대기 판독 {v.provisional}건 포함 잠정값</p>}
      <p className="mt-4 type-meta leading-5 text-text-meta">
        {v.weightBasis === '행정동 전체'
          ? '대상자 수는 2025 장기요양 재가 수급자 추정치를 행정동 75세 이상 인구 비율로 나눈 값입니다.'
          : `대상자 수는 2025 장기요양 재가 수급자 추정치를 행정동 75세 이상 인구 비율로 나누고, 행정동 안에서는 ${v.weightBasis}로 다시 나눈 값입니다.`}
        {' '}개인 정보는 가상입니다.
      </p>
    </div>
  )
}

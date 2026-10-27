// 마을 상세. 지도에서 마을을 고르면 왼쪽 패널에 열린다. 결론, 할 일, 근거 순(현황판 마을 상세와 같은 구조). 상자 없음
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import { GRADES } from '../../lib/shortage.js'
import { fmtHM } from '../../lib/time.js'
import { fmtElapsed } from '../../lib/geo.js'

const byGrade = (obj) => {
  const parts = GRADES.filter((g) => obj?.[g.key]).map((g) => `${g.label} ${obj[g.key]}명`)
  return parts.length ? parts.join(', ') : '없음'
}

function Row({ label, value }) {
  return (
    <div className="flex min-h-10 items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 type-body-sm text-text-sec">{label}</dt>
      <dd className="min-w-0 text-right type-body text-text-pri tabular-nums">{value}</dd>
    </div>
  )
}

function Part({ title, children }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-1 type-strong text-text-sec">{title}</h3>
      {children}
    </section>
  )
}

export default function VillageDetail({ village, onBack, today }) {
  const v = village
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} aria-hidden="true" />} className="-ml-2">
        부족 마을 목록
      </Button>
      <h2 className="mt-2 type-title text-text-pri">{v.label}<span className="ml-2 type-body-sm font-normal text-text-sec">{v.dongName}</span></h2>

      <Part title="결론">
        <p className="type-body-strong text-text-pri tabular-nums">
          {!v.inScope ? '대피 대상 구역 밖, 계산 제외' : v.shortage ? `기준 배정 시 이동 불가 인원 ${v.shortage}명` : '기한 안 이송 가능'}
        </p>
        {v.shortage > 0 && <p className="type-body-sm text-text-sec tabular-nums">{byGrade(v.shortageByGrade)}</p>}
        {v.timeOnly > 0 && <p className="type-body-sm text-danger-text">{v.timeOnly}명은 첫 왕복 전에 도달</p>}
      </Part>

      <Part title="할 일">
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to={`/console/roster?village=${v.code}`}>이 마을 명부 보기</Button>
          <Button as={Link} to="/console/resources" variant="secondary">협약 차량 확인</Button>
        </div>
      </Part>

      <Part title="근거">
        <dl>
          <Row label="대상자" value={`${v.target}명`} />
          <Row label="등급별" value={byGrade(v.targets)} />
          <Row label="대피소" value={v.shelterName || '미지정'} />
          <Row label="왕복 시간" value={v.roundTripMin == null ? '대피소 없음' : `${v.roundTripMin}분`} />
          {v.inScope && Number.isFinite(v.completeBy) && <Row label="이송 완료 기한" value={`발령 후 ${fmtElapsed((v.completeBy - today) / 3600000)}`} />}
          {v.inScope && <Row label="산불 도달" value={`발령 후 ${fmtElapsed(v.arrivalH)}, ${fmtHM(v.arrivalAt)}`} />}
          {v.inScope && <Row label="선택 시점" value={`대기 ${v.waiting}명, 이송 완료 ${v.moved}명`} />}
          {v.provisional > 0 && <Row label="확인 대기 서류" value={`${v.provisional}건 포함`} />}
        </dl>
        {v.shelterNote && <p className="mt-1 type-body-sm text-text-sec">{v.shelterNote}</p>}
      </Part>
    </div>
  )
}

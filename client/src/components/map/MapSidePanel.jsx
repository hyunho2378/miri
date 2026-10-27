// 상황판 왼쪽 패널(현재 보기). 현황판과 같은 이름, 같은 순서(기한 빠른 순)의 부족 마을 목록과 이동 단추를 둔다. 상자 없이 섹션과 행.
// 숫자는 MapPage 가 현황판과 같은 계산(computeShortage)에서 넘긴 값만 쓴다.
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import Button from '../ui/Button.jsx'
import { fmtElapsed } from '../../lib/geo.js'
import { useFireRisk } from '../miri/FireRiskStrip.jsx'

const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')

function Row({ label, value }) {
  return (
    <div className="flex min-h-10 items-baseline justify-between gap-3 py-1.5">
      <dt className="type-body-sm text-text-sec">{label}</dt>
      <dd className="type-body-strong text-text-pri tabular-nums">{value}</dd>
    </div>
  )
}

export default function MapSidePanel({ switcher, total, rows, onPick, stats, vehicleCount, today }) {
  const fire = useFireRisk()
  const fireText = fire.data ? `평균 ${fire.data.mean}, 최고 ${fire.data.max}` : fire.error ? '조회 실패' : '조회 중'
  return (
    <div className="flex h-full min-h-0 flex-col">
      {switcher}
      <dl className="mt-3 divide-y-0">
        <Row label="기준 배정 시 이동 불가 인원" value={`${fmt(total)}명`} />
        <Row label="등록 대상자" value={`${fmt(stats.targets)}명, ${fmt(stats.villages)}곳`} />
        <Row label="출동 가능 차량" value={`${stats.avail}/${vehicleCount}대`} />
        <Row label="산불위험지수" value={fireText} />
      </dl>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button as={Link} to="/console/shortage">부족분 계산</Button>
        <Button as={Link} to="/console/resources" variant="secondary">협약 차량 확인</Button>
      </div>
      <h2 className="mt-5 type-title text-text-pri">이동 불가 발생 마을 {rows.length}곳</h2>
      <ul className="-mx-2 mt-1 min-h-0 flex-1 overflow-y-auto">
        {rows.map((v, i) => (
          <li key={v.code}>
            <button type="button" onClick={() => onPick(v.code)} className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-subtle">
              <span className="min-w-0 flex-1">
                <span className="block truncate type-body text-text-pri">{v.label}</span>
                <span className="block truncate type-body-sm text-text-sec tabular-nums">기한 발령 후 {fmtElapsed((v.completeBy - today) / 3600000)}</span>
              </span>
              <span className={clsx('shrink-0 type-body-strong tabular-nums', i === 0 ? 'text-danger-text' : 'text-text-pri')}>{v.shortage}명</span>
              <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-text-sec" />
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-3 type-body text-text-sec">해당 마을 없음</li>}
      </ul>
      <p className="mt-3 type-meta text-text-sec">대상자와 차량은 가상 자료</p>
    </div>
  )
}

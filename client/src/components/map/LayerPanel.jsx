// 상황판 오른쪽 보기 전환, 레이어 목록, 범례. 토글은 role=switch 버튼이라 키보드로 조작한다.
// 공공데이터 레이어는 켤 때 조회하고, 실패하면 "불러오지 못함"과 사유 코드를 그대로 보인다(빈 결과로 위장 금지).
import { Maximize } from 'lucide-react'
import clsx from 'clsx'
import Button from '../ui/Button.jsx'
import SegmentControl from '../ui/SegmentControl.jsx'
import Toggle from '../ui/Toggle.jsx'
import { SEVERITY_STEPS } from '../../lib/geo.js'
import { SEVERITY_SWATCH } from './mapTheme.js'

function Status({ tone = 'meta', role, children }) {
  return (
    <p role={role} className={clsx('ml-14 -mt-1 pb-1 type-meta', tone === 'danger' ? 'text-danger-text' : 'text-text-meta')}>
      {children}
    </p>
  )
}

function openStatus(state, { okText, kind }) {
  if (!state || state.loading) return <Status role="status">불러오는 중</Status>
  if (state.error) return <Status tone="danger" role="alert">불러오지 못함({state.error}). 공공데이터포털 연계 설정 확인 필요</Status>
  return <Status>{okText(state.data)} 출처: {state.data?.source || kind}</Status>
}

export default function LayerPanel({
  mode, onMode, theme, onTheme, onFit, layers, onLayer, shelterState, ltcState, fireInfo, vehicleCount
}) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="map-view-title">
        <h2 id="map-view-title" className="type-caption text-text-sec">보기</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <SegmentControl label="지도 차원" value={mode} onChange={onMode} items={[{ value: '2d', label: '2D' }, { value: '3d', label: '3D' }]} />
          <SegmentControl label="바탕 지도" value={theme} onChange={onTheme} items={[{ value: 'light', label: '밝은 바탕' }, { value: 'dark', label: '어두운 바탕' }]} />
        </div>
        <Button variant="secondary" size="sm" className="mt-2" onClick={onFit} leftIcon={<Maximize size={16} aria-hidden="true" />}>시 전체 보기</Button>
      </section>

      <section aria-labelledby="map-layer-title">
        <h2 id="map-layer-title" className="type-caption text-text-sec">레이어</h2>
        <div className="mt-1">
          <Toggle label="마을별 부족분" checked={layers.shortage} onChange={(v) => onLayer('shortage', v)} />
          <Toggle label="행정동 경계" checked={layers.dongs} onChange={(v) => onLayer('dongs', v)} />
          <Toggle label="산불 확산 가정 방향" checked={layers.fire} onChange={(v) => onLayer('fire', v)} />
          {layers.fire && (
            <Status>
              {fireInfo
                ? `시나리오 가정. 발령 후 ${fireInfo.fromH}시간 도달 마을에서 ${fireInfo.toH}시간 도달 마을 방향`
                : '이 시나리오는 마을별 도달 시각 차이가 없어 방향을 표시하지 않음'}
            </Status>
          )}
          <Toggle label="차량 위치(가상)" checked={layers.vehicles} onChange={(v) => onLayer('vehicles', v)} />
          {layers.vehicles && <Status>차량 {vehicleCount}대. 소속 동 기준 가상 위치</Status>}
          <Toggle label="대피소(공공데이터)" checked={layers.shelters} onChange={(v) => onLayer('shelters', v)} />
          {layers.shelters && openStatus(shelterState, {
            kind: '행정안전부 민방위대피시설',
            okText: (d) => `대피소 ${d?.count ?? 0}곳, 좌표 있는 곳만 표시.`
          })}
          <Toggle label="장기요양기관(공공데이터)" checked={layers.ltc} onChange={(v) => onLayer('ltc', v)} />
          {layers.ltc && openStatus(ltcState, {
            kind: '국민건강보험공단 장기요양기관',
            okText: (d) => `기관 ${d?.count ?? 0}곳. 응답에 좌표가 없어 지도에는 표시하지 않음.`
          })}
        </div>
      </section>

      <section aria-labelledby="map-legend-title">
        <h2 id="map-legend-title" className="type-caption text-text-sec">범례</h2>
        <p className="mt-2 type-meta text-text-meta">색: 도달 시점 부족분 단계</p>
        <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
          {SEVERITY_STEPS.map((s) => (
            <li key={s.level} className="flex items-center gap-2 type-meta text-text-sec">
              <span aria-hidden="true" className={clsx('inline-block h-3 w-3 shrink-0 rounded-full', SEVERITY_SWATCH[s.level])} />
              {s.label}
            </li>
          ))}
        </ul>
        <ul className="mt-2 space-y-1 type-meta text-text-sec">
          <li>숫자: 선택 시점 대기 인원(도달 시점은 부족분)</li>
          <li>{mode === '3d' ? '막대 높이: 선택 시점 대기 인원' : '원 크기: 선택 시점 대기 인원'}</li>
          {layers.vehicles && (
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-full bg-primary" />이송 가용 차량
              <span aria-hidden="true" className="ml-2 inline-block h-3 w-3 shrink-0 rounded-full border-2 border-text-meta" />대기 차량
            </li>
          )}
          {layers.shelters && (
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-success" />대피소
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

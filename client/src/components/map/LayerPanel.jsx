// 상황판 오른쪽 보기 전환, 레이어 목록, 범례.
// 레이어 한 줄 = 제목과 설명(왼쪽) + 스위치(오른쪽). 줄 전체가 role=switch 버튼이라 어디를 눌러도 켜고 끈다.
// 시설 레이어는 정적 공개 자료(donghaeData.js)다. 설명 줄에 출처와 기준 시점을 적는다.
import { Maximize } from 'lucide-react'
import clsx from 'clsx'
import { SEVERITY_STEPS, fmtElapsed } from '../../lib/geo.js'
import { AGING_STEPS, SEVERITY_SWATCH } from './mapTheme.js'

function Segment({ label, value, onChange, items }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="type-body-sm text-text-sec">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-flow-col auto-cols-fr gap-1 rounded-md bg-mute p-1">
        {items.map((it) => {
          const on = it.value === value
          return (
            <button key={it.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(it.value)}
              className={clsx('h-8 min-w-14 rounded-sm px-3 type-strong transition-colors duration-fast',
                on ? 'bg-page text-text-pri shadow-sm' : 'text-text-meta hover:text-text-pri')}>
              {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LayerRow({ label, desc, tone, checked, onChange, swatch }) {
  return (
    <li>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className="flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-fast hover:bg-mute">
        {swatch && <span aria-hidden="true" className={clsx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', swatch)} />}
        <span className="min-w-0 flex-1">
          <span className="block type-body-sm leading-6 text-text-pri">{label}</span>
          {desc && <span className={clsx('mt-0.5 block type-meta leading-5', tone === 'danger' ? 'text-danger-text' : 'text-text-meta')}>{desc}</span>}
        </span>
        <span aria-hidden="true" className={clsx('relative mt-0.5 inline-block h-5 w-9 shrink-0 rounded-full transition-colors duration-fast', checked ? 'bg-primary' : 'bg-line-strong')}>
          <span className={clsx('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-page shadow-sm transition-transform duration-fast', checked && 'translate-x-4')} />
        </span>
      </button>
    </li>
  )
}

export default function LayerPanel({
  mode, onMode, theme, onTheme, onFit, layers, onLayer, shelterStats, shelterTotal, ltcCounts, fireInfo, vehicleCount, sources = {}, extraLayers = []
}) {
  const src = (k) => (sources[k] ? `${sources[k].org}, ${sources[k].period}` : '')
  const shelterDesc = shelterStats
    ? `${shelterTotal}곳 중 이번 시나리오 배정 ${shelterStats.used}곳${shelterStats.over ? `, 수용 초과 ${shelterStats.over}곳` : ''}${shelterStats.blocked ? `, 구역 안이라 제외 ${shelterStats.blocked}곳` : ''}. 점선은 마을 집결지와 배정 시설을 잇는 직선입니다. 출처: ${src('shelters')}`
    : ''
  return (
    <div className="space-y-6">
      <section aria-labelledby="map-view-title" className="space-y-2.5">
        <h3 id="map-view-title" className="type-caption text-text-meta">보기</h3>
        <Segment label="지도" value={mode} onChange={onMode} items={[{ value: '2d', label: '2D' }, { value: '3d', label: '3D' }]} />
        <Segment label="바탕" value={theme} onChange={onTheme} items={[{ value: 'light', label: '밝게' }, { value: 'dark', label: '어둡게' }]} />
        <button type="button" onClick={onFit} className="inline-flex h-9 items-center gap-2 rounded-md px-2 type-strong text-primary-text hover:bg-mute">
          <Maximize size={16} aria-hidden="true" />{mode === '3d' ? '대피 대상 구역 보기' : '동해시 전체 보기'}
        </button>
      </section>

      <section aria-labelledby="map-layer-title">
        <h3 id="map-layer-title" className="type-caption text-text-meta">레이어</h3>
        <ul className="mt-1.5 -mx-2 divide-y divide-line-sub">
          <LayerRow label="마을별 부족분" checked={layers.shortage} onChange={(v) => onLayer('shortage', v)} swatch="bg-chart-heatDanger-3" />
          <LayerRow label={mode === '3d' ? '읍면동 조각 선과 이름' : '행정동 경계'} checked={layers.dongs} onChange={(v) => onLayer('dongs', v)} />
          {mode === '3d' && (
            <LayerRow label="조각 펼치기" checked={!!layers.spread} onChange={(v) => onLayer('spread', v)}
              desc={layers.spread ? '읍면동 조각을 바깥으로 벌려 서로 가려진 곳을 볼 수 있게 합니다.' : undefined} />
          )}
          <LayerRow label="산불 확산 가정 구역" checked={layers.fire} onChange={(v) => onLayer('fire', v)} swatch="bg-text-pri"
            desc={layers.fire ? (fireInfo ? `${fireInfo.label}에서 시속 ${fireInfo.speed}km로 번진다고 둔 가정입니다. 띠 안 마을에 발령 후 ${fmtElapsed(fireInfo.fromH)}부터 ${fmtElapsed(fireInfo.toH)} 사이에 차례로 도달합니다.` : '시 전체 시나리오라 발화 가정 지점이 없습니다.') : undefined} />
          <LayerRow label="이재민 임시주거시설" checked={layers.shelters} onChange={(v) => onLayer('shelters', v)} swatch="bg-primary" desc={layers.shelters ? shelterDesc : undefined} />
          {extraLayers.map((x) => (
            <LayerRow key={x.key} label={x.label} desc={layers[x.key] ? x.desc : undefined} checked={!!layers[x.key]} onChange={(v) => onLayer(x.key, v)} swatch={x.swatch} />
          ))}
          <LayerRow label="장기요양 입소시설과 주야간보호" checked={layers.ltc} onChange={(v) => onLayer('ltc', v)} swatch="bg-chart-2"
            desc={layers.ltc ? `노인요양시설 ${ltcCounts?.residential ?? 0}곳(채운 점), 주야간보호 ${ltcCounts?.daycare ?? 0}곳(빈 점). 입소자는 시설 자체 대피계획 대상이라 부족분 계산에 넣지 않습니다. 출처: ${src('ltcFacilities')}` : undefined} />
          <LayerRow label="행정동 고령화율" checked={layers.aging} onChange={(v) => onLayer('aging', v)} swatch="bg-chart-heat-3"
            desc={layers.aging ? `65세 이상 인구 비율입니다. 출처: ${src('population')}` : undefined} />
          <LayerRow label="차량 위치" checked={layers.vehicles} onChange={(v) => onLayer('vehicles', v)} swatch="bg-primary"
            desc={layers.vehicles ? `차량 ${vehicleCount}대. 수량과 위치는 기관 조사 전 가정이며 소속 동 행정복지센터 둘레에 둡니다.` : undefined} />
        </ul>
      </section>

      <section aria-labelledby="map-legend-title">
        <h3 id="map-legend-title" className="type-caption text-text-meta">범례</h3>
        <p className="mt-2 type-meta leading-5 text-text-sec">색은 도달 시점의 부족분 단계입니다.</p>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          {SEVERITY_STEPS.map((s) => (
            <li key={s.level} className="flex items-center gap-2 type-meta text-text-sec">
              <span aria-hidden="true" className={clsx('inline-block h-2.5 w-2.5 shrink-0 rounded-full', SEVERITY_SWATCH[s.level])} />
              {s.label}
            </li>
          ))}
        </ul>
        {layers.aging && (
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2" aria-label="고령화율 범례">
            {AGING_STEPS.map((s) => (
              <li key={s.min} className="flex items-center gap-2 type-meta text-text-sec">
                <span aria-hidden="true" className={clsx('inline-block h-2.5 w-2.5 shrink-0 rounded-xs', s.swatch)} />
                고령화율 {s.label}
              </li>
            ))}
          </ul>
        )}
        {layers.shelters && (
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2" aria-label="임시주거시설 범례">
            {[['border-primary', '수용 여유'], ['border-chart-heatDanger-2', '수용 80% 이상'], ['border-danger', '수용 초과'], ['border-text-ter', '구역 안 제외']].map(([c, t]) => (
              <li key={t} className="flex items-center gap-2 type-meta text-text-sec">
                <span aria-hidden="true" className={clsx('inline-block h-3 w-3 shrink-0 rounded-full border-[3px] bg-page', c)} />{t}
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-3 space-y-1.5 type-meta leading-5 text-text-meta">
          <li>회색 작은 점은 대피 대상 구역 밖 마을입니다.</li>
          <li>숫자는 선택한 시점의 대기 인원입니다. 도달 시점에는 부족분과 같습니다.</li>
          <li>{mode === '3d' ? '기둥 높이는 선택한 시점의 대기 인원입니다. 동해시 행정동 조각이 솟은 높이는 그 행정동의 미이송 예상 인원에 비례합니다.' : '원 크기는 선택한 시점의 대기 인원입니다.'}</li>
        </ul>
      </section>
    </div>
  )
}

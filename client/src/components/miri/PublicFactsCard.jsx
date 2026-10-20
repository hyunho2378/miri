// 현황판 공공데이터 추가 카드. 동해 응급실 실시간 가용병상(국립중앙의료원), 장애인편의시설 수(한국사회보장정보원),
// 산불 이력(산림청 산불통계 스냅샷). 출처와 기준 시각을 함께 보인다. 실시간 조회가 실패하면 사유를 그대로 적는다.
import { Ambulance, Accessibility, Flame } from 'lucide-react'
import Card from '../ui/Card.jsx'
import useOpenData from '../../hooks/useOpenData.js'
import { FOREST_FIRE_ROWS, FOREST_FIRE_SOURCE } from '../../data/forestFireHistory.js'

const fmtHvidate = (s) => (/^\d{14}$/.test(String(s || '')) ? `${s.slice(0, 4)}. ${s.slice(4, 6)}. ${s.slice(6, 8)}. ${s.slice(8, 10)}:${s.slice(10, 12)}` : s || '시각 없음')

function Status({ s }) {
  return <p className="type-body-sm text-text-meta">{s.loading ? '조회 중입니다.' : `응답을 받지 못했습니다(${s.error || '사유 없음'}).`}</p>
}

export default function PublicFactsCard({ only = null, className = '' }) {
  const show = (k) => !only || only === k
  const er = useOpenData('er')
  const access = useOpenData('access')
  return (
    <Card title={only === 'er' ? '인계 참고: 동해 응급실' : '공공데이터 추가 연계'} desc={only === 'er' ? '출처: 국립중앙의료원 전국 응급의료기관 정보 조회 서비스' : '출처: 국립중앙의료원, 한국사회보장정보원, 산림청'} className={className}>
      <div className="space-y-5">
        {show('er') && <section aria-label="동해 응급실 가용병상">
          <p className="mb-2 inline-flex items-center gap-1.5 type-caption text-text-sec"><Ambulance size={16} aria-hidden="true" />동해 응급실 가용병상(실시간)</p>
          {er.data ? (
            er.data.list.length ? (
              <ul className="space-y-1">
                {er.data.list.map((h) => (
                  <li key={h.name} className="type-body-sm text-text-pri">
                    <strong>{h.name}</strong> 응급실 {h.erBeds ?? '정보 없음'}병상 <span className="text-text-meta">(기관 입력 {fmtHvidate(h.updatedAt)})</span>
                  </li>
                ))}
              </ul>
            ) : <p className="type-body-sm text-text-meta">동해시로 등록된 응급실 정보가 없습니다.</p>
          ) : <Status s={er} />}
        </section>}
        {show('access') && <section aria-label="동해 장애인편의시설">
          <p className="mb-2 inline-flex items-center gap-1.5 type-caption text-text-sec"><Accessibility size={16} aria-hidden="true" />동해 장애인편의시설 등록</p>
          {access.data ? (
            <p className="type-body-sm text-text-pri"><strong>{access.data.count.toLocaleString('ko-KR')}곳</strong> <span className="text-text-meta">(좌표 있는 곳 {access.data.list.filter((x) => x.lat && x.lon).length}곳)</span></p>
          ) : <Status s={access} />}
        </section>}
        {show('fires') && <section aria-label="동해 산불 이력">
          <p className="mb-2 inline-flex items-center gap-1.5 type-caption text-text-sec"><Flame size={16} aria-hidden="true" />동해 산불 이력</p>
          <ul className="space-y-1">
            {FOREST_FIRE_ROWS.map((r) => (
              <li key={r.start} className="type-body-sm text-text-pri">
                {r.start.slice(0, 10)} {r.place} {r.areaHa.toLocaleString('ko-KR')}ha, 원인 {r.cause}{r.note ? <span className="text-text-meta"> ({r.note})</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 type-caption text-text-meta">{FOREST_FIRE_SOURCE.name}(포털 {FOREST_FIRE_SOURCE.portalId}), 파일 {FOREST_FIRE_SOURCE.file}, 포털 수정일 {FOREST_FIRE_SOURCE.portalUpdated}</p>
        </section>}
      </div>
    </Card>
  )
}

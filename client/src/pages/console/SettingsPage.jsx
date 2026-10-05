// 설정(IA 4.9). 시 관리자 전용. 계산 기본값, 이상 탐지 임계값, 마을과 대피소, 임시주거시설, 차종 정원, 사용자, 데이터 출처.
import Card from '../../components/ui/Card.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'
import Badge from '../../components/ui/Badge.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import NumberStepper from '../../components/ui/NumberStepper.jsx'
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import { ORG_NAME } from '../../lib/api.js'
import { GRADES, VEHICLE_TYPES } from '../../lib/shortage.js'
import useAuthStore, { DEMO_USERS, ROLE_LABEL } from '../../store/useAuthStore.js'
import useMiriStore, { dongName } from '../../store/useMiriStore.js'
import { DATA_SOURCES, DONG_STATS, LTC } from '../../mock/donghaeData.js'

export default function SettingsPage() {
  const settings = useMiriStore((s) => s.settings)
  const villages = useMiriStore((s) => s.villages)
  const shelters = useMiriStore((s) => s.shelters)
  const dongs = useMiriStore((s) => s.dongs)
  const updateSettings = useMiriStore((s) => s.updateSettings)
  const me = useAuthStore((s) => s.user)

  const sname = (c) => shelters.find((s) => s.code === c)?.name || c
  const villageCols = [
    { key: 'label', label: '마을(법정동)', sortable: true, render: (v) => <span className="type-strong text-text-pri">{v.label}</span> },
    { key: 'dong', label: '행정동', render: (v) => dongName({ dongs }, v.dongCode), hideBelow: 'lg' },
    { key: 'pickup', label: '집결지', hideBelow: 'md', render: (v) => (v.pickup ? <span><span className="block">{v.pickup.name}</span><span className="block type-meta text-text-meta">{v.pickup.road.replace('동해시 ', '')}</span></span> : <span className="text-text-meta">미지정(법정동 기준점)</span>) },
    { key: 'shelter', label: '평시 지정 대피소', render: (v) => sname(v.shelterCode), hideBelow: 'md' },
    { key: 'driveMin', label: '편도 주행', align: 'right', sortable: true, hideBelow: 'lg', render: (v) => `${v.driveMin}분` },
    { key: 'roundTripMin', label: '왕복', align: 'right', sortable: true, render: (v) => <span className="type-strong tabular-nums">{Math.round(2 * v.driveMin + (settings.boardingMinutes ?? 20))}분</span> },
    { key: 'estTargets', label: '추정 대상자', align: 'right', sortable: true, hideBelow: 'lg', render: (v) => `${v.estTargets}명` }
  ]
  const shelterCols = [
    { key: 'name', label: '시설', sortable: true, render: (x) => <span><span className="block type-strong text-text-pri">{x.name}</span><span className="block type-meta text-text-meta">{x.kind}</span></span> },
    { key: 'address', label: '주소', hideBelow: 'md', render: (x) => <span className="type-body-sm text-text-sec">{x.address.replace('동해시 ', '')}{x.coordApprox ? ' (좌표 근사)' : ''}</span> },
    { key: 'capacity', label: '수용 가능', align: 'right', sortable: true, render: (x) => `${x.capacity}명` },
    { key: 'areaM2', label: '면적', align: 'right', hideBelow: 'lg', render: (x) => `${x.areaM2.toLocaleString('ko-KR')}㎡` },
    { key: 'quake', label: '지진 겸용', hideBelow: 'lg', render: (x) => (x.quake ? '겸용' : '아님') }
  ]
  const sourceRows = Object.entries(DATA_SOURCES).map(([key, x]) => ({ key, ...x }))
  const sourceCols = [
    { key: 'label', label: '자료', render: (x) => <span className="type-strong text-text-pri">{x.label}</span> },
    { key: 'org', label: '제공 기관', render: (x) => x.org },
    { key: 'table', label: '표와 파일', hideBelow: 'lg', render: (x) => <span className="type-meta text-text-sec">{x.table}</span> },
    { key: 'period', label: '기준 시점', render: (x) => <span className="whitespace-nowrap">{x.period}</span> }
  ]
  const shelterCap = shelters.reduce((t, x) => t + (x.capacity || 0), 0)
  const dongRows = Object.entries(DONG_STATS).map(([code, d]) => ({ code, ...d }))

  const capacityCols = [
    { key: 'label', label: '차종', render: (t) => <span className="type-strong text-text-pri">{t.label}</span> },
    ...GRADES.map((g) => ({ key: g.key, label: g.label, align: 'right', render: (t) => <span className="text-text-sec">{t.capacity[g.key] ? `${t.capacity[g.key]}명` : '불가'}</span> }))
  ]

  return (
    <PageShell title="설정">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="기관 정보">
          <KeyValue items={[
            { label: '기관명', value: ORG_NAME, strong: true },
            { label: '행정동', value: `${dongs.length}개 (${dongs.map((d) => d.name).join(', ')})` },
            { label: '마을', value: `법정동 ${villages.length}곳(동호동은 행정동 일대 1곳)` },
            { label: '임시주거시설', value: `${shelters.length}곳, 수용 가능 ${shelterCap.toLocaleString('ko-KR')}명` },
            { label: '재가 장기요양 수급자 추정', value: `${LTC.homeTotal.toLocaleString('ko-KR')}명(${LTC.period}년 급여이용 ${LTC.users['계'].toLocaleString('ko-KR')}명 중 시설급여 ${LTC.facilityUsers['계']}명 제외)` },
            { label: '주민등록인구', value: `${dongRows.reduce((t, d) => t + d.total, 0).toLocaleString('ko-KR')}명, 65세 이상 ${dongRows.reduce((t, d) => t + d.age65, 0).toLocaleString('ko-KR')}명(${DATA_SOURCES.population.period})` }
          ]} />
        </Card>

        <Card title="계산 기본값">
          <div className="divide-y divide-line-sub">
            <NumberStepper className="pb-3" label="준비 시간" unit="분" step={15} min={0} max={180} value={settings.prepMinutes} onChange={(v) => updateSettings({ prepMinutes: v })} hint="발령 후 첫 차량이 출발하기까지 걸리는 시간" />
            <NumberStepper className="py-3" label="탑승과 하차 시간" unit="분" step={5} min={5} max={60} value={settings.boardingMinutes ?? 20} onChange={(v) => updateSettings({ boardingMinutes: v })} hint="왕복 시간 = 편도 주행 시간 × 2 + 이 값. 주행 시간은 OSRM 도로 경로 계산값" />
            <div className="pt-3">
              <p className="type-caption text-text-sec">이송 완료 기한</p>
              <SegmentControl
                className="mt-3" label="이송 완료 기한"
                value={settings.completeBeforeHours}
                onChange={(v) => updateSettings({ completeBeforeHours: v })}
                items={[{ value: 0, label: '산불 도달 시각' }, { value: 5, label: '도달 5시간 전' }]}
              />
            </div>
          </div>
        </Card>

        <Card title="이상 탐지 기준값">
          <div className="divide-y divide-line-sub">
            <NumberStepper className="pb-3" label="확인 대기 서류 장기 보류 기준" unit="일" min={1} max={60} value={settings.pendingDays} onChange={(v) => updateSettings({ pendingDays: v })} />
            <NumberStepper className="py-3" label="협약 만료 임박 기준" unit="일" step={5} min={5} max={120} value={settings.contractWarnDays} onChange={(v) => updateSettings({ contractWarnDays: v })} />
            <NumberStepper className="py-3" label="도우미 담당 대상자 상한" unit="명" step={5} min={5} max={100} value={settings.helperLoadMax} onChange={(v) => updateSettings({ helperLoadMax: v })} />
            <NumberStepper className="pt-3" label="도우미 무응답 판정 시간" unit="분" step={5} min={5} max={60} value={settings.noAckMinutes} onChange={(v) => updateSettings({ noAckMinutes: v })} />
          </div>
        </Card>

        <Card title="사용자와 역할" desc="시연용 계정입니다.">
          <ul className="divide-y divide-line-sub">
            {Object.values(DEMO_USERS).map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="type-strong text-text-pri">{u.name}</p>
                  <p className="type-meta text-text-meta">{u.dong ? `${dongName({ dongs }, u.dong)} 담당` : '동해시 전체 담당'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {me?.id === u.id && <Badge tone="primary">현재 사용자</Badge>}
                  <Badge>{ROLE_LABEL[u.role]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <TableCard
        className="mt-4" title="차종별 회차당 탑승 정원" count={`${VEHICLE_TYPES.length}종`} desc="협의 전 가정값입니다."
        columns={capacityCols} rows={VEHICLE_TYPES} rowKey={(t) => t.key} pageSize={20} caption="차종과 등급별 정원"
      />

      <TableCard
        className="mt-4" title="마을과 평시 지정 대피소" count={`${villages.length}곳`}
        desc={`집결지는 각 법정동 경로당 가운데 분포 중심에 가까운 곳입니다(${DATA_SOURCES.seniorCenters.org}). 대피소는 집결지에서 도로 주행 시간이 가장 짧은 임시주거시설이며, 확산 시나리오에서는 대피 대상 구역 밖 시설로 바뀝니다.`}
        columns={villageCols} rows={villages} rowKey={(v) => v.code} caption="마을별 집결지, 대피소, 왕복 시간" pageSize={20}
      />

      <TableCard
        className="mt-4" title="이재민 임시주거시설" count={`${shelters.length}곳`}
        desc={`${DATA_SOURCES.shelters.org} 공개 목록, ${DATA_SOURCES.shelters.period}. 수용 가능 인원은 시설 전체 기준이며 대상자에게 모두 쓸 수 있다고 가정합니다.`}
        columns={shelterCols} rows={shelters} rowKey={(x) => x.code} caption="임시주거시설 목록" pageSize={10}
      />

      <TableCard
        className="mt-4" title="데이터 출처" count={`${sourceRows.length}건`}
        desc="실제 공개 자료와 가정값을 나눠 적습니다. 대상자 개인, 차량 수량, 도우미 배치는 가정입니다."
        columns={sourceCols} rows={sourceRows} rowKey={(x) => x.key} caption="데이터 출처와 기준 시점" pageSize={20}
      />
    </PageShell>
  )
}

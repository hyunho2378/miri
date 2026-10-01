// 설정(IA 4.9). 시 관리자 전용. 계산 기본값, 이상 탐지 임계값, 마을과 대피소 왕복 시간, 차종 정원, 사용자.
import { Minus, Plus } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import IconButton from '../../components/ui/IconButton.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import NumberStepper from '../../components/ui/NumberStepper.jsx'
import SectionTitle from '../../components/ui/SectionTitle.jsx'
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import { ORG_NAME } from '../../lib/api.js'
import { GRADES, VEHICLE_TYPES } from '../../lib/shortage.js'
import useAuthStore, { DEMO_USERS, ROLE_LABEL } from '../../store/useAuthStore.js'
import useMiriStore, { dongName } from '../../store/useMiriStore.js'

export default function SettingsPage() {
  const settings = useMiriStore((s) => s.settings)
  const villages = useMiriStore((s) => s.villages)
  const shelters = useMiriStore((s) => s.shelters)
  const dongs = useMiriStore((s) => s.dongs)
  const updateSettings = useMiriStore((s) => s.updateSettings)
  const updateVillage = useMiriStore((s) => s.updateVillage)
  const me = useAuthStore((s) => s.user)

  const villageCols = [
    { key: 'label', label: '마을', sortable: true },
    { key: 'dong', label: '동', render: (v) => dongName({ dongs }, v.dongCode), hideBelow: 'lg' },
    { key: 'shelter', label: '대피소', render: (v) => shelters.find((s) => s.code === v.shelterCode)?.name || v.shelterCode, hideBelow: 'md' },
    {
      key: 'roundTripMin', label: '왕복 시간', sortable: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1">
          <IconButton size="sm" radius="md" aria-label={`${v.label} 왕복 시간 5분 줄이기`} disabled={v.roundTripMin <= 10} onClick={() => updateVillage(v.code, { roundTripMin: v.roundTripMin - 5 })}>
            <Minus size={16} aria-hidden="true" />
          </IconButton>
          <span className="min-w-12 text-center type-strong text-text-pri tabular-nums">{v.roundTripMin}분</span>
          <IconButton size="sm" radius="md" aria-label={`${v.label} 왕복 시간 5분 늘리기`} disabled={v.roundTripMin >= 240} onClick={() => updateVillage(v.code, { roundTripMin: v.roundTripMin + 5 })}>
            <Plus size={16} aria-hidden="true" />
          </IconButton>
        </span>
      )
    }
  ]

  return (
    <PageShell title="설정" intro="계산 기본값과 이상 탐지 임계값과 마을별 왕복 시간 관리. 변경 즉시 부족분 계산과 배정에 반영">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="기관 정보">
          <KeyValue items={[
            { label: '기관명', value: ORG_NAME, strong: true },
            { label: '행정동', value: `${dongs.length}개 (${dongs.map((d) => d.name).join(', ')})` },
            { label: '산림 연접 마을', value: `${villages.filter((v) => v.forestAdjacent).length}곳 (가상마을)` },
            { label: '대피소', value: `${shelters.length}곳 (가상)` }
          ]} />
          <p className="mt-4 type-meta text-text-meta">기관명은 환경변수 VITE_ORG_NAME 값. 화면에서 변경 불가</p>
        </Card>

        <Card title="계산 기본값" desc="부족분 공식: 왕복 가능 횟수는 준비 시간을 뺀 가용 시간을 왕복 시간으로 나눈 값">
          <div className="divide-y divide-line-sub">
            <NumberStepper className="pb-3" label="준비 시간" unit="분" step={15} min={0} max={180} value={settings.prepMinutes} onChange={(v) => updateSettings({ prepMinutes: v })} hint="발령 후 첫 차량 출발까지" />
            <div className="py-3">
              <p className="type-caption text-text-sec">발령 기준 시간</p>
              <p className="mt-1 type-strong text-text-pri tabular-nums">{settings.windowHours}시간</p>
              <p className="type-meta text-text-meta">재난취약자 도달 8시간 전 대피 (행정안전부 2025.4.16)</p>
            </div>
            <div className="pt-3">
              <p className="type-caption text-text-sec">이송 완료 기한</p>
              <p className="type-meta text-text-meta">도달 5시간 전 선택 시 가용 시간이 크게 줄어 부족분 증가. 동해시 담당자 확인 항목</p>
              <SegmentControl
                className="mt-3" label="이송 완료 기한"
                value={settings.completeBeforeHours}
                onChange={(v) => updateSettings({ completeBeforeHours: v })}
                items={[{ value: 0, label: '산불 도달 시각' }, { value: 5, label: '도달 5시간 전' }]}
              />
            </div>
          </div>
        </Card>

        <Card title="이상 탐지 임계값" desc="규칙 기반 탐지 기준">
          <div className="divide-y divide-line-sub">
            <NumberStepper className="pb-3" label="판독 장기 미확인" unit="일" min={1} max={60} value={settings.pendingDays} onChange={(v) => updateSettings({ pendingDays: v })} />
            <NumberStepper className="py-3" label="협약 만료 임박" unit="일" step={5} min={5} max={120} value={settings.contractWarnDays} onChange={(v) => updateSettings({ contractWarnDays: v })} />
            <NumberStepper className="py-3" label="도우미 담당 상한" unit="명" step={5} min={5} max={100} value={settings.helperLoadMax} onChange={(v) => updateSettings({ helperLoadMax: v })} />
            <NumberStepper className="pt-3" label="도우미 무응답" unit="분" step={5} min={5} max={60} value={settings.noAckMinutes} onChange={(v) => updateSettings({ noAckMinutes: v })} />
          </div>
        </Card>

        <Card title="사용자와 역할">
          <ul className="divide-y divide-line-sub">
            {Object.values(DEMO_USERS).map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="type-strong text-text-pri">{u.name}</p>
                  <p className="type-meta text-text-meta">{u.dong ? `${dongName({ dongs }, u.dong)} 담당` : '동해시 전체'}</p>
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

      <Card className="mt-4" title="차종별 회차당 탑승 정원" desc="가정값. 동해소방서와 요양시설 자문 전" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left tabular-nums">
            <caption className="sr-only">차종과 등급별 정원</caption>
            <thead>
              <tr className="bg-subtle">
                <th scope="col" className="px-4 py-3 type-caption text-text-meta">차종</th>
                {GRADES.map((g) => <th key={g.key} scope="col" className="px-4 py-3 type-caption text-text-meta text-right">{g.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {VEHICLE_TYPES.map((t) => (
                <tr key={t.key} className="border-t border-line-sub">
                  <th scope="row" className="px-4 py-3 type-strong text-text-pri">{t.label}</th>
                  {GRADES.map((g) => (
                    <td key={g.key} className="px-4 py-3 type-body-sm text-right text-text-sec">{t.capacity[g.key] ? `${t.capacity[g.key]}명` : '불가'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="mt-8">
        <SectionTitle title="마을과 대피소 왕복 시간" desc="승차와 하차 포함 왕복. 5분 단위 조정" />
        <DataTable columns={villageCols} rows={villages} rowKey={(v) => v.code} caption="마을별 대피소와 왕복 시간" pageSize={30} />
      </section>
    </PageShell>
  )
}

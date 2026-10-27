// 소방 인계(IA 4.7). 소방 인계 대상 = 배정 결과 미배정 + 이송 실패 + 이미 소방 인계한 대상자.
// 선택 후 일괄 인계, CSV 내보내기, 인쇄, 전달 기록.
// 현직 소방관 인터뷰(2026. 10. 24.) 반영: 기준 시각을 숫자 옆에, 가장 급한 사람 먼저, 상세 위치와 엘리베이터와 보호자 연락처,
// 명부 마지막 확인, 소방 용어(구조 대상, 거동불편). 목록 계산은 lib/handoverRows.js
import { useMemo, useState } from 'react'
import { Ambulance, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import PublicFactsCard from '../../components/miri/PublicFactsCard.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import MetricCard from '../../components/miri/MetricCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import HandoverPrint from '../../components/miri/HandoverPrint.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Button from '../../components/ui/Button.jsx'
import Checkbox from '../../components/ui/Checkbox.jsx'
import Modal from '../../components/ui/Modal.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ExportButton from '../../components/ui/ExportButton.jsx'
import useNow from '../../hooks/useNow.js'
import useToast from '../../hooks/useToast.js'
import { UNSERVED_REASON } from '../../lib/assign.js'
import { FAIL_REASONS, failReasonOf, indexStops, stepOf } from '../../lib/dispatchSim.js'
import { TAGS } from '../../lib/intake.js'
import { gradeOf } from '../../lib/shortage.js'
import { STALE_DAYS, buildHandoverRows, handoverCsvColumns } from '../../lib/handoverRows.js'
import { handoverConfirmLines } from '../../lib/confirmSummary.js'
import { fmtDateTime, fmtHM } from '../../lib/time.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'
import { computeShortage, optimizedUnserved, requiredExtraVehicles } from '../../lib/shortageCalc.js'
import { handoverPreview } from '../../lib/handoverPreview.js'
import { addressText } from '../../lib/addressText.js'
import Drawer from '../../components/ui/Drawer.jsx'

const REASON = { ...UNSERVED_REASON, ...FAIL_REASONS }

export default function HandoverPage() {
  const d = useDispatchStore()
  const persons = useMiriStore((s) => s.persons)
  const villages = useMiriStore((s) => s.villages)
  const dongs = useMiriStore((s) => s.dongs)
  const privateInfo = useMiriStore((s) => s.privateInfo)
  const today = useMiriStore((s) => s.today)
  const orgName = useMiriStore((s) => s.settings.orgName)
  const vehicles = useMiriStore((s) => s.vehicles)
  const helpers = useMiriStore((s) => s.helpers)
  const settings = useMiriStore((s) => s.settings)
  const scenario = useMiriStore(activeScenario)
  const now = useNow()
  const toast = useToast()
  const [selected, setSelected] = useState(() => new Set())
  const [handOpen, setHandOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  const dname = (code) => dongs.find((x) => x.code === code)?.name || code

  // 평시 미리보기(셀 58): 발령 전에도 소방에 넘어갈 예상 구조 대상을 보인다. 값은 현황판과 같은 부족분 계산에서 가져온다
  const preview = useMemo(() => {
    if (['assigned', 'sent'].includes(d.status) && d.result) return null
    const input = { persons, villages, vehicles, helpers, settings, scenario, t0: today }
    const r = computeShortage(input)
    const extra = r.total > 0 ? requiredExtraVehicles(input, r) : []
    const resolved = extra.length > 0 && extra.every((e) => e.resolved)
    const vname = (code) => villages.find((v) => v.code === code)?.label || code
    return handoverPreview({
      baseline: r.total, recommended: optimizedUnserved(r), byVillage: r.byVillage, villageName: vname,
      extraLine: resolved ? extra.map((e) => `${e.typeLabel} ${e.count}대`).join(', ') : null
    })
  }, [d.status, d.result, persons, villages, vehicles, helpers, settings, scenario, today])

  const rows = useMemo(() => {
    if (!d.result) return []
    const stops = indexStops(d.result)
    const entries = []
    const add = (code, reasonKey, status) => entries.push({
      code, reason: REASON[reasonKey] || '미상', status, at: d.events[code]?.at, care: d.events[code]?.care || null
    })
    for (const code of Object.keys(d.events)) if (d.events[code].step === 'handedToFire') add(code, d.events[code].reason, 'handedToFire')
    for (const p of persons) if (stepOf(d, p.code, now, stops) === 'fail') add(p.code, failReasonOf(d, p.code), 'fail')
    for (const u of d.result.unassigned) add(u.personCode, u.reason, 'unassigned')
    // 같은 대상자는 처음 들어온 상태(소방 인계, 이송 실패, 미배정 순)만 남기고, 가장 급한 사람 먼저 정렬
    return buildHandoverRows({
      entries, persons, villages, privateInfo, arrivals: d.arrivals, now: today,
      dongName: dname, tagText: (t) => TAGS[t] || t
    }).map((r, i) => ({ ...r, rank: i + 1 }))
  }, [d, persons, villages, privateInfo, today, now]) // eslint-disable-line react-hooks/exhaustive-deps

  const waiting = rows.filter((r) => r.status !== 'handedToFire')
  const handed = rows.length - waiting.length
  const picked = waiting.filter((r) => selected.has(r.code)).map((r) => r.code)

  const toggle = (code) => setSelected((s) => {
    const n = new Set(s)
    if (n.has(code)) n.delete(code)
    else n.add(code)
    return n
  })
  const allOn = waiting.length > 0 && picked.length === waiting.length

  // 화면 표는 다섯 열(급한 순, 대상자, 마을과 위치, 등급, 사유)만. 나머지는 행을 누르면 열리는 상세에서 본다.
  // CSV 와 인쇄는 소방에 넘기는 서식이라 기존 열 그대로(handoverCsvColumns, HandoverPrint)
  const columns = [
    { key: 'rank', label: '급한 순', align: 'right', render: (r) => <span className="tabular-nums">{r.rank}</span>, sortable: true, sortValue: (r) => r.rank },
    {
      key: 'code', label: '대상자', sortable: true,
      render: (r) => (r.status === 'handedToFire'
        ? <span className="tabular-nums">{r.code}</span>
        : (
          <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected.has(r.code)} onChange={() => toggle(r.code)} label={`${r.code} 선택`} srOnlyLabel />
            <span className="tabular-nums">{r.code}</span>
          </span>
        ))
    },
    {
      key: 'village', label: '마을과 위치', sortable: true,
      render: (r) => <span>{r.village}<span className="block type-meta text-text-meta">{addressText(r.location)}</span></span>
    },
    {
      key: 'grade', label: '등급', sortValue: (r) => gradeOf(r.grade)?.weight * -1,
      render: (r) => <span className="inline-flex flex-col gap-0.5"><GradeChip grade={r.grade} size="sm" /><span className="type-meta text-text-meta">{r.gradeTerm}</span></span>
    },
    {
      key: 'reason', label: '사유',
      render: (r) => <span className="inline-flex flex-col items-start gap-1">{r.reason}{r.status === 'handedToFire' && <StatusPill status={r.status} label={`소방 인계 ${fmtHM(r.at)}`} />}</span>
    }
  ]
  const baseAt = d.result?.basis?.at
  const csvCols = handoverCsvColumns(baseAt)

  const live = ['assigned', 'sent'].includes(d.status) && d.result

  return (
    <PageShell title="소방 인계">
      {!live ? (
        <div className="space-y-4">
        {preview && (
          <Card title="평시 예상" meta={`기준 시나리오 ${scenario.name}`}>
            <p className="type-h3 text-text-pri tabular-nums">{preview.line1}</p>
            {preview.line2 && <p className="mt-1.5 type-body-sm text-text-sec tabular-nums">{preview.line2}</p>}
          </Card>
        )}
        <Card as="div" padding="none">
          <EmptyState
            title="진행 중인 발령이 없습니다"
            desc={d.status === 'standby' ? '추천 배정을 계산하면 목록이 생성됩니다.' : '발령을 개시하면 목록이 생성됩니다.'}
            action={<Button as={Link} to="/console/dispatch">발령 운영</Button>}
          />
        </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            <MetricCard label="소방 인계 대상" value={waiting.length} unit="명" tone={waiting.length ? 'danger' : 'neutral'} sub={`${fmtHM(baseAt)} 기준`} />
            <MetricCard label="인계 완료" value={handed} unit="명" />
            <MetricCard label="전달 횟수" value={d.handovers.length} unit="회" sub={d.status === 'assigned' ? '배정표 보내기 전 예상' : undefined} />
          </div>

          <TableCard
            title="소방 인계 대상" count={`${rows.length}명`}
            desc={`${fmtHM(baseAt)} 기준, 급한 순`}
            actions={(
              <>
                <Button variant="ghost" size="sm" disabled={!waiting.length} onClick={() => setSelected(allOn ? new Set() : new Set(waiting.map((r) => r.code)))}>
                  {allOn ? '선택 해제' : '전체 선택'}
                </Button>
                <ExportButton size="sm" columns={csvCols} rows={rows} filename={`${orgName}_소방인계_${fmtDateTime(now).replace(/[ .:]/g, '')}`} />
                <Button variant="secondary" size="sm" leftIcon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>인쇄</Button>
                <Button
                  variant="danger" size="sm" disabled={!picked.length} leftIcon={<Ambulance size={16} aria-hidden="true" />}
                  onClick={() => setHandOpen(true)}
                >
                  {picked.length ? `선택 ${picked.length}명 소방 인계` : '소방 인계'}
                </Button>
              </>
            )}
            columns={columns} rows={rows} rowKey={(r) => r.code} pageSize={20} caption="소방 인계 대상 목록"
            onRowClick={(r) => setDetail(r)}
            emptyTitle="소방 인계 대상이 없습니다" emptyDesc="전원 기한 안에 이송 중입니다."
          />

          <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.code} 상세` : ''}>
            {detail && (
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 type-body-sm">
                {[
                  ['마을(동)', `${detail.village}, ${detail.dong}`],
                  ['산불 도달', fmtHM(detail.arrival)],
                  ['상세 위치', addressText(detail.location)],
                  ['엘리베이터', detail.elevator],
                  ['보호자 연락처', detail.guardianPhone],
                  ['필요 대원 수', detail.crew],
                  ['의료기기', detail.device],
                  ['반려동물', detail.pet],
                  ['주소', addressText(detail.address)],
                  ['명부 마지막 확인', `${detail.checked.text}${detail.checked.stale && detail.checked.days != null ? ', 재확인 필요' : ''}`],
                  ['특이사항', detail.tags || '-'],
                  ['증상 시각, 관찰, 조치', detail.care ? [detail.care.symptomAt && `${detail.care.symptomAt} 발생`, detail.care.observation, detail.care.action && `조치: ${detail.care.action}`].filter(Boolean).join(', ') : '-']
                ].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-text-sec">{k}</dt>
                    <dd className={k === '명부 마지막 확인' && detail.checked.stale ? 'type-strong text-danger-text' : 'text-text-pri tabular-nums'}>{v || '-'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Drawer>

          <Modal
            open={handOpen} onClose={() => setHandOpen(false)} title="소방 인계"
            footer={(
              <>
                <Button variant="ghost" onClick={() => setHandOpen(false)}>취소</Button>
                <Button variant="danger" onClick={() => { setHandOpen(false); d.handover(picked); setSelected(new Set()); toast(`동해소방서 인계: ${picked.length}명`, 'primary') }}>소방 인계</Button>
              </>
            )}
          >
            <ul className="space-y-2 type-body text-text-pri tabular-nums">
              {handoverConfirmLines(rows, picked, (v) => v, fmtHM(baseAt)).map((l) => <li key={l}>{l}</li>)}
            </ul>
          </Modal>

          <HandoverPrint rows={rows} baseAt={baseAt} orgName={orgName} />

          <PublicFactsCard only="er" />

          <Card title="전달 기록" meta={`${d.handovers.length}회`}>
            {d.handovers.length ? (
              <ul className="divide-y divide-line-sub">
                {d.handovers.map((h, i) => (
                  <li key={`${h.at}-${i}`} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="type-strong text-text-pri tabular-nums">{fmtDateTime(h.at)}</span>
                    <span className="type-body-sm text-text-sec">{h.receiver}</span>
                    <span className="type-body-sm text-text-sec tabular-nums">{h.codes.length}명</span>
                    <span className="min-w-0 basis-full truncate type-meta text-text-meta tabular-nums">{h.codes.join(' ')}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="type-body-sm text-text-meta">전달 기록이 없습니다.</p>}
          </Card>
        </div>
      )}
    </PageShell>
  )
}

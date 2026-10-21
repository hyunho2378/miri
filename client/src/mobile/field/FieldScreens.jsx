import { FilledInput, FilledTextarea, IconButton, BottomActions } from '../ui.jsx'
// 현장 담당자 휴대폰 화면 F0~F7(docs/MOBILE_UI.md 4장). 콘솔과 같은 store를 쓰고 플랫폼 모양은 공용 부품이 나눈다.
// F0 평시, F1 발령 상태, F2 마을별 진행(목록, 상세), F3 도우미 응답, F4 미배정과 소방 지원 요청, F5 대상자 확인, F6 서류 판독, F7 현장 소식
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, Flame, Send, Siren, Truck, UserCheck, FileText, MessageSquare, Search } from 'lucide-react'
import { useRealNow } from '../../hooks/useNow.js'
import useOpenData from '../../hooks/useOpenData.js'
import { useDispatchStore } from '../../store/useDispatchStore.js'
import { activeScenario, useMiriStore } from '../../store/useMiriStore.js'
import { vnowOf, FAIL_REASONS, DECLINE_REASONS } from '../../lib/dispatchSim.js'
import { computeShortage, optimizedUnserved } from '../../lib/shortageCalc.js'
import { pendingCounts } from '../../lib/basis.js'
import { OWNERS, VEHICLE_NOTE, COMMITMENTS, commitmentOf, vehicleLabel, gradeOf } from '../../lib/shortage.js'

// 소속별 차량 요약: 대수와 확인 상태별 대수, 차량 코드
const ownerSummary = (list) => {
  if (!list.length) return '없음'
  const counts = {}
  list.forEach((v) => { const c = COMMITMENTS[commitmentOf(v)]; counts[c] = (counts[c] || 0) + 1 })
  const state = Object.entries(counts).map(([k, n]) => `${k} ${n}대`).join(', ')
  return `${list.length}대(${state}), ${list.map((v) => v.code).join(', ')}`
}
import { personCare, ROUTE_NOTE } from '../../lib/tripChecks.js'
import { readDocument } from '../../lib/intake.js'
import { readNote } from '../../lib/notes.js'
import { aiErrorMessage } from '../../lib/aiErrors.js'
import { AppBar, DisplaySettings, Banner, Button, Card, Chip, Dialog, EmptyState, List, ListRow, Progress, Segmented, Sheet, Spinner, useMobileToast } from '../ui.jsx'
import { ACTIVE, STATUS_LABEL, failedPending, fieldSummary, helperResponses, hm, searchPersons, stepLabel, unservedByReason, villageName, villageProgress, deadlineTag } from './fieldModel.js'

// 발령 복원과 10초 주기 조회(콘솔 발령 운영과 같은 방식)
function useDispatchLive() {
  const d = useDispatchStore()
  const restoreRemote = useDispatchStore((s) => s.restoreRemote)
  const pollReports = useDispatchStore((s) => s.pollReports)
  useEffect(() => { restoreRemote?.() }, [restoreRemote])
  useEffect(() => {
    if (d.status !== 'sent') return undefined
    pollReports?.()
    const t = setInterval(() => pollReports?.(), 10_000)
    return () => clearInterval(t)
  }, [d.status, pollReports])
  // 실제 시각을 받아 한 번만 가상 시각으로 바꾼다(배속 이중 적용으로 경과 시간이 커지던 문제)
  const now = useRealNow(5000)
  return { d, vnow: d.realStart ? vnowOf(d, now) : now, now }
}

function Section({ title, children, trailing }) {
  return (
    <section className="mob-section">
      <div className="mob-section-head">
        <h2 className="mob-t-label mob-section-title">{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className={`mob-stat ${tone ? `tone-${tone}` : ''}`}>
      <span className="mob-t-foot">{label}</span>
      <strong className="mob-t-title">{value}</strong>
    </div>
  )
}

function Fresh({ res }) {
  const asOf = res?.data?.asOf
  if (res?.loading) return <span className="mob-t-foot">조회 중</span>
  if (res?.error) return <span className="mob-t-foot tone-red-text">조회 실패, 이전 값 표시</span>
  if (!asOf) return <span className="mob-t-foot">기준 시각 확인 필요</span>
  const t = new Date(asOf)
  return <span className="mob-t-foot">기준 {Number.isNaN(t.getTime()) ? String(asOf) : `${t.getMonth() + 1}. ${t.getDate()}. ${hm(t.getTime())}`}{res?.data?.asOfBasis ? `, ${res.data.asOfBasis}` : ''}</span>
}

// F0 평시와 F1 발령 상태
export function FieldStatusPage() {
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const navigate = useNavigate()
  const scenario = activeScenario(data)
  const fire = useOpenData('fire')
  const warning = useOpenData('warning')
  if (!ACTIVE.has(d.status)) return <PeaceStatus data={data} scenario={scenario} fire={fire} warning={warning} navigate={navigate} closed={d.status === 'closed'} />
  const s = fieldSummary(d, data.persons, data.villages, vnow)
  const pct = s.total ? (s.counts.done / s.total) * 100 : 0
  return (
    <>
      <AppBar title="발령 상태" large trailing={d.kind !== 'drill' ? <Chip tone="red">실제 발령</Chip> : <Chip>훈련</Chip>} />
      <main id="main" className="mob-content">
        <Card filled className="mob-hero">
          <p className="mob-t-foot">{STATUS_LABEL[d.status]}</p>
          <p className="mob-t-display">{s.counts.done}<span className="mob-t-body"> / {s.total}명 이송 완료</span></p>
          <Progress value={pct} label="이송 완료 비율" />
          <p className="mob-t-foot">발령 개시 {s.elapsedMin}분 경과 기준, {hm(vnow)} 계산</p>
        </Card>
        <div className="mob-stat-grid">
          <Stat label="이송 진행" value={`${s.counts.moving}명`} />
          <Stat label="출발 대기" value={`${s.counts.wait}명`} />
          <Stat label="실패" value={`${s.counts.fail}명`} tone={s.counts.fail ? 'red' : undefined} />
          <Stat label="미배정" value={`${s.counts.unassigned}명`} tone={s.counts.unassigned ? 'red' : undefined} />
        </div>
        {s.next && (
          <List label="다음 기한">
            <ListRow lead={<Flame size={22} />} title={`${s.next.name} ${hm(s.next.at)}까지`} subtitle={`남은 대상자 ${s.next.left}명, 산불 도달 시각 기준`} chevron onClick={() => navigate(`/m/f/villages/${s.next.code}`)} />
          </List>
        )}
        {s.counts.unassigned > 0 && (
          <Banner tone="red" icon={<Siren size={20} aria-hidden="true" />}>
            <span className="mob-flex-1">소방 지원 요청 대상 {s.counts.unassigned}명</span>
            <Button size="sm" variant="danger" onClick={() => navigate('/m/f/fire')}>요청 화면</Button>
          </Banner>
        )}
        <Section title="저장 상태">
          <List label="저장 상태">
            <ListRow title={d.remote?.state === 'saved' ? '서버 저장' : '이 휴대폰 안에서만 진행'} subtitle={d.remote?.savedAt ? `마지막 저장 ${hm(d.remote.savedAt)}, 10초 주기 조회` : (d.remote?.reason || '시연 세션이 있으면 서버에 저장')} />
          </List>
        </Section>
      </main>
    </>
  )
}

function PeaceStatus({ data, scenario, fire, warning, navigate, closed }) {
  const toast = useMobileToast()
  const startDrill = () => {
    const st = useDispatchStore.getState()
    if (st.status === 'closed') st.reset()
    useDispatchStore.getState().start({ kind: 'drill', speed: 60 })
    useDispatchStore.getState().runAssign()
    useDispatchStore.getState().confirmAndSend()
    toast('훈련 발령 시연 시작')
  }
  const result = useMemo(() => computeShortage({ persons: data.persons, villages: data.villages, vehicles: data.vehicles, helpers: data.helpers, settings: data.settings, scenario, t0: data.today }), [data.persons, data.villages, data.vehicles, data.helpers, data.settings, scenario, data.today])
  const opt = useMemo(() => optimizedUnserved(result), [result])
  const scopeCodes = new Set(Object.keys(result.arrivals || {}))
  const pc = pendingCounts({ persons: data.persons, fieldNotes: data.fieldNotes, scopeVillageCodes: scopeCodes })
  const total = result.scopeTargets ?? 0
  const base = result.total
  return (
    <>
      <AppBar title="평시 현황" large />
      <main id="main" className="mob-content">
        {closed && <Banner tone="blue">발령 종료. 종료 기록은 콘솔 기록 화면에서 확인</Banner>}
        <Card filled className="mob-hero">
          <p className="mob-t-foot">미이송 예상, {scenario?.name || '기준 시나리오'}</p>
          <p className="mob-t-display">{base ?? '-'}<span className="mob-t-body">명</span></p>
          <p className="mob-t-foot">추천 배정 적용 {opt ?? '-'}명, 대피 대상 {result.scopeVillages}개 마을 {total}명, 평시 기준</p>
        </Card>
        <Section title="오늘 산불 여건">
          <List label="오늘 산불 여건">
            <ListRow lead={<Flame size={22} />} title={fire.data ? `산불위험지수 평균 ${fire.data.mean}, 최고 ${fire.data.max}` : fire.loading ? '조회 중' : '산불위험지수 조회 실패'} subtitle={<Fresh res={fire} />} />
            <ListRow lead={<Siren size={22} />} title={warning.data ? (warning.data.active?.length ? `동해 발효 특보 ${warning.data.active.join(', ')}` : '동해 발효 특보 없음') : warning.loading ? '조회 중' : '기상특보 조회 실패'} subtitle={<Fresh res={warning} />} />
          </List>
        </Section>
        <Section title="차량 소속과 확인 상태"><p className="mob-t-foot">{VEHICLE_NOTE}</p><List>{Object.entries(OWNERS).map(([key, label]) => <ListRow key={key} title={label} subtitle={ownerSummary(data.vehicles.filter((v) => v.owner === key))} />)}</List></Section>
        <Section title="확인할 일">
          <List label="확인할 일">
            <ListRow lead={<FileText size={22} />} title={`확인 대기 서류 ${pc.docsInScope}건`} subtitle="대피 대상 구역 기준, 판독 결과 원문 대조 필요" chevron onClick={() => navigate('/m/f/intake')} />
            <ListRow lead={<MessageSquare size={22} />} title={`확인 대기 현장 소식 ${pc.notes ?? 0}건`} subtitle="현장 소식 판독 결과 확인" chevron onClick={() => navigate('/m/f/note')} />
          </List>
        </Section>
        <Section title="발령">
          <Card className="mob-stack">
            <p className="mob-t-body">실제 발령은 콘솔 발령 운영에서 진행. 이 화면은 발령 개시 뒤 진행 상황 자동 표시</p>
            <Button variant="tonal" onClick={startDrill}>훈련 발령 시연 시작</Button>
            <p className="mob-t-foot">훈련 발령, 추천 배정, 전송까지 한 번에 진행. 60배속 가상 시계</p>
          </Card>
        </Section>
      </main>
    </>
  )
}

// F2 마을별 진행 목록
export function FieldVillagesPage() {
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const navigate = useNavigate()
  if (!ACTIVE.has(d.status)) return <NoDispatch title="마을별 진행" />
  const list = villageProgress(d, data.persons, data.villages, vnow)
  return (
    <>
      <AppBar title="마을별 진행" large />
      <main id="main" className="mob-content">
        <p className="mob-t-foot mob-pad">기한 임박 순, 산불 도달 시각 기준</p>
        {!list.length ? <EmptyState title="배정 전" body="배정 계산 뒤 마을별 진행 표시" /> : (
          <List label="마을별 진행">
            {list.map((v) => (
              <ListRow key={v.code} title={`${v.name}`} subtitle={`완료 ${v.done}, 진행 ${v.moving}, 대기 ${v.wait}${v.issue ? `, 미배정과 실패 ${v.issue}` : ''} / ${v.total}명`} meta={v.at ? `${hm(v.at)}까지` : '기한 없음'}
                trailing={(() => { const tg = deadlineTag(v, vnow); return tg ? <Chip tone="red">{tg === 'over' ? '기한 지남' : '임박'}</Chip> : null })()} chevron onClick={() => navigate(`/m/f/villages/${v.code}`)} />
            ))}
          </List>
        )}
      </main>
    </>
  )
}

// F2 마을 상세
export function FieldVillageDetailPage() {
  const { code } = useParams()
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const navigate = useNavigate()
  const v = villageProgress(d, data.persons, data.villages, vnow).find((x) => x.code === code)
  const village = data.villages.find((x) => x.code === code)
  return (
    <>
      <AppBar title={villageName(data.villages, code)} onBack={() => navigate('/m/f/villages')} backLabel="마을" />
      <main id="main" className="mob-content">
        {!v ? <EmptyState title="진행 정보 없음" body="대피 대상 구역 밖 마을이거나 배정 전" /> : (
          <>
            <div className="mob-stat-grid">
              <Stat label="기한" value={v.at ? hm(v.at) : '-'} />
              <Stat label="완료" value={`${v.done}/${v.total}`} />
            </div>
            <List label="만나는 곳과 자원">
              <ListRow title="집결지" subtitle={village?.pickup?.name ? `${village.pickup.name}, ${village.pickup.road}` : '확인 필요'} />
              <ListRow title="차량" subtitle={v.vehicles.map((code) => { const vehicle = data.vehicles.find((x) => x.code === code); return vehicle ? vehicleLabel(vehicle) : code }).join(', ') || '없음'} />
              <ListRow title="도우미" subtitle={v.helpers.join(', ') || '없음'} />
            </List>
            <Section title="대상자">
              <List label="대상자 진행">
                {v.people.map((r) => (
                  <ListRow key={r.person.code} title={r.person.code} subtitle={`${gradeOf(r.person.grade)?.label || '등급 확인'}, ${stepLabel(r.step)}`} trailing={<Chip tone={r.step === 'handover' ? 'blue' : ['fail', 'unassigned'].includes(r.step) ? 'red' : undefined}>{stepLabel(r.step)}</Chip>} onClick={() => navigate(`/m/f/people/${r.person.code}`)} chevron />
                ))}
              </List>
            </Section>
          </>
        )}
      </main>
    </>
  )
}

// F3 도우미 응답 현황
export function FieldHelpersPage() {
  const { d, vnow } = useDispatchLive()
  const replaceHelper = useDispatchStore((s) => s.replaceHelper)
  const resendLink = useDispatchStore((s) => s.resendLink)
  const toast = useMobileToast()
  const [tab, setTab] = useState('none')
  const [confirm, setConfirm] = useState(null)
  const [linkOf, setLinkOf] = useState(null)
  const tokens = d.remote?.tokens || {}
  const linkFor = (h) => (tokens[h] ? `${window.location.origin}/h/${tokens[h]}` : null)
  const copy = async (h) => {
    const url = linkFor(h)
    if (!url) { toast('서버 저장 전이라 링크 없음'); return }
    try { await navigator.clipboard.writeText(url); toast(`${h} 링크 복사`) } catch { toast('복사 실패, 링크를 길게 눌러 복사') }
  }
  if (!ACTIVE.has(d.status) || !d.result) return <NoDispatch title="도우미 응답" body="배정 계산 뒤 도우미 응답 표시" />
  const g = helperResponses(d, vnow)
  const rows = g[tab]
  return (
    <>
      <AppBar title="도우미 응답" large />
      <main id="main" className="mob-content">
        <div className="mob-pad">
          <Segmented label="응답 구분" value={tab} onChange={setTab} options={[{ value: 'none', label: `무응답 ${g.none.length}` }, { value: 'accept', label: `수락 ${g.accept.length}` }, { value: 'decline', label: `불가 ${g.decline.length}` }]} />
        </div>
        {d.status !== 'sent' && <Banner tone="blue">전송 전. 배정 확정 후 전송하면 응답 집계 시작</Banner>}
        {!rows.length ? <EmptyState title="해당 도우미 없음" /> : (
          <List label="도우미 목록">
            {rows.map((h) => (
              <ListRow key={h.code} title={h.code} subtitle={`차량 ${h.vehicle}, ${h.trips}회차${h.reason ? `, 사유 ${DECLINE_REASONS[h.reason] || h.reason}` : ''}${h.memo ? `, 메모 ${h.memo}` : ''}`} meta={h.at ? `${hm(h.at)} 응답` : `문자 ${h.sms}회 발송`}
                trailing={<span className="mob-inline-actions">
                  <Button size="sm" variant="plain" aria-label={`${h.code} 배정 링크`} onClick={() => setLinkOf(h)}>링크</Button>
                  {tab === 'accept' ? null : <Button size="sm" variant="tonal" onClick={() => setConfirm(h)}>{tab === 'decline' ? '교체' : '교체 요청'}</Button>}
                </span>} />
            ))}
          </List>
        )}
      </main>
      <Sheet open={!!linkOf} onClose={() => setLinkOf(null)} title={`${linkOf?.code || ''} 배정 링크`}>
        <p className="mob-t-foot mob-pad">본인 배정만 조회, 12시간 뒤 만료. 문자 {linkOf?.sms ?? 0}회 발송</p>
        <p className="mob-t-body mob-pad mob-break">{linkOf ? (linkFor(linkOf.code) || '서버 저장 전이라 링크 없음') : ''}</p>
        <div className="mob-pad mob-stack-8">
          <Button block variant="tonal" disabled={!linkOf || !linkFor(linkOf.code)} onClick={() => copy(linkOf.code)}>링크 복사</Button>
          <Button block onClick={() => { const ok = resendLink?.(linkOf.code); toast(ok ? `${linkOf.code} 문자 재발송 기록` : '재발송 실패'); setLinkOf(null) }}>문자 재발송</Button>
        </div>
      </Sheet>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={`${confirm?.code} 교체`} body="같은 등급을 지원하는 대기 도우미로 바꾸고 새 배정 문자를 보냄"
        actions={<><Button variant="plain" onClick={() => setConfirm(null)}>취소</Button><Button onClick={() => { const r = replaceHelper?.(confirm.code); toast(r ? `${confirm.code} 교체 완료` : '교체할 도우미 없음'); setConfirm(null) }}>교체</Button></>} />
    </>
  )
}

// F4 미배정과 소방 지원 요청
export function FieldFirePage() {
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const navigate = useNavigate()
  const requestFireSupport = useDispatchStore((s) => s.requestFireSupport)
  const handover = useDispatchStore((s) => s.handover)
  const toast = useMobileToast()
  const [open, setOpen] = useState(false)
  const [openFail, setOpenFail] = useState(false)
  const u = unservedByReason(d)
  const failed = failedPending(d, data.persons, vnow)
  return (
    <>
      <AppBar title="소방 지원 요청" onBack={() => navigate('/m/f/more')} backLabel="더보기" />
      <main id="main" className="mob-content">
        {!d.result ? <EmptyState icon={<Truck size={28} />} title="배정 전" body="배정 계산 뒤 미배정 인원 표시" /> : (
          <>
            <Card filled className="mob-hero">
              <p className="mob-t-foot">요청 전 미배정</p>
              <p className="mob-t-display">{u.total}<span className="mob-t-body">명</span></p>
            </Card>
            <List label="사유별 인원">
              {u.reasons.map((r) => <ListRow key={r.key} title={r.label} trailing={<span className="mob-t-body">{r.n}명</span>} />)}
            </List>
            <div className="mob-pad">
              <Button block variant="danger" disabled={!u.total} onClick={() => setOpen(true)}>동해소방서 지원 요청</Button>
            </div>
            <Section title="이송 실패 보고 대상자">
              {!failed.length ? <p className="mob-t-foot mob-pad">실패 보고 없음</p> : (
                <>
                  <List label="이송 실패 보고 대상자">
                    {failed.map((f) => <ListRow key={f.code} title={f.code} subtitle={[FAIL_REASONS[f.reason] || f.reason, f.memo].filter(Boolean).join(', ') || '사유 미기재'} meta={f.at ? `${hm(f.at)} 보고` : undefined} />)}
                  </List>
                  <div className="mob-pad"><Button block variant="danger-tonal" onClick={() => setOpenFail(true)}>실패 {failed.length}명 소방 인계</Button></div>
                </>
              )}
            </Section>
            <Section title="요청 기록">
              {!d.fireRequests?.length ? <p className="mob-t-foot mob-pad">요청 기록 없음</p> : (
                <List label="요청 기록">
                  {d.fireRequests.map((q, i) => (
                    <ListRow key={i} title={`${hm(q.at)} 요청 ${q.count}명`} subtitle={Object.entries(q.villages).map(([c, n]) => `${villageName(data.villages, c)} ${n}`).join(', ')} />
                  ))}
                </List>
              )}
            </Section>
          </>
        )}
      </main>
      <Dialog open={open} onClose={() => setOpen(false)} title={`미배정 ${u.total}명 지원 요청`} body="사유와 마을별 인원을 동해소방서 인계 기록으로 넘김. 콘솔 소방 인계 화면에도 같은 기록 표시"
        actions={<><Button variant="plain" onClick={() => setOpen(false)}>취소</Button><Button variant="danger" onClick={() => { const q = requestFireSupport(); toast(q ? `지원 요청 ${q.count}명 기록` : '요청할 미배정자 없음'); setOpen(false) }}>요청</Button></>} />
      <Dialog open={openFail} onClose={() => setOpenFail(false)} title={`실패 ${failed.length}명 소방 인계`} body="이송 실패로 보고된 대상자를 동해소방서 인계 기록으로 넘김. 콘솔 소방 인계 화면에도 같은 기록 표시"
        actions={<><Button variant="plain" onClick={() => setOpenFail(false)}>취소</Button><Button variant="danger" onClick={() => { handover(failed.map((f) => f.code)); toast(`실패 ${failed.length}명 소방 인계 기록`); setOpenFail(false) }}>인계</Button></>} />
    </>
  )
}

// F5 대상자 확인
export function FieldPeoplePage() {
  const data = useMiriStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const list = searchPersons(data.persons, data.villages, q)
  return (
    <>
      <AppBar title="대상자 확인" onBack={() => navigate('/m/f/more')} backLabel="더보기" />
      <main id="main" className="mob-content">
        <label className="mob-search">
          <Search size={20} aria-hidden="true" />
          <FilledInput type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="대상자 번호 또는 마을" aria-label="대상자 번호 또는 마을 검색" />
        </label>
        <p className="mob-t-foot mob-pad">{q ? `검색 결과 ${list.length}명` : '처음 50명'}, 이름은 화면에 두지 않음</p>
        {!list.length ? <EmptyState title="검색 결과 없음" body="번호 앞자리 또는 마을 이름으로 다시 검색" /> : (
          <List label="대상자 목록">
            {list.map((p) => (
              <ListRow key={p.code} title={p.code} subtitle={`${villageName(data.villages, p.villageCode)}, ${gradeOf(p.grade)?.label || '등급 확인'}${p.review === 'pending' ? ', 판독 확인 대기' : ''}`} chevron onClick={() => navigate(`/m/f/people/${p.code}`)} />
            ))}
          </List>
        )}
      </main>
    </>
  )
}

export function FieldPersonPage() {
  const { code } = useParams()
  const data = useMiriStore()
  const { d, vnow } = useDispatchLive()
  const navigate = useNavigate()
  const p = data.persons.find((x) => x.code === code)
  if (!p) return (<><AppBar title="대상자" onBack={() => navigate(-1)} /><main className="mob-content"><EmptyState title="대상자 없음" /></main></>)
  const care = personCare(p)
  const g = gradeOf(p.grade)
  const row = ACTIVE.has(d.status) ? villageProgress(d, [p], data.villages, vnow)[0]?.people[0] : null
  return (
    <>
      <AppBar title={p.code} onBack={() => navigate(-1)} />
      <main id="main" className="mob-content">
        <List label="이송">
          <ListRow title="이송 등급" subtitle={g ? `${g.label}, ${g.need}` : '등급 확인 필요'} />
          <ListRow title="마을" subtitle={villageName(data.villages, p.villageCode)} />
          <ListRow title="현재 단계" subtitle={row ? `${stepLabel(row.step)}${row.stop ? `, 차량 ${row.stop.vehicleCode}` : ''}${row.step === 'fail' ? `, ${FAIL_REASONS[d.events[p.code]?.reason] || ''}` : ''}` : '발령 없음'} />
        </List>
        <Section title="동행과 소통">
          <List label="동행과 소통">
            <ListRow title="평소 돌봄 담당자" subtitle={`${care.caregiverType}, ${care.reachableLabel}`} trailing={care.companionCall ? <Chip tone="blue">동행 연락</Chip> : null} />
            <ListRow title="의사소통" subtitle={care.comm.length ? care.comm.join(', ') : care.known ? '특이 없음' : '확인 필요'} trailing={care.commCaution ? <Chip>유의</Chip> : null} />
            <ListRow title="보조기구" subtitle={care.aids.length ? care.aids.join(', ') : care.known ? '없음' : '확인 필요'} />
          </List>
        </Section>
        <p className="mob-t-foot mob-pad">경로 확인 표시는 {ROUTE_NOTE}</p>
      </main>
    </>
  )
}

// F6 서류 사진 판독 요청. 콘솔 서류 읽기와 같은 형태로 확인 대기 서류에 저장
function VillagePicker({ villages, value, onChange }) {
  const [open, setOpen] = useState(false)
  const cur = villages.find((v) => v.code === value)
  return (
    <>
      <ListRow title="마을" subtitle={cur ? (cur.label || cur.name) : '서류의 마을 선택'} chevron onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title="마을 선택">
        <div className="mob-sheet-scroll">
          <List label="마을 목록">
            {villages.map((v) => <ListRow key={v.code} title={v.label || v.name} trailing={v.code === value ? <Chip tone="blue">선택</Chip> : null} onClick={() => { onChange(v.code); setOpen(false) }} />)}
          </List>
        </div>
      </Sheet>
    </>
  )
}

export function FieldIntakePage() {
  const navigate = useNavigate()
  const data = useMiriStore()
  const addIntakeDoc = useMiriStore((s) => s.addIntakeDoc)
  const nextDocId = useMiriStore((s) => s.nextDocId)
  const toast = useMobileToast()
  const fileRef = useRef(null)
  const [agree, setAgree] = useState(false)
  const [villageCode, setVillageCode] = useState('')
  const [state, setState] = useState({ phase: 'idle' })
  const run = async (file) => {
    if (!file) return
    const req = { village: villageCode } // GPT 8차 H3와 같은 원인: 판독 중 마을을 바꿔도 요청 당시 마을로 저장
    setState({ phase: 'loading', req })
    try {
      const page = await readDocument(file)
      setState({ phase: 'done', page, file, req })
    } catch (e) {
      setState({ phase: 'error', err: aiErrorMessage(e, '서류'), req })
    }
  }
  const save = () => {
    const villageCode = state.req?.village
    if (!villageCode || !state.page) return
    const used = new Set(data.persons.map((p) => p.code))
    const codes = []
    for (let k = 301; codes.length < state.page.persons.length; k += 1) { const c = `${villageCode}-${k}`; if (!used.has(c)) codes.push(c) }
    const vname = villageName(data.villages, villageCode)
    addIntakeDoc({ id: nextDocId(), kind: 'plan', name: `${vname} 대피계획서 (휴대폰 촬영)`, villageCode, image: URL.createObjectURL(state.file), uploadedAt: Date.now(), status: 'pending', transcript: state.page.transcript, results: state.page.persons.map((r, i) => ({ ...r, personCode: codes[i] })) })
    toast(`확인 대기 서류 저장, ${state.page.persons.length}명`)
    setState({ phase: 'idle' })
  }
  return (
    <>
      <AppBar title="서류 판독" onBack={() => navigate('/m/f/more')} backLabel="더보기" />
      <main id="main" className="mob-content">
        <List label="판독 전 확인">
          <VillagePicker villages={data.villages} value={villageCode} onChange={setVillageCode} />
          {/* 행 전체가 체크 영역(GPT 9차 M5): label 로 감싸 최소 터치 높이 이상, 글자를 눌러도 체크 */}
          <li>
            <label className="mob-row tall mob-check-row">
              <span className="mob-row-main">
                <span className="mob-t-body">가상 자료만 올림</span>
                <span className="mob-t-sub">실제 주민 서류 업로드 금지</span>
              </span>
              <span className="mob-row-trail"><input type="checkbox" className="mob-check" checked={agree} onChange={(e) => setAgree(e.target.checked)} /></span>
            </label>
          </li>
          <ListRow title="처리 위치" subtitle="국내 CLOVA OCR 글자 읽기, 이름과 연락처 가림 뒤 HyperCLOVA X 등급 초안, 서울 처리" />
        </List>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" capture="environment" hidden onChange={(e) => { run(e.target.files?.[0]); e.target.value = '' }} />
        <div className="mob-pad">
          <Button block disabled={!agree || !villageCode || state.phase === 'loading'} onClick={() => fileRef.current?.click()}><Camera size={20} aria-hidden="true" />사진 찍기 또는 고르기</Button>
        </div>
        {state.phase === 'loading' && <div className="mob-pad mob-inline"><Spinner label="판독 중" /><span className="mob-t-body">판독 중, 보통 5초 안팎</span></div>}
        {state.phase === 'error' && <Banner tone="red"><span><strong>{state.err.title}</strong><br />{state.err.desc}</span></Banner>}
        {state.phase === 'done' && (
          <Section title={`판독 결과 ${state.page.persons.length}명`}>
            <List label="판독 결과">
              {state.page.persons.map((r, i) => (
                <ListRow key={i} title={gradeOf(r.grade)?.label || '등급 확인 필요'} subtitle={`${r.gradeUncertain ? '확인 필요. 침상 가능성 담당자 확인. ' : ''}근거: ${r.quote || '없음'}`} meta={r.quoteMatched ? '근거 원문 대조 통과' : '원문 불일치, 원본 직접 확인'}
                  trailing={<Chip tone={r.quoteMatched ? 'blue' : 'red'}>{r.quoteMatched ? '일치' : '불일치'}</Chip>} />
              ))}
            </List>
            <div className="mob-pad mob-row-buttons">
              <Button variant="gray" onClick={() => setState({ phase: 'idle' })}>제외</Button>
              <Button onClick={save}>확인 대기로 저장</Button>
            </div>
            <p className="mob-t-foot mob-pad">등급 확정은 콘솔 서류 읽기에서 원본 대조 뒤 진행</p>
          </Section>
        )}
      </main>
    </>
  )
}

// F7 현장 소식 보내기. 콘솔 현장 소식과 같은 형태로 확인 대기 소식에 저장
export function FieldNotePage() {
  const navigate = useNavigate()
  const data = useMiriStore()
  const addFieldNote = useMiriStore((s) => s.addFieldNote)
  const nextNoteId = useMiriStore((s) => s.nextNoteId)
  const toast = useMobileToast()
  const [code, setCode] = useState('')
  const [text, setText] = useState('')
  const [mode, setMode] = useState('text')
  const [sheet, setSheet] = useState(false)
  const [state, setState] = useState({ phase: 'idle' })
  const fileRef = useRef(null)
  const person = data.persons.find((p) => p.code === code.trim().toUpperCase())
  const reqSeq = useRef(0)
  const send = async (file) => {
    if (!person) { toast('대상자 번호 확인 필요'); return }
    // GPT 8차 H3: 요청 시작 시 대상자, 마을, 현재 값, 방식, 글을 한 요청 객체로 고정. 결과와 저장 모두 이 객체만 사용
    const req = { id: ++reqSeq.current, personCode: person.code, villageCode: person.villageCode, current: { grade: person.grade, tags: [...(person.tags || [])] }, mode, text: text.trim() }
    setState({ phase: 'loading', req })
    try {
      const read = await readNote({ text: file ? undefined : req.text, file: file || undefined, current: req.current })
      if (req.id !== reqSeq.current) return // 늦게 온 이전 요청 응답은 버림
      setState({ phase: 'done', read, file, req })
      setSheet(true)
    } catch (e) {
      if (req.id !== reqSeq.current) return
      setState({ phase: 'error', err: aiErrorMessage(e, '소식'), req })
    }
  }
  const keep = () => {
    const { read, file, req } = state
    if (!req || !read) return
    addFieldNote({ id: nextNoteId(), personCode: req.personCode, villageCode: req.villageCode, source: 'dong', status: 'pending', receivedAt: Date.now(), current: req.current, mode: req.mode, fileName: file?.name || '', text: read.transcript || req.text, read, mock: false })
    toast(`${req.personCode} 확인 대기 소식으로 저장`)
    setSheet(false); setText(''); setState({ phase: 'idle' })
  }
  const r = state.read
  return (
    <>
      <AppBar title="현장 소식" onBack={() => navigate('/m/f/more')} backLabel="더보기" />
      <main id="main" className="mob-content">
        <List label="대상자">
          <ListRow title="대상자 번호" subtitle={person ? `${villageName(data.villages, person.villageCode)}, 현재 ${gradeOf(person.grade)?.label || '등급 확인'}` : '예: MS-04-014'}
            trailing={<FilledInput className="mob-input" value={code} onChange={(e) => setCode(e.target.value)} disabled={state.phase === 'loading'} aria-label="대상자 번호" placeholder="번호" autoCapitalize="characters" />} />
        </List>
        <div className="mob-pad"><Segmented label="보내는 방식" value={mode} onChange={setMode} options={[{ value: 'text', label: '글' }, { value: 'voice', label: '음성 메모' }]} /></div>
        {mode === 'text' ? (
          <div className="mob-pad mob-stack">
            <FilledTextarea className="mob-textarea" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 지난주부터 보행기 없이 걷기 어려움" aria-label="현장 소식" />
            <Button block disabled={!person || !text.trim() || state.phase === 'loading'} onClick={() => send(null)}><Send size={20} aria-hidden="true" />판독 요청</Button>
          </div>
        ) : (
          <div className="mob-pad mob-stack">
            <input ref={fileRef} type="file" accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a" hidden onChange={(e) => { send(e.target.files?.[0]); e.target.value = '' }} />
            <Button block disabled={!person || state.phase === 'loading'} onClick={() => fileRef.current?.click()}>음성 파일 고르기</Button>
            <p className="mob-t-foot">wav, mp3, m4a. 국내 CLOVA Speech 받아쓰기</p>
          </div>
        )}
        {state.phase === 'loading' && <div className="mob-pad mob-inline"><Spinner label="판독 중" /><span className="mob-t-body">판독 중</span></div>}
        {state.phase === 'error' && <Banner tone="red"><span><strong>{state.err.title}</strong><br />{state.err.desc}</span></Banner>}
        <p className="mob-t-foot mob-pad">이름과 연락처 가림 뒤 판독. 명부 반영은 담당자 확인 뒤</p>
      </main>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="판독 결과 확인">
        {r && (
          <>
            <List label="판독 결과">
              <ListRow title="등급" subtitle={r.diff?.gradeChanged ? `${gradeOf(state.req?.current?.grade)?.label} → ${gradeOf(r.diff.next.grade)?.label}` : '등급 변경 없음'} />
              <ListRow title="근거" subtitle={r.quote || '없음'} meta={r.quoteMatched ? '원문 대조 통과' : '원문 불일치, 직접 확인'} />
            </List>
            <div className="mob-row-buttons mob-top-16">
              <Button variant="gray" onClick={() => setSheet(false)}>닫기</Button>
              <Button onClick={keep}>확인 대기로 저장</Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}

function NoDispatch({ title, body }) {
  const navigate = useNavigate()
  return (
    <>
      <AppBar title={title} large />
      <main id="main" className="mob-content">
        <EmptyState icon={<UserCheck size={28} />} title="진행 중인 발령 없음" body={body || '발령 개시 뒤 자동 표시'} action={<Button variant="tonal" onClick={() => navigate('/m/f')}>평시 현황</Button>} />
      </main>
    </>
  )
}

// 더보기: 현장 업무 목록
export function FieldMorePage() {
  const navigate = useNavigate()
  const d = useDispatchStore()
  const u = unservedByReason(d)
  return (
    <>
      <AppBar title="더보기" large />
      <main id="main" className="mob-content">
        <List label="현장 업무">
          <ListRow lead={<Siren size={22} />} title="미배정과 소방 지원 요청" subtitle={d.result ? `요청 전 미배정 ${u.total}명` : '배정 뒤 표시'} chevron onClick={() => navigate('/m/f/fire')} />
          <ListRow lead={<UserCheck size={22} />} title="대상자 확인" subtitle="대상자 번호로 등급, 동행, 상태 확인" chevron onClick={() => navigate('/m/f/people')} />
          <ListRow lead={<Camera size={22} />} title="서류 사진 판독" subtitle="국내 AI 판독과 원문 대조" chevron onClick={() => navigate('/m/f/intake')} />
          <ListRow lead={<MessageSquare size={22} />} title="현장 소식 보내기" subtitle="글 또는 음성 메모" chevron onClick={() => navigate('/m/f/note')} />
        </List>
        <h2 className="mob-t-label mob-section-title">화면 설정</h2>
        <DisplaySettings />
      </main>
    </>
  )
}

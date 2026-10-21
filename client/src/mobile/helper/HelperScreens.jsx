// 도우미 모바일 화면 H0~H9(docs/MOBILE_UI.md 4-2). 같은 화면 구조를 iOS와 Material 3 부품(ui.jsx)으로 그린다.
// iOS: 큰 제목, 그룹 inset 목록, 하단 고정 버튼, 시트와 alert. Android: top app bar, list item, filled와 tonal 버튼, bottom sheet, snackbar.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, CircleX, Clock, CloudOff, Link2Off, MapPin, Phone, RefreshCw, Send, ShieldCheck, Truck, Users } from 'lucide-react'
import { radioProps, AppBar, Banner, Button, Card, Chip, Dialog, EmptyState, List, ListRow, Progress, Sheet, Spinner, Toggle, DisplaySettings, useMobileToast } from '../ui.jsx'
import { usePlatform } from '../usePlatform.js'
import { fmtHM } from '../../lib/time.js'
import { CONSENT_KEY, DECLINE_REASONS_M, FAIL_REASONS_M, NEXT_STEP, STEP_LABEL, STEP_ORDER, lastAck, progressOf, remainText, screenOf, stepsByPerson, telOf } from './flow.js'
import { startDemoDispatch, useDemoModel, useRemoteModel } from './useHelperModel.js'
import './helper.css'

const readConsent = (k) => { try { return localStorage.getItem(CONSENT_KEY + k) === '1' } catch { return false } }
const writeConsent = (k) => { try { localStorage.setItem(CONSENT_KEY + k, '1') } catch { /* 저장 불가 브라우저는 이번 화면에서만 */ } }

function Bottom({ children }) { return <div className="mob-h-bottom">{children}</div> }

function KV({ rows }) {
  return (
    <List>
      {rows.filter(Boolean).map((r) => <ListRow key={r.label} title={r.label} trailing={<span className="mob-h-kv">{r.value}</span>} />)}
    </List>
  )
}

function Deadline({ m }) {
  const r = remainText(m.completeBy, m.now)
  return (
    <Card filled className="mob-h-deadline">
      <p className="mob-t-label">이송 완료 기한</p>
      <p className="mob-h-time">{m.completeBy ? `${fmtHM(m.completeBy)}까지` : '담당자 확인'}</p>
      {r && <p className={`mob-t-sub ${r.over ? 'mob-h-over' : ''}`} role="timer">{r.text}</p>}
      {/* GPT 8차 M7: 매 분 낭독하지 않고 의미 있는 전환(30분 이내, 기한 지남)만 알림 */}
      <p className="mob-sr" aria-live="polite">{r ? (r.over ? '이송 완료 기한 지남' : r.min <= 30 ? '이송 완료 기한 30분 이내' : '') : ''}</p>
    </Card>
  )
}

// H0 첫 사용 안내와 동의
function H0({ m, onDone }) {
  const [role, setRole] = useState(false)
  const [cpr, setCpr] = useState(false)
  return (
    <>
      <AppBar title="미리 도우미" large />
      <main id="main" className="mob-content no-nav">
        <Banner tone="blue" icon={<ShieldCheck size={20} aria-hidden="true" />}>문자 링크로 열린 화면. 앱 설치와 로그인 없음</Banner>
        <p className="mob-t-body mob-h-lead">혼자 대피하기 어려운 이웃을 대피소까지 함께 옮기는 배정이에요. {m.drill ? '이번 배정은 훈련이에요.' : ''}</p>
        <p className="mob-t-label mob-section-title">이 화면에서 보는 정보</p>
        <List>
          <ListRow title="배정된 대상자만" subtitle="다른 대상자와 명부 전체는 보이지 않음" />
          <ListRow title="발령 종료 뒤 삭제" subtitle="배정 정보와 연락처는 발령이 끝나면 지움" />
          <ListRow title="보고는 담당자에게만" subtitle="출발, 도착, 탑승, 인계, 실패 기록" />
        </List>
        <p className="mob-t-label mob-section-title">확인</p>
        <List>
          <ListRow title="차량 동행 역할 확인" subtitle="대상자와 같은 차량으로 이동" trailing={<Toggle label="차량 동행 역할 확인" checked={role} onChange={setRole} />} />
          <ListRow title="기본소생술 교육과 상해보험" subtitle="모르면 담당자에게 문의" trailing={<Toggle label="기본소생술 교육과 상해보험 확인" checked={cpr} onChange={setCpr} />} />
        </List>
        <p className="mob-t-label mob-section-title">화면 설정</p>
        <DisplaySettings />
      </main>
      <Bottom><Button block disabled={!role} onClick={onDone}>확인하고 배정 보기</Button></Bottom>
    </>
  )
}

// H1 배정 알림
function H1({ m, onDecline }) {
  const toast = useMobileToast()
  return (
    <>
      <AppBar title="배정 알림" large />
      <main id="main" className="mob-content no-nav">
        <div className="mob-h-chips">
          <Chip tone="red">{m.disaster} 대피 이송</Chip>
          {m.drill && <Chip>훈련</Chip>}
          <Chip>도우미 {m.helper}</Chip>
        </div>
        <Banner tone="blue">참여 의무는 없습니다. 불가를 누르면 다른 도우미에게 배정을 넘깁니다.</Banner>
        <Deadline m={m} />
        <KV rows={[
          { label: '마을', value: m.villages.join(', ') || '-' },
          { label: '만나는 곳', value: m.meetPlace },
          { label: '차량', value: m.vehicle },
          { label: '동승 도우미', value: m.coHelpers.length ? m.coHelpers.join(', ') : '없음' },
          { label: '대상', value: `${m.codes.length}명, ${m.trips.length}회차` },
          { label: '첫 출발', value: m.trips[0]?.departAt ? fmtHM(m.trips[0].departAt) : '-' }
        ]} />
        {m.notes.length > 0 && (
          <>
            <p className="mob-t-label mob-section-title">확인할 점</p>
            <List>{m.notes.map((n) => <ListRow key={n} lead={<AlertTriangle size={20} />} title={n} />)}</List>
          </>
        )}
      </main>
      <Bottom>
        <Button block onClick={() => { m.ack('accept'); toast('수락했어요. 첫 대상자부터 진행해요.') }}>수락</Button>
        <Button block variant="gray" onClick={onDecline}>불가</Button>
      </Bottom>
    </>
  )
}

// H2 불가 사유
function H2({ m, onBack }) {
  const [reason, setReason] = useState(null)
  const [memo, setMemo] = useState('')
  return (
    <>
      <AppBar title="불가 사유" onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <p className="mob-t-sub mob-h-lead">사유를 고르면 담당자가 다른 도우미를 배정해요.</p>
        <div className="mob-h-chips" role="radiogroup" aria-label="불가 사유">
          {Object.entries(DECLINE_REASONS_M).map(([k, v]) => <Chip key={k} role="radio" aria-checked={reason === k} aria-pressed={undefined} selected={reason === k} onClick={() => setReason(k)} {...radioProps(Object.keys(DECLINE_REASONS_M), reason, setReason, k)}>{v}</Chip>)}
        </div>
        <label className="mob-h-field"><span className="mob-t-label">메모(선택)</span>
          <textarea rows={3} maxLength={200} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="담당자에게 전할 말" />
        </label>
      </main>
      <Bottom><Button block variant="danger" disabled={!reason} onClick={() => m.ack('decline', reason, memo)}>불가 전송</Button></Bottom>
    </>
  )
}

// H3 이송 목록(홈)
function H3({ m, steps, go }) {
  const p = progressOf(m.codes, steps)
  return (
    <>
      <AppBar title="이송 목록" large trailing={<button type="button" className="mob-icon-btn" aria-label="연락" onClick={() => go({ name: 'H7' })}><Phone size={22} aria-hidden="true" /></button>} />
      <main id="main" className="mob-content no-nav">
        <Deadline m={m} />
        <div className="mob-h-progress">
          <span className="mob-t-label">완료 {p.done}명, 실패 {p.failed}명, 전체 {p.total}명</span>
          <Progress value={p.total ? ((p.done + p.failed) / p.total) * 100 : 0} label="이송 진행" />
        </div>
        {m.pending > 0 && <Button variant="tonal" block onClick={() => go({ name: 'H8' })}><CloudOff size={18} aria-hidden="true" />전송 대기 {m.pending}건</Button>}
        {m.trips.map((t) => (
          <section key={t.index}>
            <p className="mob-t-label mob-section-title">{t.index}회차, {t.village}, 출발 {fmtHM(t.departAt)}</p>
            <List>
              {t.personCodes.map((c, i) => {
                const st = steps[c] || 'wait'
                const isCurrent = c === p.current
                return (
                  <ListRow key={c} onClick={() => go({ name: isCurrent ? 'H5' : 'H4', code: c })} chevron
                    lead={<span className={`mob-h-order ${isCurrent ? 'now' : ''}`}>{i + 1}</span>}
                    title={c}
                    subtitle={isCurrent ? `지금 차례, ${STEP_LABEL[st]}` : STEP_LABEL[st]}
                    meta={t.routeCheck ? '경로 확인 필요(직선 기준, 도로 경로 아님)' : undefined}
                    trailing={st === 'handover' ? <CheckCircle2 size={20} aria-label="인계 완료" /> : st === 'fail' ? <CircleX size={20} aria-label="이송 실패" /> : null} />
                )
              })}
            </List>
          </section>
        ))}
      </main>
      {p.current && <Bottom><Button block onClick={() => go({ name: 'H5', code: p.current })}>{p.current} {NEXT_STEP[steps[p.current] || 'wait']?.label || '보고'}</Button></Bottom>}
    </>
  )
}

// H4 대상자 상세
function H4({ m, code, steps, go, onBack }) {
  const d = m.detail(code)
  const st = steps[code] || 'wait'
  return (
    <>
      <AppBar title={code} onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <div className="mob-h-chips"><Chip>{STEP_LABEL[st]}</Chip>{d?.grade && <Chip tone="blue">{d.grade}</Chip>}</div>
        {!d && <Banner tone="gray" icon={<ShieldCheck size={20} aria-hidden="true" />}>이름, 주소, 건강 정보는 휴대폰으로 보내지 않음. 담당자 문자와 현장에서 확인</Banner>}
        {d && (
          <>
            {d.routeCheck && <Banner tone="red" icon={<MapPin size={20} aria-hidden="true" />}>경로 확인 필요. 마을과 대피소를 잇는 직선이 산불 영향 범위를 지남(도로 경로 아님)</Banner>}
            <p className="mob-t-label mob-section-title">동행과 소통</p>
            <KV rows={[
              { label: '평소 돌봄 담당자', value: d.care.caregiverType },
              { label: '연락', value: d.care.reachableLabel },
              { label: '의사소통', value: d.care.comm.length ? d.care.comm.join(', ') : '특이 없음' },
              { label: '보조기구', value: d.care.aids.length ? d.care.aids.join(', ') : '없음' }
            ]} />
            {d.care.companionCall && <Banner tone="blue" icon={<Phone size={20} aria-hidden="true" />}>출발 전에 평소 돌봄 담당자에게 연락</Banner>}
            <p className="mob-t-label mob-section-title">대피소</p>
            <KV rows={[{ label: '도착', value: d.shelter }, { label: '리프트 차량 진입', value: d.lift }, { label: '야간과 휴일 개방', value: d.night }]} />
          </>
        )}
      </main>
      {!['handover', 'fail', 'handedToFire'].includes(st) && <Bottom><Button block onClick={() => go({ name: 'H5', code })}>단계 보고</Button></Bottom>}
    </>
  )
}

// H5 단계 보고
function H5({ m, code, steps, go, onBack }) {
  const toast = useMobileToast()
  const st = steps[code] || 'wait'
  const next = NEXT_STEP[st]
  const [confirm, setConfirm] = useState(false)
  const [care, setCare] = useState({ symptomAt: '', observation: '', action: '' })
  const idx = STEP_ORDER.indexOf(st)
  const submit = () => {
    const hasCare = care.observation || care.action || care.symptomAt
    m.step(code, next.step, hasCare && next.step === 'handover' ? { care } : {})
    setConfirm(false)
    toast(`${code} ${next.label} 보고`)
    if (next.step === 'handover') onBack()
  }
  return (
    <>
      <AppBar title={`${code} 보고`} onBack={onBack} trailing={<button type="button" className="mob-icon-btn" aria-label="대상자 상세" onClick={() => go({ name: 'H4', code })}><Users size={22} aria-hidden="true" /></button>} />
      <main id="main" className="mob-content no-nav">
        <ol className="mob-h-steps" aria-label="이송 단계">
          {STEP_ORDER.slice(1).map((s, i) => (
            <li key={s} className={i + 1 <= idx ? 'done' : i + 1 === idx + 1 ? 'next' : ''}>
              <span className="mob-h-dot" aria-hidden="true">{i + 1 <= idx ? <CheckCircle2 size={18} /> : i + 1}</span>
              <span className="mob-t-body">{STEP_LABEL[s] === '인계 완료' ? '대피소 인계' : STEP_LABEL[s]}</span>
            </li>
          ))}
        </ol>
        {!next && <EmptyState icon={<CheckCircle2 size={28} />} title="이 대상자 보고 끝" body={STEP_LABEL[st]} />}
      </main>
      {next && (
        <Bottom>
          <Button block className="mob-h-big" onClick={() => setConfirm(true)}>{next.label}</Button>
          <Button block variant="danger-tonal" onClick={() => go({ name: 'H6', code })}>이송 실패 보고</Button>
        </Bottom>
      )}
      <Sheet open={confirm} onClose={() => setConfirm(false)} title={`${next?.label || ''} 보고`}>
        <p className="mob-t-sub">{code} 대상자를 {next?.label} 처리해요. 연결이 끊기면 휴대폰에 보관했다가 다시 보내요.</p>
        {next?.step === 'handover' && (
          <div className="mob-h-care">
            <p className="mob-t-label">인계 기록(선택, 소방과 대피소에 전달)</p>
            <label className="mob-h-field"><span className="mob-t-label">증상 시각</span><input type="time" value={care.symptomAt} onChange={(e) => setCare({ ...care, symptomAt: e.target.value })} /></label>
            <label className="mob-h-field"><span className="mob-t-label">관찰 내용</span><textarea rows={2} maxLength={200} value={care.observation} onChange={(e) => setCare({ ...care, observation: e.target.value })} /></label>
            <label className="mob-h-field"><span className="mob-t-label">수행한 조치</span><textarea rows={2} maxLength={200} value={care.action} onChange={(e) => setCare({ ...care, action: e.target.value })} /></label>
          </div>
        )}
        <div className="mob-h-sheet-actions">
          <Button block onClick={submit}>{next?.label} 보고</Button>
          <Button block variant="plain" onClick={() => setConfirm(false)}>취소</Button>
        </div>
      </Sheet>
    </>
  )
}

// H6 실패 보고
function H6({ m, code, onBack, onDone }) {
  const toast = useMobileToast()
  const [reason, setReason] = useState(null)
  const [memo, setMemo] = useState('')
  const [ask, setAsk] = useState(false)
  return (
    <>
      <AppBar title="이송 실패 보고" onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <p className="mob-t-sub mob-h-lead">{code} 대상자. 실패로 보고하면 담당자 휴대폰의 소방 지원 요청 화면에 실패 대상자로 올라가요.</p>
        <div className="mob-h-chips" role="radiogroup" aria-label="실패 사유">
          {Object.entries(FAIL_REASONS_M).map(([k, v]) => <Chip key={k} role="radio" aria-checked={reason === k} aria-pressed={undefined} selected={reason === k} onClick={() => setReason(k)} {...radioProps(Object.keys(FAIL_REASONS_M), reason, setReason, k)}>{v}</Chip>)}
        </div>
        <label className="mob-h-field"><span className="mob-t-label">메모(선택)</span><textarea rows={3} maxLength={200} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="현장 상황" /></label>
      </main>
      <Bottom><Button block variant="danger" disabled={!reason} onClick={() => setAsk(true)}>실패 보고</Button></Bottom>
      <Dialog open={ask} onClose={() => setAsk(false)} title="이송 실패로 보고할까요?" body={`${code}, ${FAIL_REASONS_M[reason] || ''}. 다음 대상자로 넘어가요.`} actions={
        <>
          <Button variant="plain" onClick={() => setAsk(false)}>취소</Button>
          <Button variant="plain" className="mob-h-danger-text" onClick={() => { m.step(code, 'fail', { reason, memo }); setAsk(false); toast(`${code} 실패 보고`); onDone() }}>보고</Button>
        </>
      } />
    </>
  )
}

// H7 연락
function H7({ m, onBack }) {
  const officerTel = telOf(m.officerContact)
  return (
    <>
      <AppBar title="연락" onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <List>
          <ListRow lead={<Phone size={20} />} title="119" subtitle="생명이 위급할 때" href="tel:119" chevron />
          <ListRow lead={<Phone size={20} />} title="발령 담당자" subtitle={m.officerContact} href={officerTel || undefined} chevron={!!officerTel}
            trailing={officerTel ? null : <span className="mob-t-foot">번호 없음, 문자로 회신</span>} />
          {m.coHelpers.map((h) => <ListRow key={h} lead={<Users size={20} />} title={`동승 도우미 ${h}`} subtitle="차량에서 만남, 번호는 담당자 문자로 안내" />)}
        </List>
        {m.demo && (() => {
          const g = m.codes.map((c) => ({ c, d: m.detail(c) })).filter((x) => x.d?.care?.companionCall && x.d.guardianPhone)
          return g.length > 0 && (
            <>
              <p className="mob-t-label mob-section-title">평소 돌봄 담당자(연락 가능)</p>
              <List>{g.map(({ c, d }) => <ListRow key={c} lead={<Phone size={20} />} title={c} subtitle={d.care.caregiverType} href={`tel:${d.guardianPhone}`} chevron />)}</List>
            </>
          )
        })()}
      </main>
    </>
  )
}

// H8 전송 대기
function H8({ m, onBack }) {
  const toast = useMobileToast()
  const [busy, setBusy] = useState(false)
  return (
    <>
      <AppBar title="전송 대기" onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <p className="mob-t-sub mob-h-lead">{m.lastOk ? `마지막 연결 ${fmtHM(m.lastOk)}` : '아직 연결 기록 없음'}</p>
        {m.queue.length === 0 ? <EmptyState icon={<Send size={28} />} title="보낼 보고 없음" body="모든 보고를 담당자에게 보냈어요." /> : (
          <List>{m.queue.map((q) => <ListRow key={q.key} lead={<Clock size={20} />} title={q.type === 'ack' ? (q.answer === 'accept' ? '수락' : '불가') : `${q.personCode} ${STEP_LABEL[q.step] || q.step}`} subtitle="전송 대기" />)}</List>
        )}
        {/* GPT 8차 H1: 서버가 받지 않은 보고는 지우지 않고 사유와 함께 남김. 담당자에게 전화로 알림 */}
        {m.rejected?.length > 0 && (
          <List label="보내지 못한 보고">{m.rejected.map((q) => <ListRow key={q.key} lead={<CircleX size={20} />} title={q.type === 'ack' ? (q.answer === 'accept' ? '수락' : '불가') : `${q.personCode} ${STEP_LABEL[q.step] || q.step}`} subtitle={`보내지 못함: ${q.rejected}. 담당자에게 전화로 알림`} />)}</List>
        )}
      </main>
      {m.queue.length > 0 && <Bottom><Button block disabled={busy} onClick={async () => { setBusy(true); const r = await m.resend(); setBusy(false); toast(r.left ? `아직 ${r.left}건 대기, 연결되면 자동 전송` : '모두 보냈어요') }}><RefreshCw size={18} aria-hidden="true" />다시 보내기</Button></Bottom>}
    </>
  )
}

// H9 끝과 기록
function H9({ m, steps, declined }) {
  const p = progressOf(m.codes, steps)
  const ackR = lastAck(m.reports)
  const done = m.reports.filter((r) => r.type === 'step' && (r.step === 'handover' || r.step === 'fail')).sort((a, b) => (a.at || 0) - (b.at || 0))
  if (declined) {
    return (
      <>
        <AppBar title="불가 응답" large />
        <main id="main" className="mob-content no-nav">
          <EmptyState icon={<CircleX size={28} />} title="불가 응답을 보냈어요" body={`사유: ${DECLINE_REASONS_M[ackR?.reason] || '기타'}. 담당자가 다른 도우미를 배정해요.`} />
          {m.pending > 0 && <Banner tone="red" icon={<CloudOff size={20} aria-hidden="true" />}>전송 대기 {m.pending}건. 연결되면 자동 전송</Banner>}
        </main>
      </>
    )
  }
  return (
    <>
      <AppBar title="이송 끝" large />
      <main id="main" className="mob-content no-nav">
        <Card filled className="mob-h-deadline">
          <p className="mob-t-label">결과</p>
          <p className="mob-h-time">완료 {p.done}명, 실패 {p.failed}명</p>
          <p className="mob-t-sub">대피소에서 대기하며 담당자 안내를 확인해 주세요.</p>
        </Card>
        <p className="mob-t-label mob-section-title">기록</p>
        <List>{done.map((r) => <ListRow key={`${r.personCode}${r.step}`} title={r.personCode} subtitle={STEP_LABEL[r.step]} trailing={<span className="mob-h-kv">{r.at ? fmtHM(r.at) : ''}</span>} />)}</List>
        {m.pending > 0 && <Banner tone="red" icon={<CloudOff size={20} aria-hidden="true" />}>전송 대기 {m.pending}건. 연결되면 자동 전송</Banner>}
      </main>
    </>
  )
}

function Notice({ icon, title, body, action }) {
  return <main id="main" className="mob-content no-nav mob-h-notice"><EmptyState icon={icon} title={title} body={body} action={action} /></main>
}

function Flow({ m, consentKey }) {
  const [consented, setConsented] = useState(() => readConsent(consentKey))
  const [declining, setDeclining] = useState(false)
  const [stack, setStack] = useState([])
  const steps = stepsByPerson(m.codes, m.reports)
  const ackR = lastAck(m.reports)
  const finished = progressOf(m.codes, steps).finished
  const base = screenOf({ consented, ack: ackR, finished, declining })
  const view = base === 'H3' ? stack[stack.length - 1] : null
  const go = (v) => setStack((s) => [...s, v])
  const back = () => setStack((s) => s.slice(0, -1))
  useEffect(() => { if (ackR) setDeclining(false) }, [ackR])
  useEffect(() => { window.scrollTo(0, 0) }, [base, view?.name, view?.code])

  if (base === 'H0') return <H0 m={m} onDone={() => { writeConsent(consentKey); setConsented(true) }} />
  if (base === 'H1') return <H1 m={m} onDecline={() => setDeclining(true)} />
  if (base === 'H2') return <H2 m={m} onBack={() => setDeclining(false)} />
  if (base === 'H9') return <H9 m={m} steps={steps} declined={ackR?.answer === 'decline'} />
  if (view?.name === 'H4') return <H4 m={m} code={view.code} steps={steps} go={go} onBack={back} />
  if (view?.name === 'H5') return <H5 m={m} code={view.code} steps={steps} go={go} onBack={back} />
  if (view?.name === 'H6') return <H6 m={m} code={view.code} onBack={back} onDone={() => setStack((s) => s.filter((x) => x.code !== view.code))} />
  if (view?.name === 'H7') return <H7 m={m} onBack={back} />
  if (view?.name === 'H8') return <H8 m={m} onBack={back} />
  return <H3 m={m} steps={steps} go={go} />
}

function DemoHelper() {
  const m = useDemoModel()
  useEffect(() => { document.title = '도우미 배정 | 미리' }, [])
  const start = <Button block onClick={startDemoDispatch}>시연 발령 시작</Button>
  if (m.phase === 'idle') return <Notice icon={<Truck size={28} />} title="배정 대기 중" body="발령이 내려지면 문자와 이 화면으로 알려 드려요." action={start} />
  if (m.phase === 'preparing') return <Notice icon={<Spinner />} title="배정 준비 중" body="배정이 전송되면 이 화면에 표시돼요." />
  if (m.phase === 'closed') return <Notice icon={<CheckCircle2 size={28} />} title="발령이 끝났어요" body="배정 정보와 연락처를 지웠어요." action={start} />
  if (m.phase === 'none') return <Notice icon={<CircleX size={28} />} title="이번 발령에 배정 없음" body="담당자 연락을 기다려 주세요." />
  return <Flow m={m} consentKey="demo" />
}

function RemoteHelperM({ token }) {
  const m = useRemoteModel(token)
  useEffect(() => { document.title = '도우미 배정 | 미리' }, [])
  if (m.phase === 'loading') return <Notice icon={<Spinner />} title="배정 정보 불러오는 중" />
  if (m.phase === 'error') {
    const s = screenOf({ error: m.error })
    if (s === 'closed') return <Notice icon={<CheckCircle2 size={28} />} title="발령이 끝났어요" body="배정 정보와 연락처를 지웠어요." />
    if (s === 'expired') return <Notice icon={<Link2Off size={28} />} title="열 수 없는 링크" body="링크가 만료되었거나 다른 도우미로 바뀌었어요. 담당자에게 새 링크를 요청해 주세요." />
    return <Notice icon={<CloudOff size={28} />} title="연결할 수 없음" body="잠시 뒤 다시 시도해 주세요." action={<Button block onClick={() => window.location.reload()}>다시 시도</Button>} />
  }
  return <Flow m={m} consentKey={String(token).split('.').slice(0, 2).join('.')} />
}

export default function MobileHelperPage() {
  const { token } = useParams()
  const { platform } = usePlatform()
  return <div data-screen-platform={platform} className="mob-h-wrap">{!token || token === 'demo' ? <DemoHelper /> : <RemoteHelperM token={token} />}</div>
}

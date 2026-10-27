// 도우미 휴대폰 화면(docs/MOBILE_UI.md 4-2). 재구성 2a(공모전/모바일UI/퍼소나_사용성진단_20261022.md 도우미 절, 벤치마크_20261022.md 공통 규칙 8개).
// 화면 하나에 할 일 하나, 주 버튼 하나(아래 전체 폭), 문단 없이 큰 값 하나와 한 줄 몇 개. 긴 설명은 한 줄 행 뒤 시트(InfoSheet),
// 응급 대응은 늘 같은 자리의 작은 빨간 버튼(EmergencyButton) 뒤 시트. 부품은 부품표(kitParts.js)의 키트 부품만 쓴다.
import { EXP_NOTICE, expSource, useExpScreen } from '../../lib/expTrack.js'
import { helperKeyOf } from '../../lib/expSchema.js'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Armchair, CheckCircle2, CircleX, ClipboardList, Route, Clock, CloudOff, Link2Off, MapPin, Phone, RefreshCw, Send, User, Users } from 'lucide-react'
import { AppBar, BottomAction, Button, Dialog, DisplaySettings, EmergencyButton, EmptyState, Figure, FilledInput, FilledTextarea, InfoSheet, List, ListRow, Progress, SelectRow, Sheet, Spinner, TwoPane, useLayout, useMobileToast } from '../ui.jsx'
import { usePlatform } from '../usePlatform.js'
import { fmtHM } from '../../lib/time.js'
import { queueSummary, queueRowSubtitle } from '../../lib/queueStatus.js'
import { ROLE_OPTIONS } from '../../lib/helperConsent.js'
import { AVOID_PHRASES, EMERGENCY, HELPER_PHRASES, PREDEPARTURE } from '../../lib/helperGuidance.js'
import { PLACE_TERMS } from '../../lib/aiCard.js'
import { LOCATION_ERASE_NOTE, locationRows } from '../../lib/locationDisclosure.js'
import { routeBasisLabel } from '../../lib/tripChecks.js'
import { CONSENT_KEY, DECLINE_REASONS_M, FAIL_REASONS_M, NEXT_STEP, PREDEPARTURE_ITEMS, STEP_ACTION, STEP_LABEL, STEP_NOW, UNDO_MS, helperPaneOf, houseOf, lastAck, nextPlaceOf, progressOf, remainText, screenOf, sentencesOf, stepIndexOf, stepsByPerson, telOf, tripWord, withPending } from './flow.js'
import { startDemoDispatch, useDemoModel, useRemoteModel } from './useHelperModel.js'
import './helper.css'

// 수락 안내 한 문장(멘토링 녹취의 수락 필요, 한림봉사센터 회신 R12 196행의 불이익 없음, 버튼 말은 수락과 불가)
const ACK_NOTE = '수락을 누르면 배정이 확정됩니다. 불가를 눌러도 불이익은 없고, 다른 도우미에게 넘어갑니다.'
const ROLES_KEY = 'miri.m.roles.'
const PREDEP_KEY = 'miri.m.predep.'
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* 저장 불가 브라우저는 이번 화면에서만 */ } },
  del: (k) => { try { localStorage.removeItem(k) } catch { /* 저장 불가 */ } }
}
const writeConsent = (k, roles) => { store.set(CONSENT_KEY + k, '1'); store.set(ROLES_KEY + k, JSON.stringify(roles)) }
const readRoles = (k) => { try { const r = JSON.parse(store.get(ROLES_KEY + k) || '[]'); return Array.isArray(r) ? r.filter((x) => x in ROLE_OPTIONS) : [] } catch { return [] } }
// 동의는 역할을 하나 이상 고른 경우에만 성립한다(동의 화면이 역할 없이는 진행되지 않음). 역할 없이 남은 옛 기록은 '아직'으로 보고 다시 묻는다.
const readConsent = (k) => store.get(CONSENT_KEY + k) === '1' && readRoles(k).length > 0
const roleText = (roles) => roles.map((r) => ROLE_OPTIONS[r]).filter(Boolean).join(', ')

function Kv({ label, value }) {
  return <ListRow className="kv" title={label} trailing={<span className="mob-h-kv">{value}</span>} />
}

function Deadline({ m }) {
  const r = remainText(m.completeBy, m.now)
  const caption = [m.drill ? '훈련' : '', '이송 완료 기한', r?.text].filter(Boolean).join(', ')
  return (
    <>
      <Figure value={m.completeBy ? `${fmtHM(m.completeBy)}까지` : '담당자 확인'} caption={caption} live tone={r?.over ? 'red' : undefined} />
      {/* 매 분 낭독하지 않고 의미 있는 전환(30분 이내, 기한 지남)만 알림 */}
      <p className="mob-sr" aria-live="polite">{r ? (r.over ? '이송 완료 기한 지남' : r.min <= 30 ? '이송 완료 기한 30분 이내' : '') : ''}</p>
    </>
  )
}

function PrivacySheet() {
  return (
    <InfoSheet title="개인정보와 그만두는 방법" summary="배정된 분 정보만, 발령이 끝나면 삭제">
      <List label="개인정보와 그만두는 방법">
        <ListRow title="문자 링크로 열기" subtitle="앱 설치와 로그인 없음" />
        <ListRow title="배정 대상자만 표시" subtitle="다른 대상자와 명부 전체는 보이지 않음" />
        <ListRow title="발령 종료 시 삭제" subtitle="배정 정보와 연락처 삭제" />
        <ListRow title="보고는 담당자에게만 전달" subtitle="출발, 도착, 탑승, 인계, 실패 기록" />
        <ListRow title="언제든 그만두기 가능" subtitle="연락 화면의 참여 그만두기, 불이익 없음" />
        <ListRow title="안전교육과 보험" subtitle="이수 여부는 담당자가 확인, 모르면 담당자에게 문의" />
      </List>
    </InfoSheet>
  )
}

// 참여 동의(처음 한 번). 질문 하나, 역할 고르기, 불이익 없음 한 줄, 주 버튼 하나
export function ConsentScreen({ initialRoles = ['ride'], onBack, onDone }) {
  const [roles, setRoles] = useState(initialRoles.length ? initialRoles : ['ride'])
  const toggle = (r) => setRoles((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))
  return (
    <>
      <AppBar title="참여 동의" large={!onBack} onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <p className="mob-t-body mob-h-lead">가능한 도움 선택</p>
        <List label="할 수 있는 일">
          {Object.entries(ROLE_OPTIONS).map(([k, v]) => <SelectRow key={k} multiple title={v} subtitle={k === 'ride' ? '차량 배정 후보 등록' : undefined} selected={roles.includes(k)} onSelect={() => toggle(k)} />)}
        </List>
        <p className="mob-t-callout mob-h-lead">참여 불가 또는 중도 그만둠에 따른 불이익 없음</p>
        <List label="안내"><PrivacySheet /></List>
      </main>
      <BottomAction primary={{ label: '동의하고 시작', disabled: !roles.length, onClick: () => onDone(roles) }} />
    </>
  )
}

// 평시 첫 화면(시연 주소). 누구용인지 한 줄, 내 상태, 할 일 하나. 시연 배정은 아래 약한 글자 버튼
function IdleHome({ consentKey, onStart }) {
  const [consented, setConsented] = useState(() => readConsent(consentKey))
  const [roles, setRoles] = useState(() => readRoles(consentKey))
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  // 배정 계산이 몇 초 걸려 화면이 멈춘 듯 보이지 않게, 먼저 '받는 중'을 그린 뒤 계산한다. 두 번 누름도 막는다
  const begin = () => { if (busy) return; setBusy(true); setTimeout(() => { try { onStart() } finally { setBusy(false) } }, 60) }
  useExpScreen(editing ? 'idle.consent' : 'idle')
  if (editing) {
    return <ConsentScreen initialRoles={roles} onBack={() => setEditing(false)} onDone={(r) => { writeConsent(consentKey, r); store.set(`${ROLES_KEY}${consentKey}.pending`, '1'); setRoles(r); setConsented(true); setEditing(false) }} />
  }
  return (
    <>
      <AppBar title="미리 도우미" large />
      <main id="main" className="mob-content no-nav">
        <List label="내 상태">
          <ListRow className="kv" title="참여 동의" trailing={<span className="mob-h-kv">{consented ? '동의함' : '아직'}</span>} onClick={consented ? () => setEditing(true) : undefined} chevron={consented} />
          {consented && <Kv label="역할" value={roleText(roles) || '-'} />}
          <Kv label="배정" value="요청 없음" />
        </List>
        <p className="mob-t-callout mob-h-lead">배정 시 문자로 링크 전송</p>
        {expSource() && <p className="mob-t-foot mob-pad">{EXP_NOTICE}</p>}
      </main>
      <BottomAction primary={consented ? null : { label: '참여 동의하기', onClick: () => setEditing(true) }} secondary={{ label: busy ? '배정 조회 중' : '훈련 배정 받기', onClick: begin, disabled: busy }} />
    </>
  )
}

// 배정 알림: 큰 기한 하나, 어디서와 몇 명, 수락 하나. 차량과 동승, 확인할 점은 자세히 시트
function AlertScreen({ m, onDecline }) {
  const toast = useMobileToast()
  // 수락은 바로 보낸다(기다림 없음). 서버 전송은 m.ack 가 이어서 하고, 실패하면 아래에서 되돌린다.
  const [accepting, setAccepting] = useState(false)
  const accept = () => {
    if (accepting) return
    setAccepting(true)
    try {
      const r = m.ack('accept')
      if (r && typeof r.catch === 'function') r.catch(() => { setAccepting(false); toast('수락 전송 실패, 다시 수락') })
      toast('수락 완료')
    } catch { setAccepting(false); toast('수락 전송 실패, 다시 수락') }
  }
  const first = m.trips[0]
  return (
    <>
      <AppBar title="배정 알림" large />
      <main id="main" className="mob-content no-nav">
        <Deadline m={m} />
        <List label="배정 요약">
          <Kv label="마을" value={m.villages.join(', ') || '-'} />
          <Kv label="만나는 곳" value={m.meetPlace} />
          <Kv label="대상" value={`${m.codes.length}명, ${m.trips.length}번 이동`} />
          <InfoSheet title="자세히" summary={`차량, 함께 가는 도우미${m.notes.length ? `, 확인할 점 ${m.notes.length}개` : ''}, 대피소 뜻`} sheetTitle="배정 자세히">
            <List label="배정 자세히">
              <Kv label="차량" value={m.vehicle} />
              <Kv label="함께 가는 도우미" value={m.coHelpers.length ? m.coHelpers.join(', ') : '없음'} />
              <Kv label="첫 출발" value={first?.departAt ? fmtHM(first.departAt) : '-'} />
              <Kv label="도우미 번호" value={m.helper || '-'} />
            </List>
            {m.notes.length > 0 && <List label="확인할 점">{m.notes.map((n) => <ListRow key={n} title={n} />)}</List>}
            <List label="장소 뜻">{Object.values(PLACE_TERMS).map((t) => <ListRow key={t.term} title={t.term} subtitle={t.easy || t.text} />)}</List>
          </InfoSheet>
        </List>
        <p className="mob-t-callout mob-h-lead">{ACK_NOTE}</p>
      </main>
      <BottomAction primary={{ label: accepting ? '수락 처리 중' : '수락', onClick: accept, disabled: accepting }} secondary={{ label: '불가', onClick: onDecline, disabled: accepting }} />
    </>
  )
}

// 사유 고르기 한 화면(불가, 실패 공용). 사유 목록 한 줄씩, 메모 한 줄(선택), 주 버튼 하나
function ReasonScreen({ title, lead, reasons, label, danger, onBack, onSend }) {
  const [reason, setReason] = useState(null)
  const [memo, setMemo] = useState('')
  return (
    <>
      <AppBar title={title} onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <p className="mob-t-callout mob-h-lead">{lead}</p>
        <div role="radiogroup" aria-label={`${title} 사유`}>
          <List label="사유">{Object.entries(reasons).map(([k, v]) => <SelectRow key={k} title={v} selected={reason === k} onSelect={() => setReason(k)} />)}</List>
        </div>
        <label className="mob-h-field"><span className="mob-sr-only">메모(선택)</span>
          <FilledInput maxLength={200} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모(선택)" aria-label="메모(선택)" />
        </label>
      </main>
      <BottomAction primary={{ label, disabled: !reason, onClick: () => onSend(reason, memo), danger }} />
    </>
  )
}

// 상태가 나빠졌을 때 시트. 첫 장: 한 줄 안내, 119 전화(주 버튼), 실패 보고, 담당자 전화, 응급 대응 안내, 말할 때 쓰는 문구
// 긴 안전 문단(EMERGENCY)은 이 시트 안 '응급 대응 안내'에서 문장 하나씩(helperGuidance.js 원문 그대로)
function EmergencySheet({ open, onClose, m, onFail }) {
  const [page, setPage] = useState('main')
  useEffect(() => { if (!open) setPage('main') }, [open])
  const officerTel = telOf(m.officerContact)
  const title = page === 'guide' ? '응급 대응 안내' : page === 'phrases' ? '말할 때 쓰는 문구' : '대상자 상태 악화'
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {page === 'main' && (
        <div className="mob-h-sheet-body">
          <p className="mob-t-body mob-h-lead">안전한 곳에서 정지 후 119 신고</p>
          <Button block variant="danger" onClick={() => { window.location.href = 'tel:119' }}><Phone size={20} aria-hidden="true" />119에 전화</Button>
          <List label="다음 할 일">
            {onFail && <ListRow title="이송 불가" subtitle="실패 보고 시 담당자가 소방 지원 요청" chevron onClick={() => { onClose(); onFail() }} />}
            <ListRow title="담당자 전화" subtitle={m.officerContact} href={officerTel || undefined} chevron={!!officerTel} />
            <ListRow title="응급 대응 안내" subtitle="의식과 호흡 확인, 하지 말아야 할 것" chevron onClick={() => setPage('guide')} />
            <ListRow title="말할 때 쓰는 문구" subtitle={`권장 문구 ${HELPER_PHRASES.length}개와 피할 표현`} chevron onClick={() => setPage('phrases')} />
          </List>
        </div>
      )}
      {page === 'guide' && (
        <List label="응급 대응 안내">{sentencesOf(EMERGENCY).map((s, i) => <ListRow key={s} lead={<span className="mob-h-order">{i + 1}</span>} title={s} />)}</List>
      )}
      {page === 'phrases' && (
        <List label="말할 때 쓰는 문구">
          {HELPER_PHRASES.map(([t, s]) => <ListRow key={t} title={t} subtitle={s} />)}
          <ListRow title="피할 표현" subtitle={AVOID_PHRASES.join(', ')} />
          <ListRow title="전달 방법" subtitle="천천히, 한 번에 한 가지 정보만 전달" />
        </List>
      )}
      <Button block variant="plain" onClick={page === 'main' ? onClose : () => setPage('main')}>{page === 'main' ? '닫기' : '뒤로'}</Button>
    </Sheet>
  )
}

// 이송(지금 대상자 한 명). 진행 n/4 한 줄, 다음 장소 큰 값, 주 버튼 하나(이름이 단계), 실패는 약한 버튼
function TransportScreen({ m, code, steps, go, onBack, report, predepKey, inPane = false }) {
  const st = steps[code] || 'wait'
  const next = NEXT_STEP[st]
  const d = m.detail(code)
  const trip = m.trips.find((t) => t.personCodes.includes(code))
  const p = progressOf(m.codes, steps)
  // 지금 차례 화면에도 보내지 못한 보고를 보여 준다(누른 보고가 아직 서버에 없다는 사실을 놓치지 않게)
  const nowQs = queueSummary(m)
  const [sos, setSos] = useState(false)
  const [predep, setPredep] = useState(false)
  const [care, setCare] = useState({ symptomAt: '', observation: '', action: '' })
  const [careOpen, setCareOpen] = useState(false)
  const order = m.codes.indexOf(code) + 1
  const press = () => {
    if (!next) return
    if (next.step === 'depart' && store.get(PREDEP_KEY + predepKey) !== '1') { setPredep(true); return }
    const hasCare = care.observation || care.action || care.symptomAt
    report(code, next.step, hasCare && next.step === 'handover' ? { care } : {})
  }
  const village = d?.village || trip?.village || ''
  const place = next ? nextPlaceOf(st, { village, shelter: d?.shelter }) : STEP_LABEL[st]
  return (
    <>
      <AppBar title={code === p.current ? '지금 차례' : `${order}번째 분`} onBack={onBack} trailing={<EmergencyButton onClick={() => setSos(true)} />} />
      <main id="main" className="mob-content no-nav">
        <div className="mob-h-progress">
          <span className="mob-t-callout">{next ? `단계 ${stepIndexOf(st)}/4, ${STEP_NOW[st]}` : STEP_LABEL[st]}</span>
          <Progress value={next ? (stepIndexOf(st) / 4) * 100 : 100} label="이 대상자 이송 단계" />
        </div>
        <Figure value={place} caption={[code, d?.grade, trip ? `${tripWord(trip.index)}${st === 'wait' && trip.departAt ? ` ${fmtHM(trip.departAt)} 출발` : ''}` : ''].filter(Boolean).join(', ')} />
        <LocationRows m={m} code={code} />
        <List label="이 대상자">
          {m.completeBy && <ListRow lead={<Clock size={20} />} title={`이송 완료 기한 ${fmtHM(m.completeBy)}까지`} subtitle={[m.drill ? '훈련' : '', remainText(m.completeBy, m.now)?.text].filter(Boolean).join(', ')} />}
          {/* 탑승 메모(1026 복지관 면담): 수락한 본인 대상자에게만, 이름 없이 */}
          {m.accepted && d?.care?.boardingNote && <ListRow lead={<Armchair size={20} />} title="탑승 메모" subtitle={d.care.boardingNote} />}
          {d?.care?.companionCall && <ListRow lead={<Phone size={20} />} title="평소 돌봄 담당자에게 연락" subtitle={d.care.caregiverType} href={d.guardianPhone ? `tel:${d.guardianPhone}` : undefined} chevron={!!d.guardianPhone} />}
          {(d?.routeCheck || trip?.routeCheck) && <ListRow lead={<Route size={20} />} title={st === 'wait' ? '출발 전 담당자에게 길 확인' : '길이 막히면 담당자에게 전화'} subtitle={`경로 확인 필요, ${routeBasisLabel(trip?.routeBasis)}`} href={telOf(m.officerContact) || undefined} chevron={!!telOf(m.officerContact)} />}
          <InfoSheet lead={<User size={20} />} title="대상자 정보" summary={d ? '돌봄 담당자, 보조기구, 대피소' : '이름과 주소는 휴대폰으로 보내지 않음'}>
            {d ? (
              <List label="대상자 정보">
                <Kv label="평소 돌봄 담당자" value={d.care.caregiverType} />
                <Kv label="연락" value={d.care.reachableLabel} />
                <Kv label="의사소통" value={d.care.comm.length ? d.care.comm.join(', ') : '특이 없음'} />
                <Kv label="보조기구" value={d.care.aids.length ? d.care.aids.join(', ') : '없음'} />
                {m.accepted && <Kv label="탑승 메모" value={d.care.boardingNote || '없음'} />}
                <Kv label="도착 대피소" value={d.shelter} />
                <Kv label="리프트 차량 진입" value={d.lift} />
                <Kv label="야간과 휴일 개방" value={d.night} />
              </List>
            ) : <List label="대상자 정보"><ListRow title="담당자 문자와 현장에서 확인" subtitle="이름, 주소, 건강 정보는 휴대폰으로 보내지 않음" /></List>}
          </InfoSheet>
          {next?.step === 'handover' && <ListRow lead={<ClipboardList size={20} />} title="인계 기록(선택)" subtitle={care.observation || care.action || care.symptomAt ? '적어 둠, 인계 때 함께 보냄' : '증상 시각, 관찰, 조치'} chevron onClick={() => setCareOpen(true)} />}
          {!inPane && <ListRow lead={<Users size={20} />} title={`맡은 대상자 ${p.total}명 중 ${order}번째`} subtitle={`완료 ${p.done}명, 실패 ${p.failed}명`} chevron onClick={() => go({ name: 'list' })} />}
        </List>
        {nowQs && <List label="전송 대기"><ListRow lead={<CloudOff size={20} />} title={nowQs.title} subtitle={nowQs.subtitle} chevron onClick={() => go({ name: 'H8' })} /></List>}
        {!next && <EmptyState icon={<CheckCircle2 size={28} />} title="이 대상자 보고 끝" body={STEP_LABEL[st]} />}
      </main>
      {next && <BottomAction primary={{ label: STEP_ACTION[st], onClick: press }} secondary={{ label: '이송 불가', onClick: () => go({ name: 'H6', code }) }} />}
      <EmergencySheet open={sos} onClose={() => setSos(false)} m={m} onFail={next ? () => go({ name: 'H6', code }) : null} />
      <Sheet open={predep} onClose={() => setPredep(false)} title="출발 전 확인">
        <List label="출발 전 확인">{PREDEPARTURE_ITEMS.map((x) => <ListRow key={x} title={x} />)}</List>
        <p className="mob-t-callout mob-h-sheet-note">{sentencesOf(PREDEPARTURE)[1]}</p>
        <div className="mob-h-sheet-actions">
          <Button block onClick={() => { store.set(PREDEP_KEY + predepKey, '1'); setPredep(false); report(code, 'depart', {}) }}>확인 후 출발</Button>
          <Button block variant="plain" onClick={() => setPredep(false)}>닫기</Button>
        </div>
      </Sheet>
      <Sheet open={careOpen} onClose={() => setCareOpen(false)} title="인계 기록(선택)">
        <div className="mob-h-care">
          <label className="mob-h-field"><span className="mob-t-callout">증상 시각</span><FilledInput type="time" value={care.symptomAt} onChange={(e) => setCare({ ...care, symptomAt: e.target.value })} /></label>
          <label className="mob-h-field"><span className="mob-t-callout">관찰 내용</span><FilledTextarea rows={2} maxLength={200} value={care.observation} onChange={(e) => setCare({ ...care, observation: e.target.value })} /></label>
          <label className="mob-h-field"><span className="mob-t-callout">수행한 조치</span><FilledTextarea rows={2} maxLength={200} value={care.action} onChange={(e) => setCare({ ...care, action: e.target.value })} /></label>
        </div>
        <div className="mob-h-sheet-actions"><Button block onClick={() => setCareOpen(false)}>저장</Button></div>
      </Sheet>
    </>
  )
}

// 전체 목록(이동별, 사람 한 줄). 두 단에서는 왼쪽 단
function PeopleList({ m, steps, go, onBack, selected = null, inPane = false }) {
  const p = progressOf(m.codes, steps)
  const qs = queueSummary(m)
  return (
    <>
      <AppBar title={inPane ? '이송 목록' : `전체 ${p.total}명`} large={inPane} onBack={inPane ? undefined : onBack} trailing={<Button variant="plain" size="sm" onClick={() => go({ name: 'H7' })}>연락</Button>} />
      <main id="main" className="mob-content no-nav">
        <div className="mob-h-progress">
          <span className="mob-t-callout">완료 {p.done}명, 실패 {p.failed}명, 전체 {p.total}명</span>
          <Progress value={p.total ? ((p.done + p.failed) / p.total) * 100 : 0} label="이송 진행" />
        </div>
        {qs && <List label="전송 대기"><ListRow lead={<CloudOff size={20} />} title={qs.title} subtitle={qs.subtitle} chevron onClick={() => go({ name: 'H8' })} /></List>}
        {m.trips.map((t) => (
          <List key={t.index} label={`${tripWord(t.index)}, ${t.village}`}>
            {t.personCodes.map((c, i) => {
              const st = steps[c] || 'wait'
              const isCurrent = c === p.current
              return (
                <ListRow key={c} onClick={() => go({ name: 'H5', code: c })} chevron aria-current={selected === c ? 'true' : undefined} className={selected === c ? 'mob-row selected' : undefined}
                  lead={<span className={`mob-h-order ${isCurrent ? 'now' : ''}`}>{m.codes.indexOf(c) + 1}</span>}
                  title={`${t.village} ${i + 1}번째 집`}
                  subtitle={`${c}, ${isCurrent && st === 'wait' ? '지금 차례' : STEP_LABEL[st]}`}
                  trailing={st === 'handover' ? <CheckCircle2 size={20} aria-label="인계 완료" /> : st === 'fail' ? <CircleX size={20} aria-label="이송 실패" /> : null} />
              )
            })}
          </List>
        ))}
      </main>
    </>
  )
}

// 연락: 119, 담당자, 함께 가는 도우미, 평소 돌봄 담당자(시연), 참여 그만두기
function ContactScreen({ m, onBack }) {
  const toast = useMobileToast()
  const [ask, setAsk] = useState(false)
  const officerTel = telOf(m.officerContact)
  const g = m.demo ? m.codes.map((c) => ({ c, d: m.detail(c) })).filter((x) => x.d?.care?.companionCall && x.d.guardianPhone) : []
  return (
    <>
      <AppBar title="연락" onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <List label="연락">
          <ListRow lead={<Phone size={20} />} title="119" subtitle="생명이 위급할 때" href="tel:119" chevron />
          <ListRow lead={<Phone size={20} />} title="발령 담당자" subtitle={m.officerContact} href={officerTel || undefined} chevron={!!officerTel} />
          {m.coHelpers.map((h) => <ListRow key={h} lead={<Users size={20} />} title={`함께 가는 도우미 ${h}`} subtitle="번호는 담당자 문자로 안내" />)}
          {g.map(({ c, d }) => <ListRow key={c} lead={<Phone size={20} />} title={`${c} 평소 돌봄 담당자`} subtitle={d.care.caregiverType} href={`tel:${d.guardianPhone}`} chevron />)}
        </List>
        <List label="참여"><ListRow title="참여 그만두기" subtitle="다음 배정부터 빠짐, 불이익 없음" chevron onClick={() => setAsk(true)} /></List>
        <List label="화면 설정"><DisplaySettings /></List>
      </main>
      <Dialog open={ask} onClose={() => setAsk(false)} title="참여를 그만둘까요?" body="현재 배정은 담당자 연락 후 조정" actions={
        <>
          <Button variant="plain" onClick={() => setAsk(false)}>취소</Button>
          <Button variant="plain" className="mob-h-danger-text" onClick={() => { m.preference(false, []); setAsk(false); toast('그만두기 요청 전송') }}>그만두기</Button>
        </>
      } />
    </>
  )
}

// 전송 대기
function QueueScreen({ m, onBack }) {
  const toast = useMobileToast()
  const [busy, setBusy] = useState(false)
  const name = (q) => (q.type === 'preference' ? (q.consent ? '참여 동의와 역할' : '참여 그만두기') : q.type === 'ack' ? (q.answer === 'accept' ? '수락' : '불가') : `${houseOf(m.trips, q.personCode)} ${STEP_LABEL[q.step] || q.step}`)
  return (
    <>
      <AppBar title="전송 대기" onBack={onBack} />
      <main id="main" className="mob-content no-nav">
        <p className="mob-t-callout mob-h-lead">{m.lastOk ? `마지막 연결 ${fmtHM(m.lastOk)}` : '아직 연결 기록 없음'}</p>
        {m.queue.length === 0 ? <EmptyState icon={<Send size={28} />} title="보낼 보고 없음" body="모든 보고 담당자 전달 완료" /> : (
          <List label="전송 대기">{m.queue.map((q) => <ListRow key={q.key} lead={<Clock size={20} />} title={name(q)} subtitle={queueRowSubtitle(q)} />)}</List>
        )}
        {/* 서버가 받지 않은 보고는 지우지 않고 사유와 함께 남김. 담당자에게 전화로 알림 */}
        {m.rejected?.length > 0 && <List label="보내지 못한 보고">{m.rejected.map((q) => <ListRow key={q.key} lead={<CircleX size={20} />} title={name(q)} subtitle={`보내지 못함: ${q.rejected}. 담당자에게 전화로 알림`} />)}</List>}
      </main>
      {m.queue.length > 0 && <BottomAction primary={{ label: busy ? '보내는 중' : '다시 보내기', disabled: busy, onClick: async () => { setBusy(true); const r = await m.resend(); setBusy(false); toast(r.left ? `아직 ${r.left}건 대기, 연결되면 자동 전송` : '모두 전송 완료') } }} />}
    </>
  )
}

// 끝
function EndScreen({ m, steps, declined }) {
  const p = progressOf(m.codes, steps)
  const ackR = lastAck(m.reports)
  const done = m.reports.filter((r) => r.type === 'step' && (r.step === 'handover' || r.step === 'fail')).sort((a, b) => (a.at || 0) - (b.at || 0))
  const qs = queueSummary(m)
  const pending = qs && <List label="전송 대기"><ListRow lead={<CloudOff size={20} />} title={qs.title} subtitle={qs.subtitle} /></List>
  if (declined) {
    return (
      <>
        <AppBar title="불가 응답" large />
        <main id="main" className="mob-content no-nav">
          <EmptyState icon={<CircleX size={28} />} title="불가 응답 전송 완료" body={`사유: ${DECLINE_REASONS_M[ackR?.reason] || '기타'}. 담당자가 다른 도우미 배정`} />
          {pending}
        </main>
      </>
    )
  }
  return (
    <>
      <AppBar title="이송 끝" large />
      <main id="main" className="mob-content no-nav">
        <Figure value={`완료 ${p.done}명`} caption={`실패 ${p.failed}명, 대피소에서 담당자 안내 대기`} />
        <List label="기록">{done.map((r) => <ListRow key={`${r.personCode}${r.step}`} className="kv" title={houseOf(m.trips, r.personCode)} trailing={<span className="mob-h-kv">{STEP_LABEL[r.step]} {r.at ? fmtHM(r.at) : ''}</span>} />)}</List>
        {pending}
      </main>
    </>
  )
}

function Notice({ icon, title, body, action }) {
  return <main id="main" className="mob-content no-nav mob-h-notice"><EmptyState icon={icon} title={title} body={body} action={action} /></main>
}

// 보고 되돌리기: 누르면 바로 보내지 않고 몇 초 기다리며 '되돌리기'를 띄운다(매 단계 확인 창 대신). 시간이 지나거나 다른 보고를 누르거나 화면을 떠나면 보낸다
function usePendingReport(m) {
  const toast = useMobileToast()
  const [pending, setPending] = useState(null)
  const ref = useRef(null)
  const timer = useRef(null)
  const commit = () => {
    const p = ref.current
    if (!p) return
    clearTimeout(timer.current); ref.current = null; setPending(null)
    m.step(p.code, p.step, p.extra)
  }
  useEffect(() => () => commit(), []) // eslint-disable-line react-hooks/exhaustive-deps
  const report = (code, step, extra = {}) => {
    commit()
    const p = { code, step, extra }
    ref.current = p; setPending(p)
    timer.current = setTimeout(commit, UNDO_MS)
    const what = step === 'fail' ? '이송 실패' : STEP_LABEL[step]
    toast(`${houseOf(m.trips, code)} ${what} 보고`, { label: '되돌리기', onClick: () => { clearTimeout(timer.current); ref.current = null; setPending(null) } })
  }
  return { pending, report }
}

function Flow({ m, consentKey }) {
  const { twoPane } = useLayout()
  const [consented, setConsented] = useState(() => readConsent(consentKey))
  const [declining, setDeclining] = useState(false)
  const [stack, setStack] = useState([])
  const { pending, report } = usePendingReport(m)
  const steps = withPending(stepsByPerson(m.codes, m.reports), pending)
  const ackR = lastAck(m.reports)
  const base = screenOf({ consented, ack: ackR, finished: progressOf(m.codes, steps).finished, declining })
  const view = base === 'H3' ? stack[stack.length - 1] : null
  const go = (v) => setStack((s) => [...s, v])
  const back = () => setStack((s) => s.slice(0, -1))
  const current = progressOf(m.codes, steps).current
  useEffect(() => { if (ackR) setDeclining(false) }, [ackR])
  useEffect(() => { window.scrollTo(0, 0) }, [base, view?.name, view?.code, current])
  const predepKey = `${consentKey}.${m.helper || ''}`
  useExpScreen(helperKeyOf({ base, view: twoPane ? (view || (current ? { name: 'H5', code: current } : null)) : view, current, steps, declined: ackR?.answer === 'decline' }))

  if (base === 'H0') return <ConsentScreen initialRoles={readRoles(consentKey)} onDone={(roles) => { m.preference(true, roles); writeConsent(consentKey, roles); setConsented(true) }} />
  if (base === 'H1') return <AlertScreen m={m} onDecline={() => setDeclining(true)} />
  if (base === 'H2') return <ReasonScreen title="불가 사유" lead="사유를 고르면 담당자가 다른 도우미 배정" reasons={DECLINE_REASONS_M} label="불가 보내기" onBack={() => setDeclining(false)} onSend={(reason, memo) => m.ack('decline', reason, memo)} />
  if (base === 'H9') return <EndScreen m={m} steps={steps} declined={ackR?.answer === 'decline'} />
  const detailOf = (v, goTo, onBackTo, inPane) => {
    if (v?.name === 'list') return <PeopleList m={m} steps={steps} go={goTo} onBack={onBackTo} />
    if (v?.name === 'H5' || v?.name === 'H4') return <TransportScreen m={m} code={v.code} steps={steps} go={goTo} onBack={onBackTo} report={report} predepKey={predepKey} inPane={inPane} />
    if (v?.name === 'H6') return <ReasonScreen title="이송 불가" lead={`${houseOf(m.trips, v.code)}, 사유 선택 시 담당자가 소방 지원 요청`} reasons={FAIL_REASONS_M} label="실패로 보고" danger onBack={onBackTo} onSend={(reason, memo) => { report(v.code, 'fail', { reason, memo }); setStack((s) => s.filter((x) => x.code !== v.code)) }} />
    if (v?.name === 'H7') return <ContactScreen m={m} onBack={onBackTo} />
    if (v?.name === 'H8') return <QueueScreen m={m} onBack={onBackTo} />
    return null
  }
  if (twoPane) {
    // 두 단: 왼쪽 이송 목록, 오른쪽 고른 대상자 이송(없으면 지금 차례). 목록에서 고르면 오른쪽만 바뀐다(쌓지 않고 바꿈)
    const pick = (v) => setStack([v])
    const pane = helperPaneOf({ twoPane, base, view, currentCode: current })
    return (
      <TwoPane
        list={<PeopleList m={m} steps={steps} go={pick} selected={pane.detail?.code || null} inPane />}
        detail={detailOf(pane.detail, go, stack.length > 1 ? back : undefined, true)}
        emptyDetail={<Notice icon={<CheckCircle2 size={28} />} title="모든 대상자 보고 끝" body="목록에서 대상자를 고르면 기록이 보여요." />}
      />
    )
  }
  // 한 단: 기본 화면은 지금 차례 대상자 이송. 목록은 '전체 n명' 행 뒤
  if (view) return detailOf(view, go, back, false)
  if (current) return <TransportScreen m={m} code={current} steps={steps} go={go} report={report} predepKey={predepKey} />
  return <Notice icon={<CheckCircle2 size={28} />} title="보고를 보내는 중" body="잠시 뒤 결과가 보여요." />
}

function DemoHelper() {
  const m = useDemoModel()
  useExpScreen(m.phase === 'ready' || m.phase === 'idle' ? null : m.phase)
  useEffect(() => { document.title = '도우미 배정 | 미리' }, [])
  // 평시에 고른 동의와 역할은 시연 배정이 오면 이 도우미 기록에 한 번 반영한다
  useEffect(() => {
    if (m.phase !== 'ready' || store.get(`${ROLES_KEY}demo.pending`) !== '1') return
    store.del(`${ROLES_KEY}demo.pending`)
    m.preference(true, readRoles('demo'))
  }, [m.phase]) // eslint-disable-line react-hooks/exhaustive-deps
  const start = <Button block variant="tonal" onClick={startDemoDispatch}>훈련 배정 다시 받기</Button>
  if (m.phase === 'idle') return <IdleHome consentKey="demo" onStart={startDemoDispatch} />
  if (m.phase === 'preparing') return <Notice icon={<Spinner />} title="배정 준비 중" body="배정 전송 시 이 화면에 표시" />
  if (m.phase === 'closed') return <Notice icon={<CheckCircle2 size={28} />} title="발령 종료" body="배정 정보와 연락처 삭제 완료" action={start} />
  if (m.phase === 'none') return <Notice icon={<CircleX size={28} />} title="이번 발령에 배정 없음" body="담당자 연락 대기" />
  return <Flow m={m} consentKey="demo" />
}

function RemoteHelperM({ token }) {
  const m = useRemoteModel(token)
  const errKey = m.phase === 'error' ? `err.${screenOf({ error: m.error })}` : null
  useExpScreen(errKey === 'err.error' ? 'err.network' : errKey)
  useEffect(() => { document.title = '도우미 배정 | 미리' }, [])
  if (m.phase === 'loading') return <Notice icon={<Spinner />} title="배정 정보 불러오는 중" />
  if (m.phase === 'error') {
    const s = screenOf({ error: m.error })
    if (s === 'closed') return <Notice icon={<CheckCircle2 size={28} />} title="발령 종료" body="배정 정보와 연락처 삭제 완료" />
    if (s === 'expired') return <Notice icon={<Link2Off size={28} />} title="열 수 없는 링크" body="링크 만료 또는 도우미 변경, 담당자에게 새 링크 요청" />
    return <Notice icon={<CloudOff size={28} />} title="연결할 수 없음" body="잠시 뒤 재시도" action={<Button block onClick={() => window.location.reload()}><RefreshCw size={18} aria-hidden="true" />다시 시도</Button>} />
  }
  return <Flow m={m} consentKey={String(token).split('.').slice(0, 2).join('.')} />
}

export default function MobileHelperPage() {
  const { token } = useParams()
  const { platform } = usePlatform()
  return <div data-screen-platform={platform} className="mob-h-wrap">{!token || token === 'demo' ? <DemoHelper /> : <RemoteHelperM token={token} />}</div>
}

// 찾아가는 곳(위치 정보 최소 공개). 수락한 본인 배정 대상자이고 근거(별도 동의 또는 실제 발령)가 있을 때만 보인다.
// 근거가 없으면 담당자에게 묻도록 안내한다. 이름과 건강 정보는 여기에도 두지 않는다
function LocationRows({ m, code }) {
  if (!m?.accepted) return null
  const loc = typeof m.location === 'function' ? m.location(code) : null
  const rows = locationRows(loc)
  if (!rows) {
    return (
      <List label="찾아가는 곳">
        <ListRow lead={<MapPin size={20} />} title="담당자에게 위치 문의" subtitle="위치 정보 제공 미동의" href={telOf(m.officerContact) || undefined} chevron={!!telOf(m.officerContact)} />
      </List>
    )
  }
  return (
    <List label="찾아가는 곳">
      <ListRow lead={<MapPin size={20} />} title={rows.place} subtitle={rows.detail} />
      {loc.guardianPhone && <ListRow lead={<Phone size={20} />} title="보호자에게 전화" subtitle={loc.guardianPhone} href={`tel:${loc.guardianPhone}`} chevron />}
      <ListRow lead={<Clock size={20} />} title={LOCATION_ERASE_NOTE} subtitle={rows.basisText} />
    </List>
  )
}

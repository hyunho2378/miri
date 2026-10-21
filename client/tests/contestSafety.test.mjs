import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSeed } from '../src/mock/seed.js'
import { computeShortage, optimizedUnserved } from '../src/lib/shortageCalc.js'
import { commitmentOf, OWNERS } from '../src/lib/shortage.js'
import { pendingCounts } from '../src/lib/basis.js'
import { verifyResult } from '../src/lib/intake.js'
import { fillMissing, judge } from '../api/intake.js'
import { useDispatchStore as store } from '../src/store/useDispatchStore.js'
import { useMiriStore as data } from '../src/store/useMiriStore.js'
const seed=buildSeed(), sc=seed.scenarios[0]
test('차량 표시 변경 뒤 모든 기획안 수치 유지',()=>{
 const run=(patch={},other={})=>computeShortage({...seed,...other,scenario:{...sc,...patch},t0:seed.today})
 const r=run(); assert.equal(r.total,291);assert.equal(optimizedUnserved(r),267);assert.equal(r.scopeTargets,848)
 const day=run({timeBand:'day'});assert.equal(day.total,216);assert.equal(optimizedUnserved(day),200)
 assert.equal(run({}, {vehicles:seed.vehicles.filter(v=>commitmentOf(v)!=='unconfirmed')}).total,358)
 assert.deepEqual([10,20,30].map(boardingMinutes=>run({}, {settings:{...seed.settings,boardingMinutes}}).total),[183,291,402])
 const p=pendingCounts({persons:seed.persons,scopeVillageCodes:new Set(Object.keys(r.arrivals))}); assert.equal(p.docsInScope,4);assert.equal(p.docsAll,7)
 assert.equal(OWNERS.city,'시 보유')
})
test('번호 없는 대상자 수와 표 행에서 모델 누락 보충',()=>{
 for(const lines of [['대상자 4명','자유 서술'],['1 [가림] 거동 불명','2 [가림] 보행'],['성명 [가림]','성명 [가림]']]){
 const out=fillMissing([{grade:'assist'}],[{id:'P1'}],lines);assert.equal(out.length,lines[0]==='대상자 4명'?4:2);assert.equal(out[1].grade,'unknown');assert.equal(verifyResult(lines.join(' '),out[1]).gradeUncertain,true)
 }
})
test('판독 불가와 기록 없음 근거는 확인 필요 및 휠체어',()=>{
 for(const quote of ['도움의 종류는 기록 없음','판독 불가','없는 근거']){
 const r=judge({grade:'assist',confidence:'high',quote},'판독 불가. 도움의 종류는 기록 없음','순번 1',null,true)
 const v=verifyResult('판독 불가. 도움의 종류는 기록 없음',r);assert.equal(v.grade,'wheelchair');assert.equal(v.gradeUncertain,true)
 }
})
function setup(helpers){
 data.setState({helpers});store.setState({status:'sent',kind:'drill',realStart:1000,vStart:1000,speed:60,sentAt:1000,ackOverride:{},ackPlan:{},events:{},smsLog:[],fireRequests:[],handovers:[],manualHelper:'H1',result:{assignments:[{vehicleCode:'V1',helperCodes:['H1'],trips:[{grade:'assist',personCodes:['P1']}]}],unassigned:[]}})
}
test('10 가상 분 뒤 무응답 교체하며 대체자 수락을 기다림',()=>{
 setup([{code:'H2',active:true,consent:true,roles:['ride'],grades:['assist']}]);store.getState().processResponses(10999);assert.equal(store.getState().result.assignments[0].helperCodes[0],'H1');store.getState().processResponses(11000);const d=store.getState();assert.equal(d.ackOverride.H1.answer,'noack');assert.equal(d.result.assignments[0].helperCodes[0],'H2');assert.equal(d.ackOverride.H2.answer,'none')
})
test('예비 도우미 없으면 무응답 대상자 소방 지원 요청 및 중복 방지',()=>{
 setup([]);store.getState().processResponses(11000);assert.equal(store.getState().fireRequests.length,1);assert.equal(store.getState().events.P1.step,'handedToFire');store.getState().processResponses(12000);assert.equal(store.getState().fireRequests.length,1)
})
test('불가 응답은 기한 전에도 다음 후보로 교체',()=>{
 setup([{code:'H2',active:true,consent:true,roles:['ride'],grades:['assist']}]);store.setState({ackOverride:{H1:{answer:'decline',at:1000}}});store.getState().processResponses(1001);assert.equal(store.getState().result.assignments[0].helperCodes[0],'H2')
})

// 회신 R37: 돌봄 인력 소식도 담당자 승인 전에는 명부를 바꾸지 않는다
test('생활지원사 소식은 서버 검증을 통과하고 승인 뒤에만 명부 반영', async () => {
 const { NOTE_SOURCES, sourceLabel, verifyNote } = await import('../src/lib/notes.js')
 const { validateRequest } = await import('../api/note.js')
 assert.equal(sourceLabel('dailyCare'), '생활지원사')
 assert.ok(NOTE_SOURCES.some(s => s.value === 'dailyCare'))
 const text = '이제 휠체어를 타고 이동하세요'
 assert.equal(validateRequest({ text, source:'dailyCare', virtualOnly:true }).error, undefined)
 assert.equal(validateRequest({ text, source:'invalid', virtualOnly:true }).code, 'BAD_INPUT')
 const before = data.getState()
 try {
  const p = before.persons.find(p => p.grade === 'assist')
  const read = verifyNote(text, { grade:'wheelchair', tags:[], quote:text, confidence:'high' }, p)
  data.getState().addFieldNote({ id:'R37', personCode:p.code, source:'dailyCare', status:'pending', read })
  assert.deepEqual(data.getState().persons, before.persons)
  assert.equal(data.getState().fieldNotes[0].status, 'pending')
  data.getState().reviewFieldNote('R37', 'apply', read.diff.next)
  assert.equal(data.getState().persons.find(x => x.code === p.code).grade, 'wheelchair')
  assert.equal(data.getState().fieldNotes[0].status, 'applied')
 } finally { data.setState(before) }
})
test('생활지원사 돌봄 유형도 동행과 연락 판단에 사용', async () => {
 const { personCare } = await import('../src/lib/tripChecks.js')
 const source = seed.persons.find(p => p.care)
 const p = {...source, ltcGrade:null, care:{...source.care, caregiverType:'생활지원사', caregiverReachable:true}} // 별도 가상 맞춤돌봄 사례, 등급 보유 시연 명부에 자동 부여하지 않음
 assert.ok(p)
 assert.equal(personCare(p).caregiverType, '생활지원사')
 assert.equal(personCare({ care:{ ...p.care, caregiverReachable:true } }).companionCall, true)
 assert.equal(personCare({ care:{ ...p.care, caregiverReachable:false } }).caregiverUnreachable, true)
})

// 회신 R39: 기존 보고 호환성과 지원 부족 분리
for (const reason of ['refuse', 'support']) {
 test(`R39 ${reason} 실패 보고를 서버에서 받아 담당자 화면 상태로 복원`, async () => {
  const { cleanReport } = await import('../api/dispatch.js')
  const { mergeReports } = await import('../src/lib/reportQueue.js')
  const { FAIL_REASONS, FAIL_FOLLOW_UP, failReasonOf, stepOf } = await import('../src/lib/dispatchSim.js')
  const { FAIL_REASONS_M } = await import('../src/mobile/helper/flow.js')
  const report = cleanReport({ key:'r39report01', type:'step', personCode:'P1', step:'fail', reason }, { personCodes:['P1'] }, 'H1')
  assert.ok(report)
  const restored = mergeReports({ events:{}, ackOverride:{} }, [report])
  assert.equal(stepOf(restored, 'P1', 0, {}), 'fail')
  assert.equal(failReasonOf(restored, 'P1'), reason)
  assert.equal(FAIL_REASONS[reason], reason === 'refuse' ? '대피 원하지 않음' : '지원 부족으로 이동 못 함')
  assert.equal(FAIL_REASONS_M[reason], FAIL_REASONS[reason])
  assert.equal(FAIL_FOLLOW_UP[reason], reason === 'refuse' ? '평소 돌봄 담당자 연락과 재방문' : '차량이나 인력 다시 배정')
 })
}
test('R39 보건소 담당자 소식은 검증을 통과하고 승인 뒤에만 반영', async () => {
 const { sourceLabel, verifyNote } = await import('../src/lib/notes.js')
 const { validateRequest } = await import('../api/note.js')
 const text = '이제 휠체어를 타고 이동하세요'
 assert.equal(sourceLabel('visitingHealth'), '보건소 방문건강관리 담당자')
 assert.equal(validateRequest({ text, source:'visitingHealth', virtualOnly:true }).error, undefined)
 const before = data.getState()
 try {
  const p = before.persons.find(p => p.grade === 'assist')
  const read = verifyNote(text, { grade:'wheelchair', tags:[], quote:text, confidence:'high' }, p)
  data.getState().addFieldNote({ id:'R39', personCode:p.code, source:'visitingHealth', status:'pending', read })
  assert.deepEqual(data.getState().persons, before.persons)
  data.getState().reviewFieldNote('R39', 'apply', read.diff.next)
  assert.equal(data.getState().persons.find(x => x.code === p.code).grade, 'wheelchair')
 } finally { data.setState(before) }
})
test('R39 동의서와 교육 순서 및 결과 선택지', async () => {
 const { DOC_TEMPLATES, FORM_TEMPLATES } = await import('../src/lib/workspaceTemplates.js')
 const consent = DOC_TEMPLATES.find(x => x.key === 'consent')
 assert.equal(consent.title, '재난 때 이동 지원 사전 확인 동의서')
 assert.ok(!consent.html.includes('재난취약자'))
 assert.ok(consent.html.includes('재난 때 필요한 이동 지원을 미리 확인하고, 발령 때 차량과 도우미를 배정'))
 assert.ok(consent.html.includes('정보를 받는 사람'))
 assert.ok(consent.html.includes('동 맞춤형복지 담당, 발령 때 배정된 차량 기사와 도우미(배정된 분의 정보만)'))
 assert.ok(DOC_TEMPLATES.find(x => x.key === 'helper-training').html.includes('문자 먼저, 익숙한 담당자가 전화로 이해했는지 확인, 그다음 도우미 방문'))
 const options = FORM_TEMPLATES.flatMap(x => x.questions || []).find(x => x.title === '결과').options
 assert.ok(options.includes('대피 원하지 않음'))
 assert.ok(options.includes('지원 부족으로 이동 못 함'))
 assert.ok(!options.includes('거부'))
})

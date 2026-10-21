import test from 'node:test'
import assert from 'node:assert/strict'
import {validTime,timeValue} from '../src/mobile/time.js'
import {HELPER_PHRASES,AVOID_PHRASES,EMERGENCY,PREDEPARTURE} from '../src/lib/helperGuidance.js'
import {cleanPreference,preferencePatch} from '../src/lib/helperConsent.js'
import {crewEligible} from '../src/lib/assign.js'
import {careOf} from '../src/mock/seed.js'
test('시간 입력 형식과 범위 검증',()=>{for(const t of ['00:00','23:59','09:04'])assert.ok(validTime(t));for(const t of ['24:00','12:60','-1:00','9:2',''])assert.ok(!validTime(t));assert.equal(timeValue('9','4'),'09:04')})
test('R06 원문 여섯 문구와 보장 표현 금지',()=>{assert.equal(HELPER_PHRASES.length,6);assert.equal(AVOID_PHRASES.length,2);assert.match(HELPER_PHRASES[3][1],/이동을 멈추고 119/);assert.match(EMERGENCY,/안전.*확보/);assert.match(EMERGENCY,/의식과 호흡/);assert.match(PREDEPARTURE,/건강상태를 판정/);assert.ok(!HELPER_PHRASES.some(([,s])=>AVOID_PHRASES.some(x=>s.includes(x))))})
test('본인 역할과 동의 검증 및 철회 후보 제외',()=>{assert.equal(cleanPreference({consent:true,roles:[]}),null);assert.equal(cleanPreference({consent:true,roles:['admin']}),null);assert.equal(preferencePatch({consent:false,roles:['ride']},123).consentAt,null);assert.equal(crewEligible({active:true,consent:false,roles:['ride']}),false);assert.equal(crewEligible({active:true,consent:true,roles:['contact']}),false)})
test('R37 등급 보유자에 생활지원사 자동 배정 금지 및 연락 여부 유지',()=>{for(let k=1;k<100;k++){const c=careOf([], 'assist',k,'3');assert.notEqual(c.caregiverType,'생활지원사');assert.equal(c.caregiverReachable,c.caregiverType==='없음'?null:k%7===0?false:true)}assert.equal(careOf([],'assist',6,null).caregiverType,'확인 필요')})

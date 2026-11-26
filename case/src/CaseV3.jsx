// 미리 케이스 스터디 v3. 플러스엑스 T Universe 상세 페이지(plus-ex.com/experience#tuniverse)의 장 순서, 여백, 둥근 모서리,
// 스크롤 연출 값을 그대로 옮겼다. 연출 코드는 원본 initPageEvent와 같은 GSAP ScrollTrigger 설정을 쓴다(tmp/plusex/source_inline.js).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Accessibility, Flame, Landmark, Bus, Car, Users, HeartHandshake, Building2, House, FileText, Map as MapIcon, Bell,
  ClipboardCheck, Phone, Shield, Calendar, Send, Settings, X, ArrowUpRight, Hand, HeartPulse, Siren, GraduationCap,
  Handshake, Monitor, Server, Cpu, CircleCheck, TriangleAlert, CircleHelp, Truck, Database, Smartphone,
  ClipboardList, Calculator, Route, RefreshCw, ShieldCheck, Ambulance, PersonStanding, BedDouble, HandHelping, UserCheck, ScanText, EyeOff,
} from './icons.jsx';
// 디자인 시스템 아이콘 칸은 서비스 앱이 실제로 쓰는 루시드 아이콘을 그대로 보여 준다
import { House as LcHouse, FileText as LcFileText, Users as LcUsers, Map as LcMap, Car as LcCar, Bell as LcBell, Flame as LcFlame, ClipboardCheck as LcClipboardCheck, Phone as LcPhone, Shield as LcShield, Calendar as LcCalendar, Accessibility as LcAccessibility, Bus as LcBus, Send as LcSend, Settings as LcSettings, Smartphone as LcSmartphone, Database as LcDatabase, Siren as LcSiren } from 'lucide-react';
import './caseV3.css';
import { LiveScreen, driveHelper } from './Live.jsx';
import { buildSeed } from '../../client/src/mock/seed.js';
import { computeShortage } from '../../client/src/lib/shortageCalc.js';
import {
  LINKS, HERO, OVERVIEW, CONTEXT, INTERVIEW, RESEARCH, MAP, PARTNERS, DEFINE, DS, CONSOLE, AI, SHORTAGE, CARS, SYSTEM, DELIVER, CREDITS,
  DIAMOND, CHAPTER, RESEARCH_N, HMW, BLUEPRINT, LOGIC, PIPE, NETWORK, SCREENS, PHOTOS, FIRES, USED, BP2,
} from './caseCopy3.js';
import { AutoScreen } from './Autoplay.jsx';
import { PartnerMap, Situation, Roles, AsIsToBe, LogicLab, AILab, DispatchFlow, Access, Architecture, DesignQA, Redesign, Impact } from './Backstage.jsx';
import './backstage.css';

gsap.registerPlugin(ScrollTrigger);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Lines = ({ lines }) => lines.map((l, i) => <span key={i} className="ln">{l}</span>);
const Txt = ({ badge, title, sub, en = false, light = false }) => (
  <div className={`txt-wrap${light ? ' on-dark' : ''}`}>
    <span className="badge">{badge}</span>
    <p className={`txt-title${en ? ' en' : ''}`}>{title.join(' ')}</p>
    {sub?.map((s, i) => <p key={i} className="sub">{s}</p>)}
  </div>
);

// 원본 initPageEvent와 같은 값의 연출
function usePlusXMotion() {
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.__caseScrollBy = (dy) => window.scrollBy(0, dy);
    if (reduced()) { document.documentElement.classList.add('rm'); return undefined; }
    const ctx = gsap.context(() => {
      // 목업 묶음: 아래 그림부터 0.1초 간격
      gsap.utils.toArray('.mockup-wrap').forEach((wrap) => {
        const images = gsap.utils.toArray(wrap.querySelectorAll('.image')).reverse();
        ScrollTrigger.create({ trigger: wrap, start: '10% bottom', once: true, onEnter: () => {
          gsap.to(images, { opacity: 1, duration: 0.7, ease: 'power1.inOut', stagger: 0.1 });
          gsap.to(images, { y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.1 });
        } });
      });
      // OVERVIEW 떠 있는 오브젝트: 시작점을 25%씩 늦춰 속도가 달라 보임
      gsap.utils.toArray('.con2 .image').forEach((img, index) => {
        gsap.to(img, { yPercent: -20, scale: 1, scrollTrigger: { trigger: img, start: () => `top-=120px ${100 + index * 25}%`, end: () => 'bottom 40%', scrub: 1.4 } });
      });
      // 기본 진입: 아래 60px에서 떠오르기
      gsap.utils.toArray('.image').forEach((img) => {
        if (img.closest('.con2') || img.closest('.mockup-wrap')) return;
        const d = Number(img.getAttribute('data-duration') ?? 0.6);
        if (img.hasAttribute('data-yv')) gsap.set(img, { y: Number(img.getAttribute('data-yv')) });
        ScrollTrigger.create({ trigger: img, start: '30% bottom', end: 'bottom 5%', onEnter: () => {
          gsap.to(img, { autoAlpha: 1, duration: d, ease: 'power1.inOut' });
          gsap.to(img, { y: 0, duration: d, ease: 'power2.out' });
        } });
      });
      // 막대
      const bars = gsap.utils.toArray('.bar.now span');
      if (bars.length) ScrollTrigger.create({ trigger: bars[0], start: '20% bottom', once: true, onEnter: () => {
        bars.forEach((b, i) => gsap.to(b, { scaleX: 1, duration: 0.6 + i * 0.2, ease: 'power2.out', delay: i * 0.05 }));
        gsap.to('.graph .badg', { autoAlpha: 1, duration: 0.45, ease: 'power1.inOut', delay: 0.9 });
        gsap.from('.graph .badg', { y: 8, duration: 0.45, ease: 'power2.out', delay: 0.9 });
      } });
      // 말풍선 펼치기
      gsap.utils.toArray('.chat').forEach((chat) => {
        ScrollTrigger.create({ trigger: chat, start: '40% bottom', onEnter: () => {
          gsap.set(chat, { opacity: 1 });
          gsap.to(chat.querySelector('.badge-bg'), { width: '100%', duration: 0.7, ease: 'power3.out', onStart: () => gsap.delayedCall(0.2, () => chat.classList.add('shadow')) });
          gsap.to(chat.querySelector('.badge-txt'), { opacity: 1, duration: 0.7, ease: 'power1.out', delay: 0.3 });
        } });
      });
      // 사용자 리서치 카드: 0.17초 간격
      gsap.utils.toArray('.con6 .content').forEach((content) => {
        const all = [...content.querySelectorAll('.box')];
        gsap.set(all, { yPercent: 15 });
        ScrollTrigger.create({ trigger: content, start: '30% bottom', onEnter: () => {
          gsap.to(all, { autoAlpha: 1, duration: 0.6, ease: 'power1.inOut', stagger: 0.17 });
          gsap.to(all, { yPercent: 0, duration: 0.6, ease: 'power2.out', stagger: 0.17 });
        } });
      });
      // 검은 면 상자: 배경 0.88에서 1, 글은 0.3초 늦게
      gsap.set('.box-bg', { scale: 0.88, opacity: 0 });
      gsap.utils.toArray('.bg-bk .content.boxes').forEach((content) => {
        const all = [...content.querySelectorAll('.box')];
        ScrollTrigger.create({ trigger: all[1] || all[0], once: true, start: 'top bottom', onEnter: () => {
          all.forEach((box, i) => {
            gsap.to(box.querySelector('.box-bg'), { scale: 1, duration: 0.7, ease: 'power3.out', delay: i * 0.1 });
            gsap.to(box.querySelector('.box-bg'), { opacity: 1, duration: 0.4, ease: 'power1.inOut', delay: i * 0.1 });
            gsap.to(box.querySelector('.box-inner'), { opacity: 1, duration: 0.4, ease: 'power1.inOut', delay: i * 0.1 + 0.3 });
          });
        } });
      });
      // 큰 글자 블러 해제
      const pv = { blur: 30 };
      const big = document.querySelector('.ch-insight .txt-img');
      if (big) {
        gsap.set(big, { filter: `blur(${pv.blur}px)` });
        ScrollTrigger.create({ trigger: '.animation-y', once: true, start: '30% bottom', onEnter: () => {
          gsap.to('.animation-y', { autoAlpha: 1, duration: 0.6, y: 0, ease: 'power3.out' });
          gsap.to(pv, { blur: 0, duration: 1, onUpdate: () => gsap.set(big, { filter: `blur(${pv.blur}px)` }) });
        } });
      }
      // 항목 묶음: yPercent 10에서 0, 0.1초 간격
      gsap.utils.toArray('.item-wrap').forEach((wrap) => {
        const items = wrap.querySelectorAll('.item');
        gsap.set(items, { yPercent: wrap.classList.contains('benefit') ? 0 : 10 });
        ScrollTrigger.create({ trigger: wrap, once: true, start: '30% bottom', onEnter: () => {
          gsap.to(items, { autoAlpha: 1, stagger: 0.1, duration: 0.55, ease: 'power1.inOut' });
          gsap.to(items, { yPercent: 0, stagger: 0.1, duration: 0.7, ease: 'power2.out' });
        } });
      });
      // 포인트 아이콘: 0.77에서 튀어나오고 스크롤 따라 7px 떠오름
      gsap.utils.toArray('.image-point').forEach((image) => {
        gsap.set(image, { scale: 0.77, transformOrigin: 'center center', opacity: 1 });
        ScrollTrigger.create({ trigger: image, start: '20% bottom', once: true, onEnter: () => gsap.to(image, { scale: 1, duration: 1.0, ease: 'power3.out' }) });
        gsap.to(image, { y: -7, scrollTrigger: { trigger: image, start: '1% bottom', end: () => `+=${window.innerHeight * 0.7}`, scrub: 1.4 } });
      });
      // 이해관계자 지도: 상자가 차례로 오르고 선이 그어짐
      const map = document.querySelector('.map-svg');
      if (map) {
        const lines = map.querySelectorAll('.ln-path');
        gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(map.querySelectorAll('.nd, .lb'), { opacity: 0, y: 14 });
        ScrollTrigger.create({ trigger: map, start: '25% bottom', once: true, onEnter: () => {
          gsap.to(map.querySelectorAll('.nd'), { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.06 });
          gsap.to(lines, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', stagger: 0.07, delay: 0.45 });
          gsap.to(map.querySelectorAll('.lb'), { opacity: 1, y: 0, duration: 0.45, ease: 'power1.inOut', stagger: 0.07, delay: 0.8 });
        } });
      }
    });
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => { window.removeEventListener('load', onLoad); ctx.revert(); };
  }, []);
}

// 화면 열기: 목록 위로 아래에서 덮여 올라오는 층(원본 .experience__view 0.8s cubic-bezier(0.77,0,0.175,1))
function ScreenLayer({ open, onClose }) {
  const [shown, setShown] = useState(null);
  const closeBtn = useRef(null);
  useEffect(() => {
    if (open) { setShown(open); document.body.style.overflow = 'hidden'; setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 50); } else { document.body.style.overflow = ''; }
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return createPortal(
    <div className={`view-layer${open ? ' on' : ''}`} aria-hidden={!open} onTransitionEnd={() => { if (!open) setShown(null); }}>
      <div className="view-dim" onClick={onClose} />
      <div className="view-sheet" role="dialog" aria-label={shown ? `${shown.name} 화면` : '화면'}>
        <div className="view-head">
          <p><b>{shown?.name}</b><span>{shown?.cap}</span></p>
          <button ref={closeBtn} type="button" className="view-close" onClick={onClose} aria-label="닫기"><X size={22} strokeWidth={1.6} /></button>
        </div>
        <div className="view-body">
          {shown ? <LiveScreen key={shown.route} route={shown.route} poster={`/v3/scr-${shown.id}.webp`} title={`${shown.name} 실제 화면`} eager /> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// 이해관계자 지도(포스터 2장과 같은 배치): 상자 8개, 가운데 원, 파란 화살표와 빨간 선
const NODE_XY = {
  fire: [287.5, 0, 170], safe: [517.5, 0, 170], traf: [785, 0, 190], tong: [0, 184, 190], taxi: [785, 184, 190],
  resi: [0, 368, 190], care: [379.5, 368, 216], welf: [785, 368, 190],
};
const ICONS = { flame: Flame, landmark: Landmark, bus: Bus, car: Car, users: Users, accessibility: Accessibility, heart: HeartHandshake, building: Building2 };
const LINKS_MAP = [
  { d: [[443.5, 106], [443.5, 160]], c: 'b', n: ['fire'], t: '진행 방향을 알려 줌', tx: 431, ty: 128, a: 'end' },
  { d: [[531.5, 106], [531.5, 160]], c: 'b', n: ['safe'], t: '대피 계획을 매년 내려보냄', tx: 544, ty: 128, a: 'start' },
  { d: [[880, 106], [880, 162]], c: 'b', n: ['traf', 'taxi'], t: '필요할 때 그때 부탁', tx: 868, ty: 138, a: 'end' },
  { d: [[405.6, 210], [212, 210]], c: 'b', n: ['tong'], t: '명단 확인과 동의를 맡김', tx: 309, ty: 196, a: 'middle' },
  { d: [[212, 242], [405.6, 242]], c: 'r', n: ['tong'], t: '산불 발생 당일 올지 확인한 적 없음', tx: 309, ty: 266, a: 'middle' },
  { d: [[571.5, 226], [763, 226]], c: 'r', n: ['taxi'], t: '차가 산불 발생 당일 올지 약속 없음', tx: 667, ty: 212, a: 'middle' },
  { d: [[95, 290], [95, 346]], c: 'b', n: ['tong', 'resi'], t: '도와줄 사람으로 정함', tx: 107, ty: 322, a: 'start' },
  { d: [[487.5, 310], [487.5, 346]], c: 'r', n: ['care'], t: '몸 상태 변화가 명단에 닿는 길 없음', tx: 499, ty: 332, a: 'start' },
  { d: [[357.5, 410], [212, 410]], c: 'b', n: ['care', 'resi'], t: '평소 방문하며 몸 상태를 앎', tx: 285, ty: 396, a: 'middle' },
  { d: [[763, 410], [617.5, 410]], c: 'b', n: ['welf', 'care'], t: '직원으로 두고 관리', tx: 690, ty: 396, a: 'middle' },
];
function StakeholderMap() {
  const [act, setAct] = useState(null);
  const lit = (n) => !act || act === 'hub' || n.includes(act);
  return (
    <svg className={`map-svg${act ? ' focusing' : ''}`} viewBox="-6 -6 987 464" role="group" aria-label="미리 이해관계자 지도">
      <defs>
        <marker id="ah3" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M1 1 L9 5 L1 9" fill="none" stroke="#1E6EF4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {LINKS_MAP.map((l, i) => (
        <g key={i} className={`lk ${l.c}${lit(l.n) ? '' : ' dim'}`}>
          <path className="ln-path" pathLength="1" d={`M${l.d[0][0]} ${l.d[0][1]} L${l.d[1][0]} ${l.d[1][1]}`} markerEnd={l.c === 'b' ? 'url(#ah3)' : undefined} />
          <text className="lb" x={l.tx} y={l.ty} textAnchor={l.a}>{l.t}</text>
        </g>
      ))}
      <g className={`nd hub${act ? '' : ''}`} tabIndex={0} onMouseEnter={() => setAct('hub')} onMouseLeave={() => setAct(null)} onFocus={() => setAct('hub')} onBlur={() => setAct(null)}>
        <circle cx="487.5" cy="226" r="62" />
        {MAP.hub.split('\n').map((t, i) => <text key={i} x="487.5" y={221 + i * 24} textAnchor="middle">{t}</text>)}
      </g>
      {MAP.nodes.map((n) => {
        const [x, y, w] = NODE_XY[n.id];
        const Ic = ICONS[n.icon];
        return (
          <g key={n.id} className={`nd box${act && act !== n.id && act !== 'hub' && !LINKS_MAP.some((l) => l.n.includes(act) && l.n.includes(n.id)) ? ' dim' : ''}${act === n.id ? ' act' : ''}`}
            tabIndex={0} aria-label={n.name} onMouseEnter={() => setAct(n.id)} onMouseLeave={() => setAct(null)} onFocus={() => setAct(n.id)} onBlur={() => setAct(null)}>
            <rect x={x} y={y} width={w} height="84" rx="10" />
            <Ic x={x + w / 2 - 13} y={y + 14} width={26} height={26} color="#1E6EF4" strokeWidth={2} />
            <text x={x + w / 2} y={y + 66} textAnchor="middle">{n.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

// 부족분 계산: 서비스 계산 코드(computeShortage)를 그대로 부른다
let calcInput = null;
const inputOf = () => {
  if (calcInput) return calcInput;
  const s = buildSeed();
  const scenario = s.scenarios.find((x) => x.id === s.activeScenarioId) || s.scenarios[0];
  calcInput = { base: { persons: s.persons, villages: s.villages, vehicles: s.vehicles, helpers: s.helpers, settings: s.settings, scenario, t0: s.today }, names: Object.fromEntries(s.villages.map((v) => [v.code, v.label])) };
  return calcInput;
};
const runCalc = (cars) => { const { base } = inputOf(); return computeShortage({ ...base, scenario: { ...base.scenario, extraVehicles: { ...(base.scenario.extraVehicles || {}), car: cars } } }); };
function ShortageCalc({ value, onChange }) {
  const [own, setOwn] = useState(0);
  const cars = value ?? own;
  const setCars = (n) => { setOwn(n); onChange?.(n); };
  const all = useMemo(() => Array.from({ length: SHORTAGE.max + 1 }, (_, n) => runCalc(n)), []);
  const r = all[cars]; const v = r.total; const { names } = inputOf();
  const villages = useMemo(() => Object.entries(all[0].byVillage).filter(([, x]) => x.total > 0).sort((a, b) => b[1].total - a[1].total).map(([code, x]) => ({ code, name: names[code] || code, start: x.total })), [all, names]);
  const vmax = useMemo(() => Math.max(1, ...all.flatMap((x) => villages.map((vg) => x.byVillage[vg.code]?.total || 0))), [all, villages]);
  return (
    <div className="calc">
      <div className="calc-top">
        <label htmlFor="cars-range" className="calc-lb">{SHORTAGE.label}</label>
        <b className="calc-cars">{cars}대</b>
      </div>
      <input id="cars-range" className="slider" type="range" min="0" max={SHORTAGE.max} value={cars} style={{ '--p': `${(cars / SHORTAGE.max) * 100}%` }} onChange={(e) => setCars(Number(e.target.value))} aria-valuetext={`승용차 ${cars}대`} />
      <div className="ticks" aria-hidden="true">{SHORTAGE.ticks.map((s) => <button type="button" tabIndex={-1} key={s} className={s === cars ? 'on' : ''} style={{ left: `${(s / SHORTAGE.max) * 100}%` }} onClick={() => setCars(s)}>{s}</button>)}</div>
      <p className="calc-say" aria-live="polite">{SHORTAGE.say(cars, v)}</p>
      <div className="vbars">
        {villages.map((x) => {
          const now = r.byVillage[x.code]?.total || 0;
          return (
            <div className={`vbar${now === 0 ? ' done' : ''}`} key={x.code}>
              <span className="nm">{x.name}</span>
              <span className="track"><b style={{ transform: `scaleX(${x.start / vmax})` }} /><i style={{ transform: `scaleX(${now / vmax})` }} /></span>
              <span className="num">{now}명</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 도우미 휴대폰: 단계 단추를 누르면 실제 화면 안 버튼이 차례로 눌려 그 단계까지 간다
function HelperDemo() {
  const live = useRef(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const go = async (i) => { setStep(i); setBusy(true); await driveHelper(live, i); setBusy(false); };
  return (
    <div className="helper-demo">
      <div className="steps" role="tablist" aria-label="배정 단계">
        {MOBILE.steps.map((s, i) => <button key={s} type="button" role="tab" aria-selected={step === i} className={step === i ? 'on' : ''} disabled={busy} onClick={() => go(i)}><span>{String(i + 1).padStart(2, '0')}</span>{s}</button>)}
      </div>
      <LiveScreen ref={live} kind="phone" route="/m/h/demo" poster="/v3/phone-consent.webp" title="도우미 휴대폰 실제 화면" margin="40%" />
    </div>
  );
}

const ScreenThumb = ({ s, onOpen }) => (
  <button type="button" className="thumb item" onClick={() => onOpen(s)}>
    <span className="thumb-frame"><img src={`/v3/scr-${s.id}.webp`} alt="" loading="lazy" width="1600" height="1000" /></span>
    <span className="thumb-cap"><b>{s.name}</b><em>{s.cap}</em><ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" /></span>
  </button>
);

const DICON = { hand: Hand, car: Car, pulse: HeartPulse, siren: Siren };
const STACK_ICON = { monitor: Monitor, server: Server, cpu: Cpu, check: CircleCheck };
const DS_ICONS = [LcHouse, LcFileText, LcUsers, LcMap, LcCar, LcBell, LcFlame, LcClipboardCheck, LcPhone, LcShield, LcCalendar, LcAccessibility, LcBus, LcSend, LcSettings, LcSmartphone, LcDatabase, LcSiren];
const NET_ICON = { pub: Landmark, uni: GraduationCap, biz: Building2, etc: Handshake };
const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function useCountUp() {
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-count]')];
    if (reduced()) { els.forEach((el) => { el.textContent = Number(el.dataset.count).toLocaleString('ko-KR'); }); return undefined; }
    const sts = els.map((el) => {
      const to = Number(el.dataset.count); const o = { v: 0 }; el.textContent = '0';
      return ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('ko-KR'); } }) });
    });
    return () => sts.forEach((x) => x.kill());
  }, []);
}

// 보일 때 일정 간격으로 다음 칸을 밝히는 순환(청사진, 규칙, AI 흐름)
function useCycle(n, ms, ref) {
  const [i, setI] = useState(0);
  const [on, setOn] = useState(false);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOn(e.intersectionRatio > 0.35), { threshold: [0, 0.35] });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    if (!on || hold || reduced()) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(t);
  }, [on, hold, n, ms]);
  return [i, (k) => { setHold(true); setI(k); }];
}


// 장 사이 목업 구간: 플러스엑스 브랜딩 사례처럼 글 없이 색 면 위에 실제 화면만 놓는다. 그림은 모두 실제 서비스 캡처와 실제 사진
const PH = (src, cls, sp, alt = '') => ({ src, cls, sp, alt });
function Showcase({ v }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el || reduced()) return undefined;
    const ctx = gsap.context(() => {
      el.querySelectorAll('[data-sp]').forEach((n) => {
        const sp = parseFloat(n.dataset.sp);
        gsap.fromTo(n, { y: sp * 120 }, { y: -sp * 120, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });
      const row = el.querySelector('[data-x]');
      if (row) gsap.fromTo(row, { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    }, el);
    return () => ctx.revert();
  }, [v]);
  const phone = (p, bz = 'black') => (
    <figure key={p.src + p.cls} className={`sc-ip ${p.cls}`} data-sp={p.sp}>
      <div className="iphone"><div className="ip-scr"><img src={p.src} alt={p.alt} loading="lazy" /></div><img className="ip-bz" src={`/v3/ip18pro_${bz}.webp`} alt="" width="900" height="1840" /></div>
    </figure>
  );
  if (v === 'brand') {
    return (
      <section className="sc sc-brand" ref={ref} aria-label="미리 대표 그림">
        <div className="sc-logo" data-sp="0.15"><img src="/v3/tile.webp" alt="" width="1240" height="1233" /><b>미리</b></div>
        {[PH('/v3/phone-assign.webp', 'b1', 0.9, '도우미 배정 알림 화면'), PH('/v3/phone-dong.webp', 'b2', -0.6, '동 담당자 오늘 할 일 화면')].map((p) => phone(p))}
        <figure className="sc-chip b3" data-sp="1.4"><img src="/v3/def-consent.webp" alt="도우미가 고르는 도움 종류" loading="lazy" /></figure>
      </section>
    );
  }
  // 휴대폰 화면 줄: 애플 공식 아이폰 18 Pro 베젤에 실제 화면을 넣어 한 줄로 세우고, 스크롤하면 줄 전체가 옆으로 흐른다
  return (
    <section className="sc sc-line" ref={ref} aria-label="도우미와 동 담당자 휴대폰 화면">
      <div className="sc-row" data-x="1">
        {[PH('/v3/phone-helper.webp', 'r1', 0, '도우미 첫 화면'), PH('/v3/phone-consent.webp', 'r2', 0, '참여 동의'), PH('/v3/phone-assign.webp', 'r3', 0, '배정 알림'), PH('/v3/phone-accepted.webp', 'r4', 0, '수락 뒤 대상자 순서'), PH('/v3/phone-dong.webp', 'r5', 0, '동 담당자 오늘 할 일')].map((p) => phone(p, 'silver'))}
      </div>
    </section>
  );
}

// 인터뷰: 플러스엑스 SK바이오팜 ZERO "In-depth Interview" 구간 구조(흐린 사진 바탕, 큰 영문 두 단어, 왼쪽 글, 오른쪽에 어긋나게 뜬 말 카드, 하나만 흰색)
function Interview() {
  const ref = useRef(null);
  const [on, pick] = useCycle(INTERVIEW.chats.length, 3200, ref);
  return (
    <section className="con4 iv2" id="interview" ref={ref}>
      <div className="iv2-bg" style={{ backgroundImage: 'url(/v3/real/mukho-hill.webp)' }} />
      <p className="iv2-word" aria-hidden="true"><span>User</span><span className="o">Research</span></p>
      <div className="iv2-row">
        <div className="iv2-l">
          <Txt badge={INTERVIEW.badge} title={INTERVIEW.title} sub={INTERVIEW.sub} />
          <div className="rm">{RESEARCH_N.map((x) => <div key={x.t} className="rm-r"><b>{x.t}</b><span>{x.who}</span><p>{x.got}</p></div>)}</div>
        </div>
        <div className="iv2-r">
          {INTERVIEW.chats.map((c, i) => (
            <button type="button" key={c.q} className={`iv2-c c${i}${on === i ? ' on' : ''}`} onClick={() => pick(i)}>
              <em>{c.who}</em><span>“{c.q}”</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Diamond() {
  return (
    <section className="con-dd" id="process">
      <Txt badge={DIAMOND.badge} title={DIAMOND.title} />
      <div className="dd">
        <svg viewBox="0 0 1200 300" className="dd-svg" aria-hidden="true">
          <path className="dd-shape d1" d="M20 150 L300 20 L580 150 L300 280 Z" />
          <path className="dd-shape d2" d="M620 150 L900 20 L1180 150 L900 280 Z" />
          <line className="dd-mid" x1="300" y1="20" x2="300" y2="280" />
          <line className="dd-mid" x1="900" y1="20" x2="900" y2="280" />
        </svg>
        <div className="dd-tags" aria-hidden="true">{DIAMOND.stages.map((st) => <span key={st.id}>{st.en}</span>)}</div>
        <div className="dd-labels">
          {DIAMOND.stages.map((st, i) => (
            <button key={st.id} type="button" className={`dd-st s${i}`} onClick={() => go(st.id)}>
              <b>{st.en}</b><span>{st.ko}</span><ul className="dd-did">{st.did.map((d) => <li key={d}>{d}</li>)}</ul>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chapter({ id, photo }) {
  const c = CHAPTER[id];
  return (
    <section className="bg-bk ch-insight" id={id}>
      <div className="bg-img-wrap image">
        <div className="bg-img" style={{ backgroundImage: `url(${photo})` }} />
        <p className="side"><span>{c.n}</span><span>FROM</span><span>DONGHAE</span><span>&nbsp;</span><span>TO</span><span>MIRI</span></p>
      </div>
      <div className="animation-y"><p className="txt-img"><span>{c.en.toUpperCase()}</span></p></div>
      <p className="ch-lead2 image">{c.lead}</p>
    </section>
  );
}

// 티 우주 IMPRESSION, SUBSCRIPTION처럼 구간 맨 위에 깔리는 흐린 큰 단어
const BigWord = ({ id }) => (
  <p className="bigword" aria-hidden="true"><span data-slide>{CHAPTER[id].en.toUpperCase()}</span></p>
);

const BP_ICON = { clipboard: ClipboardList, calc: Calculator, siren: Siren, route: Route, car: Car, refresh: RefreshCw, handover: ShieldCheck, home: House, users: Users, monitor: Monitor, cpu: Cpu };

function Blueprint() {
  const ref = useRef(null);
  const [col, pick] = useCycle(BLUEPRINT.stages.length, 2200, ref);
  return (
    <section className="con-bp" id="blueprint" ref={ref}>
      <Txt badge={BLUEPRINT.badge} title={BLUEPRINT.title} />
      <div className="bp2 image" style={{ '--cols': BLUEPRINT.stages.length }}>
        <div className="bp2-head" />
        {BLUEPRINT.stages.map((st, i) => {
          const I = BP_ICON[BP2.icons[i]];
          return (
            <button key={st.t} type="button" className={`bp2-st${i === col ? ' on' : ''}${i < col ? ' past' : ''}`} onClick={() => pick(i)}>
              <span className="bp2-ic"><I size={26} strokeWidth={1.9} /></span>
              <em>{String(i + 1).padStart(2, '0')}</em><b>{st.t}</b>
            </button>
          );
        })}
        {BP2.lanes.map((ln) => {
          const L = BP_ICON[ln.icon];
          return (
            <div key={ln.t} style={{ display: 'contents' }}>
              <div className="bp2-lane"><L size={18} strokeWidth={2} /><b>{ln.t}</b></div>
              {ln.cells.map((c, i) => <div key={i} className={`bp2-cell${i === col ? ' on' : ''}`}>{c}</div>)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// 배정 규칙 인포그래픽: 등급별 주민 → 규칙 여섯 개 → 차 네 종류 → 남는 사람
const GRADES = [
  { k: '침상', I: BedDouble, c: '#BA1A1A', n: 12 },
  { k: '휠체어', I: Accessibility, c: '#1E6EF4', n: 14 },
  { k: '부축', I: HandHelping, c: '#C93400', n: 18 },
  { k: '도보', I: PersonStanding, c: '#008932', n: 20 },
];
const VEHICLES = [
  { k: '침상 승합차', s: '침상 2명', I: Ambulance, seats: 2 },
  { k: '리프트 승합차', s: '휠체어 3명', I: Accessibility, seats: 3 },
  { k: '승용차', s: '부축 3명, 도보 4명', I: Car, seats: 4 },
  { k: '마을버스', s: '도보 20명', I: Bus, seats: 20 },
];
function Logic() {
  const ref = useRef(null);
  const [k, pick] = useCycle(LOGIC.rules.length + 1, 1300, ref);
  const fill = Math.min(1, k / LOGIC.rules.length);
  return (
    <section className="con-logic" id="logic" ref={ref}>
      <Txt badge={LOGIC.badge} title={LOGIC.title} />
      <div className="lg2 image">
        <div className="lg2-col">
          {GRADES.map((g) => (
            <div key={g.k} className="lg2-grade">
              <span className="lg2-gi" style={{ background: g.c }}><g.I size={22} strokeWidth={2} color="#fff" /></span>
              <div><b>{g.k}</b><p className="dots">{Array.from({ length: g.n }, (_, i) => <i key={i} style={{ background: g.c, opacity: i < g.n * (1 - fill * 0.7) ? 1 : 0.18 }} />)}</p></div>
            </div>
          ))}
        </div>
        <span className="lg2-ar" aria-hidden="true" />
        <div className="lg2-rules">
          <div className="lg2-funnel"><Users size={30} strokeWidth={2} color="#fff" /></div>
          {LOGIC.rules.map((x, i) => (
            <button type="button" key={x.t} className={`lg2-rule${i === k ? ' on' : ''}${i < k ? ' past' : ''}`} onClick={() => pick(i)}>
              <span>{i + 1}</span><b>{x.t}</b>
            </button>
          ))}
        </div>
        <span className="lg2-ar" aria-hidden="true" />
        <div className="lg2-col">
          {VEHICLES.map((v, vi) => (
            <div key={v.k} className="lg2-car">
              <span className="lg2-ci"><v.I size={30} strokeWidth={1.8} /></span>
              <div><b>{v.k}</b><em>{v.s}</em><p className="seats">{Array.from({ length: Math.min(v.seats, 10) }, (_, i) => <i key={i} className={i < Math.round(Math.min(v.seats, 10) * fill) ? 'on' : ''} style={{ transitionDelay: `${vi * 80 + i * 40}ms` }} />)}</p></div>
            </div>
          ))}
        </div>
        <span className="lg2-ar" aria-hidden="true" />
        <div className={`lg2-out${k === LOGIC.rules.length ? ' on' : ''}`}><b data-count={LOGIC.result.n}>{LOGIC.result.n}</b><span>명</span><em>기한 안에 옮기지 못하는 사람</em></div>
      </div>
    </section>
  );
}

// AI 서류 읽기 인포그래픽: 서류, 가림, 국내 AI, 등급 초안, 담당자 확인
const PIPE5 = [
  { t: '서류 사진', s: '동마다 서식이 다른 종이 서류' },
  { t: '개인정보 가림', s: '이름과 연락처, 주소를 가림' },
  { t: '국내 AI가 읽기', s: 'CLOVA OCR과 HyperCLOVA X' },
  { t: '등급 초안', s: '도보, 부축, 휠체어, 침상' },
  { t: '담당자 확인', s: '원문과 대조해 확정' },
];
function Pipeline() {
  const ref = useRef(null);
  const [k, pick] = useCycle(PIPE5.length, 1500, ref);
  const gi = 2; // 휠체어
  return (
    <section className="con-pipe" id="pipeline" ref={ref}>
      <Txt badge={PIPE.badge} title={PIPE.title} />
      <div className="pp2 image">
        {PIPE5.map((x, i) => (
          <button type="button" key={x.t} className={`pp2-st${i === k ? ' on' : ''}${i < k ? ' past' : ''}`} onClick={() => pick(i)}>
            <p className="pp2-n">{String(i + 1).padStart(2, '0')}</p>
            <b>{x.t}</b><span>{x.s}</span>
            <div className={`pp2-art a${i}`}>
              {i === 0 ? <><img src="/v3/doc-card.webp" alt="" /><i className="scan" /></> : null}
              {i === 1 ? <div className="mask"><img src="/v3/doc-card.webp" alt="" /><i className="bar b1" /><i className="bar b2" /></div> : null}
              {i === 2 ? <div className="chip"><Cpu size={44} strokeWidth={1.6} color="#fff" /></div> : null}
              {i === 3 ? <div className="grades">{[PersonStanding, HandHelping, Accessibility, BedDouble].map((I, j) => <span key={j} className={j === gi ? 'on' : ''}><I size={30} strokeWidth={1.9} /></span>)}</div> : null}
              {i === 4 ? <div className="human"><UserCheck size={46} strokeWidth={1.6} /><span className="ok"><CircleCheck size={22} strokeWidth={2.4} />확인</span></div> : null}
            </div>
            {i < PIPE5.length - 1 ? <i className="pp2-ar" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function Network() {
  const [sel, setSel] = useState('pub');
  const detail = useMemo(() => {
    const pub = PARTNERS.groups.find((g) => g.id === 'pub').items;
    const uni = PARTNERS.groups.find((g) => g.id === 'uni').items;
    const civ = PARTNERS.groups.find((g) => g.id === 'civ').items;
    return {
      pub: pub.filter((x) => !x.n.includes('소방관')),
      uni,
      biz: civ.filter((x) => x.n.includes('카카오')),
      etc: [...civ.filter((x) => !x.n.includes('카카오')), ...pub.filter((x) => x.n.includes('소방관'))],
    };
  }, []);
  return (
    <section className="con-net" id="network">
      <Txt badge={NETWORK.badge} title={NETWORK.title} sub={NETWORK.sub} />
      <PartnerMap groups={NETWORK.groups} sel={sel} onPick={setSel} />
      <ul className="net-detail" key={sel}>{detail[sel].map((x) => <li key={x.n}><b>{x.n}</b><span>{x.r}</span></li>)}</ul>
    </section>
  );
}

// 차 카드: 주현호 포트폴리오(26-portfolio-hyunho) StackCarousel의 아치 배치를 가져와 줄이고, 가운데 카드를 누르면 뒤집혀 설명이 보이게 바꿨다
const CAR_ICON = [Ambulance, Accessibility, Car, Bus];
const CARD_LIST = [
  { name: '침상 승합차', g: '침상', cap: '한 번에 2명', cls: 'c-blue', back: [['누가 타나', '앉은 자세를 유지하기 어려워 누운 채 옮겨야 하는 분'], ['함께 가는 사람', '구급대원'], ['배정 순서', '1순위, 같은 등급은 불이 먼저 닿는 마을부터']] },
  { name: '리프트 승합차', g: '휠체어', cap: '한 번에 3명', cls: 'c-white', back: [['누가 타나', '걷기 어렵지만 휠체어에 앉을 수 있는 분'], ['함께 가는 사람', '도우미 2명'], ['배정 순서', '2순위, 전동 휠체어는 경차 특장차에 배정하지 않음']] },
  { name: '협약 승용차', g: '부축', cap: '한 번에 3명', cls: 'c-red', back: [['누가 타나', '사람이나 보조기구에 기대야 걸을 수 있는 분'], ['함께 가는 사람', '도우미 1명, 도보 등급은 4명까지'], ['배정 순서', '3순위, 평소 협약으로 대수를 미리 약속']] },
  { name: '마을버스', g: '도보', cap: '한 번에 20명', cls: 'c-deep', back: [['누가 타나', '안내만 받으면 차까지 스스로 걷는 분'], ['함께 가는 사람', '인솔 1명'], ['배정 순서', '4순위']] },
];
const ARC = 12;
function Cars() {
  const N = CARD_LIST.length;
  const [active, setActive] = useState(0);
  const [flip, setFlip] = useState(-1);
  const box = useRef(null);
  const [cw, setCw] = useState(300);
  const drag = useRef({ on: false, x: 0, dx: 0 });
  useEffect(() => {
    const el = box.current; if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setCw(Math.round(Math.max(200, Math.min(340, e.contentRect.width * 0.24)))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const go = (dir) => { setFlip(-1); setActive((a) => a + dir); };
  const norm = ((active % N) + N) % N;
  const dist = (i) => { let d = ((((i - active) % N) + N) % N); if (d > N / 2) d -= N; return d; };
  const onCard = (i) => { if (i === norm) setFlip((f) => (f === i ? -1 : i)); else { setFlip(-1); setActive(active + dist(i)); } };
  const ch = Math.round(cw * 1.4);
  return (
    <section className="bg-bk con16" id="cars-sec">
      <Txt badge={CARS.badge} title={CARS.title} sub={['가운데 카드를 누르면 뒤집혀 누가 타는지 보입니다. 옆 카드를 누르거나 끌면 넘어갑니다.']} light />
      <div
        className="arc" ref={box} style={{ height: ch + Math.round(cw * 0.5) }}
        tabIndex={0} aria-label="차종 카드. 화살표로 넘기고 Enter로 뒤집습니다."
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); if (e.key === 'Enter') onCard(norm); }}
        onPointerDown={(e) => { drag.current = { on: true, x: e.clientX, dx: 0 }; }}
        onPointerMove={(e) => { if (drag.current.on) drag.current.dx = e.clientX - drag.current.x; }}
        onPointerUp={() => { const { dx } = drag.current; drag.current.on = false; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }}
      >
        {CARD_LIST.map((c, i) => {
          const d = dist(i); const ad = Math.abs(d); const I = CAR_ICON[i];
          return (
            <div key={c.name} className="arc-slot" style={{ width: cw, height: ch, transformOrigin: `center ${Math.round(cw * 4.1)}px`, transform: `translateX(-50%) rotate(${d * ARC}deg)`, zIndex: 100 - ad }}>
              <button type="button" className={`flipcard${flip === i ? ' flipped' : ''}`} onClick={() => { if (Math.abs(drag.current.dx) < 6) onCard(i); }} aria-label={`${c.name} ${flip === i ? '앞면 보기' : '뒷면 보기'}`}>
                <span className={`face front ${c.cls}`}>
                  <span className="tc-top"><span className="tc-ic"><I size={30} strokeWidth={1.8} /></span><span className="tc-g">{c.g}</span></span>
                  <span className="tc-bot"><b>{c.name}</b><em>{c.cap}</em></span>
                  <span className="dim" style={{ opacity: ad < 0.5 ? 0 : Math.min(0.45, ad * 0.22) }} />
                </span>
                <span className={`face back ${c.cls}`}>
                  <b className="bk-t">{c.name}</b>
                  {c.back.map(([k, v]) => <span key={k} className="bk-row"><em>{k}</em><span>{v}</span></span>)}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DesignSystem() {
  const [w, setW] = useState(700);
  return (
    <section className="con-ds" id="ds">
      <div className="ds-head">
        <Txt badge={DS.badge} title={DS.title} sub={DS.sub} />
        <a className="ds-link" href={LINKS.figma} target="_blank" rel="noreferrer">피그마 디자인 시스템<ArrowUpRight size={16} strokeWidth={2} /></a>
      </div>
      <div className="ds-grid">
        <div className="ds-cell ds-type image">
          <p className="ds-k">01 Typography</p>
          <p className="ds-aa" style={{ fontWeight: w }}>Aa 가</p>
          <p className="ds-fname">{DS.font.name}<span>{DS.font.note}</span></p>
          <div className="ds-weights" role="radiogroup" aria-label="굵기">
            {DS.weights.map((x) => <button key={x.w} type="button" role="radio" aria-checked={w === x.w} className={w === x.w ? 'on' : ''} onClick={() => setW(x.w)} style={{ fontWeight: x.w }}><b>{x.w}</b><span>{x.u}</span></button>)}
          </div>
        </div>
        <div className="ds-cell ds-scale image">
          <p className="ds-k">02 Type Scale</p>
          <ul>{DS.scale.map((x) => <li key={x.k}><span className="ds-tag">{x.k}<em>{x.px}</em></span><span className="ds-sample" style={{ fontSize: `min(${x.px}px, ${(x.px / 14.4).toFixed(2)}vw + 6px)`, fontWeight: x.w }}>{x.s}</span></li>)}</ul>
        </div>
        <div className="ds-cell ds-color image">
          <p className="ds-k">03 Color</p>
          <div className="ds-sw">{DS.colors.map((c) => <div key={c.role} className="sw"><span className="chip" style={{ background: c.hex }} /><b>{c.role}</b><code>{c.hex}</code><em>{c.u}</em></div>)}</div>
        </div>
        <div className="ds-cell ds-icons image">
          <p className="ds-k">04 Icon</p>
          <div className="ig">{DS_ICONS.map((I, i) => <span key={i}><I size={26} strokeWidth={DS.icons.stroke} /></span>)}</div>
          <p className="ds-note">{DS.icons.set} 선 굵기 {DS.icons.stroke}, 크기 {DS.icons.sizes.join(', ')}</p>
        </div>
      </div>
      <DesignQA />
    </section>
  );
}

function ScreenSection({ sc, first = false }) {
  const dark = sc.dark || first;
  return (
    <section className={`con-scr${dark ? ' bg-bk' : ''}${sc.kind === 'phone' ? ' phone-row' : ''}${first ? ' has-word' : ''}`} id={`scr-${sc.id}`}>
      <div className="scr-head">
        <Txt badge={first ? `03 Develop  ${sc.en}` : sc.en} title={sc.title} light={dark} />
      </div>
      <AutoScreen route={sc.route} role={sc.role} kind={sc.kind || 'desktop'} poster={sc.poster} title={`${sc.name} 실제 화면`} steps={sc.steps} />
    </section>
  );
}

// 스크롤하면 협약 승용차 막대가 0대에서 20대까지 따라 움직인다
function ShortageScrub() {
  const ref = useRef(null);
  const [cars, setCars] = useState(0);
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top top', end: '+=90%', pin: true, scrub: 0.6,
      onUpdate: (self) => setCars(Math.round(self.progress * 20)),
    });
    return () => st.kill();
  }, []);
  return (
    <section className="con15" id="shortage" ref={ref}>
      <div className="sh-row">
        <div>
          <Txt badge={SHORTAGE.badge} title={SHORTAGE.title} sub={SHORTAGE.sub} />
          <p className="sh-hint">아래로 내리면 승용차가 한 대씩 늘어납니다.</p>
        </div>
        <ShortageCalc value={cars} onChange={setCars} />
      </div>
    </section>
  );
}

// 스크롤 강조: 화면이 들어올 때 작게 시작해 제자리로 커지고, 사진과 큰 단어는 스크롤 속도와 다르게 움직인다
function useScrollEmphasis() {
  useLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.con-scr .auto-stage').forEach((el) => {
        gsap.fromTo(el, { scale: 0.82, yPercent: 10, opacity: 0.35 }, { scale: 1, yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 25%', scrub: 0.8 } });
      });
      gsap.utils.toArray('.con-scr .auto-steps').forEach((el) => {
        gsap.fromTo(el, { y: 80 }, { y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 40%', scrub: 0.8 } });
      });
      gsap.utils.toArray('[data-slide]').forEach((el) => {
        gsap.fromTo(el, { xPercent: 22, opacity: 0.2 }, { xPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 45%', scrub: 0.8 } });
      });
      gsap.utils.toArray('.ch-bg').forEach((el) => {
        gsap.fromTo(el, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      gsap.utils.toArray('.fire-photos .ph-in img').forEach((el) => {
        gsap.fromTo(el, { yPercent: -16 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      gsap.utils.toArray('.net-hub, .lg-out b').forEach((el) => {
        gsap.fromTo(el, { scale: 0.7 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 50%', scrub: 0.8 } });
      });
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => { clearTimeout(t); ctx.revert(); };
  }, []);
}

// 머리 메뉴: 심사위원이 네 단계로 바로 건너가도록 누르면 그 장으로 이동하고 지금 장을 표시한다
const STAGES = [['discover', 'Discover'], ['define', 'Define'], ['develop', 'Develop'], ['deliver', 'Deliver']];
function StageNav() {
  const [cur, setCur] = useState('');
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => {
      setShow(window.scrollY > window.innerHeight * 0.6);
      let c = '';
      STAGES.forEach(([id]) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) c = id; });
      setCur(c);
    };
    on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on);
  }, []);
  const go = (id) => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' }); };
  return (
    <nav className={`stage-nav${show ? ' on' : ''}`} aria-label="단계 이동">
      {STAGES.map(([id, en], i) => (
        <button key={id} type="button" className={cur === id ? 'cur' : ''} onClick={() => go(id)} aria-current={cur === id ? 'true' : undefined}>
          <em>{String(i + 1).padStart(2, '0')}</em>{en}<i />
        </button>
      ))}
    </nav>
  );
}

export default function CaseV3() {
  usePlusXMotion();
  useCountUp();
  useScrollEmphasis();
  return (
    <div className="portfolio">
      <StageNav />

      <section className="con1" id="cover">
        <div className="hero">
          <div className="hero-bg" />
          <img className="h-obj h-tile" src="/v3/tile.webp" alt="" width="1240" height="1233" />
          <img className="h-obj h-van" src="/v3/obj-van.webp" alt="" width="886" height="583" />
          <img className="h-obj h-phone" src="/v3/obj-phone.webp" alt="" width="890" height="779" />
          <div className="hero-txt">
            <span className="badge">{HERO.badge}</span>
            <h1>{HERO.title}</h1>
            <p>{HERO.sub}</p>
          </div>
        </div>
        <div className="bg-wh" />
      </section>

      <section className="con2" id="overview">
        <div className="bg"><span /></div>
        <div className="box-wh">
          <div className="ov-objs" aria-hidden="true">
            <img className="image o-tile" src="/v3/tile.webp" alt="" width="1240" height="1233" />
            <img className="image o-wheel" src="/v3/obj-wheelchair.webp" alt="" width="900" height="796" />
          </div>
          <Txt badge={OVERVIEW.badge} title={OVERVIEW.title} sub={OVERVIEW.sub} />
        </div>
      </section>

      <Showcase v="brand" />

      <Diamond />

      {/* 01 Discover */}
      <Chapter id="discover" photo={PHOTOS.chapter1} />

      <section className="con3" id="context">
        <div className="bg"><span /></div>
        <Txt badge={CONTEXT.badge} title={CONTEXT.title} sub={CONTEXT.sub} />
        <div className="fires item-wrap">
          {FIRES.map((f) => (
            <div key={f.y} className="fire item">
              <p className="fire-y">{f.y}</p><p className="fire-t">{f.t}</p>
              <div className="fire-n">{f.facts.map((x) => <div key={x.k}><b>{x.n}<em>{x.u}</em></b><span>{x.k}</span></div>)}</div>
              <p className="fire-src">{f.src}</p>
            </div>
          ))}
        </div>
        <div className="graph-wrap">
          <div className="graph">
            <div className="year">{CONTEXT.rows.map((r, i) => <p key={i} className={i === 1 ? 'now' : ''}><span>{r.time}</span><span>{r.text}</span></p>)}</div>
            <div className="bar-wrap">
              {CONTEXT.rows.map((r, i) => (
                <div key={i} className={`bar${i === 1 ? ' now' : ''}`} style={{ width: `${r.w * 100}%` }}>
                  <span />{i === 1 ? <em className="badg">{CONTEXT.badgeText}</em> : null}
                </div>
              ))}
            </div>
          </div>
          <p className="src">{CONTEXT.src}</p>
        </div>
        {PHOTOS.fires?.length ? (
          <div className="fire-photos mockup-wrap">
            {PHOTOS.fires.map((p) => <figure key={p.src} className="image"><div className="ph-in"><img src={p.src} alt={p.t} loading="lazy" /></div><figcaption>{p.t}</figcaption></figure>)}
          </div>
        ) : null}
      </section>

      <Situation />

      <Interview />

      <section className="con6" id="research">
        <div className="bg" /><div className="bg" />
        <Txt badge={RESEARCH.badge} title={RESEARCH.title} />
        <div className="content">
          {[0, 1].map((col) => (
            <div className="box-wrap" key={col}>
              {RESEARCH.cards.filter((_, i) => i % 2 === col).map((c) => (
                <div key={c.who} className="box">
                  <span className="user">{c.who}</span>
                  <p className="title">“{c.q}”</p>
                  <p className="change"><b>반영</b>{c.c}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 02 Define */}
      <section className="bg-bk con-map dark-map" id="define">
        <BigWord id="define" />
        <Txt badge={`02 Define  ${MAP.badge}`} title={MAP.title} sub={[CHAPTER.define.lead]} light />
        <div className="map-wrap"><StakeholderMap /></div>
      </section>

      <section className="bg-bk con-def" id="problem">
        <Txt badge={DEFINE.badge} title={DEFINE.title} light />
        <div className="hmw item-wrap">
          <p className="hmw-k">{HMW.badge}</p>
          {HMW.items.map((h, i) => <div key={h} className="item hmw-it"><span>{String(i + 1).padStart(2, '0')}</span><p>{h}</p></div>)}
        </div>
      </section>

      <AsIsToBe />
      <Roles />

      {/* 03 Develop */}
      <section className="bg-bk con7" id="develop">
        <BigWord id="develop" />
        <Txt badge="03 Develop  Concept" title={['끊긴 연결을 잇기 위해', '약속 네 가지를 세웠습니다.']} sub={['화면보다 먼저 사람과 기관이 불이 나기 전에 맺는 약속을 설계했습니다.']} light />
        <div className="content boxes boxes2">
          {[[0, 1], [2, 3]].map((col, ci) => (
            <div className="box-wrap" key={ci}>
              {col.map((i) => {
                const b = DEFINE.boxes[i]; const I = DICON[b.icon];
                return (
                  <div className="box" key={b.eng}>
                    <div className="box-bg" />
                    <div className="box-inner">
                      <div className="box-top"><span className="d-icon"><I size={26} strokeWidth={2} /></span><p className="eng">{b.eng}</p></div>
                      <div className={`d-img${b.img.includes('def-') ? ' ph' : ''}`}><img src={b.img} alt="" loading="lazy" /></div>
                      <div className="title-sub"><span>{b.t}</span><span>{b.s}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {SCREENS.slice(0, 1).map((sc) => <ScreenSection key={sc.id} sc={sc} first />)}
      <Showcase v="line" />
      {SCREENS.slice(1, 4).map((sc) => <ScreenSection key={sc.id} sc={sc} />)}
      <ShortageScrub />
      {SCREENS.slice(4).map((sc) => <ScreenSection key={sc.id} sc={sc} />)}
      <Cars />

      <Blueprint />
      <LogicLab />
      <AILab />
      <DispatchFlow />
      <Access />
      <Architecture />
      <DesignSystem />

      {/* 04 Deliver */}
      <section className="bg-bk ch-mini" id="deliver">
        <BigWord id="deliver" />
        <Txt badge="04 Deliver" title={[CHAPTER.deliver.lead]} light />
      </section>
      <Redesign />

      <section className="con17" id="used">
        <Txt badge={USED.badge} title={USED.title} />
        <div className="ut-lead">
          <div className="ut-who">
            <b>{USED.lead.who}</b><span>{USED.lead.org}</span>
            <p className="ut-used">{USED.lead.used}</p>
            <p className="ut-q">“{USED.lead.quote}”</p>
          </div>
          <ol className="ut-pairs item-wrap">
            {USED.lead.pairs.map((x, i) => (
              <li key={x.said} className="item"><span className="ut-n">{String(i + 1).padStart(2, '0')}</span><p className="ut-said">{x.said}</p><p className="ut-did"><em>반영</em>{x.did}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="con-ut2 nice bg-bk">
        <div className="nice-head"><Txt badge="Reviewers" title={['현장과 학계, 시민사회에서', '화면을 보고 의견을 보탠 분들']} light /></div>
        <ul className="nice-l">
          {USED.people.map((x, i) => (
            <li key={x.who} className="nice-it">
              <span className="nice-n">{String(i + 1).padStart(2, '0')}</span>
              <p className="nice-q">“{x.quote}”</p>
              <b className="nice-k">{x.who}</b>
              <span className="nice-o">{x.org}</span>
              <p className="nice-d"><em>반영</em>{x.did}</p>
            </li>
          ))}
        </ul>
      </section>

      <Network />
      <Impact />

      <section className="plus" id="credits">
        <div className="plus-bg" style={PHOTOS.credits ? { backgroundImage: `url(${PHOTOS.credits})` } : undefined} />
        <div className="plus-in">
          <img src="/v3/tile.webp" alt="" width="1240" height="1233" className="cr-tile" />
          <p className="cr-name">{CREDITS.name}</p>
          <p className="cr-sub">{CREDITS.sub}</p>
          <dl className="cr-list">
            <div><dt>Team</dt><dd>{CREDITS.team}</dd></div>
            <div><dt>Members</dt><dd className="cr-team">{CREDITS.people.map((n) => <span key={n}>{n}</span>)}</dd></div>
            <div><dt>Course</dt><dd>{CREDITS.course}</dd></div>
          </dl>
          <div className="cr-links">{CREDITS.links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}<ArrowUpRight size={14} strokeWidth={2} /></a>)}</div>
        </div>
      </section>
    </div>
  );
}

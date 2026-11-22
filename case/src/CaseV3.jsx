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
} from 'lucide-react';
import './caseV3.css';
import { LiveScreen, driveHelper } from './Live.jsx';
import { buildSeed } from '../../client/src/mock/seed.js';
import { computeShortage } from '../../client/src/lib/shortageCalc.js';
import {
  LINKS, HERO, OVERVIEW, CONTEXT, INTERVIEW, RESEARCH, MAP, PARTNERS, DEFINE, DS, CONSOLE, AI, SHORTAGE, CARS, SYSTEM, DELIVER, CREDITS,
  DIAMOND, CHAPTER, RESEARCH_N, HMW, BLUEPRINT, LOGIC, PIPE, NETWORK, SCREENS, PHOTOS, FIRES,
} from './caseCopy3.js';
import { AutoScreen } from './Autoplay.jsx';

gsap.registerPlugin(ScrollTrigger);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Lines = ({ lines }) => lines.map((l, i) => <span key={i} className="ln">{l}</span>);
const Txt = ({ badge, title, sub, en = false, light = false }) => (
  <div className={`txt-wrap${light ? ' on-dark' : ''}`}>
    <span className="badge">{badge}</span>
    <p className={`txt-title${en ? ' en' : ''}`}><Lines lines={title} /></p>
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
      const big = document.querySelector('.con8 .txt-img');
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
  { d: [[212, 242], [405.6, 242]], c: 'r', n: ['tong'], t: '그날 올지 확인한 적 없음', tx: 309, ty: 266, a: 'middle' },
  { d: [[571.5, 226], [763, 226]], c: 'r', n: ['taxi'], t: '차가 그날 올지 약속 없음', tx: 667, ty: 212, a: 'middle' },
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
const DS_ICONS = [House, FileText, Users, MapIcon, Car, Bell, Flame, ClipboardCheck, Phone, Shield, Calendar, Accessibility, Bus, Send, Settings, Smartphone, Database, Siren];
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

function Diamond() {
  return (
    <section className="con-dd" id="process">
      <Txt badge={DIAMOND.badge} title={DIAMOND.title} />
      <div className="dd image">
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
              <b>{st.en}</b><span>{st.ko}</span><em>{st.did}</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chapter({ id, photo, dark = false }) {
  const c = CHAPTER[id];
  return (
    <section className={`chapter${dark ? ' dark' : ''}${photo ? ' ph' : ''}`} id={id}>
      {photo ? <div className="ch-bg" style={{ backgroundImage: `url(${photo})` }} /> : null}
      <div className="ch-in">
        <p className="ch-n">{c.n}</p>
        <p className="ch-en" data-slide>{c.en}</p>
        <p className="ch-ko image">{c.ko}</p>
        <p className="ch-lead image">{c.lead}</p>
      </div>
    </section>
  );
}

function Blueprint() {
  const ref = useRef(null);
  const [col, pick] = useCycle(BLUEPRINT.stages.length, 2600, ref);
  return (
    <section className="con-bp" id="blueprint" ref={ref}>
      <Txt badge={BLUEPRINT.badge} title={BLUEPRINT.title} sub={BLUEPRINT.sub} />
      <div className="bp-wrap image">
        <div className="bp" style={{ '--cols': BLUEPRINT.stages.length }}>
          <div className="bp-corner">단계</div>
          {BLUEPRINT.stages.map((st, i) => (
            <button key={st.t} type="button" className={`bp-stage${i === col ? ' on' : ''}`} onClick={() => pick(i)}>
              <span>{String(i + 1).padStart(2, '0')}</span><b>{st.t}</b><em>{st.s}</em>
            </button>
          ))}
          {BLUEPRINT.lanes.map((ln) => (
            <div className="bp-row" key={ln.t} style={{ display: 'contents' }}>
              <div className="bp-lane"><b>{ln.t}</b>{ln.tag ? <em>{ln.tag}</em> : null}</div>
              {ln.cells.map((c, i) => <div key={i} className={`bp-cell${i === col ? ' on' : ''}`}>{c}</div>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Logic() {
  const ref = useRef(null);
  const [k, pick] = useCycle(LOGIC.rules.length + 1, 1500, ref);
  return (
    <section className="con-logic" id="logic" ref={ref}>
      <Txt badge={LOGIC.badge} title={LOGIC.title} sub={LOGIC.sub} />
      <div className="lg image">
        <div className="lg-col">
          <p className="lg-h">입력</p>
          {LOGIC.inputs.map((x) => <div className="lg-in" key={x.t}><b>{x.t}</b><span>{x.s}</span></div>)}
        </div>
        <div className="lg-col rules">
          <p className="lg-h">계산과 배정 규칙</p>
          {LOGIC.rules.map((x, i) => (
            <button type="button" key={x.t} className={`lg-rule${i === k ? ' on' : ''}${i < k ? ' past' : ''}`} onClick={() => pick(i)}>
              <span>{i + 1}</span><b>{x.t}</b><em>{x.s}</em>
            </button>
          ))}
        </div>
        <div className="lg-col">
          <p className="lg-h">결과</p>
          <div className={`lg-out${k === LOGIC.rules.length ? ' on' : ''}`}><b><span data-count={LOGIC.result.n}>{LOGIC.result.n}</span>명</b><span>{LOGIC.result.t}</span><em>{LOGIC.result.s}</em></div>
          <p className="lg-why"><b>옮기지 못하는 사유</b>{LOGIC.reasons.join(', ')}</p>
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  const ref = useRef(null);
  const [k, pick] = useCycle(PIPE.steps.length, 1400, ref);
  return (
    <section className="con-pipe" id="pipeline" ref={ref}>
      <Txt badge={PIPE.badge} title={PIPE.title} />
      <div className="pp image">
        <div className="pp-track"><i style={{ width: `${(k / (PIPE.steps.length - 1)) * 100}%` }} /></div>
        {PIPE.steps.map((x, i) => (
          <button type="button" key={x.t} className={`pp-st${i === k ? ' on' : ''}${i < k ? ' past' : ''} t-${x.tag === 'AI' ? 'ai' : x.tag === '사람 확인' ? 'hu' : x.tag === '입력' ? 'in' : 'ru'}`} onClick={() => pick(i)}>
            <em>{x.tag}</em><b>{x.t}</b><span>{x.s}</span>
          </button>
        ))}
      </div>
      <p className="pp-stops image"><b>멈추는 경우</b>{PIPE.stops.join(', ')}</p>
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
      <div className="net image">
        {NETWORK.groups.map((g) => {
          const I = NET_ICON[g.id];
          return (
            <button type="button" key={g.id} className={`net-g p-${g.pos} g-${g.id}${sel === g.id ? ' on' : ''}`} onClick={() => setSel(g.id)} aria-pressed={sel === g.id}>
              <p className="net-name"><I size={20} strokeWidth={2} />{g.name}<em>{g.chips.length}</em></p>
              <p className="net-names">{g.chips.join(', ')}</p>
            </button>
          );
        })}
        <div className="net-hub"><img src="/v3/tile.webp" alt="" width="1240" height="1233" /><b>미리</b>
          <span className="net-ar a-top" /><span className="net-ar a-left" /><span className="net-ar a-right" /><span className="net-ar a-bottom" />
        </div>
      </div>
      <ul className="net-detail" key={sel}>{detail[sel].map((x) => <li key={x.n}><b>{x.n}</b><span>{x.r}</span></li>)}</ul>
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
    </section>
  );
}

function ScreenSection({ sc, flip }) {
  return (
    <section className={`con-scr${sc.dark ? ' bg-bk' : ''}${sc.kind === 'phone' ? ' phone-row' : ''}${flip ? ' flip' : ''}`} id={`scr-${sc.id}`}>
      <div className="scr-head">
        <Txt badge={sc.en} title={sc.title} light={!!sc.dark} />
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
          <div className="sh-meter"><span style={{ width: `${(cars / 20) * 100}%` }} /></div>
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
      gsap.utils.toArray('.dd-shape').forEach((el) => {
        const len = el.getTotalLength();
        gsap.fromTo(el, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: el.closest('.dd'), start: 'top 85%', end: 'top 35%', scrub: 0.8 } });
      });
      gsap.utils.toArray('.net-hub, .lg-out b').forEach((el) => {
        gsap.fromTo(el, { scale: 0.7 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 50%', scrub: 0.8 } });
      });
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => { clearTimeout(t); ctx.revert(); };
  }, []);
}

export default function CaseV3() {
  usePlusXMotion();
  useCountUp();
  useScrollEmphasis();
  return (
    <div className="portfolio">
      <header className="top">
        <a href="#" className="logo" aria-label="미리 처음으로"><img src="/v3/tile.webp" alt="" width="28" height="28" />미리</a>
        <nav className="top-dd" aria-label="단계">{DIAMOND.stages.map((st) => <button key={st.id} type="button" onClick={() => go(st.id)}>{st.en}</button>)}</nav>
        <a className="top-link" href={LINKS.service} target="_blank" rel="noreferrer">체험<ArrowUpRight size={14} strokeWidth={2} /></a>
      </header>

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
        <div className="facts item-wrap">
          {OVERVIEW.facts.map((f) => <div key={f.t} className="fact item"><p><b data-count={f.n}>{f.n}</b>{f.u}</p><span>{f.t}</span></div>)}
        </div>
      </section>

      <Diamond />

      {/* 01 Discover */}
      <Chapter id="discover" photo={PHOTOS.chapter1} dark />

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

      <section className="con4" id="interview">
        <div className="bg"><span /></div>
        <div className="iv-row">
          <div>
            <Txt badge={INTERVIEW.badge} title={INTERVIEW.title} sub={INTERVIEW.sub} />
            <div className="rn item-wrap">{RESEARCH_N.map((x) => <div key={x.t} className="item rn-it"><p><b data-count={x.n}>{x.n}</b>{x.u}</p><span>{x.t}</span>{x.s ? <em>{x.s}</em> : null}</div>)}</div>
          </div>
          <div className="iv-chats">
            {INTERVIEW.chats.map((c) => (
              <div key={c.q} className="badge-img chat"><span className="badge-bg" /><p className="badge-txt"><span />{c.q}<em>{c.who}</em></p></div>
            ))}
          </div>
        </div>
      </section>

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
                  <p className="change"><b>바뀐 설계</b>{c.c}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 02 Define */}
      <Chapter id="define" />

      <section className="con-map" id="map">
        <Txt badge={MAP.badge} title={MAP.title} />
        <div className="map-wrap"><StakeholderMap /></div>
      </section>

      <section className="bg-bk con-def" id="problem">
        <Txt badge={DEFINE.badge} title={DEFINE.title} light />
        <div className="hmw item-wrap">
          <p className="hmw-k">{HMW.badge}</p>
          {HMW.items.map((h, i) => <div key={h} className="item hmw-it"><span>{String(i + 1).padStart(2, '0')}</span><p>{h}</p></div>)}
        </div>
      </section>

      {/* 03 Develop */}
      <Chapter id="develop" />

      <section className="bg-bk con7" id="promise">
        <Txt badge="Concept" title={['끊긴 연결을 잇기 위해', '약속 네 가지를 세웠습니다.']} sub={['화면보다 먼저 사람과 기관이 불이 나기 전에 맺는 약속을 설계했습니다.']} light />
        <div className="content boxes">
          {[[0], [1, 2], [3]].map((col, ci) => (
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

      <Blueprint />
      <Logic />
      <Pipeline />

      <section className="con-sys" id="system">
        <Txt badge={SYSTEM.badge} title={SYSTEM.title} />
        <div className="sys-grid">
          <div className="sys-stack item-wrap">{SYSTEM.stack.map((x) => { const I = STACK_ICON[x.icon]; return <div key={x.k} className="item st"><span className="st-icon"><I size={22} strokeWidth={2} /></span><b>{x.k}</b><p>{x.v}</p></div>; })}</div>
          <div className="sys-data image">
            <p className="ds-k">공공데이터 9종</p>
            <p className="sys-list">{SYSTEM.data.join(', ')}</p>
            <p className="ds-note">{SYSTEM.dataNote}</p>
          </div>
          <div className="sys-plat image">
            <p className="ds-k">민관협력 지원 플랫폼</p>
            <div className="plat-n">{SYSTEM.platform.map((x) => <div key={x.t}><b>{x.n}</b><span>{x.t}</span>{x.s ? <em>{x.s}</em> : null}</div>)}</div>
            <p className="ds-note">{SYSTEM.platformNote}</p>
          </div>
        </div>
      </section>

      <Network />
      <DesignSystem />

      {/* 04 Deliver */}
      <Chapter id="deliver" dark />

      {SCREENS.slice(0, 4).map((sc, i) => <ScreenSection key={sc.id} sc={sc} flip={i % 2 === 1} />)}
      <ShortageScrub />
      {SCREENS.slice(4).map((sc, i) => <ScreenSection key={sc.id} sc={sc} flip={i % 2 === 1} />)}

      <section className="bg-bk con16" id="cars">
        <div className="cars-row">
          <Txt badge={CARS.badge} title={CARS.title} sub={CARS.sub} light />
          <div className="cards item-wrap">
            {CARS.cards.map((c, i) => <div key={c.name} className={`card item c${i}${c.dark ? ' lightcard' : ''}`} style={{ background: c.c }}><span>{c.sub}</span><b>{c.name}</b></div>)}
          </div>
        </div>
      </section>

      <section className="con17" id="used">
        <Txt badge={DELIVER.badge} title={DELIVER.title} />
        <div className="dl-list item-wrap">{DELIVER.rows.map((r) => <div className="item dl" key={r.who}><b>{r.who}</b><span>{r.used}</span><p><em>바뀐 설계</em>{r.c}</p></div>)}</div>
      </section>

      <section className="plus" id="credits">
        <div className="plus-bg" style={PHOTOS.credits ? { backgroundImage: `url(${PHOTOS.credits})` } : undefined} />
        <div className="plus-in">
          <img src="/v3/tile.webp" alt="" width="1240" height="1233" className="cr-tile" />
          <p className="cr-name">{CREDITS.name}</p>
          <p className="cr-sub">{CREDITS.sub}</p>
          <dl className="cr-list">
            <div><dt>Team</dt><dd>{CREDITS.team}</dd></div>
            <div><dt>Members</dt><dd>{CREDITS.people.join(', ')}</dd></div>
            <div><dt>Course</dt><dd>{CREDITS.course}</dd></div>
          </dl>
          <div className="cr-links">{CREDITS.links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}<ArrowUpRight size={14} strokeWidth={2} /></a>)}</div>
        </div>
      </section>
    </div>
  );
}

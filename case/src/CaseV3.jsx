// 미리 케이스 스터디 v3. 플러스엑스 T Universe 상세 페이지(plus-ex.com/experience#tuniverse)의 장 순서, 여백, 둥근 모서리,
// 스크롤 연출 값을 그대로 옮겼다. 연출 코드는 원본 initPageEvent와 같은 GSAP ScrollTrigger 설정을 쓴다(tmp/plusex/source_inline.js).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Accessibility, Flame, Landmark, Bus, Car, Users, HeartHandshake, Building2, House, FileText, Map as MapIcon, Bell,
  ClipboardCheck, Phone, Shield, Calendar, Send, Settings, X, ArrowUpRight,
} from 'lucide-react';
import './caseV3.css';
import { LiveScreen, driveHelper } from './Live.jsx';
import { buildSeed } from '../../client/src/mock/seed.js';
import { computeShortage } from '../../client/src/lib/shortageCalc.js';
import {
  LINKS, OVERVIEW, CONTEXT, INTERVIEW, RESEARCH, MAP, DEFINE, INSIGHT, UI, CONSOLE, MOBILE, AI, SHORTAGE, CARS, DELIVER, AWARD, CREDITS,
} from './caseCopy3.js';

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
function ShortageCalc() {
  const [cars, setCars] = useState(0);
  const all = useMemo(() => Array.from({ length: SHORTAGE.max + 1 }, (_, n) => runCalc(n)), []);
  const r = all[cars]; const v = r.total; const { names } = inputOf();
  const villages = useMemo(() => Object.entries(all[0].byVillage).filter(([, x]) => x.total > 0).sort((a, b) => b[1].total - a[1].total).map(([code, x]) => ({ code, name: names[code] || code, start: x.total })), [all, names]);
  const vmax = useMemo(() => Math.max(1, ...all.flatMap((x) => villages.map((vg) => x.byVillage[vg.code]?.total || 0))), [all, villages]);
  return (
    <div className="calc">
      <div className="calc-top">
        <label htmlFor="cars" className="calc-lb">{SHORTAGE.label}</label>
        <b className="calc-cars">{cars}대</b>
      </div>
      <input id="cars" className="slider" type="range" min="0" max={SHORTAGE.max} value={cars} style={{ '--p': `${(cars / SHORTAGE.max) * 100}%` }} onChange={(e) => setCars(Number(e.target.value))} aria-valuetext={`승용차 ${cars}대`} />
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

export default function CaseV3() {
  usePlusXMotion();
  const [open, setOpen] = useState(null);
  const scr = (id) => CONSOLE.screens.find((s) => s.id === id);
  return (
    <div className="portfolio">
      <header className="top">
        <a href="#" className="logo" aria-label="미리 처음으로"><img src="/v3/tile.webp" alt="" width="28" height="33" />미리</a>
        <a className="top-link" href={LINKS.service} target="_blank" rel="noreferrer">서비스 열기<ArrowUpRight size={14} strokeWidth={2} /></a>
      </header>

      {/* con1 표지 */}
      <section className="con1" id="cover">
        <div className="hero">
          <div className="hero-bg" />
          <img className="h-obj h-tile" src="/v3/tile.webp" alt="" width="826" height="962" />
          <img className="h-obj h-van" src="/v3/obj-van.webp" alt="" width="886" height="702" />
          <img className="h-obj h-phone" src="/v3/obj-phone.webp" alt="" width="890" height="890" />
          <div className="hero-txt">
            <span className="badge">Civic Tech Service Design</span>
            <h1>미리</h1>
            <p>동해시 재난취약자 사전 이송 서비스</p>
          </div>
        </div>
        <div className="bg-wh" />
      </section>

      {/* con2 OVERVIEW */}
      <section className="con2" id="overview">
        <div className="bg"><span /></div>
        <div className="box-wh">
          <Txt badge={OVERVIEW.badge} title={OVERVIEW.title} sub={OVERVIEW.sub} en />
        </div>
        <img className="image o-tile" src="/v3/tile.webp" alt="" width="826" height="962" />
        <img className="image o-wheel" src="/v3/obj-wheelchair.webp" alt="" width="900" height="900" />
        <img className="image o-van" src="/v3/obj-van.webp" alt="" width="886" height="702" />
      </section>

      {/* con3 CONTEXT 막대 */}
      <section className="con3" id="context">
        <div className="bg"><span /></div>
        <Txt badge={CONTEXT.badge} title={CONTEXT.title} sub={CONTEXT.sub} />
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
      </section>

      {/* con4 현장 면담 말풍선 */}
      <section className="con4" id="interview">
        <div className="bg"><span /></div>
        <Txt badge={INTERVIEW.badge} title={INTERVIEW.title} sub={INTERVIEW.sub} />
        <div className="bg-txt-wrap">
          <div className="big-words" aria-hidden="true">{INTERVIEW.words.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="badge-img-wrap">
            {INTERVIEW.chats.map((c) => (
              <div key={c} className="badge-img chat"><span className="badge-bg" /><p className="badge-txt"><span />{c}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* con5 목업과 키워드 */}
      <section className="con5">
        <div className="img-wrap-row mockup-wrap">
          <div className="mockup image"><img src="/v3/mock-hand.webp" alt="도우미 휴대폰에 온 배정 알림 화면" width="1040" height="1300" /></div>
          <div className="icons">
            <div className="keyword image">
              <div className="chips">{INTERVIEW.keywords.map((k, i) => <span key={k} className={i % 3 === 1 ? 'on' : ''}>{k}</span>)}</div>
            </div>
            <div className="wallet-wrap">
              <div className="op-5 image"><img src="/v3/obj-wheelchair.webp" alt="" width="900" height="900" /></div>
              <div className="op-5 image corner"><img src="/v3/tile.webp" alt="" width="826" height="962" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* con6 사용자 리서치 카드 */}
      <section className="con6" id="research">
        <div className="bg" /><div className="bg" />
        <Txt badge={RESEARCH.badge} title={RESEARCH.title} />
        <div className="content">
          {[0, 1].map((col) => (
            <div className="box-wrap" key={col}>
              {RESEARCH.cards.filter((_, i) => i % 2 === col).map((c) => (
                <div key={c.title} className={`box${c.kind === 'p' ? ' photo' : ''}`}>
                  {c.kind === 'p' ? <img src={c.src} alt="" loading="lazy" width="1800" height="1350" /> : null}
                  <span className="user">{c.user}</span>
                  <p className="title">{c.title}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 이해관계자 지도 */}
      <section className="con-map" id="map">
        <Txt badge={MAP.badge} title={MAP.title} />
        <div className="map-wrap"><StakeholderMap /></div>
      </section>

      {/* 검은 면: Define과 약속 네 가지 */}
      <section className="bg-bk con7" id="define">
        <Txt badge={DEFINE.badge} title={DEFINE.title} sub={DEFINE.sub} light />
        <div className="content boxes">
          {[[0], [1, 2], [3]].map((col, ci) => (
            <div className="box-wrap" key={ci}>
              {col.map((i) => {
                const b = DEFINE.boxes[i];
                return (
                  <div className="box" key={b.eng}>
                    <div className="box-bg" />
                    <div className="box-inner">
                      <p className="eng">{b.eng}</p>
                      <div className="title-sub"><span>{b.t}</span><span>{b.s}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* 검은 면: 현장 사진, 큰 글자, 실제 휴대폰 두 대, 원 도식 */}
      <section className="bg-bk con8" id="insight">
        <div className="bg-img-wrap image">
          <div className="bg-img" />
          <p className="side">{INSIGHT.side.map((s, i) => <span key={i}>{s || '\u00a0'}</span>)}</p>
        </div>
        <div className="animation-y"><p className="txt-img">{INSIGHT.big.map((b) => <span key={b}>{b}</span>)}</p></div>
        <div className="phones">
          <div className="phones-cap image"><Txt badge="Field Mobile" title={['One Plan', 'on Two Phones']} sub={['동 담당자 휴대폰에는 오늘 할 일과 우리 동 인원이, 도우미 휴대폰에는 참여 동의와 배정 알림이 뜹니다. 두 화면 모두 눌러 볼 수 있습니다.']} light en /></div>
          <div className="ph ph1 image"><LiveScreen kind="phone" route="/m/f" role="dong" poster="/v3/phone-dong.webp" title="동 담당자 휴대폰 실제 화면" margin="30%" /></div>
          <div className="ph ph2 image" data-yv="120"><LiveScreen kind="phone" route="/m/h/demo" poster="/v3/phone-helper.webp" title="도우미 휴대폰 실제 화면" margin="30%" /></div>
        </div>
        <div className="circles image">
          <span className="end">Neighbor</span>
          <div className="cc">{INSIGHT.circles.map((c) => <span key={c}>{c}</span>)}</div>
          <span className="end">{INSIGHT.circlesEnd}</span>
        </div>
        <p className="circles-sub image">{INSIGHT.circlesSub}</p>
      </section>

      {/* con10 UI 요소 */}
      <section className="con10" id="ui">
        <Txt badge={UI.badge} title={['Pretendard GOV']} sub={[UI.fontNote]} en />
        <div className="aa image"><span className="b">Aa</span><span className="r">Aa</span></div>
        <div className="aa-meta image"><p><b>Bold</b>제목과 수치</p><p><b>Regular</b>본문과 표</p></div>
        <div className="swatches item-wrap">
          {UI.colors.map((c) => (
            <div key={c.name} className="sw item">
              <p>{c.name}</p>
              <div className="chip" style={{ background: c.hex, color: c.on }}>{c.hex}</div>
              {c.pair ? <div className="chip pair">{c.pair}</div> : null}
            </div>
          ))}
        </div>
        <img className="image-point p-tile" src="/v3/tile.webp" alt="" width="826" height="962" />
      </section>

      {/* con11 정사각 두 칸: 실제 업무 장면과 아이콘 */}
      <section className="con11">
        <div className="grid2">
          <div className="sq image"><img src="/v3/mock-desk.webp" alt="담당자가 현황판을 보며 입력하는 장면" width="1586" height="992" /></div>
          <div className="sq icons-sq image">
            <div className="icon-grid">{[House, FileText, Users, MapIcon, Car, Bell, Flame, ClipboardCheck, Phone, Shield, Calendar, Accessibility, Bus, Send, Settings].map((I, i) => <span key={i}><I size={30} strokeWidth={1.6} /></span>)}</div>
            <p className="sq-cap">Icon Set</p>
          </div>
        </div>
      </section>

      {/* 담당자 웹: 실제 현황판과 화면 여덟 장 */}
      <section className="vid-wrap" id="console">
        <div className="big-words faint" aria-hidden="true"><span>DASHBOARD</span></div>
        <div className="console-row">
          <Txt badge={CONSOLE.badge} title={CONSOLE.title} sub={CONSOLE.sub} en />
          <div className="console-live image"><LiveScreen route="/console" poster="/v3/scr-01.webp" title="현황판 실제 화면" margin="40%" /></div>
        </div>
        <div className="thumbs item-wrap">{CONSOLE.screens.map((s) => <ScreenThumb key={s.id} s={s} onOpen={setOpen} />)}</div>
      </section>

      {/* con13 흰 면 두 칸: 도우미 휴대폰, 파란 면, 빨간 면 */}
      <section className="con13" id="helper">
        <div className="grid2">
          <div className="tall image">
            <Txt badge={MOBILE.badge} title={MOBILE.title} sub={MOBILE.sub} en />
            <HelperDemo />
          </div>
          <div className="col">
            <div className="panel blue image">
              <p className="p-title">{MOBILE.relayTitle}</p>
              <div className="relay">{MOBILE.relay.map((r, i) => <span key={r} className={i ? 'ok' : ''}>{r}</span>)}</div>
              <img className="image-point p-obj" src="/v3/obj-phone.webp" alt="" width="890" height="890" />
            </div>
            <div className="panel red image">
              <p className="p-title">{MOBILE.handTitle}</p>
              <button type="button" className="p-open" onClick={() => setOpen(scr('08'))}>소방 인계 화면 열기<ArrowUpRight size={16} strokeWidth={2} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* 검은 면: AI */}
      <section className="bg-bk con14" id="ai">
        <div className="ai-row">
          <Txt badge={AI.badge} title={AI.title} sub={AI.sub} light en />
          <div className="ai-live image"><LiveScreen route="/console/intake" poster="/v3/scr-03.webp" title="서류 읽기 실제 화면" margin="40%" /></div>
        </div>
        <div className="item-wrap ai-items">
          {AI.items.map((x) => <div className="item ai-it" key={x.k}><span>{x.k}</span><p>{x.v}</p></div>)}
        </div>
        <p className="src on-dark">{AI.src}</p>
      </section>

      {/* 부족분 계산 */}
      <section className="con15" id="shortage">
        <div className="sh-row">
          <div>
            <Txt badge={SHORTAGE.badge} title={SHORTAGE.title} sub={SHORTAGE.sub} en />
            <img className="image-point p-wheel" src="/v3/obj-wheelchair.webp" alt="" width="900" height="900" />
          </div>
          <div className="image"><ShortageCalc /></div>
        </div>
      </section>

      {/* 검은 면: 차 카드와 화면 세 장 */}
      <section className="bg-bk con16" id="cars">
        <div className="cars-row">
          <Txt badge={CARS.badge} title={CARS.title} sub={CARS.sub} light en />
          <div className="cards item-wrap">
            {CARS.cards.map((c, i) => (
              <div key={c.name} className={`card item c${i}${c.dark ? ' lightcard' : ''}`} style={{ background: c.c }}>
                <span>{c.sub}</span><b>{c.name}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="item-wrap three">{CARS.screens.map((id) => <ScreenThumb key={id} s={scr(id)} onOpen={setOpen} />)}</div>
      </section>

      {/* Deliver: 사용 평가와 바뀐 화면 */}
      <section className="con17" id="deliver">
        <div className="dl-row">
          <div className="dl-photo image"><img src="/v3/persona-officer.webp" alt="동 재난 담당자" width="825" height="1100" /></div>
          <div>
            <Txt badge={DELIVER.badge} title={DELIVER.title} sub={DELIVER.sub} />
            <div className="tasks item-wrap">{DELIVER.tasks.map((t, i) => <div className="task item" key={t.t}><span>{String(i + 1).padStart(2, '0')} {t.role}</span><p>{t.t}</p></div>)}</div>
          </div>
        </div>
        <div className="changed item-wrap benefit">
          <p className="badge">Feedback to Screens</p>
          {DELIVER.changed.map((c) => <div className="ch item" key={c.who}><span>{c.who}</span><p>{c.what}</p></div>)}
        </div>
      </section>

      {/* 수상 */}
      <section className="con18" id="award">
        <img className="image-point a-tile" src="/v3/tile.webp" alt="" width="826" height="962" />
        <div>
          <Txt badge={AWARD.badge} title={AWARD.title} />
          <dl className="award item-wrap">{AWARD.rows.map((r) => <div className="item" key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}</dl>
        </div>
      </section>

      {/* 크레딧 */}
      <section className="plus" id="credits">
        <div className="plus-bg" />
        <div className="plus-in">
          <img src="/v3/tile.webp" alt="" width="826" height="962" className="cr-tile" />
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

      <ScreenLayer open={open} onClose={() => setOpen(null)} />
    </div>
  );
}

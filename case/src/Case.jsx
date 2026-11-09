// 미리 케이스 스터디. 위아래로 흐르는 한 문서.
// 스크롤 연출은 Plus X T Universe 실측(아래 60px에서 떠오르기, 묶음 순차 등장, 떠 있는 오브젝트 관성 패럴랙스, 큰 글자 블러 해제, 면 색으로 장 나누기),
// 마이크로인터랙션과 시간, 곡선, 접근성 기준은 case/INTERACTION.md를 따른다.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './case.css';
import { LiveScreen, driveHelper } from './Live.jsx';
// 서비스와 같은 계산 코드와 시연 명부(동해시 공개 통계 기반)
import { buildSeed } from '../../client/src/mock/seed.js';
import { computeShortage } from '../../client/src/lib/shortageCalc.js';
import {
  HERO, OVERVIEW, CONTEXT, FIRST, RESEARCH, MAP, SAYDO, WHYS, DEFINE, HMW, PROMISE, DISPATCH, SHORTAGE, AI, SCREENS, COLLAB, EVALUATE, CREDITS, CHAPTER_OF, SURFACE_OF,
} from './caseCopy.js';

gsap.registerPlugin(ScrollTrigger);

const EASE_OUT = 'power3.out';
const REVEAL = 0.7;
const STAGGER = 0.08;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Lines = ({ lines }) => lines.map((l, i) => <span key={i} className="ln">{l}</span>);
// 본문은 문장마다 새 줄에서 시작해 줄 끝에 문장 조각이 걸리지 않게 함
const Sent = ({ text }) => text.split(/(?<=[가-힣]\.)\s+/).map((s, i) => <span key={i} className="ln">{s}</span>);

// 링크: 손을 올리면 밑줄이 왼쪽부터 그어지고 화살표가 나아감
function MoreLink({ href, children }) {
  return (
    <a className="more" href={href} target="_blank" rel="noreferrer" data-r>
      <span className="u">{children}</span> <span className="arw" aria-hidden="true">→</span>
    </a>
  );
}

let lenisRef = null;

function useMotion() {
  useLayoutEffect(() => {
    const reduced = reducedMotion();
    document.documentElement.classList.add('js');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    const lenis = reduced ? null : new Lenis({ lerp: 0.1, smoothWheel: true, anchors: { offset: 0 } });
    lenisRef = lenis;
    // 실제 화면(iframe) 위에서 굴린 휠을 케이스 페이지 스크롤로 넘긴다
    window.__caseScrollBy = (dy) => {
      if (lenis) window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true }));
      else window.scrollBy(0, dy);
    };
    let raf;
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      raf = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context(() => {
      // 내용을 전하는 반응은 움직임을 줄인 환경에서도 남긴다
      gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.3 } });

      if (reduced) return;

      // 아래 60px에서 떠오르며 나타나기(투명도는 완만하게, 위치는 빨리 감속)
      const rise = (els, stagger = 0) => {
        gsap.to(els, { opacity: 1, duration: 0.6, ease: 'power1.inOut', stagger });
        gsap.to(els, { y: 0, duration: REVEAL, ease: EASE_OUT, stagger });
      };
      gsap.utils.toArray('[data-r]').forEach((el) => {
        if (el.closest('[data-stagger]')) return;
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.delayedCall(Number(el.dataset.d || 0), () => rise(el)) });
      });
      gsap.utils.toArray('[data-stagger]').forEach((g) => {
        const kids = g.querySelectorAll('[data-r]');
        ScrollTrigger.create({ trigger: g, start: 'top 85%', once: true, onEnter: () => rise(kids, STAGGER) });
      });

      // 큰 글자 블러 해제
      gsap.utils.toArray('[data-blur]').forEach((el) => {
        ScrollTrigger.create({ trigger: el, start: 'top 80%', once: true, onEnter: () => gsap.to(el, { opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power2.out' }) });
      });

      // 수치가 0에서 실제 값까지 한 번 세어 올라감
      gsap.utils.toArray('[data-count]').forEach((el) => {
        const target = Number(el.dataset.count);
        const dec = (el.dataset.count.split('.')[1] || '').length;
        const o = { v: 0 };
        el.textContent = (0).toFixed(dec);
        ScrollTrigger.create({
          trigger: el, start: 'top 88%', once: true,
          onEnter: () => gsap.to(o, { v: target, duration: 1, ease: 'power2.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } }),
        });
      });

      // 떠 있는 오브젝트 관성 패럴랙스(시작점을 엇갈려 속도가 달라 보임)
      gsap.utils.toArray('[data-par]').forEach((el, i) => {
        const amt = Number(el.dataset.par);
        gsap.fromTo(el, { yPercent: amt, scale: 0.94 }, {
          yPercent: -amt, scale: 1, ease: 'none',
          scrollTrigger: { trigger: el.parentElement, start: `top ${100 + (i % 3) * 20}%`, end: 'bottom top', scrub: 1.4 },
        });
      });

      const heroShot = document.querySelector('.hero-shot');
      if (heroShot) gsap.fromTo(heroShot, { scale: 0.86, y: 40 }, { scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: heroShot, start: 'top bottom', end: 'top 25%', scrub: 1 } });

      // 스크롤에 묶여 자라는 선
      const bar = document.querySelector('.timeline .bar i');
      if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 75%', end: 'bottom 45%', scrub: 0.8 } });
      gsap.utils.toArray('.strike-line').forEach((ln) => {
        gsap.to(ln, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: ln.closest('.strike-wrap'), start: 'top 70%', end: 'top 40%', scrub: 0.6 } });
      });
      gsap.utils.toArray('.relay-track i').forEach((t) => {
        gsap.to(t, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: t, start: 'top 82%', end: 'top 52%', scrub: 0.6 } });
      });

      // 이해관계자 지도: 기관과 파란 선이 그려지고 끊긴 빨간 선이 마지막에 들어옴
      const svg = document.querySelector('.map-svg');
      if (svg) {
        const links = svg.querySelectorAll('.lk');
        const gaps = svg.querySelectorAll('.gp');
        gsap.set([...links, ...gaps], { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(svg.querySelectorAll('.lb, .glb, .nd'), { opacity: 0 });
        gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 78%', end: 'bottom 55%', scrub: 0.8 } })
          .to(svg.querySelectorAll('.nd'), { opacity: 1, stagger: 0.04, duration: 0.3 })
          .to(links, { strokeDashoffset: 0, stagger: 0.08, duration: 0.6 }, '<0.1')
          .to(svg.querySelectorAll('.lb'), { opacity: 1, stagger: 0.08, duration: 0.3 }, '<0.2')
          .to(gaps, { strokeDashoffset: 0, stagger: 0.12, duration: 0.6 })
          .to(svg.querySelectorAll('.glb'), { opacity: 1, stagger: 0.12, duration: 0.3 }, '<0.2');
      }

      // 5 Whys: 화면 가운데를 지나는 줄이 진해짐
      gsap.utils.toArray('.why').forEach((row) => {
        gsap.fromTo(row, { opacity: 0.16 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: row, start: 'top 78%', end: 'top 48%', scrub: 0.5 } });
      });
    });

    // 머리의 장 이름과 브라우저 위쪽 색이 지금 장을 따라감
    const label = document.querySelector('.top .ch');
    const meta = document.querySelector('meta[name="theme-color"]');
    const chTriggers = gsap.utils.toArray('section[id]').map((sec) => ScrollTrigger.create({
      trigger: sec, start: 'top 32px', end: 'bottom 32px',
      onToggle: (s) => {
        if (!s.isActive) return;
        if (label) label.textContent = CHAPTER_OF[sec.id] || '';
        const surf = ['dark', 'white', 'light'].find((c) => sec.classList.contains(c));
        if (meta && surf) meta.setAttribute('content', SURFACE_OF[surf]);
      },
    }));

    // 주소 해시로 바로 열기(예전 주소 #proto-dispatch도 배정 흐름으로)
    const alias = { 'proto-dispatch': 'dispatch', 'proto-shortage': 'shortage', 'proto-intake': 'ai', 'proto-helper': 'dispatch' };
    const openHash = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      const id = alias[h] || h;
      const el = id && document.getElementById(id);
      if (!el) { window.scrollTo(0, 0); return; }
      if (lenis) lenis.scrollTo(el, { immediate: true, force: true }); else el.scrollIntoView();
      ScrollTrigger.refresh();
    };
    const onLoad = () => { ScrollTrigger.refresh(); openHash(); };
    if (document.readyState === 'complete') requestAnimationFrame(onLoad); else window.addEventListener('load', onLoad, { once: true });
    window.addEventListener('hashchange', openHash);

    return () => {
      window.removeEventListener('hashchange', openHash);
      chTriggers.forEach((t) => t.kill());
      ctx.revert();
      if (lenis) { gsap.ticker.remove(raf); lenis.destroy(); }
      lenisRef = null;
    };
  }, []);
}

// 기관에 손을 올리거나 초점을 두면 그 기관과 이어진 선만 남음
function MapSvg() {
  const [act, setAct] = useState(null);
  const on = (id) => () => setAct(id);
  const off = () => setAct(null);
  const dim = (ids) => (act && act !== 'hub' && !ids.includes(act) ? ' dim' : '');
  return (
    <svg className={`map-svg${act ? ' focusing' : ''}`} viewBox="0 0 1600 900" role="group" aria-label="미리 이해관계자 지도">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#1e6ef4" />
        </marker>
      </defs>
      {MAP.links.map((l, i) => (
        <g key={i} className={`mg${dim(l.n)}`}>
          <path className="lk" d={l.d} pathLength="1" fill="none" stroke="#1e6ef4" strokeWidth="3" markerEnd="url(#ah)" />
          <text className="lb" x={l.lx} y={l.ly} textAnchor={l.anchor} fontSize="21" fontWeight="500" fill="#3c3c43" letterSpacing="-0.4">{l.label}</text>
        </g>
      ))}
      {MAP.gaps.map((g, i) => (
        <g key={i} className={`mg${dim(g.n)}`}>
          <path className="gp" d={g.a} pathLength="1" fill="none" stroke="#ba1a1a" strokeWidth="3.5" strokeLinecap="round" />
          <path className="gp" d={g.b} pathLength="1" fill="none" stroke="#ba1a1a" strokeWidth="3.5" strokeLinecap="round" />
          <text className="glb" x={g.lx} y={g.ly} textAnchor={g.anchor || 'middle'} fontSize="22" fontWeight="700" fill="#ba1a1a" letterSpacing="-0.4">{g.label}</text>
        </g>
      ))}
      <g className="mg node" tabIndex={0} aria-label={`${MAP.hub.l1} ${MAP.hub.l2}`} onMouseEnter={on('hub')} onMouseLeave={off} onFocus={on('hub')} onBlur={off}>
        <g className="nd">
          <circle cx={MAP.hub.x} cy={MAP.hub.y} r={MAP.hub.r} fill="#1e6ef4" />
          <text x={MAP.hub.x} y={MAP.hub.y - 6} textAnchor="middle" fontSize="34" fontWeight="700" fill="#fff" letterSpacing="-1">{MAP.hub.l1}</text>
          <text x={MAP.hub.x} y={MAP.hub.y + 38} textAnchor="middle" fontSize="34" fontWeight="700" fill="#fff" letterSpacing="-1">{MAP.hub.l2}</text>
        </g>
      </g>
      {MAP.nodes.map((n) => (
        <g key={n.id} className={`mg node${dim([n.id])}${act === n.id ? ' act' : ''}`} tabIndex={0} aria-label={`${n.name}: ${n.role}`}
          onMouseEnter={on(n.id)} onMouseLeave={off} onFocus={on(n.id)} onBlur={off} onClick={() => setAct(act === n.id ? null : n.id)}>
          <g className="nd">
            <rect x={n.x - 190} y={n.y - (n.hidden ? 76 : 44)} width="380" height={n.hidden ? 136 : 104} fill="transparent" />
            {n.hidden ? <text x={n.x} y={n.y - 44} textAnchor="middle" fontSize="19" fontWeight="700" fill="#1e6ef4" letterSpacing="-0.3">{MAP.hiddenLabel}</text> : null}
            <text className="nm" x={n.x} y={n.y} textAnchor="middle" fontSize="30" fontWeight="700" fill="#111114" letterSpacing="-0.9">{n.name}</text>
            <text x={n.x} y={n.y + 36} textAnchor="middle" fontSize="21" fontWeight="400" fill="#3c3c43" letterSpacing="-0.4">{n.role}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}

// 시연 명부와 계산 입력. 서비스 부족분 계산 화면과 같은 입력이다
let calcInput = null;
const inputOf = () => {
  if (calcInput) return calcInput;
  const s = buildSeed();
  const scenario = s.scenarios.find((x) => x.id === s.activeScenarioId) || s.scenarios[0];
  const names = Object.fromEntries(s.villages.map((v) => [v.code, v.label]));
  calcInput = { base: { persons: s.persons, villages: s.villages, vehicles: s.vehicles, helpers: s.helpers, settings: s.settings, scenario, t0: s.today }, names };
  return calcInput;
};
const runCalc = (cars) => {
  const { base } = inputOf();
  return computeShortage({ ...base, scenario: { ...base.scenario, extraVehicles: { ...(base.scenario.extraVehicles || {}), car: cars } } });
};

// 끌면 서비스 계산 코드가 그 자리에서 다시 계산한다. 숫자는 새 값까지 세어 가고 마을 막대가 줄어든다
function ShortageCalc({ onTotals }) {
  const [cars, setCars] = useState(0);
  const numRef = useRef(null);
  const shown = useRef({ v: 0 });
  const all = useMemo(() => Array.from({ length: SHORTAGE.max + 1 }, (_, n) => runCalc(n)), []);
  const r = all[cars];
  const v = r.total;
  const max = all[0].total;
  const { names } = inputOf();
  const villages = useMemo(() => Object.entries(all[0].byVillage).filter(([, x]) => x.total > 0).sort((a, b) => b[1].total - a[1].total).map(([code, x]) => ({ code, name: names[code] || code, start: x.total })), [all, names]);
  // 배정을 다시 짜면 어떤 마을은 잠시 늘기도 하므로 모든 대수에서 가장 큰 값을 막대 끝으로 둔다
  const vmax = useMemo(() => Math.max(1, ...all.flatMap((x) => villages.map((vg) => x.byVillage[vg.code]?.total || 0))), [all, villages]);

  useEffect(() => {
    const target = all[0];
    const inScope = Object.values(target.byVillage).filter((x) => x.inScope).reduce((a, x) => a + x.targetTotal, 0);
    onTotals?.({ targets: inScope, base: target.total, zeroAt: all.findIndex((x) => x.total === 0) });
  }, [all, onTotals]);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    if (reducedMotion()) { shown.current.v = v; el.textContent = String(v); return; }
    gsap.to(shown.current, { v, duration: 0.3, ease: 'power2.out', overwrite: true, onUpdate: () => { el.textContent = String(Math.round(shown.current.v)); } });
  }, [v]);

  return (
    <div className="calc">
      <label className="t-label" htmlFor="cars" style={{ color: 'var(--on-dark-sub)' }}>{SHORTAGE.sliderLabel}</label>
      <div className="slider-row">
        <div className="slider-box">
          <input id="cars" className="slider" type="range" min="0" max={SHORTAGE.max} step="1" value={cars}
            style={{ '--p': `${(cars / SHORTAGE.max) * 100}%` }}
            onChange={(e) => setCars(Number(e.target.value))} aria-valuetext={`승용차 ${cars}대`} />
          <div className="ticks t-cap" aria-hidden="true">
            {SHORTAGE.ticks.map((s) => (
              <span key={s} className={s === cars ? 'on' : ''} style={{ left: `calc(14px + (100% - 28px) * ${s / SHORTAGE.max})` }} onClick={() => setCars(s)}>{s}</span>
            ))}
          </div>
        </div>
        <span className="t-h3 cars-val">{cars}{SHORTAGE.unitCar}</span>
      </div>
      <div className="result">
        <p className="t-label" style={{ color: 'var(--on-dark-sub)' }}>{SHORTAGE.resultLabel}</p>
        <p className={`t-num res-num${v === 0 ? ' zero' : ''}`} style={{ marginTop: 16 }}>
          <span ref={numRef}>{max}</span><span className="t-h2" style={{ marginLeft: 8 }}>명</span>
        </p>
        <div className="rbar"><i style={{ transform: `scaleX(${v / max})` }} /></div>
        <p className="t-lead say" aria-live="polite">{SHORTAGE.say(cars, v)}</p>
      </div>
      <div className="vbars">
        <p className="t-label" style={{ color: 'var(--on-dark-sub)' }}>{SHORTAGE.villageLabel}</p>
        {villages.map((x) => {
          const now = r.byVillage[x.code]?.total || 0;
          return (
            <div className={`vbar${now === 0 ? ' done' : ''}`} key={x.code}>
              <span className="t-body nm">{x.name}</span>
              <span className="track"><i style={{ transform: `scaleX(${now / vmax})` }} /><b style={{ transform: `scaleX(${x.start / vmax})` }} /></span>
              <span className="t-body num">{now}명</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 배정 흐름: 글을 읽어 내려가면 오른쪽 실제 도우미 화면이 그 단계까지 눌려 진행된다
function DispatchFlow() {
  const [step, setStep] = useState(0);
  const sticky = useRef(null);
  const inl = [useRef(null), useRef(null), useRef(null)];
  const stepEls = useRef([]);
  const run = useRef(0);
  const wide = useMedia('(min-width: 1024px)');

  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setStep(Number(e.target.dataset.i)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    stepEls.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!wide) return undefined;
    const my = ++run.current;
    driveHelper(sticky, step, () => run.current === my);
    return undefined;
  }, [step, wide]);

  return (
    <div className="flow">
      <div className="flow-steps">
        {DISPATCH.steps.map((s, i) => (
          <div className={`fstep${step === i ? ' on' : ''}`} key={s.h} data-i={i} ref={(el) => { stepEls.current[i] = el; }}>
            <div className="k">{String(i + 1).padStart(2, '0')}</div>
            <h3 className="t-h2 en">{s.h}</h3>
            <p className="t-lead sub">{s.p}</p>
            {!wide ? (
              <div className="inline-phone">
                <LiveScreen ref={inl[i]} kind="phone" route="/m/h/demo" poster={s.img} title={`도우미 화면 ${i + 1}단계`} onReady={() => driveHelper(inl[i], i)} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {wide ? (
        <div className="flow-phone">
          <LiveScreen ref={sticky} kind="phone" route="/m/h/demo" poster={DISPATCH.steps[0].img} title="도우미 휴대폰 화면" onReady={() => driveHelper(sticky, step)} />
        </div>
      ) : null}
    </div>
  );
}

function useMedia(q) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

// 다른 장으로 부드럽게 옮겨 간다
const goTo = (id) => (e) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  if (lenisRef) lenisRef.scrollTo(el); else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
};

export default function Case() {
  useMotion();
  const [totals, setTotals] = useState(null);
  useEffect(() => { document.title = '미리 케이스 스터디'; }, []);
  const toTop = (e) => {
    e.preventDefault();
    if (lenisRef) lenisRef.scrollTo(0); else window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    history.replaceState(null, '', location.pathname);
  };

  return (
    <>
      <a className="skip" href="#overview">본문으로 건너뛰기</a>
      <div className="progress" aria-hidden="true" />
      <header className="top">
        <div className="wrap">
          <a className="logo" href="#cover" onClick={toTop} aria-label="맨 위로">미리</a>
          <span className="ch" aria-live="polite" />
        </div>
      </header>

      <main>
        {/* 표지 */}
        <section id="cover" className="sec light hero">
          <div className="wrap" style={{ width: '100%' }}>
            <div className="hero-title">
              <h1 className="t-display" data-blur>{HERO.title}</h1>
              <p className="t-h2 hero-lines" data-r data-d="0.2"><Lines lines={HERO.lines} /></p>
              <div className="hero-meta" data-stagger>
                {HERO.meta.map((m) => (
                  <div key={m.k} data-r><span className="t-cap">{m.k}</span><span className="t-label">{m.v}</span></div>
                ))}
              </div>
            </div>
            <div className="obj keep" style={{ right: '2%', top: '-6%', width: 'clamp(140px, 26vw, 460px)' }}><img src="/v2/obj-phone.webp" alt="" width="900" height="900" data-par="18" /></div>
            <div className="obj" style={{ right: '30%', top: '22%', width: 'clamp(110px, 15vw, 270px)' }}><img src="/v2/obj-wheelchair.webp" alt="" width="900" height="900" data-par="30" /></div>
            <div className="hero-shot"><LiveScreen route="/console" poster="/v2/scr-overview.webp" title="미리 현황판 실제 화면" eager /></div>
          </div>
        </section>

        {/* 개요 */}
        <section id="overview" className="sec white">
          <div className="wrap indent overview">
            <h2 className="t-h1 en" data-blur><Lines lines={OVERVIEW.en} /></h2>
            <div className="ov-body" data-stagger>
              {OVERVIEW.body.map((p) => <p key={p} className="t-lead sub" data-r>{p}</p>)}
            </div>
          </div>
        </section>

        {/* 2022년 옥계 산불 */}
        <section id="context" className="sec dark">
          <div className="ghost" data-blur aria-hidden="true">Discover</div>
          <div className="wrap indent ghost-pad">
            <h2 className="t-h1" data-r><Lines lines={CONTEXT.title} /></h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={CONTEXT.body} /></p>
            <div className="timeline" data-stagger>
              <div className="bar" aria-hidden="true"><i /></div>
              {CONTEXT.steps.map((s) => (
                <div className="step" key={s.time} data-r>
                  <div className="time">{s.time}</div>
                  <p className="t-lead">{s.text}</p>
                </div>
              ))}
            </div>
            <p className="t-cap" style={{ marginTop: 32 }} data-r>{CONTEXT.stepsSrc}</p>
            <div className="facts" data-stagger>
              {CONTEXT.facts.map((f) => (
                <div className="fact" key={f.label} data-r>
                  <div className="t-num-s"><span data-count={f.value}>{f.value}</span><span className="t-h3" style={{ marginLeft: 6 }}>{f.unit}</span></div>
                  <p className="t-body">{f.label}</p>
                  <p className="t-cap" style={{ marginTop: 6 }}>{f.src}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 처음 들은 문제 */}
        <section id="first-problem" className="sec white">
          <div className="wrap indent">
            <h2 className="t-h1" data-r><Lines lines={FIRST.title} /></h2>
            <p className="t-h1 strike-wrap" data-r>
              {FIRST.struck.map((l, i) => (
                <span key={i} className="ln"><span className="strike">{l}<i className="strike-line" aria-hidden="true" /></span></span>
              ))}
            </p>
            <p className="t-lead sub body-w" data-r><Sent text={FIRST.body} /></p>
          </div>
        </section>

        {/* 리서치 */}
        <section id="research" className="sec light">
          <div className="wrap indent">
            <h2 className="t-h1" data-r><Lines lines={RESEARCH.title} /></h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={RESEARCH.body} /></p>
            <div className="photos">
              {RESEARCH.photos.map((p) => (
                <figure key={p.src} data-r>
                  <div className="photo lift"><img src={p.src} alt={p.cap} width="1800" height="1350" loading="lazy" /></div>
                  <figcaption><span className="t-label">{p.cap}</span><span className="t-cap">{p.date}</span></figcaption>
                </figure>
              ))}
            </div>
            <div className="rlist" data-stagger>
              {RESEARCH.list.map((r) => (
                <div key={r.k} data-r><span className="t-h3">{r.k}</span><span className="t-body sub">{r.v}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* 이해관계자 지도 */}
        <section id="stakeholders" className="sec white">
          <div className="wrap">
            <div className="indent">
              <h2 className="t-h1" data-r><Lines lines={MAP.title} /></h2>
              <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={MAP.body} /></p>
              <p className="t-cap hint" data-r data-d="0.2">{MAP.hint}</p>
            </div>
            <MapSvg />
            <ul className="map-list">
              {MAP.links.map((l) => <li key={l.label} className="t-body"><b>{l.label}</b></li>)}
              {MAP.gaps.map((g) => <li key={g.label} className="t-body red"><b>{g.label}</b></li>)}
            </ul>
          </div>
        </section>

        {/* 말과 행동 */}
        <section id="say-do" className="sec dark">
          <div className="ghost" data-blur aria-hidden="true">Define</div>
          <div className="wrap indent ghost-pad">
            <h2 className="t-h1" data-r><Lines lines={SAYDO.title} /></h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={SAYDO.body} /></p>
            <div className="saydo-head">
              <p className="t-label sub">{SAYDO.say}</p>
              <p className="t-label" style={{ color: 'var(--red-on-dark)' }}>{SAYDO.do}</p>
            </div>
            {SAYDO.rows.map((r) => (
              <div className="saydo-row" key={r.s}>
                <div className="s" data-r>
                  <p className="t-h3" style={{ color: 'var(--on-dark-sub)' }}>{r.s}</p>
                  <p className="t-cap w">{r.sw}</p>
                </div>
                <div className="d" data-r data-d="0.25">
                  <p className="t-h3">{r.d}</p>
                  <p className="t-cap w">{r.dw}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5 Whys */}
        <section id="whys" className="sec white">
          <div className="wrap indent">
            <h2 className="t-h1" data-r>{WHYS.title}</h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={WHYS.body} /></p>
            <div className="whys">
              {WHYS.steps.map((s, i) => (
                <div className="why" key={s.q}>
                  <div className="n">{String(i + 1).padStart(2, '0')}</div>
                  <p className="t-h3">{s.q}</p>
                  <div className="ans">
                    <p className="t-lead">{s.a}</p>
                    <p className="t-cap e">{s.e}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 진짜 문제 */}
        <section id="define" className="sec dark define">
          <div className="wrap indent" style={{ width: '100%' }}>
            <p className="t-h3 define-heard strike-wrap" data-r>
              <span className="sr">처음 들은 문제: </span>
              <span className="strike">{DEFINE.heard}<i className="strike-line" aria-hidden="true" /></span>
            </p>
            <h2 className="t-h1 define-real" data-blur><span className="sr">진짜 문제: </span><span className="d-only"><Lines lines={DEFINE.real} /></span><span className="m-only"><Lines lines={DEFINE.realM} /></span></h2>
          </div>
        </section>

        {/* POV와 HMW */}
        <section id="hmw" className="sec light">
          <div className="wrap indent">
            <h2 className="t-h1" data-r>{HMW.povLabel}</h2>
            <div className="pov" data-stagger>
              {HMW.pov.map((p) => (
                <div key={p.k} data-r><span className="t-label blue">{p.k}</span><span className="t-h3">{p.v}</span></div>
              ))}
            </div>
            <div className="hmw">
              <h2 className="t-h1" data-r>{HMW.hmwLabel}</h2>
              {HMW.hmw.map((h, i) => (
                <div className="hmw-row" key={i} data-r>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <p className="t-h2"><Lines lines={h} /></p>
                </div>
              ))}
            </div>
          </div>
          <div className="obj" style={{ right: '4%', bottom: '6%', width: 'clamp(120px, 17vw, 320px)' }}><img src="/v2/obj-wheelchair.webp" alt="" width="900" height="900" data-par="26" /></div>
        </section>

        {/* 약속 */}
        <section id="promise" className="sec white">
          <div className="ghost" data-blur aria-hidden="true">Develop</div>
          <div className="wrap indent ghost-pad">
            <h2 className="t-h1" data-r><Lines lines={PROMISE.title} /></h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={PROMISE.body} /></p>
            <div className="promise-head">
              <p className="t-label">{PROMISE.colA}</p>
              <p className="t-label blue">{PROMISE.colB}</p>
            </div>
            {PROMISE.rows.map((r) => (
              <div className="promise-row" key={r.t} data-r>
                <div>
                  <h3 className="t-h2">{r.t}</h3>
                  <p className="t-body sub">{r.a}</p>
                </div>
                <a className="b go" href={`#${r.to}`} onClick={goTo(r.to)}>
                  <p className="t-lead blue" style={{ fontWeight: 600 }}>{r.b}</p>
                  <span className="t-label go-l"><span className="u">{PROMISE.goLabel}</span> <span className="arw" aria-hidden="true">→</span></span>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* 배정 흐름 */}
        <section id="dispatch" className="sec light">
          <div className="wrap indent">
            <h2 className="t-h1" data-r><Lines lines={DISPATCH.title} /></h2>
            <DispatchFlow />
            <div className="relay">
              <h3 className="t-h1 en" data-r>{DISPATCH.relayTitle}</h3>
              <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={DISPATCH.relayBody} /></p>
              {DISPATCH.relay.map((r, i) => (
                <div className="relay-row" key={r.who} data-r>
                  <p className="t-h3">{r.who}</p>
                  <div>
                    <p className="t-lead">{r.state}</p>
                    {r.wait ? (
                      <>
                        <div className={`relay-track ${i === 0 ? 'wait' : ''}`}><i /></div>
                        <p className={`t-label ${i === 0 ? 'red' : 'blue'}`}>{r.wait}</p>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
              <div className="quote-big" data-r>
                <p className="t-h2">{DISPATCH.quote}</p>
                <p className="t-cap" style={{ marginTop: 14 }}>{DISPATCH.quoteWho}</p>
              </div>
            </div>
          </div>
          <div className="obj" style={{ right: '4%', bottom: '3%', width: 'clamp(140px, 18vw, 340px)' }}><img src="/v2/obj-phone.webp" alt="" width="900" height="900" data-par="22" /></div>
        </section>

        {/* 부족분 계산 */}
        <section id="shortage" className="sec dark">
          <div className="wrap indent">
            <h2 className="t-h1 en" data-r>{SHORTAGE.title}</h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={SHORTAGE.body} /></p>
            <div className="short">
              <div data-r><ShortageCalc onTotals={setTotals} /></div>
              <div className="cases" data-stagger>
                {SHORTAGE.cases.map((c) => (
                  <div key={c.k} data-r>
                    <span className="t-lead">{c.k}{c.note ? <span className="t-cap" style={{ marginLeft: 10 }}>{c.note}</span> : null}</span>
                    <span className={`v ${c.alert ? 'red' : ''}`}>{c.calc && totals ? `${totals[c.calc]}명` : c.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="t-cap" style={{ marginTop: 40 }} data-r>{SHORTAGE.src}</p>
            <div className="short-shot" data-r><LiveScreen route={SHORTAGE.route} poster={SHORTAGE.shot} title="부족분 계산 실제 화면" /></div>
          </div>
        </section>

        {/* AI */}
        <section id="ai" className="sec white">
          <div className="wrap indent">
            <h2 className="t-h1 en" data-r>{AI.title}</h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={AI.body} /></p>
            <div className="ai-grid" data-stagger>
              {AI.where.map((w) => (
                <div key={w.h} data-r><h3 className="t-h3">{w.h}</h3><p className="t-body sub">{w.p}</p></div>
              ))}
            </div>
            <div className="ai-shot" data-r><LiveScreen route={AI.route} poster={AI.shot} title="서류 읽기 실제 화면" /></div>
            <div className="ai-results" data-stagger>
              {AI.results.map((r) => (
                <div key={r.k} data-r>
                  <div className="t-num-s blue"><span data-count={r.v}>{r.v}</span><span className="t-h3" style={{ marginLeft: 4, color: 'var(--ink)' }}>{r.of}</span></div>
                  <p className="t-body">{r.k}</p>
                </div>
              ))}
            </div>
            <p className="t-cap" style={{ marginTop: 28 }} data-r>{AI.resultsSrc}</p>
          </div>
        </section>

        {/* 화면 모음 */}
        <section id="screens" className="sec dark">
          <div className="ghost" data-blur aria-hidden="true">Deliver</div>
          <div className="wrap ghost-pad">
            <div className="indent">
              <h2 className="t-h1 en" data-r>{SCREENS.title}</h2>
              <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={SCREENS.body} /></p>
            </div>
            <div className="gallery">
              {SCREENS.items.map((s) => (
                <figure key={s.src} data-r>
                  <LiveScreen route={s.route} poster={s.src} title={s.cap} margin="10%" />
                  <figcaption className="t-label" style={{ color: 'var(--on-dark-sub)' }}>{s.cap}</figcaption>
                </figure>
              ))}
              <figure className="ph" data-r>
                <LiveScreen kind="phone" route={SCREENS.phone.route} role={SCREENS.phone.role} poster={SCREENS.phone.src} title={SCREENS.phone.cap} className="lift" />
                <figcaption className="t-label" style={{ color: 'var(--on-dark-sub)' }}>{SCREENS.phone.cap}</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* 협업 */}
        <section id="collaboration" className="sec light">
          <div className="wrap indent">
            <h2 className="t-h1" data-r><Lines lines={COLLAB.title} /></h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={COLLAB.body} /></p>
            <div className="collab">
              {COLLAB.rows.map((r) => (
                <div className="collab-row" key={r.who} data-r>
                  <p className="t-label who">{r.who}</p>
                  <p className="t-body sub">{r.said}</p>
                  <p className="t-body blue" style={{ fontWeight: 600 }}>{r.changed}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="obj" style={{ right: '5%', top: 'clamp(40px, 6vw, 120px)', width: 'clamp(150px, 22vw, 420px)' }}><img src="/v2/obj-van.webp" alt="" width="900" height="900" data-par="20" /></div>
        </section>

        {/* 평가 */}
        <section id="evaluate" className="sec white">
          <div className="wrap indent">
            <h2 className="t-h1" data-r><Lines lines={EVALUATE.title} /></h2>
            <p className="t-lead sub body-w" data-r data-d="0.1"><Sent text={EVALUATE.body} /></p>
            <div className="eval-tasks">
              {EVALUATE.tasks.map((t, i) => (
                <div className="eval-row" key={i} data-r>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <p className="t-label">{t.role}</p>
                  <div className="task">
                    <p className="t-lead">{t.task}</p>
                    <a className="t-label go-l blue" href={`#${t.to}`} onClick={goTo(t.to)}><span className="u">{EVALUATE.tryLabel}</span> <span className="arw" aria-hidden="true">→</span></a>
                  </div>
                </div>
              ))}
            </div>
            <div className="measures" data-stagger>
              {EVALUATE.measures.map((m) => <p key={m} className="t-h3" data-r>{m}</p>)}
            </div>
          </div>
        </section>

        {/* 마무리 */}
        <section id="credits" className="sec dark credits">
          <div className="wrap" style={{ width: '100%' }}>
            <h2 className="t-display" data-blur>{CREDITS.title}</h2>
            <p className="t-h2" style={{ marginTop: 24 }} data-r>{CREDITS.sub}</p>
            <div className="credits-links" data-stagger>
              {CREDITS.links.map((l) => <MoreLink key={l.href} href={l.href}>{l.label}</MoreLink>)}
            </div>
          </div>
          <div className="wrap credits-foot" style={{ width: '100%' }}>
            <p className="t-label">{CREDITS.people}</p>
            <p className="t-cap">{CREDITS.course}</p>
          </div>
        </section>
      </main>
    </>
  );
}

// 조작 셸. VORTEX presentation-v2의 인터랙션을 옮겼다.
// 넓은 화면: GSAP Observer(휠, 터치)와 키보드로 한 입력에 한 장씩 Lenis scrollTo. 이동 중 입력 잠금.
// 좁은 화면(폭 1024 미만 또는 높이 620 미만): 위아래로 흐르는 문서. 각 장은 내용 높이만 차지한다.
// 주소 해시(#scenarios 등)로 특정 장을 바로 연다.

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import Lenis from 'lenis';
import { c, t, space, ease, font } from './tokens.js';
import { SECTIONS, CHAPTERS } from './copy.js';
import { RENDERERS } from './sections/Slides.jsx';
import { ModeCtx, useViewport } from './components/ui.jsx';

gsap.registerPlugin(Observer);
const curve = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export default function App() {
  const vp = useViewport();
  const slideMode = vp.slide;
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  const lockRef = useRef(false);
  const goToRef = useRef(() => {});

  useEffect(() => {
    if (!slideMode) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const lenis = new Lenis({ smoothWheel: false, smoothTouch: false });
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    let timer = null;

    const goTo = (next, instant = false) => {
      if (lockRef.current && !instant) return;
      if (next < 0 || next >= SECTIONS.length) return;
      if (next === currentRef.current && !instant) return;
      lockRef.current = true;
      currentRef.current = next;
      setCurrent(next);
      const id = SECTIONS[next].id;
      if (window.location.hash !== `#${id}`) window.history.replaceState(null, '', `#${id}`);
      const dur = reduced || instant ? 0 : 1;
      const unlock = () => { lockRef.current = false; };
      lenis.scrollTo(document.getElementById(id), { duration: dur, easing: curve, lock: true, force: true, immediate: dur === 0, onComplete: unlock });
      clearTimeout(timer);
      timer = setTimeout(unlock, dur * 1000 + 200);
    };
    goToRef.current = goTo;

    const start = SECTIONS.findIndex((s) => `#${s.id}` === window.location.hash);
    requestAnimationFrame(() => goTo(Math.max(start, 0), true));

    const observer = Observer.create({ type: 'wheel,touch', tolerance: 10, preventDefault: true, onDown: () => goTo(currentRef.current + 1), onUp: () => goTo(currentRef.current - 1) });
    const onKey = (e) => {
      const k = e.key;
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(k)) { e.preventDefault(); goTo(currentRef.current + 1); }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(k)) { e.preventDefault(); goTo(currentRef.current - 1); }
      else if (k === 'Home') { e.preventDefault(); goTo(0); }
      else if (k === 'End') { e.preventDefault(); goTo(SECTIONS.length - 1); }
      else if (k === 'f' || k === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.();
      }
    };
    const onHash = () => {
      const idx = SECTIONS.findIndex((x) => `#${x.id}` === window.location.hash);
      if (idx >= 0 && idx !== currentRef.current) goTo(idx, true);
    };
    const onResize = () => lenis.scrollTo(document.getElementById(SECTIONS[currentRef.current].id), { immediate: true, force: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      observer.kill();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('resize', onResize);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [slideMode]);

  // 문서 모드에서는 스크롤 위치로 진행 막대를 채운다
  const [flowProgress, setFlowProgress] = useState(0);
  useEffect(() => {
    if (slideMode) return undefined;
    const on = () => setFlowProgress(window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight));
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [slideMode]);

  const jump = useCallback((chId) => {
    const idx = SECTIONS.findIndex((s) => s.chapter === chId);
    if (idx >= 0) goToRef.current(idx);
  }, []);

  const progress = slideMode ? (current + 1) / SECTIONS.length : flowProgress;
  const cur = SECTIONS[current];

  return (
    <ModeCtx.Provider value={vp}>
      <main style={{ fontFamily: font }}>
        {SECTIONS.map((s, i) => {
          const R = RENDERERS[s.id];
          return (
            <section id={s.id} key={s.id} aria-label={`${i + 1} ${s.ko}`} style={{ position: 'relative', height: slideMode ? '100dvh' : 'auto', overflow: 'hidden' }}>
              <R active={slideMode ? current === i : true} s={s} />
            </section>
          );
        })}
      </main>

      <div aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, top: 0, height: 4, zIndex: 20, background: 'rgba(37,110,244,0.12)' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: c.primary, transition: slideMode ? `width 900ms ${ease.out}` : 'none' }} />
      </div>

      {slideMode ? (
        <>
          <nav aria-label="챕터" style={{ position: 'fixed', left: space.x, bottom: 'clamp(16px, 3vh, 32px)', zIndex: 20, display: 'flex', gap: 'clamp(14px, 1.6vw, 30px)' }}>
            {CHAPTERS.map((ch) => {
              const on = ch.id === cur.chapter;
              const blueBg = cur.id === 'define';
              return (
                <a
                  key={ch.id}
                  href={`#${SECTIONS.find((s) => s.chapter === ch.id).id}`}
                  onClick={(e) => { e.preventDefault(); jump(ch.id); }}
                  aria-current={on ? 'step' : undefined}
                  style={{ ...t.label, textDecoration: 'none', color: blueBg ? (on ? c.white : 'rgba(255,255,255,0.75)') : on ? c.primary : c.sub, fontWeight: on ? 700 : 400 }}
                >
                  {ch.en}
                </a>
              );
            })}
          </nav>
          <div aria-live="polite" style={{ position: 'fixed', right: space.x, bottom: 'clamp(16px, 3vh, 32px)', zIndex: 20, ...t.label, fontWeight: 400, color: cur.id === 'define' ? c.white : c.sub, fontVariantNumeric: 'tabular-nums' }}>
            <b style={{ color: cur.id === 'define' ? c.white : c.ink }}>{String(current + 1).padStart(2, '0')}</b> / {SECTIONS.length} <span style={{ marginLeft: 10 }}>{cur.ko}</span>
          </div>
        </>
      ) : null}
    </ModeCtx.Provider>
  );
}

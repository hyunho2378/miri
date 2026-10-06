// 미리 케이스 스터디 조작 셸. VORTEX presentation-v2 셸을 옮겨 왔다.
// GSAP Observer(휠, 터치) + 키보드(방향키, 스페이스, Home, End) → Lenis scrollTo로 한 입력에 한 슬라이드씩 이동한다.
// 이동 중에는 입력을 잠근다. 하단 왼쪽은 챕터 이동, 오른쪽은 현재와 전체, 맨 위는 진행 막대.
// 주소 해시(#scenarios 등)로 특정 슬라이드를 바로 열 수 있다(캡처와 전시 안내용).

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import Lenis from 'lenis';
import { colors, typography, grid, motion } from './tokens.js';
import { SECTION_LABELS, CHAPTERS } from './copy.js';
import { RENDERERS } from './sections/Slides.jsx';

gsap.registerPlugin(Observer);

const SECTIONS = SECTION_LABELS;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function App() {
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  const animatingRef = useRef(false);
  const goToRef = useRef(() => {});

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

    const lenis = new Lenis({ smoothWheel: false, smoothTouch: false });
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    let unlockTimer = null;
    const goTo = (next, instant = false) => {
      if (animatingRef.current && !instant) return;
      if (next < 0 || next >= SECTIONS.length || next === currentRef.current && !instant) return;
      animatingRef.current = true;
      currentRef.current = next;
      setCurrent(next);
      const id = SECTIONS[next].id;
      if (window.location.hash !== `#${id}`) window.history.replaceState(null, '', `#${id}`);
      const unlock = () => { animatingRef.current = false; };
      const dur = reduced || instant ? 0 : 1;
      lenis.scrollTo(document.getElementById(id), { duration: dur, easing: easeInOut, lock: true, force: true, immediate: dur === 0, onComplete: unlock });
      clearTimeout(unlockTimer);
      unlockTimer = setTimeout(unlock, dur * 1000 + 200);
    };
    goToRef.current = goTo;

    // 해시로 시작 슬라이드를 고른다. 없으면 표지
    const start = SECTIONS.findIndex((s) => `#${s.id}` === window.location.hash);
    if (start > 0) {
      requestAnimationFrame(() => goTo(start, true));
    } else {
      window.scrollTo(0, 0);
    }

    const go = (dir) => goTo(currentRef.current + dir);
    const observer = Observer.create({
      type: 'wheel,touch',
      tolerance: 10,
      preventDefault: true,
      onDown: () => go(1),
      onUp: () => go(-1),
    });

    const onKey = (e) => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Spacebar') { e.preventDefault(); go(1); }
      else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); go(-1); }
      else if (k === 'Home') { e.preventDefault(); goTo(0); }
      else if (k === 'End') { e.preventDefault(); goTo(SECTIONS.length - 1); }
      else if (k === 'f' || k === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener('keydown', onKey);
    const onHash = () => {
      const idx = SECTIONS.findIndex((x) => `#${x.id}` === window.location.hash);
      if (idx >= 0 && idx !== currentRef.current) goTo(idx, true);
    };
    window.addEventListener('hashchange', onHash);
    const onResize = () => lenis.scrollTo(document.getElementById(SECTIONS[currentRef.current].id), { immediate: true, force: true });
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(unlockTimer);
      observer.kill();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('resize', onResize);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  const jumpChapter = useCallback((chId) => {
    const idx = SECTIONS.findIndex((s) => s.chapter === chId);
    if (idx >= 0) goToRef.current(idx);
  }, []);

  const curChapter = SECTIONS[current].chapter;
  const navFont = { fontFamily: typography.eyebrow.family, fontSize: 'clamp(0.66rem, 0.82vw, 0.9rem)', fontWeight: 700, letterSpacing: '0.04em' };

  return (
    <>
      <main>
        {SECTIONS.map((s, i) => {
          const R = RENDERERS[s.id];
          return (
            <section id={s.id} key={s.id} aria-label={`${i + 1} ${s.ko}`} style={{ position: 'relative', height: '100dvh', overflow: 'hidden', background: colors.bg }}>
              {R ? <R active={current === i} s={s} /> : null}
            </section>
          );
        })}
      </main>

      {/* 진행 막대 */}
      <div aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, top: 0, height: 3, zIndex: 20, background: colors.line.faint }}>
        <div style={{ height: '100%', width: `${((current + 1) / SECTIONS.length) * 100}%`, background: colors.accent, transition: `width 900ms ${motion.easeOut}` }} />
      </div>

      {/* 챕터 이동 */}
      <nav aria-label="챕터" style={{ position: 'fixed', left: grid.marginX, bottom: 'clamp(16px, 3vh, 32px)', zIndex: 20, display: 'flex', gap: 'clamp(10px, 1.4vw, 26px)' }}>
        {CHAPTERS.map((c) => {
          const on = c.id === curChapter;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => jumpChapter(c.id)}
              aria-current={on ? 'step' : undefined}
              style={{ ...navFont, background: 'none', border: 0, padding: '4px 0', cursor: 'pointer', color: on ? colors.accent : colors.text.faint, borderBottom: `2px solid ${on ? colors.accent : 'transparent'}`, transition: 'color 250ms ease, border-color 250ms ease' }}
            >
              {c.en}
            </button>
          );
        })}
      </nav>

      {/* 현재와 전체 */}
      <div aria-live="polite" style={{ position: 'fixed', right: grid.marginX, bottom: 'clamp(16px, 3vh, 32px)', zIndex: 20, ...navFont, color: colors.text.dim, fontVariantNumeric: 'tabular-nums', padding: '4px 0' }}>
        <span style={{ color: colors.text.primary }}>{String(current + 1).padStart(2, '0')}</span> / {String(SECTIONS.length).padStart(2, '0')}
        <span style={{ marginLeft: 12, fontWeight: 400 }}>{SECTIONS[current].ko}</span>
      </div>
    </>
  );
}

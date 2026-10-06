// 전 슬라이드 공용 틀. 그리드 마진, 공용 2단 헤더, 진입 연출을 한곳에서 쥔다.
// 진입 연출: 슬라이드가 활성화되면 헤더와 data-rv 표시가 붙은 요소를 순서대로 올린다.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { colors, typography, motion, grid } from '../tokens.js';
import { SlideHeader } from './Bits.jsx';

export const T = {
  body: {
    fontFamily: typography.family,
    fontSize: typography.body.size,
    lineHeight: typography.body.leading,
    fontWeight: 400,
    color: colors.text.secondary,
  },
  strong: {
    fontFamily: typography.family,
    fontSize: typography.body.size,
    lineHeight: 1.45,
    fontWeight: 700,
    color: colors.text.primary,
  },
  caption: {
    fontFamily: typography.family,
    fontSize: typography.caption.size,
    lineHeight: typography.caption.leading,
    fontWeight: 400,
    color: colors.text.dim,
  },
  label: {
    fontFamily: typography.eyebrow.family,
    fontSize: 'clamp(0.66rem, 0.86vw, 0.95rem)',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: colors.text.dim,
  },
  title: {
    fontFamily: typography.family,
    fontSize: 'clamp(0.95rem, 1.32vw, 1.45rem)',
    lineHeight: 1.35,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: colors.text.primary,
  },
  num: {
    fontFamily: typography.eyebrow.family,
    fontSize: 'clamp(2rem, 3.6vw, 4.2rem)',
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: colors.text.primary,
    fontVariantNumeric: 'tabular-nums',
  },
};

export const card = {
  background: colors.raised,
  borderRadius: 'clamp(12px, 1.2vw, 20px)',
  padding: 'clamp(14px, 1.5vw, 28px)',
  boxShadow: `inset 0 0 0 1px ${colors.line.faint}`,
};

/** 상태 배지. 진행 예정, 작성 예정 등 아직 하지 않은 일을 숨기지 않고 표시한다. */
export function Pending({ text = '진행 예정' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontFamily: typography.eyebrow.family,
        fontSize: 'clamp(0.62rem, 0.8vw, 0.85rem)',
        fontWeight: 700,
        color: colors.text.secondary,
        boxShadow: `inset 0 0 0 1px ${colors.line.strong}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, border: `1.5px solid ${colors.text.dim}` }} />
      {text}
    </span>
  );
}

export function Frame({ active, eyebrow, headline, sub, children, contentStyle, headerRight }) {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !active) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const head = root.querySelector('[data-head]');
    const items = Array.from(root.querySelectorAll('[data-rv]'));
    if (reduced) {
      gsap.set([head, ...items], { opacity: 1, y: 0 });
      return undefined;
    }
    gsap.set(head, { opacity: 0, y: 16 });
    gsap.set(items, { opacity: 0, y: 26 });
    const tl = gsap.timeline();
    tl.to(head, { opacity: 1, y: 0, duration: 0.7, ease: motion.gsapOut });
    tl.to(items, { opacity: 1, y: 0, duration: 0.8, ease: motion.gsapOut, stagger: 0.07 }, 0.15);
    return () => tl.kill();
  }, [active]);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: `${grid.marginTop} ${grid.marginX} clamp(56px, 9vh, 100px)`,
      }}
    >
      <div data-head style={{ position: 'relative' }}>
        <SlideHeader eyebrow={{ ...eyebrow, tone: colors.navy }} headline={headline} sub={sub} />
        {headerRight ? <div style={{ position: 'absolute', right: 0, top: 0 }}>{headerRight}</div> : null}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, marginTop: 'clamp(18px, 4.6vh, 60px)', position: 'relative', ...contentStyle }}>
        {children}
      </div>
    </div>
  );
}

// 공용 조각. 헤더(아이브로우 위, 명사형 헤드라인 아래), 슬라이드 틀, 숫자 칩, 화면 모드.
// 보더를 쓰지 않는다. 면은 바탕색과 흰 카드, 그림자 한 단계로만 나눈다.

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { c, t, space, shadow, ease, font } from '../tokens.js';

// 화면 모드. 넓고 높은 화면은 한 장씩 넘기는 슬라이드, 그 밖은 위아래로 흐르는 문서
export const ModeCtx = createContext({ slide: true, w: 1440, h: 900 });
export const useMode = () => useContext(ModeCtx);

export function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const slide = v.w >= 1024 && v.h >= 620;
  return { ...v, slide, mobile: v.w < 640, narrow: v.w < 1024 };
}

export function Header({ eyebrow, headline, lead, right, onBlue = false }) {
  const { mobile } = useMode();
  return (
    <div data-head style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.gap, flexWrap: mobile ? 'wrap' : 'nowrap' }}>
      <div style={{ minWidth: 0, maxWidth: right ? '68%' : '84%', flex: '1 1 auto' }}>
        <p style={{ ...t.eyebrow, margin: 0, color: onBlue ? c.white : c.primary }}>{eyebrow}</p>
        <h2 style={{ ...t.headline, margin: 'clamp(6px, 0.6vw, 12px) 0 0', color: onBlue ? c.white : c.ink }}>{headline}</h2>
        {lead ? <p style={{ ...t.lead, margin: 'clamp(8px, 0.9vw, 16px) 0 0', color: onBlue ? 'rgba(255,255,255,0.88)' : c.sub }}>{lead}</p> : null}
      </div>
      {right ? <div style={{ flex: '0 0 auto' }}>{right}</div> : null}
    </div>
  );
}

// 헤더 오른쪽 숫자 칩(강릉페이 PPT 설문, 인터뷰 장표). 흰 면과 그림자, 보더 없음
export function StatChips({ items }) {
  return (
    <div style={{ display: 'flex', gap: 'clamp(8px, 0.8vw, 14px)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {items.map((it) => (
        <div key={it.label} style={{ background: c.card, borderRadius: space.radius, boxShadow: shadow.md, padding: 'clamp(10px, 1vw, 18px) clamp(14px, 1.4vw, 26px)', textAlign: 'center', minWidth: 'clamp(96px, 8vw, 160px)' }}>
          <div style={{ ...t.numSm, fontSize: 'clamp(22px, 1.6vw + 4px, 40px)', color: it.alert ? c.alert : it.ink ? c.ink : c.primary }}>{it.value}</div>
          <div style={{ ...t.note, marginTop: 6, color: c.body }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// 아직 하지 않은 일. 버튼처럼 보이지 않게 글자로만 표시한다
export function Pending({ text = '진행 예정', onBlue = false }) {
  return (
    <span style={{ ...t.label, color: onBlue ? c.white : c.sub, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: onBlue ? c.white : c.barIdle }} />
      {text}
    </span>
  );
}

export const panel = (tone = 'white') => ({
  background: tone === 'blue' ? c.primary : tone === 'soft' ? c.primarySoft : tone === 'tint' ? c.primaryTint : tone === 'gray' ? c.muted : c.card,
  borderRadius: space.radius,
  boxShadow: tone === 'white' ? shadow.sm : 'none',
  padding: 'clamp(16px, 1.6vw, 32px)',
});

// 슬라이드 틀. 슬라이드 모드에서는 화면 한 장, 문서 모드에서는 내용 높이만큼
export function Slide({ active, bg = c.bg, children, header, contentStyle, center = false }) {
  const { slide } = useMode();
  const root = useRef(null);
  useEffect(() => {
    const el = root.current;
    if (!el || !slide || !active) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const head = el.querySelector('[data-head]');
    const items = Array.from(el.querySelectorAll('[data-rv]'));
    const tl = gsap.timeline();
    if (head) tl.fromTo(head, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: ease.gsapOut }, 0);
    if (items.length) tl.fromTo(items, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8, ease: ease.gsapOut, stagger: 0.07 }, 0.15);
    return () => tl.kill();
  }, [active, slide]);

  return (
    <div
      ref={root}
      style={{
        position: slide ? 'absolute' : 'relative',
        inset: slide ? 0 : undefined,
        background: bg,
        fontFamily: font,
        display: 'flex',
        flexDirection: 'column',
        padding: slide ? `${space.top} ${space.x} ${space.bottom}` : `clamp(40px, 9vw, 72px) ${space.x}`,
        overflow: 'hidden',
      }}
    >
      {header}
      <div
        style={{
          flex: slide ? '1 1 auto' : '0 0 auto',
          minHeight: 0,
          marginTop: header ? 'clamp(20px, 3.6vh, 52px)' : 0,
          position: 'relative',
          display: center ? 'flex' : 'block',
          flexDirection: 'column',
          justifyContent: center ? 'center' : undefined,
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

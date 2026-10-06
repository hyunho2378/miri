// 더블 다이아몬드. 두 마름모를 선으로 그리고, 네 단계 아래에 한 일과 남은 일을 둔다.
// 진입하면 선이 그려지고, 단계 칸에 마우스를 올리면 그 반쪽이 칠해진다.

import { useEffect, useState } from 'react';
import { colors, typography, motion } from '../tokens.js';
import { T, Pending } from './Frame.jsx';

const HALVES = [
  '0,150 250,12 250,288',
  '250,12 500,150 250,288',
  '500,150 750,12 750,288',
  '750,12 1000,150 750,288',
];

export default function DoubleDiamond({ phases, active }) {
  const [hover, setHover] = useState(-1);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    if (!active) { setDrawn(false); return undefined; }
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [active]);

  const outline = 'M0 150 L250 12 L500 150 L750 12 L1000 150 L750 288 L500 150 L250 288 Z';
  const LEN = 8000; // 화면 픽셀 기준 대시 길이(non-scaling-stroke). 실제 둘레보다 넉넉하게

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 3.4vh, 44px)' }}>
      <div data-rv style={{ flex: '0 0 auto' }}>
        <svg viewBox="-4 0 1008 300" style={{ width: '100%', height: 'clamp(150px, 32vh, 380px)', display: 'block' }} preserveAspectRatio="none" aria-hidden="true">
          {HALVES.map((p, i) => (
            <polygon key={i} points={p} fill={hover === i ? colors.accentSoft : 'transparent'} style={{ transition: 'fill 250ms ease' }} />
          ))}
          <line x1="250" y1="12" x2="250" y2="288" stroke={colors.line.default} strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
          <line x1="750" y1="12" x2="750" y2="288" stroke={colors.line.default} strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
          <path
            d={outline}
            fill="none"
            stroke={colors.accent}
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={LEN}
            strokeDashoffset={drawn ? 0 : LEN}
            style={{ transition: `stroke-dashoffset 1600ms ${motion.easeOut}` }}
          />
        </svg>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'clamp(12px, 1.6vw, 32px)' }}>
        {phases.map((p, i) => (
          <div
            key={p.en}
            data-rv
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(-1)}
            style={{ borderTop: `2px solid ${hover === i ? colors.accent : colors.line.default}`, paddingTop: 'clamp(10px, 1.6vh, 18px)', transition: 'border-color 250ms ease' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, fontSize: typography.eyebrow.size, color: colors.accent }}>{p.en}</span>
              <span style={{ ...T.strong }}>{p.ko}</span>
            </div>
            <ul style={{ listStyle: 'none', margin: 'clamp(8px, 1.4vh, 16px) 0 0', padding: 0, display: 'grid', gap: 6 }}>
              {p.items.map((it) => (
                <li key={it} style={{ ...T.body, color: colors.text.primary, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: colors.accent, flex: '0 0 auto', transform: 'translateY(-2px)' }} />
                  {it}
                </li>
              ))}
              {p.pending.map((it) => (
                <li key={it} style={{ ...T.body, color: colors.text.dim, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, border: `1.5px solid ${colors.text.dim}`, flex: '0 0 auto' }} />
                  {it}
                  <Pending />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// 세로 막대 차트. 규칙: 가늘고 긴 가로 막대 금지, 뚱뚱한 세로 막대 금지.
// 막대 폭은 칸 폭의 일부로 두고 상한을 건다(barMax). 값은 막대 위, 라벨은 아래.
// 활성화되면 막대가 바닥에서 자라고 값이 따라 올라간다.

import { useEffect, useState } from 'react';
import { colors, typography, motion } from '../tokens.js';

export default function BarChart({
  bars,
  active,
  max,
  unit = '',
  format = (v) => v.toLocaleString('ko-KR'),
  colorOf = () => colors.accent,
  barMax = 40,
  refLine,
  height = '100%',
  labelLines = 1,
}) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!active) { setGrown(false); return undefined; }
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [active]);

  const top = max ?? Math.max(...bars.map((b) => b.value)) * 1.12;
  const valueFont = {
    fontFamily: typography.eyebrow.family,
    fontSize: 'clamp(0.72rem, 1.05vw, 1.2rem)',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ position: 'relative', height, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'flex-end', borderBottom: `1px solid ${colors.line.strong}` }}>
        {refLine ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${(refLine.value / top) * 100}%`,
              borderTop: `1px dashed ${colors.text.dim}`,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <span style={{ position: 'absolute', right: 0, bottom: 6, ...valueFont, fontWeight: 400, fontSize: typography.caption.size, color: colors.text.dim, background: colors.bg, paddingLeft: 8 }}>
              {refLine.label} {format(refLine.value)}{unit}
            </span>
          </div>
        ) : null}
        {bars.map((b, i) => {
          const h = (b.value / top) * 100;
          const c = colorOf(b, i);
          return (
            <div key={b.label} style={{ flex: '1 1 0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
              <span
                style={{
                  ...valueFont,
                  color: c === colors.line.strong ? colors.text.secondary : c,
                  marginBottom: 8,
                  opacity: grown ? 1 : 0,
                  transform: grown ? 'translateY(0)' : 'translateY(10px)',
                  transition: `opacity 500ms ${motion.easeOut} ${300 + i * 60}ms, transform 700ms ${motion.easeOut} ${300 + i * 60}ms`,
                }}
              >
                {format(b.value)}
                <span style={{ fontWeight: 400, fontSize: '0.7em', marginLeft: 2 }}>{unit}</span>
              </span>
              <div
                style={{
                  width: `min(${barMax}px, 46%)`,
                  height: `${Math.max(h, b.value > 0 ? 0.6 : 0)}%`,
                  background: c,
                  borderRadius: '6px 6px 0 0',
                  transformOrigin: 'bottom',
                  transform: grown ? 'scaleY(1)' : 'scaleY(0)',
                  transition: `transform 900ms ${motion.easeOut} ${i * 60}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', paddingTop: 10 }}>
        {bars.map((b) => (
          <div key={b.label} style={{ flex: '1 1 0', textAlign: 'center', minWidth: 0, padding: '0 4px' }}>
            <div style={{ fontFamily: typography.family, fontSize: typography.caption.size, fontWeight: 700, color: colors.text.primary, lineHeight: 1.35 }}>{b.label}</div>
            {labelLines > 1 && b.sub ? (
              <div style={{ fontFamily: typography.family, fontSize: 'clamp(0.58rem, 0.8vw, 0.9rem)', color: colors.text.dim, lineHeight: 1.4, marginTop: 2 }}>{b.sub}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

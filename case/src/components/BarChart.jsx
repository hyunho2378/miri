// 세로 막대 차트. 격자선과 축선 없이 값을 막대 위에 바로 적는다.
// 막대 폭은 칸의 40% 이하, 최대 barMax px. 가늘고 긴 가로 막대와 뚱뚱한 세로 막대를 쓰지 않는다.
// 활성화되면 바닥에서 자란다.

import { useEffect, useState } from 'react';
import { c, t, ease } from '../tokens.js';

export default function BarChart({ bars, active, max, unit = '', format = (v) => v.toLocaleString('ko-KR'), colorOf, barMax = 40, height = '100%', minHeight = 220 }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!active) { setGrown(false); return undefined; }
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [active]);
  const top = max ?? Math.max(...bars.map((b) => b.value)) * 1.15;

  return (
    <div style={{ height, minHeight, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'flex-end' }}>
        {bars.map((b, i) => {
          const col = colorOf ? colorOf(b, i) : c.primary;
          const strong = col !== c.barIdle;
          return (
            <div key={b.label} style={{ flex: '1 1 0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
              <span style={{
                ...t.bodyBold,
                fontVariantNumeric: 'tabular-nums',
                color: strong ? col : c.body,
                marginBottom: 8,
                whiteSpace: 'nowrap',
                opacity: grown ? 1 : 0,
                transition: `opacity 500ms ease ${350 + i * 50}ms`,
              }}>
                {format(b.value)}<span style={{ fontWeight: 400, fontSize: '0.78em' }}>{unit}</span>
              </span>
              <div style={{
                width: `min(${barMax}px, 40%)`,
                height: `${Math.max((b.value / top) * 100, b.value > 0 ? 0.8 : 0.4)}%`,
                background: b.value > 0 ? col : c.muted,
                borderRadius: '8px 8px 2px 2px',
                transformOrigin: 'bottom',
                transform: grown ? 'scaleY(1)' : 'scaleY(0)',
                transition: `transform 900ms ${ease.out} ${i * 50}ms`,
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', marginTop: 12 }}>
        {bars.map((b) => (
          <div key={b.label} style={{ flex: '1 1 0', textAlign: 'center', minWidth: 0, padding: '0 2px' }}>
            <div style={{ ...t.note, fontWeight: 700, color: b.total ? c.ink : c.body }}>{b.label}</div>
            {b.sub ? <div style={{ ...t.note, fontSize: 'clamp(11px, 0.25vw + 8px, 14px)' }}>{b.sub}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

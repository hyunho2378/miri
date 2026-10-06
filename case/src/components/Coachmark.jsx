// 코치마크. 고해상도 캡처 위에 점을 찍고 오른쪽 설명까지 지시선을 긋는다.
// 위치는 캡처 기준 백분율. 좌표는 offset 값으로 재서 진입 연출에 흔들리지 않는다.
// 문서 모드(좁은 화면)에서는 지시선 대신 점에 번호를 넣고 설명을 그림 아래에 둔다.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { c, t, shadow, ease } from '../tokens.js';
import { useMode } from './ui.jsx';

export default function Coachmark({ src, marks, active, alt, ratio = 1.6 }) {
  const { slide, mobile } = useMode();
  const phone = ratio < 1;
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const itemRefs = useRef([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [geo, setGeo] = useState(null);
  const [focus, setFocus] = useState(-1);
  const [shown, setShown] = useState(slide ? 0 : 99);
  const sorted = useMemo(() => marks.map((m, i) => ({ ...m, i })).sort((a, b) => a.y - b.y), [marks]);

  useLayoutEffect(() => {
    if (!slide) return undefined;
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const listW = Math.min(Math.max(r.width * (phone ? 0.36 : 0.27), 240), phone ? 560 : 440);
      const gutter = Math.max(r.width * (phone ? 0.1 : 0.045), 40);
      const w = Math.min(r.width - listW - gutter, r.height * ratio);
      setBox({ w, h: w / ratio, listW, gutter, W: r.width, H: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [slide, ratio, phone]);

  useLayoutEffect(() => {
    if (!slide || !box.w || !imgRef.current) return;
    const ib = imgRef.current;
    setGeo(sorted.map((m, k) => {
      const it = itemRefs.current[k];
      const ol = it ? it.offsetParent : null;
      const x1 = ib.offsetLeft + (m.x / 100) * ib.offsetWidth;
      const y1 = ib.offsetTop + (m.y / 100) * ib.offsetHeight;
      const x3 = it && ol ? ol.offsetLeft + it.offsetLeft - 14 : x1;
      const y3 = it && ol ? ol.offsetTop + it.offsetTop + 16 : y1;
      const gx = Math.min(ib.offsetLeft + ib.offsetWidth + 18 + k * 9, x3 - 16);
      return { x1, y1, gx, x3, y3 };
    }));
  }, [box, sorted, slide]);

  useEffect(() => {
    if (!slide) { setShown(99); return undefined; }
    if (!active) { setShown(0); setFocus(-1); return undefined; }
    let n = 0;
    const id = setInterval(() => { n += 1; setShown(n); if (n >= sorted.length) clearInterval(id); }, 240);
    return () => clearInterval(id);
  }, [active, slide, sorted.length]);

  const dot = (m, k, numbered) => {
    const on = k < shown;
    const dim = focus >= 0 && focus !== k;
    const size = numbered ? (mobile ? 22 : 26) : 16;
    return (
      <span
        key={m.i}
        aria-hidden="true"
        onMouseEnter={() => setFocus(k)}
        onMouseLeave={() => setFocus(-1)}
        style={{
          position: 'absolute', left: `${m.x}%`, top: `${m.y}%`, width: size, height: size,
          transform: `translate(-50%, -50%) scale(${on ? (focus === k ? 1.2 : 1) : 0.2})`,
          opacity: on ? (dim ? 0.35 : 1) : 0,
          transition: `transform 420ms ${ease.out}, opacity 300ms ease`,
          borderRadius: 999, background: m.alert ? c.alert : c.primary, color: c.white,
          boxShadow: `0 0 0 3px ${c.white}, 0 0 0 ${focus === k ? 10 : 7}px ${m.alert ? 'rgba(214,61,74,0.28)' : 'rgba(37,110,244,0.28)'}`,
          display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
        }}
      >
        {numbered ? k + 1 : null}
      </span>
    );
  };

  const item = (m, k) => (
    <li
      key={m.i}
      ref={(el) => { itemRefs.current[k] = el; }}
      onMouseEnter={() => setFocus(k)}
      onMouseLeave={() => setFocus(-1)}
      style={{
        opacity: k < shown ? (focus >= 0 && focus !== k ? 0.4 : 1) : 0,
        transform: k < shown ? 'none' : 'translateX(12px)',
        transition: `opacity 360ms ease, transform 500ms ${ease.out}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...t.bodyBold, color: m.alert ? c.alert : c.primary, fontVariantNumeric: 'tabular-nums' }}>{String(k + 1).padStart(2, '0')}</span>
        <span style={{ ...t.bodyBold }}>{m.title}</span>
      </div>
      <p style={{ ...t.note, color: c.body, margin: '4px 0 0' }}>{m.desc}</p>
    </li>
  );

  if (!slide) {
    return (
      <div>
        <div style={{ position: 'relative', width: phone ? 'min(56vw, 240px)' : '100%', aspectRatio: String(ratio), margin: phone ? '0 auto' : 0, borderRadius: phone ? 28 : 12, overflow: 'hidden', boxShadow: shadow.lg, background: c.card }}>
          <img src={src} alt={alt} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
          {sorted.map((m, k) => dot(m, k, true))}
        </div>
        <ol style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          {sorted.map((m, k) => item(m, k))}
        </ol>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      <div
        ref={imgRef}
        style={{
          position: 'absolute',
          left: phone && box.W ? Math.max(0, box.W - box.listW - box.gutter - box.w) / 2 : 0,
          top: box.H ? (box.H - box.h) / 2 : 0,
          width: box.w || 0, height: box.h || 0,
          borderRadius: phone ? 'clamp(20px, 2vw, 36px)' : 'clamp(8px, 0.8vw, 14px)',
          overflow: 'hidden', background: c.card, boxShadow: shadow.lg,
          opacity: active ? 1 : 0, transition: 'opacity 600ms ease',
        }}
      >
        <img src={src} alt={alt} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        {sorted.map((m, k) => dot(m, k, false))}
      </div>
      {geo ? (
        <svg aria-hidden="true" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
          {geo.map((g, k) => {
            const on = k < shown;
            const tone = sorted[k].alert ? c.alert : c.primary;
            const d = `M ${g.x1} ${g.y1} H ${g.gx} V ${g.y3} H ${g.x3}`;
            const len = Math.abs(g.gx - g.x1) + Math.abs(g.y3 - g.y1) + Math.abs(g.x3 - g.gx) + 2;
            const anim = { strokeDasharray: len, strokeDashoffset: on ? 0 : len, transition: `stroke-dashoffset 700ms ${ease.out}` };
            return (
              <g key={k} style={{ opacity: on ? (focus >= 0 && focus !== k ? 0.18 : 1) : 0, transition: 'opacity 300ms ease' }}>
                <path d={d} fill="none" stroke={c.white} strokeWidth={4.5} strokeOpacity={0.9} strokeLinejoin="round" style={anim} />
                <path d={d} fill="none" stroke={tone} strokeWidth={focus === k ? 2 : 1.5} strokeLinejoin="round" style={anim} />
                <circle cx={g.x3} cy={g.y3} r={3.5} fill={tone} />
              </g>
            );
          })}
        </svg>
      ) : null}
      <ol style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: box.listW || 260, margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(16px, 3.4vh, 40px)' }}>
        {sorted.map((m, k) => item(m, k))}
      </ol>
    </div>
  );
}

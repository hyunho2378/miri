// 코치마크. 고해상도 캡처 위에 번호 점을 찍고, 오른쪽 설명 열까지 지시선을 긋는다.
// 위치는 캡처 기준 백분율(x, y). 실제 픽셀 좌표는 ResizeObserver로 매번 다시 잰다.
// 지시선: 점에서 오른쪽으로 이미지 밖 거터까지 가로, 설명 높이로 세로, 설명 앞까지 가로.
// 설명은 점의 y 순서로 정렬해 선이 서로 엇갈리지 않게 한다. 마우스를 올리면 그 한 쌍만 진하게 남는다.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { colors, typography, motion } from '../tokens.js';

// 캡처는 2880x1800(1.6). ratio를 다르게 주면 가운데를 잘라 보여 준다(도우미 휴대폰 화면 0.5).
export default function Coachmark({ src, marks, active, alt, ratio = 1.6 }) {
  const RATIO = ratio;
  const phone = ratio < 1;
  const wrapRef = useRef(null);
  const imgBoxRef = useRef(null);
  const itemRefs = useRef([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [geo, setGeo] = useState(null);
  const [focus, setFocus] = useState(-1);
  const [shown, setShown] = useState(0);

  const sorted = useMemo(() => marks.map((m, i) => ({ ...m, i })).sort((a, b) => a.y - b.y), [marks]);

  // 사용 가능한 영역에서 16:10 이미지 크기를 정한다
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const listW = Math.min(Math.max(r.width * (phone ? 0.34 : 0.26), 220), phone ? 520 : 420);
      const gutter = Math.max(r.width * (phone ? 0.12 : 0.045), 36);
      const availW = r.width - listW - gutter;
      const w = Math.min(availW, r.height * RATIO);
      setBox({ w, h: w / RATIO, listW, gutter, W: r.width, H: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [RATIO, phone]);

  // 점과 설명의 좌표로 지시선을 계산한다. 진입 연출(transform)에 흔들리지 않게 offset 값으로 잰다
  useLayoutEffect(() => {
    if (!box.w || !imgBoxRef.current) return;
    const ib = imgBoxRef.current;
    const lines = sorted.map((m, k) => {
      const it = itemRefs.current[k];
      const ol = it ? it.offsetParent : null;
      const x1 = ib.offsetLeft + (m.x / 100) * ib.offsetWidth;
      const y1 = ib.offsetTop + (m.y / 100) * ib.offsetHeight;
      const x3 = it && ol ? ol.offsetLeft + it.offsetLeft - 12 : x1;
      const y3 = it && ol ? ol.offsetTop + it.offsetTop + 14 : y1;
      const gx = ib.offsetLeft + ib.offsetWidth + 16 + k * 9;
      return { x1, y1, gx: Math.min(gx, x3 - 14), x3, y3 };
    });
    setGeo(lines);
  }, [box, sorted]);

  // 진입하면 하나씩 켠다
  useEffect(() => {
    if (!active) { setShown(0); setFocus(-1); return undefined; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setShown(sorted.length); return undefined; }
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= sorted.length) clearInterval(id);
    }, 260);
    return () => clearInterval(id);
  }, [active, sorted.length]);


  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      {/* 캡처 */}
      <div
        ref={imgBoxRef}
        style={{
          position: 'absolute',
          left: phone && box.W ? Math.max(0, box.W - box.listW - box.gutter - box.w) / 2 : 0,
          top: box.H ? (box.H - box.h) / 2 : 0,
          width: box.w || 0,
          height: box.h || 0,
          // 지시선을 재는 기준이라 transform 연출을 걸지 않는다. 투명도만 바꾼다
          opacity: active ? 1 : 0,
          transition: 'opacity 600ms ease',
          borderRadius: phone ? 'clamp(18px, 2vw, 36px)' : 'clamp(8px, 0.9vw, 14px)',
          overflow: 'hidden',
          background: colors.raised,
          boxShadow: `0 1px 0 ${colors.line.faint}, 0 24px 60px -24px rgba(16,16,16,0.28), 0 0 0 1px ${colors.line.default}`,
        }}
      >
        <img src={src} alt={alt} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        {sorted.map((m, k) => {
          const on = k < shown;
          const dim = focus >= 0 && focus !== k;
          const tone = m.alert ? colors.alert : colors.accent;
          return (
            <button
              key={m.i}
              type="button"
              aria-label={`${k + 1}. ${m.title}`}
              onMouseEnter={() => setFocus(k)}
              onMouseLeave={() => setFocus(-1)}
              onFocus={() => setFocus(k)}
              onBlur={() => setFocus(-1)}
              style={{
                position: 'absolute',
                left: `${m.x}%`,
                top: `${m.y}%`,
                width: 14,
                height: 14,
                transform: `translate(-50%, -50%) scale(${on ? (focus === k ? 1.25 : 1) : 0.2})`,
                opacity: on ? (dim ? 0.35 : 1) : 0,
                transition: `transform 420ms ${motion.easeOut}, opacity 300ms ease`,
                borderRadius: 999,
                border: `3px solid ${colors.white}`,
                background: tone,
                cursor: 'default',
                boxShadow: `0 0 0 ${focus === k ? 9 : 6}px ${m.alert ? 'rgba(214,61,74,0.25)' : 'rgba(37,110,244,0.25)'}, 0 2px 6px rgba(16,16,16,0.25)`,
                padding: 0,
              }}
            />
          );
        })}
      </div>

      {/* 지시선 */}
      {geo ? (
        <svg aria-hidden="true" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
          {geo.map((g, k) => {
            const on = k < shown;
            const dim = focus >= 0 && focus !== k;
            const tone = sorted[k].alert ? colors.alert : colors.accent;
            const d = `M ${g.x1} ${g.y1} H ${g.gx} V ${g.y3} H ${g.x3}`;
            const len = Math.abs(g.gx - g.x1) + Math.abs(g.y3 - g.y1) + Math.abs(g.x3 - g.gx) + 2;
            return (
              <g key={k} style={{ opacity: on ? (dim ? 0.18 : 1) : 0, transition: 'opacity 300ms ease' }}>
                <path d={d} fill="none" stroke={colors.white} strokeWidth={4} strokeOpacity={0.9} strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={on ? 0 : len} style={{ transition: `stroke-dashoffset 700ms ${motion.easeOut}` }} />
                <path
                  d={d}
                  fill="none"
                  strokeLinejoin="round"
                  stroke={tone}
                  strokeWidth={focus === k ? 1.8 : 1.2}
                  strokeDasharray={len}
                  strokeDashoffset={on ? 0 : len}
                  style={{ transition: `stroke-dashoffset 700ms ${motion.easeOut}` }}
                />
                <circle cx={g.x3} cy={g.y3} r={3} fill={tone} />
              </g>
            );
          })}
        </svg>
      ) : null}

      {/* 설명 열 */}
      <ol
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: box.listW || 260,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 'clamp(14px, 3.2vh, 40px)',
        }}
      >
        {sorted.map((m, k) => {
          const on = k < shown;
          const dim = focus >= 0 && focus !== k;
          return (
            <li
              key={m.i}
              ref={(el) => { itemRefs.current[k] = el; }}
              onMouseEnter={() => setFocus(k)}
              onMouseLeave={() => setFocus(-1)}
              style={{
                opacity: on ? (dim ? 0.35 : 1) : 0,
                transform: on ? 'translateX(0)' : 'translateX(12px)',
                transition: `opacity 360ms ease, transform 500ms ${motion.easeOut}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, fontSize: typography.body.size, color: m.alert ? colors.alert : colors.accent, fontVariantNumeric: 'tabular-nums' }}>
                  {String(k + 1).padStart(2, '0')}
                </span>
                <span style={{ fontFamily: typography.family, fontWeight: 700, fontSize: typography.body.size, color: colors.text.primary, lineHeight: 1.4 }}>{m.title}</span>
              </div>
              <p style={{ margin: '4px 0 0', fontFamily: typography.family, fontSize: typography.caption.size, lineHeight: 1.6, color: colors.text.secondary }}>{m.desc}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

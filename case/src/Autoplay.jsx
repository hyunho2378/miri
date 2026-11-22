// 화면별 자동 시연. 실제 서비스 화면(screen.html) 안의 단추와 입력 칸을 정해진 순서대로 눌러 그 화면의 쓰임을 보여 준다.
// 코치마크를 덮지 않고, 손끝 표시가 움직여 누르고, 필요한 곳은 화면을 그 부분으로 당겨 크게 보인다.
// 단계 글은 화면 옆 목록에 두고 지금 단계를 밝힌다. 보는 사람이 화면을 직접 누르면 시연을 멈춘다.
import { useEffect, useRef, useState } from 'react';
import { LiveScreen } from './Live.jsx';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (el) => (el.getAttribute?.('aria-label') || el.textContent || el.placeholder || '').replace(/\s+/g, ' ').trim();

// 대상 찾기: { text, exact, find, within, sel, up, nth }
function resolve(doc, t) {
  if (!doc || !t) return null;
  const scope = t.within ? doc.querySelector(t.within) : doc;
  if (!scope) return null;
  let list;
  if (t.sel) list = [...scope.querySelectorAll(t.sel)];
  else {
    const texts = [].concat(t.text || []);
    list = [...scope.querySelectorAll(t.find || 'button, a, [role="button"], [role="tab"], input, textarea, select')].filter((e) => {
      const s = norm(e);
      return texts.some((x) => (t.exact ? s === x : s.startsWith(x)));
    });
    list.sort((a, b) => norm(a).length - norm(b).length);
  }
  list = list.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  let el = list[t.nth || 0] || null;
  if (el && t.up) el = el.closest(t.up) || el;
  return el;
}

async function find(getDoc, t, timeout = 3500) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    const el = resolve(getDoc(), t);
    if (el) return el;
    await wait(150);
  }
  return null;
}

// 화면 안에서만 내린다(scrollIntoView는 케이스 페이지까지 함께 움직여 쓰지 않음)
function scrollInFrame(el) {
  const doc = el.ownerDocument; const win = doc.defaultView;
  for (let n = el.parentElement; n && n !== doc.body && n !== doc.documentElement; n = n.parentElement) {
    const st = win.getComputedStyle(n);
    if (!/(auto|scroll)/.test(st.overflowY) || n.scrollHeight <= n.clientHeight + 1) continue;
    const r = el.getBoundingClientRect(); const b = n.getBoundingClientRect();
    if (r.top < b.top + 40 || r.bottom > b.bottom - 40) n.scrollTop += (r.top + r.height / 2) - (b.top + b.height / 2);
  }
  const r = el.getBoundingClientRect();
  if (r.top < 40 || r.bottom > win.innerHeight - 40) win.scrollBy(0, (r.top + r.height / 2) - win.innerHeight / 2);
}

// React 입력 칸에 한 글자씩 친다
async function typeInto(el, text, alive) {
  const win = el.ownerDocument.defaultView;
  const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  el.focus();
  let v = '';
  for (const ch of text) {
    if (!alive()) return;
    v += ch;
    setter.call(el, v);
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    await wait(ch === ' ' ? 40 : 75 + Math.random() * 50);
  }
}

export function AutoScreen({ route, role, kind = 'desktop', poster, title, steps, hold = 3200, intro = 900, className = '' }) {
  const live = useRef(null);
  const stage = useRef(null);
  const [cur, setCur] = useState(-1);
  const [mode, setMode] = useState('idle'); // idle, play, done, user
  const [zoom, setZoom] = useState({ z: 1, ox: 50, oy: 50 });
  const [hand, setHand] = useState({ x: 50, y: 50, on: false, tap: 0 });
  const run = useRef(0);
  const visible = useRef(false);

  const getDoc = () => live.current?.frame()?.contentDocument || null;
  const scale = () => live.current?.scale() || 1;

  // 요소의 화면 좌표(틀 안, 줄이기 전 px)를 틀 비율(%)로
  const pct = (el) => {
    const r = el.getBoundingClientRect();
    const fr = live.current?.frame();
    const W = fr ? fr.offsetWidth : 1440; const H = fr ? fr.offsetHeight : 900;
    return { x: ((r.left + r.width / 2) / W) * 100, y: ((r.top + r.height / 2) / H) * 100, w: r.width / W, h: r.height / H };
  };

  async function play() {
    const id = ++run.current;
    const alive = () => run.current === id && visible.current;
    setMode('play'); setCur(-1); setZoom({ z: 1, ox: 50, oy: 50 }); setHand((h) => ({ ...h, on: false }));
    // 처음 상태로 다시 연다
    if (live.current?.ready()) { try { getDoc()?.defaultView?.localStorage?.clear(); } catch { /* 무시 */ } await live.current.reset(); }
    for (let i = 0; i < 40 && !live.current?.ready(); i += 1) { if (!alive()) return; await wait(200); }
    await wait(intro);
    for (let i = 0; i < steps.length; i += 1) {
      if (!alive()) return;
      const s = steps[i];
      setCur(i);
      if (s.esc) { const d = getDoc(); if (d) d.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); d?.activeElement?.blur?.(); await wait(400); }
      const el = s.t ? await find(getDoc, s.t, s.timeout || 3500) : null;
      if (s.t && !el) { (window.__autoMiss ||= []).push(`${route} ${i + 1}`); if (s.optional) continue; }
      if (el && s.scroll !== false) { scrollInFrame(el); await wait(160); }
      // 화면 당기기
      if (s.zoom && el) { const p = pct(el); setZoom({ z: s.zoom, ox: p.x, oy: p.y }); }
      else if (s.zoom === 1 || s.reset) setZoom({ z: 1, ox: 50, oy: 50 });
      if (el && (s.do === 'click' || s.do === 'type' || s.do === 'point')) {
        const p = pct(el); setHand((h) => ({ x: p.x, y: p.y, on: true, tap: h.tap }));
        await wait(700);
        if (!alive()) return;
      }
      if (el && s.do === 'click') { setHand((h) => ({ ...h, tap: h.tap + 1 })); await wait(160); el.click(); }
      if (el && s.do === 'type') { setHand((h) => ({ ...h, tap: h.tap + 1 })); await typeInto(el, s.text, alive); }
      if (s.do === 'nav') { const a = await find(getDoc, { text: s.text, exact: true, find: 'a', within: 'aside, nav' }); if (a) { const p = pct(a); setHand((h) => ({ x: p.x, y: p.y, on: true, tap: h.tap })); await wait(650); setHand((h) => ({ ...h, tap: h.tap + 1 })); a.click(); } }
      await wait(s.ms ?? 1600);
    }
    if (!alive()) return;
    setHand((h) => ({ ...h, on: false }));
    await wait(hold);
    if (!alive()) return;
    setZoom({ z: 1, ox: 50, oy: 50 });
    setMode('done');
    await wait(2200);
    if (alive()) play();
  }

  // 화면에 반 이상 들어오면 시작, 벗어나면 멈춤
  useEffect(() => {
    const el = stage.current;
    const io = new IntersectionObserver(([e]) => {
      const on = e.intersectionRatio >= 0.45;
      if (on && !visible.current) { visible.current = true; if (mode !== 'user') play(); }
      if (!on && visible.current) { visible.current = false; run.current += 1; setMode((m) => (m === 'user' ? m : 'idle')); setZoom({ z: 1, ox: 50, oy: 50 }); setHand((h) => ({ ...h, on: false })); }
    }, { threshold: [0, 0.45, 0.8] });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 보는 사람이 화면을 직접 누르면 시연을 멈춘다(screen.html이 'using'을 알림)
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== location.origin || e.data?.miri !== 'using') return;
      const fr = live.current?.frame();
      if (!fr || e.source !== fr.contentWindow) return;
      if (mode === 'play' && !userClick.current) return;
      run.current += 1; setMode('user'); setZoom({ z: 1, ox: 50, oy: 50 }); setHand((h) => ({ ...h, on: false }));
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [mode]);

  // 시연 중 손끝 표시가 누른 클릭은 사람 클릭이 아니다. 실제 사람 손은 pointerdown이 먼저 오므로 틀 위 pointer로 가린다
  const userClick = useRef(false);
  const onPointer = () => { userClick.current = true; run.current += 1; setMode('user'); setZoom({ z: 1, ox: 50, oy: 50 }); setHand((h) => ({ ...h, on: false })); };

  return (
    <div className={`auto ${kind} ${className}`}>
      <div className="auto-stage" ref={stage}>
        <div className="auto-zoom" style={{ transform: `scale(${zoom.z})`, transformOrigin: `${zoom.ox}% ${zoom.oy}%` }}>
          <LiveScreen ref={live} route={route} role={role} kind={kind} poster={poster} title={title} margin="80%" />
          <span className={`auto-hand${hand.on ? ' on' : ''}`} style={{ left: `${hand.x}%`, top: `${hand.y}%`, '--inv': 1 / zoom.z }}>
            <i key={hand.tap} className="auto-tap" />
          </span>
        </div>
        {mode === 'play' ? <button type="button" className="auto-cover" aria-label={`${title} 직접 써 보기`} onPointerDown={onPointer} /> : null}
        {mode === 'user' || mode === 'done' ? (
          <button type="button" className="auto-replay" onClick={() => { userClick.current = false; play(); }}>자동 시연 다시 보기</button>
        ) : null}
      </div>
      <ol className="auto-steps" aria-live="polite">
        {steps.map((s, i) => (
          <li key={s.say} className={i === cur && mode === 'play' ? 'on' : i < cur && mode === 'play' ? 'past' : ''}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <p>{s.say}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

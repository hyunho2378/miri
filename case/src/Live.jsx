// 실제 화면 틀. 그림 대신 서비스 코드(screen.html)를 띄워 누르고 입력하는 대로 움직이게 한다.
// 가까이 오면 띄우고 멀어지면 내려 동시에 떠 있는 화면 수를 줄인다. 실제 화면이 그려지기 전까지는 같은 화면의 미리 보기 그림을 깐다.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const SIZE = { desktop: { w: 1440, h: 900 }, phone: { w: 390, h: 844 } };
let seq = 0;

export const LiveScreen = forwardRef(function LiveScreen({ route, role, kind = 'desktop', poster, title, eager = false, className = '', onReady, margin = '60%' }, ref) {
  const box = useRef(null);
  const frame = useRef(null);
  const idRef = useRef(`s${++seq}`);
  const [near, setNear] = useState(eager);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [touchOn, setTouchOn] = useState(false);
  const { w, h } = SIZE[kind];
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  // 틀 폭에 맞춰 실제 화면(1440 또는 390 폭)을 줄여 보인다
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  // 화면 높이의 60%만큼 앞에서 띄우고 그만큼 멀어지면 내린다. 표지 화면(eager)은 처음부터 띄운다
  useEffect(() => {
    const el = box.current;
    const io = new IntersectionObserver(([e]) => {
      setNear(e.isIntersecting);
      if (!e.isIntersecting) { setReady(false); setTouchOn(false); }
    }, { rootMargin: `${margin} 0px ${margin} 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== location.origin || e.data?.id !== idRef.current) return;
      if (e.data.miri === 'ready') { setReady(true); onReady?.(frame.current); }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onReady]);

  useImperativeHandle(ref, () => ({
    frame: () => frame.current,
    scale: () => scale,
    ready: () => ready,
    // 처음 상태로 다시 연다(같은 주소를 새로 불러옴)
    reset: () => new Promise((res) => {
      setReady(false);
      const done = (e) => { if (e.data?.id === idRef.current && e.data.miri === 'ready') { window.removeEventListener('message', done); res(); } };
      window.addEventListener('message', done);
      setNonce((n) => n + 1);
    }),
  }), [scale, ready]);

  const src = `/screen.html?r=${encodeURIComponent(route)}${role ? `&role=${role}` : ''}&id=${idRef.current}&n=${nonce}`;
  const inner = (
    <div className="live-box" ref={box} style={{ aspectRatio: `${w} / ${h}` }}>
      {poster ? <img className={`live-poster${ready ? ' off' : ''}`} src={poster} alt="" width={w} height={h} loading={eager ? 'eager' : 'lazy'} decoding="async" /> : null}
      {near && scale > 0 ? (
        <iframe
          key={nonce}
          ref={frame}
          className={`live-frame${ready ? ' on' : ''}`}
          src={src}
          title={title}
          loading="eager"
          style={{ width: w, height: h, transform: `scale(${scale})`, pointerEvents: coarse && !touchOn ? 'none' : 'auto' }}
        />
      ) : null}
      {coarse && near && !touchOn ? (
        <button type="button" className="live-touch" onClick={() => setTouchOn(true)} aria-label={`${title} 직접 써 보기`} />
      ) : null}
    </div>
  );
  return kind === 'phone'
    ? <div className={`phone live ${className}`}>{inner}</div>
    : <div className={`shot live lift ${className}`}>{inner}</div>;
});

// 화면 안 버튼을 이름으로 찾아 누른다. 누르는 자리에 손끝 표시를 띄워 무엇을 눌렀는지 보이게 한다
export function tapIn(liveRef, label, { exact = true } = {}) {
  const fr = liveRef.current?.frame();
  const doc = fr?.contentDocument;
  if (!doc) return false;
  const btn = [...doc.querySelectorAll('button, a, [role="button"]')].find((b) => {
    const t = (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim();
    return exact ? t === label : t.startsWith(label);
  });
  if (!btn) return false;
  const s = liveRef.current.scale();
  const fb = fr.getBoundingClientRect();
  const bb = btn.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'tap-dot';
  dot.style.left = `${fb.left + (bb.left + bb.width / 2) * s}px`;
  dot.style.top = `${fb.top + (bb.top + bb.height / 2) * s}px`;
  document.body.appendChild(dot);
  setTimeout(() => dot.remove(), 700);
  btn.click();
  return true;
}

export const headingIn = (liveRef) => {
  const doc = liveRef.current?.frame()?.contentDocument;
  return doc?.querySelector('header h1, [role="banner"] h1, h1')?.textContent?.trim() || '';
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 도우미 화면을 배정 흐름의 단계(0 참여 동의, 1 배정 알림, 2 지금 차례)까지 실제로 눌러 진행한다
export async function driveHelper(liveRef, target, alive = () => true) {
  const GOAL = ['참여 동의', '배정 알림', '지금 차례'];
  const reset = async () => {
    try { liveRef.current?.frame()?.contentWindow?.localStorage?.clear(); } catch { /* 접근 불가 */ }
    await liveRef.current?.reset();
    await wait(300);
  };
  for (let i = 0; i < 14 && alive(); i += 1) {
    if (!liveRef.current?.ready()) { await wait(250); continue; }
    const h = headingIn(liveRef);
    if (h === GOAL[target]) return true;
    if (target < 2 && h === '지금 차례') { await reset(); continue; }
    if (target === 0 && h === '배정 알림') { await reset(); continue; }
    if (h === '미리 도우미') {
      if (target === 0) { if (!tapIn(liveRef, '참여 동의하기') && !tapIn(liveRef, '참여 동의', { exact: false })) await reset(); }
      else if (!tapIn(liveRef, '참여 동의하기')) tapIn(liveRef, '훈련 배정 받기');
    } else if (h === '참여 동의') {
      tapIn(liveRef, '동의하고 시작');
    } else if (h === '배정 알림' && target === 2) {
      tapIn(liveRef, '수락');
    } else if (h === '발령 종료' || h === '이번 발령에 배정 없음') {
      await reset(); continue;
    }
    await wait(target > 0 ? 650 : 450);
  }
  return headingIn(liveRef) === GOAL[target];
}

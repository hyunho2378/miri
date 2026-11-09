// 화면 입구. 케이스 스터디의 화면 자리마다 이 문서가 iframe으로 열리고, 실제 서비스 코드(client/src/App.jsx)를 그대로 그린다.
// 주소: /screen.html?r=/console/shortage(&role=dong). 그림이 아니라 서비스와 같은 코드라 누르고 입력하는 대로 움직인다.
import '../../../client/src/index.css';
import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';

const q = new URLSearchParams(location.search);
// 화면 안에서 새로고침하면 서비스 경로(/console/..., /m/...)로 다시 들어오므로 그 경로를 그대로 쓴다
const route = q.get('r') || (location.pathname.endsWith('/screen.html') ? '/console' : location.pathname + location.search);
const role = q.get('role');
// 같은 케이스 페이지 안의 화면들은 저장소를 같이 쓰므로, 화면마다 메모리 저장소를 따로 둔다
// (한 화면에서 고른 역할이나 동의가 다른 화면의 첫 상태를 바꾸지 않게)
class MemoryStorage {
  #m = new Map();
  get length() { return this.#m.size; }
  key(i) { return [...this.#m.keys()][i] ?? null; }
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  setItem(k, v) { this.#m.set(String(k), String(v)); }
  removeItem(k) { this.#m.delete(k); }
  clear() { this.#m.clear(); }
}
for (const name of ['sessionStorage', 'localStorage']) {
  try { Object.defineProperty(window, name, { value: new MemoryStorage(), configurable: true }); } catch { /* 바꿀 수 없는 브라우저는 그대로 */ }
}
if (role) sessionStorage.setItem('miri:demo-role', role);
// 서비스 라우터가 이 경로를 첫 화면으로 읽는다
history.replaceState(null, '', route);

const parentWin = window.parent !== window ? window.parent : null;
const tell = (type, extra = {}) => parentWin?.postMessage({ miri: type, id: q.get('id'), ...extra }, location.origin);

// 휠: 화면을 한 번 눌러 쓰는 중이고 안쪽에 더 내릴 곳이 있을 때만 안쪽이 움직인다. 그 밖에는 케이스 페이지가 내려간다
let using = false;
window.addEventListener('pointerdown', () => { using = true; tell('using'); }, true);
document.addEventListener('mouseleave', () => { using = false; });
const roomFor = (el, dy) => {
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (!/(auto|scroll)/.test(s.overflowY) || n.scrollHeight <= n.clientHeight + 1) continue;
    if (dy > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 1 : n.scrollTop > 0) return true;
  }
  return false;
};
window.addEventListener('wheel', (e) => {
  if (!parentWin) return;
  if (using && roomFor(e.target, e.deltaY)) return;
  e.preventDefault();
  if (typeof parentWin.__caseScrollBy === 'function') parentWin.__caseScrollBy(e.deltaY);
  else parentWin.scrollBy(0, e.deltaY);
}, { passive: false, capture: true });

// 역할을 저장한 뒤에 서비스 코드를 불러온다(로그인 저장소가 처음 읽을 때 이 역할을 보게)
const { default: App } = await import('../../../client/src/App.jsx');
createRoot(document.getElementById('root')).render(createElement(StrictMode, null, createElement(App)));

// 첫 화면이 그려지면 케이스 페이지에 알린다(그때 미리 보기 그림을 걷어 낸다)
const t0 = performance.now();
const waitReady = () => {
  const root = document.getElementById('root');
  const busy = root.querySelector('[aria-busy="true"]');
  const tall = root.firstElementChild && root.getBoundingClientRect().height > 200;
  if ((tall && !busy) || performance.now() - t0 > 15000) { setTimeout(() => tell('ready'), 250); return; }
  requestAnimationFrame(waitReady);
};
requestAnimationFrame(waitReady);

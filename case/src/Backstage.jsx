// 상세기획서와 개발보고서 내용을 서비스 디자인 순서(무대 뒤 계산, AI, 자료 흐름, 권한, 구성)로 보여 주는 도식 모음
// 도식은 그림 파일이 아니라 코드로 그리고, 연결선은 실제 상자 위치를 재서 이어 그린다
import { useEffect, useRef, useState } from 'react';
import {
  Monitor, Smartphone, Mic, Siren, User, Lock, Server, Database, ScanText, Cpu, Package, Globe, Route,
  Landmark, Users, Building2, BedDouble, Accessibility, HandHelping, PersonStanding, Ambulance, Bus, Car,
  Check, X, ArrowRight, FileText, ShieldCheck, UserCheck, EyeOff, ScanSearch, FileSearch, Ban, CloudOff, KeyRound, Clock, Layers,
} from './icons.jsx';
import { FEATURES, SITUATION, ROLES, ASIS, LOGIC2, AI2, FLOW, ACCESS, ARCH, REDESIGN, DSQA, IMPACT } from './caseCopy4.js';

const ICON = {
  monitor: Monitor, phone: Smartphone, mic: Mic, siren: Siren, person: User, lock: Lock, server: Server, db: Database,
  scan: ScanText, cpu: Cpu, box: Package, globe: Globe, route: Route, landmark: Landmark, users: Users, building: Building2,
};
const GRADE_ICON = { 침상: BedDouble, 휠체어: Accessibility, 부축: HandHelping, 도보: PersonStanding };
const CAR_ICON = { 침상: Ambulance, 휠체어: Accessibility, 부축: Car, 도보: Bus };

const Txt = ({ badge, title, sub, light = false }) => (
  <div className={`txt-wrap${light ? ' on-dark' : ''}`}>
    <span className="badge">{badge}</span>
    <p className="txt-title">{title.join(' ')}</p>
    {sub?.map((s, i) => <p key={i} className="sub">{s}</p>)}
  </div>
);

// 아이콘 타일(채운 면)
const Tile = ({ icon: I, tone = 'blue', size = 22 }) => <span className={`dg-tile t-${tone}`}><I size={size} strokeWidth={2} /></span>;

// 연결선: 상자의 실제 위치를 재서 굵은 곡선과 흐르는 점을 그린다
function Wires({ box, links, deps = [] }) {
  const [ps, setPs] = useState([]);
  useEffect(() => {
    // 부모 상자의 ref는 자식 효과보다 늦게 붙으므로 useEffect에서 잰다
    const el = box.current; if (!el) return undefined;
    const calc = () => {
      const B = el.getBoundingClientRect(); if (!B.width) return;
      const s = el.offsetWidth ? B.width / el.offsetWidth : 1;
      const at = (r, side) => {
        const x = (side === 'r' ? r.right : side === 'l' ? r.left : r.left + r.width / 2) - B.left;
        const y = (side === 'b' ? r.bottom : side === 't' ? r.top : r.top + r.height / 2) - B.top;
        return [x / s, y / s];
      };
      const out = [];
      links.forEach((l, i) => {
        const a = el.querySelector(`[data-w="${l.a}"]`); const b = el.querySelector(`[data-w="${l.b}"]`);
        if (!a || !b || !a.offsetParent || !b.offsetParent) return;
        const as = l.as || 'r'; const bs = l.bs || 'l';
        const [x1, y1] = at(a.getBoundingClientRect(), as); const [x2, y2] = at(b.getBoundingClientRect(), bs);
        let d;
        if (as === 'r' || as === 'l') { const k = Math.max(30, Math.abs(x2 - x1) * 0.5); const dx = as === 'r' ? k : -k; const ex = bs === 'l' ? -k : k; d = `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 + ex} ${y2} ${x2} ${y2}`; }
        else { const k = Math.max(24, Math.abs(y2 - y1) * 0.5); const dy = as === 'b' ? k : -k; const ey = bs === 't' ? -k : k; d = `M${x1} ${y1} C${x1} ${y1 + dy} ${x2} ${y2 + ey} ${x2} ${y2}`; }
        out.push({ i, d, l, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 });
      });
      setPs(out);
    };
    calc();
    const ro = new ResizeObserver(calc); ro.observe(el);
    window.addEventListener('resize', calc);
    const t1 = setTimeout(calc, 400); const t2 = setTimeout(calc, 1400);
    return () => { ro.disconnect(); window.removeEventListener('resize', calc); clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <>
      <svg className="wires" aria-hidden="true">
        <defs>
          {['blue', 'red', 'mute', 'white'].map((c) => (
            <marker key={c} id={`ah-${c}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className={`ah ${c}`} />
            </marker>
          ))}
        </defs>
        {ps.map((p) => (
          <g key={p.i} className={`wire w-${p.l.tone || 'blue'}${p.l.on === false ? ' off' : ''}`}>
            <path className="w-base" d={p.d} markerEnd={p.l.arrow === false ? undefined : `url(#ah-${p.l.tone || 'blue'})`} />
            {p.l.flow === false ? null : (
              <circle r="4.5" className="w-dot">
                <animateMotion dur={`${p.l.dur || 2.4}s`} repeatCount="indefinite" path={p.d} begin={`${(p.i % 5) * 0.35}s`} />
              </circle>
            )}
          </g>
        ))}
      </svg>
      {ps.filter((p) => p.l.t).map((p) => (
        <span key={`t${p.i}`} className={`w-lab w-${p.l.tone || 'blue'}`} style={{ left: p.mx, top: p.my }}>{p.l.t}</span>
      ))}
    </>
  );
}

// 탭: 아래 막대가 채워지며 지금 탭을 보여 준다(사용자가 고르는 방식, 자동으로 넘기지 않음)
function Tabs({ items, i, set, light = false }) {
  return (
    <div className={`dg-tabs${light ? ' on-dark' : ''}`} role="tablist">
      {items.map((t, k) => (
        <button key={t} type="button" role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => set(k)}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') set((k + 1) % items.length); if (e.key === 'ArrowLeft') set((k - 1 + items.length) % items.length); }}>
          <span className="n">{String(k + 1).padStart(2, '0')}</span><span className="t">{t}</span><i className="bar"><i /></i>
        </button>
      ))}
    </div>
  );
}

// 화면에 들어오면 막대를 채우는 신호
function useSeen(ref) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setOn(true); }, { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, [ref]);
  return on;
}

// ───────── 01 Discover: 숫자로 본 현황과 이미 있는 제도 ─────────
export function Situation() {
  const box = useRef(null);
  const S = SITUATION;
  return (
    <section className="dg-sec" id="situation">
      <Txt badge={S.badge} title={S.title} />
      <div className="sit-facts">
        {S.facts.map((f) => <div key={f.t} className="sit-f"><b>{f.t}</b><p className="v">{f.n}{f.u}</p><span>{f.s}</span></div>)}
      </div>
      <div className="sit-map" ref={box}>
        <div className="sit-col">
          <p className="dg-cap">{S.exist.t}</p>
          {S.exist.rows.map((r, i) => (
            <div key={r.k} className="dg-blk" data-w={`ex${i}`}><Tile icon={[Siren, Users, Layers][i]} /><div><b>{r.k}</b><span>{r.v}</span></div></div>
          ))}
        </div>
        <div className="sit-gap dg-blk t-red" data-w="gap">
          <Tile icon={Ban} tone="red" />
          <div><b>대상자별 이송 가능 여부 계산</b><span>{S.exist.gap}</span></div>
        </div>
        <Wires box={box} links={S.exist.rows.map((_, i) => ({ a: `ex${i}`, b: 'gap', tone: 'mute', flow: false }))} />
      </div>
    </section>
  );
}

// ───────── 02 Define: 사용자와 역할(기기별 묶음) ─────────
export function Roles() {
  const R = ROLES.rows;
  const groups = [
    { k: '컴퓨터', icon: Monitor, rows: R.filter((r) => r.d === '컴퓨터') },
    { k: '휴대폰', icon: Smartphone, rows: R.filter((r) => r.d === '휴대폰') },
    { k: '화면 없이 받음', icon: FileText, rows: R.filter((r) => r.d !== '컴퓨터' && r.d !== '휴대폰') },
  ];
  return (
    <section className="dg-sec" id="roles">
      <Txt badge={ROLES.badge} title={ROLES.title} />
      <div className="roles">
        {groups.map((g) => (
          <div key={g.k} className="role-g">
            <p className="role-h"><g.icon size={22} strokeWidth={2.2} />{g.k}</p>
            {g.rows.map((r) => { const I = ICON[r.icon]; return <div key={r.k} className="role-r"><span className="dg-tile t-glass"><I size={20} strokeWidth={2} /></span><div><b>{r.k}</b><p>{r.v}</p></div></div>; })}
          </div>
        ))}
      </div>
      <div className="feat">
        <p className="dg-cap">이 사람들이 쓰는 기능 8가지</p>
        <div className="feat-g">{FEATURES.map((f, i) => <div key={f.k}><em>{String(i + 1).padStart(2, '0')}</em><b>{f.k}</b><p>{f.v}</p></div>)}</div>
      </div>
    </section>
  );
}

// ───────── 02 Define: 지금과 미리(시간 축 위로 일을 앞당김) ─────────
export function AsIsToBe() {
  const ref = useRef(null); const on = useSeen(ref);
  const phase = ['불이 나기 전', '발령', '발령 뒤'];
  const to = [0, 1, 1];
  return (
    <section className="dg-sec bg-bk" id="asis" ref={ref}>
      <Txt badge={ASIS.badge} title={ASIS.title} light />
      <div className={`asis${on ? ' on' : ''}`}>
        <div className="asis-row asis-axis"><span />{phase.map((p, i) => <b key={p} style={{ gridColumn: i * 2 + 2 }}>{p}</b>)}</div>
        {ASIS.rows.map((r, i) => (
          <div key={r.k} className="asis-row">
            <p className="asis-k">{r.k}</p>
            <span className="asis-b" style={{ gridColumn: to[i] * 2 + 2 }}><Check size={16} strokeWidth={2.6} />{r.b}</span>
            <span className="asis-arrow" style={{ gridColumn: `${to[i] * 2 + 3} / 6` }}><i /></span>
            <span className="asis-a" style={{ gridColumn: 6 }}><X size={16} strokeWidth={2.6} />{r.a}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────── 03 Develop: 부족분 계산(탭 네 개) ─────────
export function LogicLab() {
  const L = LOGIC2; const box = useRef(null); const ref = useRef(null); const seen = useSeen(ref);
  const total = L.target.grades.reduce((a, g) => a + g.n, 0);
  return (
    <section className="dg-sec" id="logic" ref={ref}>
      <Txt badge={L.badge} title={L.title} />
      {L.tabs.map((name, t) => (
      <div className="dg-sub" key={name}>
      <p className="dg-sub-h"><em>{String(t + 1).padStart(2, '0')}</em>{name}</p>
      <div className={`dg-panel${seen ? ' seen' : ''}`}>
        {t === 0 ? (
          <div className="lg-target" ref={box}>
            <div className="lg-left">
              <p className="dg-cap">{L.target.t}</p>
              <div className="lg-bar">{L.target.grades.map((g) => <span key={g.k} className={g.c} style={{ flex: g.n }} title={`${g.k} ${g.n}명`} />)}</div>
              <div className="lg-legend">{L.target.grades.map((g) => <span key={g.k}><i className={g.c} />{g.k} {g.n}명</span>)}<b>합계 {total}명</b></div>
              <div className="lg-pairs">
                {L.target.grades.map((g, i) => { const GI = GRADE_ICON[g.k]; const CI = CAR_ICON[g.k]; return (
                  <div key={g.k} className="lg-pair">
                    <div className="dg-blk" data-w={`g${i}`}><span className={`dg-tile ${g.c}`}><GI size={22} strokeWidth={2} /></span><div><b>{g.k}</b><span>가중치 {g.w}</span></div></div>
                    <div className="dg-blk" data-w={`c${i}`}><Tile icon={CI} /><div><b>{g.car}</b><span>{g.cap}, {g.crew}</span></div></div>
                  </div>
                ); })}
              </div>
            </div>
            <div className="lg-res">
              {L.target.res.map((r) => <div key={r.k} className="lg-r"><span>{r.k}</span><b>{r.v}</b><em>{r.s}</em></div>)}
            </div>
            <Wires box={box} deps={[t]} links={L.target.grades.map((_, i) => ({ a: `g${i}`, b: `c${i}` }))} />
          </div>
        ) : null}
        {t === 1 ? (
          <div className="lg-formula">
            <div className="lg-chain">
              {L.formula.map((f, i) => (
                <div key={f.k} className="lg-step">
                  <div className="dg-blk col"><em>{String(i + 1).padStart(2, '0')}</em><b>{f.k}</b><code>{f.f}</code>{f.s ? <span>{f.s}</span> : null}</div>
                  {i < L.formula.length - 1 ? <span className="dg-arrow" aria-hidden="true"><ArrowRight size={22} strokeWidth={2.6} /></span> : null}
                </div>
              ))}
            </div>
            <div className="lg-results">
              {L.results.map((r) => (
                <div key={r.k} className={`lg-rr${r.base ? ' base' : ''}${r.v === 0 ? ' zero' : ''}`}>
                  <div><b>{r.k}</b><span>{r.c}</span></div>
                  <i className="meter"><i style={{ width: `${(r.v / 358) * 100}%` }} /></i>
                  <p>{r.v}<small>명</small></p>
                </div>
              ))}
              <p className="dg-note">{L.resultNote}</p>
            </div>
          </div>
        ) : null}
        {t === 2 ? (
          <div className="lg-assign">
            <div className="as-plans">
              <p className="dg-cap">마을 순서 3가지와 왕복 배치 2가지로 6개 계획</p>
              <div className="as-grid">
                <span />{L.assign.plans.cols.map((c) => <b key={c} className="as-ch">{c}</b>)}
                {L.assign.plans.rows.map((r, ri) => (
                  <div key={r} style={{ display: 'contents' }}>
                    <b className="as-rh">{r}</b>
                    {L.assign.plans.cols.map((c, ci) => <span key={c} className="as-cell">계획 {ri * 2 + ci + 1}</span>)}
                  </div>
                ))}
              </div>
              <div className="as-pick"><ArrowRight size={22} strokeWidth={2.6} /><Check size={18} strokeWidth={2.6} />교환 탐색으로 더 나은 계획만 남겨 이동 불가가 가장 적은 안을 추천</div>
            </div>
            <div className="as-side">
              <div className="as-goal"><p className="dg-cap">고르는 순서</p>{L.assign.goal.map((g, i) => <p key={g} className="as-g"><em>{i + 1}</em>{g}</p>)}</div>
              <div className="as-lim"><p className="dg-cap">지키는 조건</p><div>{L.assign.limits.map((x) => <span key={x}><Lock size={14} strokeWidth={2.4} />{x}</span>)}</div></div>
            </div>
            <div className="as-neck">
              <p className="dg-cap">병목 확인</p>
              {L.assign.neck.map((n) => (
                <div key={n.k} className="as-n">
                  <b>{n.k}</b>
                  <i className="meter2"><i className="from" style={{ width: '100%' }} /><i className="to" style={{ width: `${(n.to / n.from) * 100}%` }} /></i>
                  <p>{n.from}명<ArrowRight size={16} strokeWidth={2.6} />{n.to}명</p>
                </div>
              ))}
              <p className="dg-note">{L.assign.neckNote} {L.assign.same}</p>
            </div>
          </div>
        ) : null}
        {t === 3 ? (
          <div className="lg-scen">
            <div className="sc-rows">
              {L.scen.map((s) => (
                <div key={s.k} className={`sc-r${s.base ? ' base' : ''}${s.n === 0 ? ' zero' : ''}`}>
                  <em>{s.k}</em><b>{s.t}</b>
                  <i className="meter"><i style={{ width: `${(s.n / 744) * 100}%` }} /></i>
                  <p className="n">{s.n}<small>명</small></p>
                  <p className="fix">{s.fix}</p>
                </div>
              ))}
              <p className="dg-note">{L.scenNote}</p>
            </div>
            <div className="sc-board">
              <p className="dg-cap">한 번 타고 내리는 시간에 따른 이동 불가 인원</p>
              <div className="bd-chart">
                {L.board.map((b) => <div key={b.m} className={`bd-c${b.base ? ' base' : ''}`}><p>{b.v}</p><i style={{ height: `${(b.v / 459) * 100}%` }} /><span>{b.m}분</span></div>)}
              </div>
              <p className="dg-note">{L.boardNote}</p>
            </div>
          </div>
        ) : null}
      </div>
      </div>
      ))}
    </section>
  );
}

// ───────── 03 Develop: AI 서류 읽기(탭 다섯 개) ─────────
const STEP_ICON = [ScanText, EyeOff, ScanSearch, FileSearch, Cpu, ShieldCheck, UserCheck];
export function AILab() {
  const A = AI2; const box = useRef(null); const ref = useRef(null); const seen = useSeen(ref);
  const [cur, setCur] = useState(0); const [auto, setAuto] = useState(true); const [vis, setVis] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVis(e.intersectionRatio > 0.3), { threshold: [0, 0.3] });
    if (ref.current) io.observe(ref.current); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!auto || !vis) return undefined;
    const id = setInterval(() => setCur((c) => (c + 1) % A.steps.length), 2200); return () => clearInterval(id);
  }, [auto, vis, A.steps.length]);
  return (
    <section className="dg-sec bg-bk" id="pipeline" ref={ref}>
      <Txt badge={A.badge} title={A.title} light />
      {A.tabs.map((name, t) => (
      <div className="dg-sub" key={name}>
      <p className="dg-sub-h"><em>{String(t + 1).padStart(2, '0')}</em>{name}</p>
      <div className={`dg-panel dark${seen ? ' seen' : ''}`}>
        {t === 0 ? (
          <div className="ai-flow">
            <div className="ai-row" ref={box}>
              {A.steps.map((st, i) => {
                const I = STEP_ICON[i];
                return (
                  <button type="button" key={st.t} className={`ai-st2${i === cur ? ' on' : ''}`} data-w={`s${i}`} onClick={() => { setAuto(false); setCur(i); }}>
                    <span className={`dg-tile ${st.zone === 'llm' ? 't-deep' : st.zone === 'hum' ? 't-green' : st.zone === 'img' ? 't-blue' : 't-glass'}`}><I size={20} strokeWidth={2} /></span>
                    <em>{String(i + 1).padStart(2, '0')}</em><b>{st.t}</b><span>{st.k}</span>
                  </button>
                );
              })}
              <Wires box={box} deps={[t]} links={A.steps.slice(0, -1).map((_, i) => ({ a: `s${i}`, b: `s${i + 1}`, tone: 'white', dur: 1.6 }))} />
            </div>
            <div className="ai-band">
              {[['img', 1], ['srv', 3], ['llm', 1], ['srv', 1], ['hum', 1]].map(([z, n], k) => <span key={k} className={`z-${z}`} style={{ gridColumn: `span ${n}` }}><b>{A.zones[z]}</b></span>)}
            </div>
            <div className="ai-detail" key={cur}>
              <p className="dg-cap">{String(cur + 1).padStart(2, '0')} {A.steps[cur].k}</p>
              <p className="d-t">{A.steps[cur].v}</p>
              {A.steps[cur].f ? <p className="d-f"><Ban size={16} strokeWidth={2.4} />{A.steps[cur].f}</p> : null}
            </div>
          </div>
        ) : null}
        {t === 1 ? (
          <div className="ai-rules">
            {A.rules.map((r) => (
              <div key={r.k} className="ar-r">
                <p className="k">{r.k}</p>
                <span className="dg-arrow" aria-hidden="true"><ArrowRight size={22} strokeWidth={2.6} /></span>
                <p className={`g${r.g === '휠체어' ? ' up' : ''}`}>{r.g === '휠체어' ? <Accessibility size={20} strokeWidth={2.2} /> : <Check size={20} strokeWidth={2.6} />}{r.g}</p>
                <p className="s">{r.s}</p>
              </div>
            ))}
            <p className="dg-note">{A.rulesNote}</p>
          </div>
        ) : null}
        {t === 2 ? (
          <div className="ai-rubric">
            <div className="rb-dims">
              {A.rubric.map((d) => <div key={d.k} className="rb-d"><em>{d.k}</em><b>{d.t}</b><span>{d.s}</span><i className="rb-scale">{[1, 2, 3, 4, 5].map((n) => <i key={n} />)}</i></div>)}
            </div>
            <div className="rb-core">
              <Cpu size={30} strokeWidth={1.8} />
              <b>언어 모델</b><span>차원별 점수와 원문 근거</span>
              <ArrowRight size={22} strokeWidth={2.6} className="rb-ar" />
              <b>코드 규칙</b><span>네 등급 계산, 차원끼리 다르면 높은 쪽</span>
            </div>
            <p className="dg-note">{A.rubricNote}</p>
          </div>
        ) : null}
        {t === 3 ? (
          <div className="ai-test">
            <p className="dg-lead">{A.test.lead}</p>
            <div className="at-grid">
              <span />{A.test.cols.map((c) => <b key={c} className="at-ch">{c}</b>)}
              {A.test.rows.map((r) => (
                <div key={r.k} style={{ display: 'contents' }}>
                  <b className="at-rh">{r.k}</b>
                  {[r.a, r.b].map((v, j) => {
                    const m = v.match(/(\d+)명 중 (\d+)명/); const p = m ? +m[2] / +m[1] : null;
                    return <div key={j} className="at-c">{p !== null ? <i className="meter"><i style={{ width: `${p * 100}%` }} /></i> : null}<p>{v}</p></div>;
                  })}
                </div>
              ))}
            </div>
            <div className="at-more">{A.test.more.map((m) => <div key={m.k}><span>{m.k}</span><b>{m.v}</b>{m.s ? <em>{m.s}</em> : null}</div>)}</div>
          </div>
        ) : null}
        {t === 4 ? (
          <div className="ai-models">
            {A.models.map((m) => (
              <div key={m.k} className={`am-r${m.pick ? ' pick' : ''}`}>
                <div className="am-k"><b>{m.k}</b>{m.s ? <span>{m.s}</span> : null}{m.pick ? <em>채택</em> : null}</div>
                <div className="am-bars">
                  <p><span>정답 일치</span><i className="meter"><i style={{ width: `${m.a}%` }} /></i><b>{m.a.toFixed(1)}%</b></p>
                  <p><span>반복 일치</span><i className="meter sub"><i style={{ width: `${m.b}%` }} /></i><b>{m.b}%</b></p>
                </div>
              </div>
            ))}
            <p className="dg-note">{A.modelsNote}</p>
            <div className="at-more">{A.tune.map((m) => <div key={m.k}><span>{m.k}</span><b>{m.v}</b>{m.s ? <em>{m.s}</em> : null}</div>)}</div>
          </div>
        ) : null}
      </div>
      </div>
      ))}
    </section>
  );
}

// ───────── 03 Develop: 발령 데이터 흐름(순서도) ─────────
const LANE_ICON = [Monitor, Server, Database, Smartphone, Siren];
export function DispatchFlow() {
  const F = FLOW; const ref = useRef(null);
  const [cur, setCur] = useState(0); const [auto, setAuto] = useState(true); const [vis, setVis] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVis(e.intersectionRatio > 0.3), { threshold: [0, 0.3] });
    if (ref.current) io.observe(ref.current); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!auto || !vis) return undefined;
    const id = setInterval(() => setCur((c) => (c + 1) % F.steps.length), 1800); return () => clearInterval(id);
  }, [auto, vis, F.steps.length]);
  const n = F.lanes.length;
  return (
    <section className="dg-sec" id="flow" ref={ref}>
      <Txt badge={F.badge} title={F.title} />
      <div className="fl-wrap">
        <div className="fl-seq" style={{ '--n': n }}>
          <div className="fl-head">{F.lanes.map((l, i) => { const I = LANE_ICON[i]; return <p key={l}><Tile icon={I} tone={i === 4 ? 'red' : 'blue'} size={20} /><b>{l}</b></p>; })}</div>
          <div className="fl-body">
            <div className="fl-lines">{F.lanes.map((l) => <i key={l} />)}</div>
            {F.steps.map((s, i) => {
              const a = Math.min(s.f, s.to); const b = Math.max(s.f, s.to); const self = s.f === s.to; const rev = s.to < s.f;
              return (
                <button key={s.t} type="button" className={`fl-row${i === cur ? ' on' : ''}${i < cur ? ' past' : ''}`} onClick={() => { setAuto(false); setCur(i); }}>
                  <span className="fl-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`fl-msg${self ? ' self' : ''}${rev ? ' rev' : ''}${s.to === 4 ? ' fire' : ''}`} style={{ left: `calc(${(a + 0.5) / n} * 100%)`, width: self ? undefined : `calc(${(b - a) / n} * 100%)` }}>
                    <b>{s.t}</b><i className="ln" />
                  </span>
                  {s.also !== undefined ? <span className="fl-store" style={{ left: `calc(${(s.also + 0.5) / n} * 100%)` }}><Database size={14} strokeWidth={2.4} /></span> : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="fl-side">
          <p className="dg-cap">{String(cur + 1).padStart(2, '0')} 남는 기록</p>
          <p className="fl-rec" key={cur}>{F.steps[cur].r}</p>
          <div className="fl-res"><p className="dg-cap">{F.resultNote}</p>{F.result.map((r) => <div key={r.k}><span>{r.k}</span><b>{r.v}</b></div>)}</div>
          <div className="fl-off"><p className="dg-cap"><CloudOff size={16} strokeWidth={2.2} />{F.offline.t}</p>{F.offline.rows.map((r) => <p key={r.k}><b>{r.k}</b>{r.v}</p>)}</div>
        </div>
      </div>
      <p className="dg-note fl-fire">{F.fire}</p>
      <div className="fl-firedata">
        <p className="dg-cap"><Siren size={16} strokeWidth={2.2} />{F.fireData.t}</p>
        <ul>{F.fireData.rows.map((r) => <li key={r}>{r}</li>)}</ul>
        <p className="dg-note">{F.fireData.note}</p>
      </div>
    </section>
  );
}

// ───────── 03 Develop: 권한과 개인정보 ─────────
export function Access() {
  const C = ACCESS; const box = useRef(null);
  return (
    <section className="dg-sec bg-bk" id="access">
      <Txt badge={C.badge} title={C.title} light />
      <div className="ac-map" ref={box}>
        <div className="ac-col">
          {C.roles.map((r, i) => <div key={r.k} className="dg-blk dark" data-w={`r${i}`}><Tile icon={[Landmark, Building2, Smartphone, Users, Globe][i]} tone="glass" size={20} /><div><b>{r.k}</b><span>{r.how}</span></div></div>)}
        </div>
        <div className="ac-gate" data-w="gate">
          <KeyRound size={34} strokeWidth={1.8} />
          <b>서버 확인</b>
          <span>서명 확인, 역할, 담당 동 범위, 같은 출처, 사용량 상한</span>
        </div>
        <div className="ac-col">
          {C.roles.map((r, i) => <div key={r.k} className="dg-blk dark" data-w={`o${i}`}><div><b>{r.can}</b>{r.no ? <span className="no"><Ban size={13} strokeWidth={2.4} />{r.no}</span> : null}</div></div>)}
        </div>
        <Wires box={box} links={[...C.roles.map((_, i) => ({ a: `r${i}`, b: 'gate', tone: 'white', flow: false, arrow: false })), ...C.roles.map((_, i) => ({ a: 'gate', b: `o${i}`, tone: 'white', dur: 2.8 }))]} />
      </div>
      <div className="ac-priv">
        {C.privacy.map((p) => <div key={p.k}><b><ShieldCheck size={18} strokeWidth={2.2} />{p.k}</b><p>{p.v}</p></div>)}
      </div>
      <div className="ac-lim"><p className="dg-cap"><Clock size={16} strokeWidth={2.2} />사용량 상한</p>{C.limits.map((l) => <p key={l.k}><b>{l.k}</b>{l.v}</p>)}</div>
    </section>
  );
}

// ───────── 03 Develop: 시스템 구성(네이버 클라우드) ─────────
export function Architecture() {
  const A = ARCH; const box = useRef(null);
  const links = [
    ...A.users.map((u) => ({ a: u.id, b: 'a-caddy', t: u.id === 'u-city' ? 'https' : undefined })),
    { a: 'a-caddy', b: 'a-node', as: 'b', bs: 't' },
    { a: 'a-node', b: 'a-redis', as: 'b', bs: 't' },
    { a: 'a-node', b: 'a-ocr', t: '서류 사진' },
    { a: 'a-node', b: 'a-hcx', t: '가린 글자' },
    { a: 'a-node', b: 'a-csr', t: '음성' },
    { a: 'a-node', b: 'x-data', tone: 'mute' },
    { a: 'a-node', b: 'x-route', tone: 'mute', flow: false },
  ];
  return (
    <section className="dg-sec" id="system">
      <Txt badge={A.badge} title={A.title} />
      <div className="ar-map" ref={box}>
        <div className="ar-users">
          <p className="dg-cap">사용자</p>
          {A.users.map((u) => { const I = ICON[u.icon]; return <div key={u.id} className="dg-blk" data-w={u.id}><Tile icon={I} /><div><b>{u.k}</b><span>{u.s}</span></div></div>; })}
        </div>
        <div className="ar-cloud">
          <p className="ar-label"><span className="nv">N</span>NAVER CLOUD 한국 VPC</p>
          <div className="ar-in">
            <div className="ar-server">
              <p className="ar-sl"><Server size={16} strokeWidth={2.2} />{A.server.k}<em>{A.server.s}</em></p>
              {A.server.stack.map((s) => { const I = ICON[s.icon]; return <div key={s.id} className="dg-blk" data-w={s.id}><Tile icon={I} tone="deep" /><div><b>{s.k}</b><span>{s.s}</span></div></div>; })}
            </div>
            <div className="ar-ai">
              <p className="ar-sl"><Cpu size={16} strokeWidth={2.2} />CLOVA AI</p>
              {A.ai.map((s) => { const I = ICON[s.icon]; return <div key={s.id} className="dg-blk" data-w={s.id}><Tile icon={I} tone="green" /><div><b>{s.k}</b><span>{s.s}</span></div></div>; })}
              <div className="dg-blk ghost" data-w={A.store.id}><Tile icon={Package} tone="glass2" /><div><b>{A.store.k}</b><span>{A.store.s}</span></div></div>
            </div>
          </div>
        </div>
        <div className="ar-ext">
          <p className="dg-cap">바깥 자료</p>
          {A.ext.map((x) => { const I = ICON[x.icon]; return <div key={x.id} className="dg-blk" data-w={x.id}><Tile icon={I} tone="glass2" /><div><b>{x.k}</b><span>{x.s}</span></div></div>; })}
        </div>
        <Wires box={box} links={links} />
      </div>
      <div className="ar-facts">
        {A.quality.map((q) => <div key={q.k}><span>{q.k}</span><b>{q.v}</b><em>{q.s}</em></div>)}
        {A.platform.map((q) => <div key={q.k} className="pl"><span>민관협력 지원 플랫폼</span><b>{q.v}</b><em>{q.k}</em></div>)}
      </div>
      <p className="dg-note">{A.platformNote}</p>
    </section>
  );
}

// ───────── 디자인 시스템 검수(디자인 시스템 구간 아래에 붙임) ─────────
export function DesignQA() {
  const ref = useRef(null); const seen = useSeen(ref);
  return (
    <div className={`dsqa${seen ? ' seen' : ''}`} ref={ref}>
      <div className="dsqa-f">{DSQA.figma.map((f) => <div key={f.k}><span>{f.k}</span><b>{f.v}</b>{f.s ? <em>{f.s}</em> : null}</div>)}</div>
      <div className="dsqa-bars">
        <p className="dg-cap">디자인 검수 결과</p>
        {DSQA.qa.map((q) => (
          <div key={q.k} className="qa-r">
            <div><b>{q.k}</b><span>{q.s}</span></div>
            <i className="qa-bar"><i className="ok" style={{ flex: q.ok }} /><i className="fix" style={{ flex: q.fix }} /><i className="ex" style={{ flex: q.ex }} /></i>
            <p>일치 {q.ok}, 고친 뒤 일치 {q.fix}, 규칙상 예외 {q.ex}<b>불일치 0</b></p>
          </div>
        ))}
        <p className="dg-note">{DSQA.qaNote}</p>
      </div>
    </div>
  );
}

// ───────── 04 Deliver: 사용자 중심 재설계 ─────────
export function Redesign() {
  return (
    <section className="dg-sec" id="redesign">
      <Txt badge={REDESIGN.badge} title={REDESIGN.title} />
      <div className="rd">
        <div className="rd-h"><span>과업</span><span>재설계 전</span><span /><span>재설계 후</span></div>
        {REDESIGN.rows.map((r) => (
          <div key={r.k} className="rd-r"><b>{r.k}</b><p className="a">{r.a}</p><span className="dg-arrow" aria-hidden="true"><ArrowRight size={20} strokeWidth={2.6} /></span><p className="b">{r.b}</p></div>
        ))}
      </div>
      <p className="dg-note">{REDESIGN.study}</p>
    </section>
  );
}

// ───────── 04 Deliver: 기대효과와 확산 ─────────
export function Impact() {
  const I = IMPACT; const box = useRef(null); const ref = useRef(null); const seen = useSeen(ref);
  return (
    <section className="dg-sec bg-bk" id="impact" ref={ref}>
      <Txt badge={I.badge} title={I.title} light />
      <div className="im-who">
        {I.who.map((w) => { const Ic = ICON[w.icon]; return <div key={w.k} className="im-w"><Tile icon={Ic} tone="glass" /><b>{w.k}</b><ul>{w.v.map((v) => <li key={v}>{v}</li>)}</ul></div>; })}
      </div>
      <div className="im-org">
        <div className="im-top"><img src="/v3/tile.webp" alt="" width="1240" height="1233" /><div><b>미리</b><span>같은 계획을 세 주체가 나눠 맡습니다.</span></div></div>
        <div className="im-cols">
          {I.model.map((m, i) => { const Ic = [Landmark, Building2, Smartphone][i]; return (
            <div key={m.k} className="im-c"><Tile icon={Ic} /><b>{m.k}</b><span>{m.v}</span></div>
          ); })}
        </div>
      </div>
      <div className={`im-steps${seen ? ' seen' : ''}`}>
        <p className="dg-cap">확산 단계</p>
        <div className="im-line"><i /></div>
        <div className="im-st">{I.steps.map((s, i) => <div key={s.k}><em>{String(i + 1).padStart(2, '0')}</em><b>{s.k}</b><span>{s.s}</span></div>)}</div>
      </div>
      <div className="im-two">
        <div><p className="dg-cap">다음 확장</p>{I.next.map((n) => <p key={n.k} className="im-n"><b>{n.k}</b>{n.v}<em>{n.who}</em></p>)}</div>
        <div><p className="dg-cap">확인한 결과</p>{I.verify.map((n) => <p key={n.k} className="im-n"><b>{n.k}</b>{n.v}</p>)}</div>
      </div>
    </section>
  );
}

// ───────── 협력 네 묶음: 상세기획서 그림 5 구조(위 공공기관, 가운데 학교와 미리와 민간기업, 아래 현장과 시민사회) ─────────
const PART_ICON = { pub: Landmark, uni: Users, biz: Building2, etc: UserCheck };
export function PartnerMap({ groups, sel, onPick }) {
  const G = Object.fromEntries(groups.map((g) => [g.id, g]));
  const Panel = ({ id, cls }) => {
    const g = G[id]; if (!g) return null; const I = PART_ICON[id];
    return (
      <button type="button" className={`pm2-g ${cls}${sel === id ? ' on' : ''}`} onClick={() => onPick(id)} aria-pressed={sel === id}>
        <p className="pm2-h"><I size={24} strokeWidth={2.2} />{g.name}</p>
        <span className="pm2-chips">{g.chips.map((c) => <span key={c}>{c}</span>)}</span>
      </button>
    );
  };
  return (
    <div className="pm2">
      <Panel id="pub" cls="a-pub" />
      <div className="pm2-mid">
        <Panel id="uni" cls="a-uni" />
        <div className="pm2-hub">
          <i className="ar up" /><i className="ar left" /><i className="ar right" /><i className="ar down" />
          <span className="pm2-core"><img src="/v3/tile.webp" alt="" width="1240" height="1233" /><b>미리</b></span>
        </div>
        <Panel id="biz" cls="a-biz" />
      </div>
      <Panel id="etc" cls="a-etc" />
    </div>
  );
}

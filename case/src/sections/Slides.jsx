// 미리 케이스 스터디 슬라이드 본문. 문구는 copy.js, 값은 tokens.js에서만 읽는다.
// 각 슬라이드는 Frame(공용 헤더와 그리드)을 쓰고, 본문 요소에 data-rv를 붙여 진입 연출을 받는다.

import { colors, typography, grid, motion } from '../tokens.js';
import { Frame, T, card, Pending } from '../components/Frame.jsx';
import BarChart from '../components/BarChart.jsx';
import Coachmark from '../components/Coachmark.jsx';
import DoubleDiamond from '../components/DoubleDiamond.jsx';
import { Eyebrow } from '../components/Bits.jsx';
import {
  META, COVER, SUMMARY, PROCESS, INCIDENT, YEONGNAM, REGION, GRADES, DESK, STAKEHOLDERS, EMPATHIZE,
  DEFINE, GAPS, JOURNEY, IDEATE, BLUEPRINT, AI, PROTOS, DATA, SCENARIOS, DESIGN_SYSTEM, EVALUATE, LESSONS, OUTRO,
} from '../copy.js';

const eb = (s) => ({ en: s.en, ko: s.ko });
const gap = 'clamp(12px, 1.4vw, 28px)';

/* ── 표지 ─────────────────────────────────────────────── */
export function Cover({ active, s }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          right: '-6vw',
          top: '50%',
          width: '64vw',
          aspectRatio: '1.6',
          transform: `translateY(-50%) perspective(1800px) rotateY(-14deg) rotateX(4deg) ${active ? 'translateX(0)' : 'translateX(60px)'}`,
          opacity: active ? 1 : 0,
          transition: `transform 1400ms ${motion.easeOut}, opacity 900ms ease`,
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 40px 90px -30px rgba(16,16,16,0.35), 0 0 0 1px rgba(16,16,16,0.08)',
        }}
      >
        <img src="/shots/map-3d.png" alt="미리 상황판 3D 지도 화면" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${colors.bg} 34%, rgba(246,246,246,0.85) 48%, rgba(246,246,246,0) 66%)` }} />
      <div style={{ position: 'absolute', left: grid.marginX, top: grid.marginTop }}>
        <Eyebrow en={s.en} ko={COVER.kicker} tone={colors.navy} />
      </div>
      <div style={{ position: 'absolute', left: grid.marginX, top: '50%', transform: 'translateY(-54%)', maxWidth: '40vw' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(12px, 1.4vw, 24px)' }}>
          <h1 style={{ margin: 0, fontFamily: typography.displayFamily, fontWeight: 700, fontSize: 'clamp(4rem, 11vw, 11rem)', letterSpacing: '-0.05em', lineHeight: 0.95, color: colors.ink }}>{COVER.title}</h1>
          <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 2rem)', letterSpacing: '0.12em', color: colors.accent }}>{COVER.titleEn}</span>
        </div>
        <p style={{ ...T.title, margin: 'clamp(14px, 2.6vh, 30px) 0 0', fontSize: 'clamp(1.05rem, 1.7vw, 1.9rem)' }}>{COVER.sub}</p>
        <p style={{ ...T.body, margin: '10px 0 0' }}>{COVER.note}</p>
      </div>
      <div style={{ position: 'absolute', left: grid.marginX, bottom: 'clamp(56px, 9vh, 100px)', display: 'flex', gap: 'clamp(24px, 4vw, 72px)' }}>
        <div>
          <div style={T.label}>TEAM</div>
          <div style={{ ...T.strong, marginTop: 6 }}>{META.team}</div>
          <div style={{ ...T.body, marginTop: 2 }}>{META.members.join(', ')}</div>
        </div>
        <div>
          <div style={T.label}>COURSE</div>
          <div style={{ ...T.strong, marginTop: 6 }}>{META.course}</div>
          <div style={{ ...T.body, marginTop: 2 }}>{META.school}</div>
        </div>
      </div>
    </div>
  );
}

/* ── 주제 요약 ─────────────────────────────────────────── */
export function Summary({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={SUMMARY.headline} sub={SUMMARY.sub}>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 'clamp(16px, 4vh, 48px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap }}>
          {SUMMARY.stats.map((st) => (
            <div key={st.label} data-rv style={{ borderTop: `1px solid ${colors.line.strong}`, paddingTop: 'clamp(10px, 1.8vh, 20px)' }}>
              <div style={{ ...T.num, color: colors.accent }}>{st.value}<span style={{ fontSize: '0.4em', marginLeft: 4, color: colors.text.primary }}>{st.unit}</span></div>
              <div style={{ ...T.strong, marginTop: 10 }}>{st.label}</div>
              <div style={{ ...T.caption, marginTop: 2 }}>{st.basis}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap, alignItems: 'stretch' }}>
          {SUMMARY.features.map((f) => (
            <div key={f.no} data-rv style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', background: colors.surface.pill }}>
                <img src={f.img} alt={`${f.title} 화면 일부`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: f.pos }} />
              </div>
              <div style={{ padding: 'clamp(14px, 1.5vw, 26px)', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${colors.line.faint}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, color: colors.accent, fontSize: typography.body.size }}>{f.no}</span>
                  <span style={T.title}>{f.title}</span>
                </div>
                <span style={T.body}>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ── 진행 과정 ─────────────────────────────────────────── */
export function Process({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={PROCESS.headline}>
      <DoubleDiamond phases={PROCESS.phases} active={active} />
    </Frame>
  );
}

/* ── 배경 1, 2022 ──────────────────────────────────────── */
export function Incident({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={INCIDENT.headline} sub={INCIDENT.sub}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'clamp(24px, 4vw, 80px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(16px, 3.4vh, 40px)', position: 'relative', paddingLeft: 'clamp(22px, 2vw, 36px)' }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: 6, top: '26%', bottom: '34%', width: 1, background: colors.line.strong }} />
          {INCIDENT.events.map((e, i) => (
            <div key={e.title} data-rv style={{ position: 'relative' }}>
              <span aria-hidden="true" style={{ position: 'absolute', left: 'calc(-1 * clamp(22px, 2vw, 36px) + 0px)', top: 'clamp(12px, 1.6vw, 26px)', width: 13, height: 13, borderRadius: 999, background: i === 1 ? colors.accent : colors.ink, boxShadow: `0 0 0 5px ${colors.bg}` }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(14px, 1.6vw, 28px)', flexWrap: 'wrap' }}>
                <span style={{ ...T.num, color: i === 1 ? colors.accent : colors.text.primary, minWidth: '4.2ch' }}>{e.time}</span>
                <span>
                  <span style={{ ...T.title, display: 'block' }}>{e.title}</span>
                  <span style={{ ...T.caption }}>{e.src}</span>
                </span>
              </div>
            </div>
          ))}
          <div data-rv style={{ display: 'flex', alignItems: 'baseline', gap: 14, borderTop: `1px solid ${colors.line.default}`, paddingTop: 'clamp(12px, 2vh, 20px)' }}>
            <span style={{ ...T.strong, color: colors.accent, whiteSpace: 'nowrap' }}>4시간 10분</span>
            <span style={{ ...T.body }}>발화에서 동해시 망상동 도달까지, 같은 보도의 두 시각 차이</span>
          </div>
        </div>
        <figure data-rv style={{ margin: 0, alignSelf: 'center', width: 'min(40vw, calc(100dvh - 330px))', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 'clamp(10px, 1vw, 18px)', overflow: 'hidden', boxShadow: `0 0 0 1px ${colors.line.default}, 0 24px 60px -30px rgba(16,16,16,0.3)` }}>
            <img src="/shots/map-2d.png" alt="미리 상황판 2D 지도, 강릉시 옥계면 남양리에서 동해시 쪽으로 그린 확산 가정 구역" style={{ position: 'absolute', width: '270.3%', left: '-110.8%', top: '-32.4%', maxWidth: 'none' }} />
          </div>
          <figcaption style={{ ...T.caption }}>미리 상황판 시나리오 S-1. 발화 지점과 동쪽 확산 방향은 이 보도를 참고한 가정</figcaption>
        </figure>
      </div>
    </Frame>
  );
}

/* ── 배경 2, 2025 ──────────────────────────────────────── */
export function Yeongnam({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={YEONGNAM.headline} sub={YEONGNAM.sub}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(28px, 7vh, 80px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap }}>
          {YEONGNAM.facts.map((f, i) => (
            <div key={f.label} data-rv style={{ borderTop: `2px solid ${i === 0 ? colors.alert : colors.ink}`, paddingTop: 'clamp(14px, 2.4vh, 28px)' }}>
              <div style={{ ...T.num, fontSize: 'clamp(2.4rem, 4.6vw, 5.4rem)', color: i === 0 ? colors.alert : colors.text.primary }}>
                {f.value}<span style={{ fontSize: '0.32em', marginLeft: 6, fontWeight: 700 }}>{f.unit}</span>
              </div>
              <div style={{ ...T.strong, marginTop: 'clamp(12px, 2vh, 22px)' }}>{f.label}</div>
              <div style={{ ...T.caption, marginTop: 4 }}>{f.src}</div>
            </div>
          ))}
        </div>
        <blockquote data-rv style={{ margin: 0, ...card, padding: 'clamp(18px, 2vw, 36px)', boxShadow: `inset 4px 0 0 ${colors.accent}, inset 0 0 0 1px ${colors.line.faint}` }}>
          <div>
            <p style={{ ...T.label, color: colors.accent, margin: '0 0 10px' }}>중앙재난안전대책본부 차장 발언</p>
            <p style={{ ...T.title, fontWeight: 700, margin: 0, fontSize: 'clamp(1rem, 1.6vw, 1.8rem)', lineHeight: 1.5 }}>{YEONGNAM.quote.text}</p>
            <p style={{ ...T.caption, margin: '10px 0 0' }}>{YEONGNAM.quote.src}</p>
          </div>
        </blockquote>
      </div>
    </Frame>
  );
}

/* ── 동해시 고령화 ─────────────────────────────────────── */
export function Region({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={REGION.headline} sub={REGION.sub}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) clamp(180px, 18vw, 320px)', gap: 'clamp(20px, 3vw, 60px)' }}>
        <div data-rv style={{ minHeight: 0 }}>
          <BarChart
            bars={REGION.bars}
            active={active}
            max={60}
            unit="%"
            format={(v) => v.toFixed(1)}
            barMax={34}
            refLine={{ value: 27.6, label: '동해시 전체' }}
            colorOf={(b) => (b.value >= 44 ? colors.accent : colors.line.strong)}
          />
        </div>
        <div data-rv style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 14 }}>
          <div>
            <div style={{ ...T.num, color: colors.accent }}>23,590<span style={{ fontSize: '0.36em', marginLeft: 4, color: colors.text.primary }}>명</span></div>
            <div style={{ ...T.strong, marginTop: 8 }}>동해시 65세 이상</div>
            <div style={{ ...T.caption }}>주민등록인구 85,445명의 27.6%</div>
          </div>
          <div style={{ ...T.caption, borderTop: `1px solid ${colors.line.default}`, paddingTop: 10 }}>{REGION.basis}</div>
        </div>
      </div>
    </Frame>
  );
}

/* ── 이송 대상 ─────────────────────────────────────────── */
export function Grades({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={GRADES.headline} sub={GRADES.sub}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 'clamp(20px, 3vw, 60px)' }}>
        <div data-rv style={{ minHeight: 0 }}>
          <BarChart
            bars={GRADES.bars.map((b) => ({ ...b, sub: b.need }))}
            active={active}
            unit="명"
            barMax={44}
            labelLines={2}
            colorOf={(b) => (b.label === '침상' || b.label === '휠체어' ? colors.accent : colors.line.strong)}
          />
        </div>
        <div data-rv style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ ...T.label, marginBottom: 6 }}>장기요양 등급에서 이송 등급으로(팀 가정)</div>
            {GRADES.map.map((m) => (
              <div key={m.from} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto', gap: 12, alignItems: 'baseline', padding: 'clamp(8px, 1.4vh, 14px) 0', borderBottom: `1px solid ${colors.line.default}` }}>
                <span style={{ ...T.body, color: colors.text.primary }}>{m.from}</span>
                <span style={{ ...T.caption, fontVariantNumeric: 'tabular-nums' }}>{m.n}명</span>
                <span style={{ ...T.strong, color: m.to === '침상' || m.to === '휠체어' ? colors.accent : colors.text.primary }}>{m.to}</span>
              </div>
            ))}
          </div>
          <div style={{ ...card }}>
            <div style={{ ...T.label }}>차량이 따로 필요한 사람</div>
            <div style={{ ...T.num, color: colors.accent, marginTop: 10 }}>223<span style={{ fontSize: '0.36em', marginLeft: 4, color: colors.text.primary }}>명</span></div>
            <div style={{ ...T.body, marginTop: 8 }}>침상 73명과 휠체어 150명은 승용차로 옮길 수 없다. 구급차와 리프트 승합차의 수가 곧 상한이다.</div>
          </div>
          <div style={{ ...T.caption }}>{GRADES.basis}</div>
        </div>
      </div>
    </Frame>
  );
}

/* ── 기존 서비스 조사 ─────────────────────────────────── */
export function Desk({ active, s }) {
  const th = { ...T.label, textAlign: 'left', padding: '0 12px 12px 0', borderBottom: `1px solid ${colors.line.strong}` };
  const td = { ...T.body, padding: 'clamp(10px, 2.6vh, 28px) 12px clamp(10px, 2.6vh, 28px) 0', borderBottom: `1px solid ${colors.line.default}`, verticalAlign: 'top' };
  return (
    <Frame active={active} eyebrow={eb(s)} headline={DESK.headline}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
        <table data-rv style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{DESK.cols.map((c, i) => <th key={c} style={{ ...th, width: ['10%', '26%', '34%', '30%'][i], color: i === 3 ? colors.accent : colors.text.dim }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {DESK.rows.map((r) => (
              <tr key={r[1]}>
                <td style={{ ...td, ...T.caption, color: colors.text.dim }}>{r[0]}</td>
                <td style={{ ...td, color: colors.text.primary, fontWeight: 700 }}>{r[1]}</td>
                <td style={td}>{r[2]}</td>
                <td style={{ ...td, color: colors.accent, fontWeight: 700 }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p data-rv style={{ ...T.caption, margin: 0 }}>{DESK.note}</p>
      </div>
    </Frame>
  );
}

/* ── 이해관계자 ───────────────────────────────────────── */
export function Stakeholders({ active, s }) {
  const n = STAKEHOLDERS.nodes.length;
  const pos = STAKEHOLDERS.nodes.map((_, i) => {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    return { x: 50 + 34 * Math.cos(a), y: 50 + 39 * Math.sin(a) };
  });
  return (
    <Frame active={active} eyebrow={eb(s)} headline={STAKEHOLDERS.headline}>
      <div style={{ height: '100%', position: 'relative' }}>
        <div data-rv style={{ position: 'absolute', inset: 0 }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
            {pos.map((p, i) => (
              <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} stroke={STAKEHOLDERS.nodes[i].on ? colors.accent : colors.line.strong} strokeWidth="1.2" strokeDasharray={STAKEHOLDERS.nodes[i].on ? '0' : '3 4'} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(150px, 15vw, 260px)', ...card, background: colors.accent, textAlign: 'center' }}>
            <div style={{ ...T.title, color: colors.white }}>{STAKEHOLDERS.center.title}</div>
            <div style={{ ...T.caption, color: 'rgba(253,253,253,0.85)', marginTop: 4 }}>{STAKEHOLDERS.center.role}</div>
          </div>
          {STAKEHOLDERS.nodes.map((nd, i) => (
            <div key={nd.title} style={{ position: 'absolute', left: `${pos[i].x}%`, top: `${pos[i].y}%`, transform: 'translate(-50%,-50%)', width: 'clamp(140px, 14vw, 240px)', ...card, padding: 'clamp(10px, 1vw, 18px)', boxShadow: `inset 0 0 0 ${nd.on ? 1.5 : 1}px ${nd.on ? colors.accent : colors.line.default}` }}>
              <div style={{ ...T.strong }}>{nd.title}</div>
              <div style={{ ...T.caption, marginTop: 2 }}>{nd.role}</div>
            </div>
          ))}
        </div>
        <div data-rv style={{ position: 'absolute', right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 28, height: 0, borderTop: `1.5px solid ${colors.accent}` }} />
            <span style={T.caption}>{STAKEHOLDERS.legend[0]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 28, height: 0, borderTop: `1.5px dashed ${colors.text.dim}` }} />
            <span style={T.caption}>{STAKEHOLDERS.legend[1]}</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ── 현장 조사(진행 예정) ─────────────────────────────── */
export function Empathize({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={EMPATHIZE.headline}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(14px, 3vh, 36px)' }}>
        <div data-rv><Pending text={EMPATHIZE.status} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap }}>
          {EMPATHIZE.plan.map((p, i) => (
            <div key={p.who} data-rv style={{ ...card, background: 'transparent', boxShadow: `inset 0 0 0 1px ${colors.line.default}`, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'clamp(220px, 40vh, 420px)' }}>
              <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, color: colors.text.dim }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={T.title}>{p.who}</span>
              <span style={{ ...T.label }}>{p.how}</span>
              <span style={{ ...T.body, flex: '1 1 auto' }}>{p.ask}</span>
              <div style={{ borderTop: `1px dashed ${colors.line.strong}`, paddingTop: 12 }}>
                <div style={T.label}>확인할 화면</div>
                <div style={{ ...T.strong, color: colors.accent, marginTop: 4 }}>{p.check}</div>
              </div>
            </div>
          ))}
        </div>
        <p data-rv style={{ ...T.caption, margin: 0 }}>{EMPATHIZE.note}</p>
      </div>
    </Frame>
  );
}

/* ── 문제 정의 ─────────────────────────────────────────── */
export function Define({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={DEFINE.headline}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 'clamp(20px, 3vw, 64px)', alignItems: 'center' }}>
        <div data-rv>
          <p style={{ ...T.title, fontSize: 'clamp(1.2rem, 2.2vw, 2.5rem)', lineHeight: 1.4, margin: 0 }}>{DEFINE.problem}</p>
          <div style={{ marginTop: 'clamp(20px, 4vh, 48px)', paddingLeft: 'clamp(14px, 1.4vw, 24px)', borderLeft: `3px solid ${colors.accent}` }}>
            <div style={{ ...T.label, color: colors.accent }}>HOW MIGHT WE</div>
            <p style={{ ...T.strong, margin: '8px 0 0', fontWeight: 400 }}>{DEFINE.hmw}</p>
          </div>
        </div>
        <div data-rv style={{ display: 'grid', gap }}>
          {DEFINE.split.map((x) => (
            <div key={x.k} style={{ ...card, background: x.on ? colors.accent : 'transparent', boxShadow: x.on ? 'none' : `inset 0 0 0 1px ${colors.line.default}` }}>
              <div style={{ ...T.title, color: x.on ? colors.white : colors.text.dim, textDecoration: x.on ? 'none' : 'line-through' }}>{x.k}</div>
              <div style={{ ...T.body, color: x.on ? 'rgba(253,253,253,0.85)' : colors.text.dim, marginTop: 4 }}>{x.v}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ── 서비스 공백 ───────────────────────────────────────── */
export function Gaps({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={GAPS.headline}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap, alignItems: 'center' }}>
        {GAPS.items.map((g) => {
          const pending = g.done === '진행 예정';
          return (
            <div key={g.no} data-rv style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 'clamp(240px, 44vh, 460px)' }}>
              <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, color: colors.accent, fontSize: typography.body.size }}>{g.no}</span>
              <span style={T.title}>{g.title}</span>
              <span style={{ ...T.body, flex: '1 1 auto' }}>{g.desc}</span>
              <div style={{ borderTop: `1px solid ${colors.line.default}`, paddingTop: 12 }}>
                {pending ? <Pending /> : (
                  <>
                    <div style={T.label}>반영 화면</div>
                    <div style={{ ...T.strong, color: colors.accent, marginTop: 4 }}>{g.done}</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

/* ── 여정 비교 ─────────────────────────────────────────── */
export function Journey({ active, s }) {
  const row = (label, cells, on) => (
    <div data-rv style={{ display: 'grid', gridTemplateColumns: `clamp(72px, 7vw, 120px) repeat(${cells.length}, minmax(0,1fr))`, gap: 'clamp(8px, 0.8vw, 14px)', alignItems: 'stretch' }}>
      <div style={{ ...T.strong, color: on ? colors.accent : colors.text.dim, alignSelf: 'center' }}>{label}</div>
      {cells.map((c, i) => (
        <div key={i} style={{ ...card, padding: 'clamp(10px, 1vw, 18px)', background: on ? colors.raised : 'transparent', boxShadow: `inset 0 0 0 1px ${on ? colors.accent : colors.line.default}`, ...T.body, color: on ? colors.text.primary : colors.text.secondary }}>{c}</div>
      ))}
    </div>
  );
  return (
    <Frame active={active} eyebrow={eb(s)} headline={JOURNEY.headline}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(12px, 2.4vh, 28px)' }}>
        <div data-rv style={{ display: 'grid', gridTemplateColumns: `clamp(72px, 7vw, 120px) repeat(5, minmax(0,1fr))`, gap: 'clamp(8px, 0.8vw, 14px)' }}>
          <span />
          {JOURNEY.stages.map((st, i) => (
            <div key={st} style={{ ...T.label, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: colors.accent }}>{String(i + 1).padStart(2, '0')}</span>{st}
            </div>
          ))}
        </div>
        {row('현재', JOURNEY.now, false)}
        {row('미리 도입 후', JOURNEY.after, true)}
        <p data-rv style={{ ...T.caption, margin: 0 }}>{JOURNEY.note}</p>
      </div>
    </Frame>
  );
}

/* ── 아이디어 발전 ─────────────────────────────────────── */
export function Ideate({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={IDEATE.headline}>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: '1fr auto', gap: 'clamp(14px, 3vh, 36px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap, alignItems: 'center' }}>
          {IDEATE.versions.map((v, i) => {
            const last = i === IDEATE.versions.length - 1;
            return (
              <div key={v.v} data-rv style={{ position: 'relative', ...card, background: last ? colors.accent : colors.raised, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'clamp(240px, 42vh, 440px)' }}>
                <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, fontSize: typography.eyebrow.size, color: last ? colors.white : colors.accent }}>{v.v}</span>
                <span style={{ ...T.title, color: last ? colors.white : colors.text.primary }}>{v.title}</span>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, flex: '1 1 auto', alignContent: 'start' }}>
                  {v.items.map((it) => <li key={it} style={{ ...T.body, color: last ? colors.white : colors.text.primary }}>{it}</li>)}
                </ul>
                <span style={{ ...T.caption, color: last ? 'rgba(253,253,253,0.8)' : colors.text.dim }}>{v.note}</span>
                {!last ? <span aria-hidden="true" style={{ position: 'absolute', right: 'calc(-1 * clamp(12px, 1.4vw, 28px))', top: '50%', width: 'clamp(12px, 1.4vw, 28px)', height: 1, background: colors.line.strong }} /> : null}
              </div>
            );
          })}
        </div>
        <div data-rv style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: `1px solid ${colors.line.default}`, paddingTop: 14 }}>
          <span style={T.strong}>{IDEATE.methods.title}</span>
          <Pending text={IDEATE.methods.status} />
        </div>
      </div>
    </Frame>
  );
}

/* ── 서비스 블루프린트 ─────────────────────────────────── */
export function Blueprint({ active, s }) {
  const cols = `clamp(90px, 9vw, 150px) repeat(${BLUEPRINT.stages.length}, minmax(0,1fr))`;
  return (
    <Frame active={active} eyebrow={eb(s)} headline={BLUEPRINT.headline}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(8px, 1.4vh, 16px)' }}>
        <div data-rv style={{ display: 'grid', gridTemplateColumns: cols, gap: 'clamp(8px, 0.8vw, 14px)' }}>
          <span />
          {BLUEPRINT.stages.map((st, i) => (
            <div key={st} style={{ ...T.strong, padding: '10px 0', borderBottom: `2px solid ${colors.ink}` }}>
              <span style={{ color: colors.accent, marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>{st}
            </div>
          ))}
        </div>
        {BLUEPRINT.lanes.map((ln, li) => (
          <div key={ln.name}>
            {li > 0 ? (
              <div data-rv style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0 10px' }}>
                <span style={{ ...T.caption, whiteSpace: 'nowrap' }}>{li === 1 ? '상호작용선' : '가시선'}</span>
                <span style={{ flex: 1, borderTop: `1px dashed ${colors.line.strong}` }} />
              </div>
            ) : null}
            <div data-rv style={{ display: 'grid', gridTemplateColumns: cols, gap: 'clamp(8px, 0.8vw, 14px)' }}>
              <div style={{ ...T.label, alignSelf: 'center' }}>{ln.name}</div>
              {ln.cells.map((c, ci) => {
                const ai = li === 1 && BLUEPRINT.ai.includes(ci);
                const gapCell = li === 0 && ci === 3;
                return (
                  <div key={ci} style={{ ...card, padding: 'clamp(10px, 1vw, 16px)', minHeight: 'clamp(54px, 8vh, 96px)', background: c ? (gapCell ? colors.accentSoft : colors.raised) : 'transparent', boxShadow: c ? `inset 0 0 0 1px ${colors.line.faint}` : 'none', ...T.body, color: colors.text.primary, position: 'relative' }}>
                    {c}
                    {ai ? <span style={{ position: 'absolute', right: 10, top: 10, fontFamily: typography.eyebrow.family, fontWeight: 700, fontSize: 11, color: colors.white, background: colors.accent, borderRadius: 999, padding: '2px 8px' }}>AI</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── AI 적용 ───────────────────────────────────────────── */
export function Ai({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={AI.headline}>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 'clamp(16px, 3.6vh, 44px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap }}>
          {AI.steps.map((st, i) => (
            <div key={st.no} data-rv style={{ position: 'relative', ...card, background: st.ai ? colors.accent : colors.raised, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, color: st.ai ? colors.white : colors.accent }}>{st.no}</span>
                <span style={{ ...T.label, color: st.ai ? 'rgba(253,253,253,0.85)' : colors.text.dim }}>{st.who}</span>
              </div>
              <span style={{ ...T.title, color: st.ai ? colors.white : colors.text.primary }}>{st.title}</span>
              <span style={{ ...T.body, color: st.ai ? 'rgba(253,253,253,0.9)' : colors.text.secondary }}>{st.desc}</span>
              {i < AI.steps.length - 1 ? <span aria-hidden="true" style={{ position: 'absolute', right: 'calc(-1 * clamp(12px, 1.4vw, 28px))', top: '50%', width: 'clamp(12px, 1.4vw, 28px)', height: 1, background: colors.line.strong }} /> : null}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap, alignItems: 'start' }}>
          {[AI.why, AI.not].map((b, i) => (
            <div key={b.title} data-rv style={{ borderTop: `2px solid ${i === 0 ? colors.accent : colors.ink}`, paddingTop: 14 }}>
              <div style={T.title}>{b.title}</div>
              <p style={{ ...T.body, margin: '8px 0 0' }}>{b.desc}</p>
            </div>
          ))}
          <div data-rv style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
              <span style={T.title}>{AI.examples.title}</span>
              <span style={T.caption}>{AI.examples.note}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['칸', '서류 원문', 'AI 근거 문구', 'AI 등급 초안', '원문 대조'].map((h) => (
                    <th key={h} style={{ ...T.label, textAlign: 'left', padding: '8px 12px 8px 0', borderBottom: `1px solid ${colors.line.strong}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AI.examples.rows.map((r) => (
                  <tr key={r.row}>
                    <td style={{ ...T.caption, padding: '12px 12px 12px 0', borderBottom: `1px solid ${colors.line.default}` }}>{r.row}</td>
                    <td style={{ ...T.body, color: colors.text.primary, padding: '12px 12px 12px 0', borderBottom: `1px solid ${colors.line.default}` }}>{r.original}</td>
                    <td style={{ ...T.body, padding: '12px 12px 12px 0', borderBottom: `1px solid ${colors.line.default}` }}>"{r.quote}"</td>
                    <td style={{ ...T.strong, padding: '12px 12px 12px 0', borderBottom: `1px solid ${colors.line.default}` }}>{r.grade}</td>
                    <td style={{ ...T.strong, color: r.ok ? colors.text.secondary : colors.alert, padding: '12px 0', borderBottom: `1px solid ${colors.line.default}` }}>{r.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 14 }}><Pending text={AI.pending} /></div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ── 프로토타입 코치마크 ───────────────────────────────── */
export function Proto({ active, s }) {
  const p = PROTOS[s.id];
  return (
    <Frame active={active} eyebrow={eb(s)} headline={p.headline}>
      <Coachmark src={p.src} marks={p.marks} ratio={p.ratio} active={active} alt={`${s.ko} 화면`} />
    </Frame>
  );
}

/* ── 공공데이터 ───────────────────────────────────────── */
export function Data({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={DATA.headline}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(16px, 4vh, 48px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap }}>
          {DATA.groups.map((g) => (
            <div key={g.title} data-rv>
              <div style={{ ...T.title, paddingBottom: 10, borderBottom: `2px solid ${colors.ink}` }}>{g.title} <span style={{ color: colors.accent }}>{g.items.length}</span></div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {g.items.map((it) => (
                  <li key={it.name} style={{ padding: 'clamp(10px, 2.2vh, 22px) 0', borderBottom: `1px solid ${colors.line.default}` }}>
                    <div style={{ ...T.strong }}>{it.name}</div>
                    <div style={{ ...T.caption, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{it.org}</span><span style={{ whiteSpace: 'nowrap' }}>{it.at}</span></div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p data-rv style={{ ...T.caption, margin: 0 }}>{DATA.note}</p>
      </div>
    </Frame>
  );
}

/* ── 시나리오 결과 ─────────────────────────────────────── */
export function Scenarios({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={SCENARIOS.headline}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 'clamp(20px, 3vw, 60px)' }}>
        <div data-rv style={{ minHeight: 0 }}>
          <BarChart
            bars={SCENARIOS.bars.map((b) => ({ ...b, label: b.id }))}
            active={active}
            max={850}
            unit="명"
            barMax={36}
            colorOf={(b) => (b.value > 0 ? colors.alert : colors.line.strong)}
          />
        </div>
        <div data-rv style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {SCENARIOS.bars.map((b) => (
              <li key={b.id} style={{ display: 'grid', gridTemplateColumns: 'clamp(36px, 3.4vw, 56px) 1fr auto', gap: 10, alignItems: 'baseline', padding: 'clamp(8px, 1.4vh, 14px) 0', borderBottom: `1px solid ${colors.line.default}` }}>
                <span style={{ ...T.label, color: colors.text.primary }}>{b.id}</span>
                <span>
                  <span style={{ ...T.strong, display: 'block' }}>{b.label}</span>
                  <span style={T.caption}>{b.note}</span>
                </span>
                <span style={{ ...T.strong, color: b.value > 0 ? colors.alert : colors.text.dim, fontVariantNumeric: 'tabular-nums' }}>{b.value}명</span>
              </li>
            ))}
          </ul>
          <p style={{ ...T.caption, margin: '12px 0 0' }}>{SCENARIOS.basis}</p>
        </div>
      </div>
    </Frame>
  );
}

/* ── 디자인 시스템 ─────────────────────────────────────── */
export function DesignSystem({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={DESIGN_SYSTEM.headline}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'clamp(20px, 3vw, 60px)', alignContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 3vh, 32px)' }}>
          <div data-rv style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10 }}>
            {DESIGN_SYSTEM.colors.map((c) => (
              <div key={c.name}>
                <div style={{ aspectRatio: '1 / 1.1', borderRadius: 12, background: c.hex, boxShadow: `inset 0 0 0 1px ${colors.line.faint}` }} />
                <div style={{ ...T.strong, marginTop: 8 }}>{c.name}</div>
                <div style={{ ...T.caption, fontVariantNumeric: 'tabular-nums' }}>{c.hex}</div>
                <div style={T.caption}>{c.use}</div>
              </div>
            ))}
          </div>
          <ul data-rv style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {DESIGN_SYSTEM.rules.map((r) => (
              <li key={r} style={{ ...T.body, display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: colors.accent, flex: '0 0 auto', transform: 'translateY(-2px)' }} />{r}
              </li>
            ))}
          </ul>
          <p data-rv style={{ ...T.caption, margin: 0 }}>{DESIGN_SYSTEM.src}</p>
        </div>
        <div data-rv style={{ fontFamily: "'Pretendard GOV Variable', 'Pretendard Variable', Pretendard, sans-serif" }}>
          <div style={{ ...T.label, marginBottom: 8 }}>{DESIGN_SYSTEM.font}</div>
          {DESIGN_SYSTEM.type.map((t) => (
            <div key={t.role} style={{ display: 'grid', gridTemplateColumns: 'clamp(90px, 8vw, 140px) 1fr', alignItems: 'baseline', gap: 12, padding: 'clamp(6px, 1.1vh, 12px) 0', borderBottom: `1px solid ${colors.line.default}` }}>
              <span style={T.caption}>{t.role} {t.size}/{t.weight}</span>
              <span style={{ fontSize: `calc(${t.size}px * var(--ts, 1))`, fontWeight: t.weight, color: colors.text.primary, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>미이송 예상 291명</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ── 사용성 평가(진행 예정) ───────────────────────────── */
export function Evaluate({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={EVALUATE.headline}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(14px, 3vh, 36px)' }}>
        <div data-rv><Pending text={EVALUATE.status} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr)) minmax(0, 0.8fr)', gap }}>
          {EVALUATE.tasks.map((t) => (
            <div key={t.no} data-rv style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'clamp(200px, 34vh, 360px)' }}>
              <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, color: colors.accent }}>{t.no}</span>
              <span style={T.title}>{t.title}</span>
              <span style={T.body}>{t.goal}</span>
            </div>
          ))}
          <div data-rv style={{ ...card, background: 'transparent', boxShadow: `inset 0 0 0 1px ${colors.line.default}` }}>
            <div style={T.label}>측정</div>
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
              {EVALUATE.measures.map((m) => <li key={m} style={{ ...T.body, color: colors.text.primary }}>{m}</li>)}
            </ul>
          </div>
        </div>
        <p data-rv style={{ ...T.caption, margin: 0 }}>{EVALUATE.note}</p>
      </div>
    </Frame>
  );
}

/* ── 배운 점(작성 예정) ───────────────────────────────── */
export function Lessons({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={LESSONS.headline}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: 16 }}>
        <div data-rv><Pending text={LESSONS.status} /></div>
        <p data-rv style={{ ...T.title, color: colors.text.dim, margin: 0 }}>{LESSONS.note}</p>
      </div>
    </Frame>
  );
}

/* ── 마무리 ───────────────────────────────────────────── */
export function Outro({ active, s }) {
  return (
    <Frame active={active} eyebrow={eb(s)} headline={OUTRO.headline}>
      <div aria-hidden="true" style={{ position: 'absolute', right: 0, top: 0, bottom: 'clamp(40px, 8vh, 90px)', width: '46%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'clamp(12px, 1.4vw, 24px)', pointerEvents: 'none' }}>
        <div style={{ width: '62%', aspectRatio: '1.6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 30px 70px -30px rgba(16,16,16,0.35), 0 0 0 1px rgba(16,16,16,0.08)', transform: active ? 'translateY(0)' : 'translateY(30px)', opacity: active ? 1 : 0, transition: `transform 1200ms ${motion.easeOut}, opacity 800ms ease` }}>
          <img src="/shots/shortage.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ width: '24%', aspectRatio: '0.5', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 70px -30px rgba(16,16,16,0.35), 0 0 0 1px rgba(16,16,16,0.08)', transform: active ? 'translateY(0)' : 'translateY(50px)', opacity: active ? 1 : 0, transition: `transform 1400ms ${motion.easeOut} 120ms, opacity 900ms ease 120ms` }}>
          <img src="/shots/helper.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      </div>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 'clamp(20px, 4vh, 48px)', position: 'relative' }}>
        <div data-rv style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(12px, 1.4vw, 24px)' }}>
          <span style={{ fontFamily: typography.displayFamily, fontWeight: 700, fontSize: 'clamp(4rem, 11vw, 11rem)', letterSpacing: '-0.05em', lineHeight: 0.95 }}>{META.service}</span>
          <span style={{ fontFamily: typography.eyebrow.family, fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 2rem)', letterSpacing: '0.12em', color: colors.accent }}>{META.serviceEn}</span>
        </div>
        <div data-rv style={{ display: 'flex', gap: 'clamp(24px, 4vw, 80px)', flexWrap: 'wrap' }}>
          {OUTRO.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <div style={T.label}>{l.label}</div>
              <div style={{ ...T.strong, color: colors.accent, marginTop: 4 }}>{l.url.replace('https://', '')}</div>
            </a>
          ))}
          <div>
            <div style={T.label}>TEAM</div>
            <div style={{ ...T.strong, marginTop: 4 }}>{META.members.join(', ')}</div>
          </div>
        </div>
        <p data-rv style={{ ...T.caption, margin: 0 }}>{OUTRO.credit}</p>
      </div>
    </Frame>
  );
}

export const RENDERERS = {
  cover: Cover,
  summary: Summary,
  process: Process,
  incident: Incident,
  yeongnam: Yeongnam,
  region: Region,
  grades: Grades,
  desk: Desk,
  stakeholders: Stakeholders,
  empathize: Empathize,
  define: Define,
  gaps: Gaps,
  journey: Journey,
  ideate: Ideate,
  blueprint: Blueprint,
  ai: Ai,
  'proto-intake': Proto,
  'proto-shortage': Proto,
  'proto-map': Proto,
  'proto-roster': Proto,
  'proto-dispatch': Proto,
  'proto-helper': Proto,
  data: Data,
  scenarios: Scenarios,
  'design-system': DesignSystem,
  evaluate: Evaluate,
  lessons: Lessons,
  outro: Outro,
};

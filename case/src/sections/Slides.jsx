// 미리 케이스 스터디 슬라이드. 구성은 강릉페이 PPT 장표 문법을 따른다.
// 파란 영문 아이브로우와 명사형 헤드라인, 오른쪽 숫자 칩, 이어진 원, 채운 면, 파란 전면 장표, 트리 구조.
// 보더와 버튼처럼 보이는 알약을 쓰지 않는다.

import { c, t, space, shadow, ease } from '../tokens.js';
import { Slide, Header, StatChips, Pending, panel, useMode } from '../components/ui.jsx';
import BarChart from '../components/BarChart.jsx';
import Coachmark from '../components/Coachmark.jsx';
import {
  META, COVER, SUMMARY, PROCESS, INCIDENT, YEONGNAM, REGION, GRADES, DESK, STAKEHOLDERS, EMPATHIZE,
  DEFINE, GAPS, JOURNEY, IDEATE, BLUEPRINT, AI, PROTOS, DATA, SCENARIOS, DESIGN_SYSTEM, EVALUATE, LESSONS, OUTRO,
} from '../copy.js';

const gap = space.gap;
const grid = (n) => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap });

// 이어진 원 줄. 원 중심 높이에 가는 선 하나를 깐다(강릉페이 인터뷰, 사용성 평가 장표)
function CircleRow({ items, size, render, below, lineColor = c.primaryMid }) {
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap }}>
      <span aria-hidden="true" style={{ position: 'absolute', left: `${50 / items.length}%`, right: `${50 / items.length}%`, top: `calc(${size} / 2)`, height: 2, background: lineColor }} />
      {items.map((it, i) => (
        <div key={i} data-rv style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: size, height: size, borderRadius: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8%', ...render(it, i).style }}>
            {render(it, i).inner}
          </div>
          {below ? <div style={{ marginTop: 'clamp(12px, 1.6vh, 22px)', width: '100%' }}>{below(it, i)}</div> : null}
        </div>
      ))}
    </div>
  );
}

/* 01 표지 */
export function Cover({ active, s }) {
  const { slide, narrow } = useMode();
  return (
    <Slide active={active} bg={`linear-gradient(180deg, ${c.white} 0%, ${c.primarySoft} 100%)`}>
      <span aria-hidden="true" style={{ position: 'absolute', left: '-8vw', bottom: '-18vw', width: '38vw', height: '38vw', borderRadius: 999, background: c.primaryTint, opacity: 0.8 }} />
      <div style={{ position: 'relative', height: slide ? '100%' : 'auto', display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: 'clamp(24px, 4vw, 80px)', alignItems: 'center' }}>
        <div data-rv>
          <p style={{ ...t.eyebrow, margin: 0 }}>{s.eyebrow}</p>
          <h1 style={{ margin: 'clamp(10px, 1.4vh, 20px) 0 0', fontWeight: 700, fontSize: 'clamp(64px, 8vw, 168px)', letterSpacing: '-0.05em', lineHeight: 1, color: c.primary }}>
            {COVER.title}<span style={{ fontSize: '0.26em', letterSpacing: '0.1em', marginLeft: '0.5em', verticalAlign: 'middle' }}>{COVER.titleEn}</span>
          </h1>
          <p style={{ ...t.headline, fontSize: 'clamp(22px, 1.5vw + 6px, 40px)', margin: 'clamp(16px, 2.4vh, 32px) 0 0' }}>{COVER.sub}</p>
          <p style={{ ...t.lead, margin: '10px 0 0' }}>{COVER.note}</p>
          <div style={{ display: 'flex', gap: 'clamp(24px, 3vw, 64px)', marginTop: 'clamp(28px, 6vh, 72px)', flexWrap: 'wrap' }}>
            <div>
              <div style={t.label}>{META.team}</div>
              <div style={{ ...t.body, marginTop: 4 }}>{META.members}</div>
            </div>
            <div>
              <div style={t.label}>{META.school}</div>
              <div style={{ ...t.body, marginTop: 4 }}>{META.course}</div>
            </div>
          </div>
        </div>
        <div data-rv style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src="/shots/map-3d.png"
            alt="미리 상황판 3D 지도 화면"
            style={{ width: '100%', maxHeight: slide ? '64vh' : 'none', objectFit: 'contain', borderRadius: 'clamp(10px, 1vw, 18px)', boxShadow: shadow.lg, background: c.card, aspectRatio: '1.6' }}
          />
        </div>
      </div>
    </Slide>
  );
}

/* 02 프로젝트 배경과 목적 */
export function Summary({ active, s }) {
  const { narrow, mobile } = useMode();
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={SUMMARY.headline} />}>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1.05fr) minmax(0, 1fr) minmax(0, 0.8fr)', gap: 'clamp(20px, 3vw, 56px)', alignItems: 'center', height: narrow ? 'auto' : '100%' }}>
        {!mobile ? (
          <div data-rv>
            <img src="/shots/intake.png" alt="서류 읽기 화면" style={{ width: '100%', aspectRatio: '1.6', objectFit: 'cover', borderRadius: 14, boxShadow: shadow.lg, display: 'block' }} />
          </div>
        ) : null}
        <div data-rv>
          <h3 style={{ ...t.title, color: c.primary, margin: 0 }}>{SUMMARY.introTitle}</h3>
          <p style={{ ...t.body, margin: '10px 0 0' }}>{SUMMARY.intro}</p>
          <h3 style={{ ...t.title, color: c.primary, margin: 'clamp(20px, 3.4vh, 40px) 0 0' }}>{SUMMARY.featureTitle}</h3>
          <ol style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 'clamp(12px, 2vh, 22px)' }}>
            {SUMMARY.features.map((f) => (
              <li key={f.no} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14 }}>
                <span style={{ ...t.bodyBold, color: c.primary }}>{f.no}</span>
                <span>
                  <span style={{ ...t.bodyBold, display: 'block' }}>{f.title}</span>
                  <span style={{ ...t.body, display: 'block', marginTop: 2 }}>{f.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div data-rv style={{ ...panel('tint'), padding: 'clamp(22px, 2.2vw, 44px)' }}>
          <div style={{ ...t.eyebrow, fontSize: 'clamp(13px, 0.5vw + 8px, 18px)' }}>{SUMMARY.goalLabel}</div>
          <div style={{ ...t.title, fontSize: 'clamp(20px, 1.2vw + 8px, 34px)', color: c.primaryDeep, marginTop: 14 }}>{SUMMARY.goalTitle}</div>
          <p style={{ ...t.body, color: c.primaryDeep, margin: '16px 0 0' }}>{SUMMARY.goal}</p>
        </div>
      </div>
    </Slide>
  );
}

/* 03 더블 다이아몬드 */
export function Process({ active, s }) {
  const { narrow } = useMode();
  const pts = [[0, 150], [250, 10], [500, 150], [750, 10], [1000, 150], [750, 290], [500, 150], [250, 290]];
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={PROCESS.headline} />} center>
      <div data-rv style={{ position: 'relative', width: narrow ? '100%' : '72%', margin: '0 auto' }}>
        <svg viewBox="-6 0 1012 300" style={{ width: '100%', display: 'block' }} aria-hidden="true">
          <polygon points="0,150 250,10 500,150 250,290" fill={c.primarySoft} />
          <polygon points="500,150 750,10 1000,150 750,290" fill={c.primaryTint} />
          <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={c.primary} strokeWidth="3" strokeLinejoin="round" />
          <line x1="250" y1="10" x2="250" y2="290" stroke={c.primary} strokeWidth="2" strokeDasharray="6 8" />
          <line x1="750" y1="10" x2="750" y2="290" stroke={c.primary} strokeWidth="2" strokeDasharray="6 8" />
          {['D1', 'D2', 'D3', 'D4'].map((d, i) => (
            <text key={d} x={[150, 350, 650, 850][i]} y="162" textAnchor="middle" fontSize="40" fontWeight="700" fill={c.primary} fontFamily="inherit">{d}</text>
          ))}
        </svg>
      </div>
      <div style={{ ...grid(narrow ? 2 : 4), marginTop: 'clamp(20px, 3.6vh, 44px)' }}>
        {PROCESS.phases.map((p) => (
          <div key={p.d} data-rv>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ ...t.label }}>{p.d}</span>
              <span style={{ ...t.title }}>{p.en}</span>
              <span style={{ ...t.body, color: c.sub }}>{p.ko}</span>
            </div>
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
              {p.items.map((it) => <li key={it} style={t.body}>{it}</li>)}
              {p.pending.map((it) => (
                <li key={it} style={{ ...t.body, color: c.sub, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{it}<Pending /></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div data-rv style={{ ...panel('blue'), marginTop: 'clamp(20px, 3.6vh, 44px)', textAlign: 'center' }}>
        <p style={{ ...t.bodyBold, color: c.white, margin: 0 }}>{PROCESS.lead}</p>
      </div>
    </Slide>
  );
}

/* 04 2022 옥계 산불 */
export function Incident({ active, s }) {
  const { narrow, mobile } = useMode();
  const size = mobile ? '92px' : 'clamp(120px, 10.5vw, 220px)';
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={INCIDENT.headline} lead={INCIDENT.lead} right={!mobile ? <StatChips items={[{ value: INCIDENT.gap, label: INCIDENT.gapLabel }]} /> : null} />}>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 'clamp(24px, 3.4vw, 72px)', alignItems: 'center', height: narrow ? 'auto' : '100%' }}>
        <CircleRow
          items={INCIDENT.events}
          size={size}
          render={(e, i) => ({
            style: { background: i === 1 ? c.primary : i === 0 ? c.primaryTint : c.primaryDeep, color: i === 0 ? c.primaryDeep : c.white },
            inner: <span style={{ ...t.numSm, fontSize: mobile ? 22 : 'clamp(24px, 2vw + 4px, 48px)', color: 'inherit' }}>{e.time}</span>,
          })}
          below={(e) => (
            <>
              <div style={{ ...t.bodyBold }}>{e.title}</div>
              <div style={{ ...t.note, marginTop: 4 }}>{e.src}</div>
            </>
          )}
        />
        <figure data-rv style={{ margin: 0 }}>
          <div style={{ position: 'relative', width: narrow ? '100%' : 'min(100%, 54vh)', aspectRatio: '1 / 1', borderRadius: 16, overflow: 'hidden', boxShadow: shadow.lg, marginLeft: 'auto' }}>
            <img src="/shots/map-2d.png" alt="강릉시 옥계면 남양리에서 동해시 쪽으로 그린 확산 가정 구역" style={{ position: 'absolute', width: '270.3%', left: '-110.8%', top: '-34.6%', maxWidth: 'none' }} />
          </div>
          <figcaption style={{ ...t.note, marginTop: 10, width: narrow ? '100%' : 'min(100%, 54vh)', marginLeft: 'auto' }}>{INCIDENT.mapCaption}</figcaption>
        </figure>
      </div>
    </Slide>
  );
}

/* 05 2025 영남 산불 */
export function Yeongnam({ active, s }) {
  const { narrow } = useMode();
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={YEONGNAM.headline} lead={YEONGNAM.lead} />} center>
      <div style={grid(narrow ? 2 : 4)}>
        {YEONGNAM.facts.map((f) => (
          <div key={f.label} data-rv style={{ ...panel('white'), textAlign: 'center', boxShadow: shadow.md }}>
            <div style={{ ...t.num, color: f.alert ? c.alert : c.primary }}>
              {f.value}<span style={{ fontSize: '0.34em', marginLeft: 4 }}>{f.unit}</span>
            </div>
            <div style={{ ...t.bodyBold, marginTop: 'clamp(10px, 1.6vh, 18px)' }}>{f.label}</div>
            <div style={{ ...t.note, marginTop: 6 }}>{f.src}</div>
          </div>
        ))}
      </div>
      <div data-rv style={{ ...panel('soft'), marginTop: 'clamp(20px, 4vh, 48px)', padding: 'clamp(22px, 2.4vw, 44px)' }}>
        <div style={{ ...t.label }}>{YEONGNAM.quoteLabel}</div>
        <p style={{ ...t.title, fontSize: 'clamp(18px, 1vw + 8px, 30px)', color: c.primaryDeep, margin: '12px 0 0' }}>"{YEONGNAM.quote}"</p>
        <p style={{ ...t.note, margin: '12px 0 0' }}>{YEONGNAM.quoteSrc}</p>
      </div>
    </Slide>
  );
}

/* 06 동해시 고령화율 */
export function Region({ active, s }) {
  const { mobile, slide } = useMode();
  return (
    <Slide
      active={active}
      header={<Header eyebrow={s.eyebrow} headline={REGION.headline} lead={REGION.lead} right={!mobile ? <StatChips items={[{ value: `${REGION.big.value}명`, label: REGION.big.label }, { value: '27.6%', label: '주민등록인구 대비', ink: true }]} /> : null} />}
    >
      <div data-rv style={{ ...panel('white'), height: slide ? '100%' : 'auto', display: 'flex', flexDirection: 'column', padding: 'clamp(18px, 2vw, 40px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ ...t.bodyBold }}>행정동별 65세 이상 비율</span>
          <span style={{ ...t.note }}>{REGION.basis}</span>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, marginTop: 16, overflowX: mobile ? 'auto' : 'visible' }}>
          <div style={{ minWidth: mobile ? 560 : 0, height: '100%' }}>
            <BarChart
              bars={REGION.bars}
              active={active}
              max={56}
              unit="%"
              format={(v) => v.toFixed(1)}
              barMax={44}
              height={slide ? '100%' : 280}
              minHeight={mobile ? 240 : 200}
              colorOf={(b) => (b.total ? c.ink : b.value >= 44 ? c.primary : c.barIdle)}
            />
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* 07 이송 등급별 재가 수급자 */
export function Grades({ active, s }) {
  const { narrow, mobile } = useMode();
  const maxV = Math.max(...GRADES.items.map((i) => i.value));
  const maxD = mobile ? 120 : 'min(15vw, 30vh)';
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={GRADES.headline} lead={GRADES.lead} />}>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 'clamp(20px, 3vw, 56px)', alignItems: 'center', height: narrow ? 'auto' : '100%' }}>
        <div data-rv style={{ ...grid(mobile ? 2 : 4), alignItems: 'end' }}>
          {GRADES.items.map((g) => {
            const r = Math.sqrt(g.value / maxV);
            return (
              <div key={g.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ height: maxD, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{
                    width: `calc(${typeof maxD === 'number' ? `${maxD}px` : maxD} * ${Math.max(r, 0.3)})`,
                    aspectRatio: '1 / 1', borderRadius: 999,
                    background: g.key ? c.primary : c.primaryTint,
                    color: g.key ? c.white : c.primaryDeep,
                    display: 'grid', placeItems: 'center',
                    transform: active ? 'scale(1)' : 'scale(0.4)', opacity: active ? 1 : 0,
                    transition: `transform 900ms ${ease.out}, opacity 500ms ease`,
                  }}>
                    <span style={{ ...t.bodyBold, color: 'inherit', fontSize: 'clamp(15px, 0.9vw + 6px, 28px)', fontVariantNumeric: 'tabular-nums' }}>{g.value.toLocaleString('ko-KR')}</span>
                  </div>
                </div>
                <div style={{ ...t.title, marginTop: 14 }}>{g.label}</div>
                <div style={{ ...t.note, color: c.body, marginTop: 4 }}>{g.need}</div>
                <div style={{ ...t.note, marginTop: 2 }}>장기요양 {g.from}</div>
              </div>
            );
          })}
        </div>
        <div data-rv>
          <div style={{ ...panel('blue'), padding: 'clamp(22px, 2.2vw, 40px)' }}>
            <div style={{ ...t.title, color: c.white, fontSize: 'clamp(19px, 1vw + 8px, 30px)' }}>{GRADES.callTitle}</div>
            <p style={{ ...t.body, color: 'rgba(255,255,255,0.92)', margin: '12px 0 0' }}>{GRADES.call}</p>
          </div>
          <p style={{ ...t.note, margin: '14px 0 0' }}>{GRADES.basis}</p>
        </div>
      </div>
    </Slide>
  );
}

/* 08 기존 서비스 비교 */
export function Desk({ active, s }) {
  const { narrow, mobile } = useMode();
  const cols = 'minmax(0, 0.55fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.1fr)';
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={DESK.headline} lead={DESK.lead} />} center>
      {mobile ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {DESK.rows.map((r) => (
            <div key={r[1]} data-rv style={{ ...panel('white'), padding: 16 }}>
              <div style={t.label}>{r[0]}</div>
              <div style={{ ...t.bodyBold, marginTop: 4 }}>{r[1]}</div>
              <div style={{ ...t.note, fontWeight: 700, color: c.primary, marginTop: 4 }}>하지 않는 일: {r[3]}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'clamp(4px, 0.5vh, 8px)' }}>
          <div data-rv style={{ display: 'grid', gridTemplateColumns: cols, padding: '0 clamp(14px, 1.4vw, 28px)', gap }}>
            {DESK.cols.map((h, i) => <span key={h} style={{ ...t.label, color: i === 3 ? c.primary : c.sub }}>{h}</span>)}
          </div>
          {DESK.rows.map((r) => (
            <div key={r[1]} data-rv style={{ display: 'grid', gridTemplateColumns: cols, gap, background: c.card, borderRadius: space.radiusSm, overflow: 'hidden', alignItems: 'stretch' }}>
              <span style={{ ...t.note, fontWeight: 700, color: c.sub, padding: 'clamp(12px, 1.8vh, 20px) 0 clamp(12px, 1.8vh, 20px) clamp(14px, 1.4vw, 28px)' }}>{r[0]}</span>
              <span style={{ ...t.bodyBold, padding: 'clamp(12px, 1.8vh, 20px) 0' }}>{r[1]}</span>
              <span style={{ ...t.body, padding: 'clamp(12px, 1.8vh, 20px) 0' }}>{r[2]}</span>
              <span style={{ ...t.bodyBold, color: c.primaryDeep, background: c.primarySoft, padding: 'clamp(12px, 1.8vh, 20px) clamp(14px, 1.4vw, 28px)' }}>{r[3]}</span>
            </div>
          ))}
        </div>
      )}
      <p data-rv style={{ ...t.note, margin: '16px 0 0' }}>{DESK.note}</p>
    </Slide>
  );
}

/* 09 이해관계자 */
export function Stakeholders({ active, s }) {
  const { slide, mobile } = useMode();
  const node = (n, tone) => (
    <div style={{ background: tone === 'blue' ? c.primary : c.card, borderRadius: space.radius, boxShadow: shadow.md, padding: 'clamp(10px, 0.9vw, 18px) clamp(14px, 1.2vw, 24px)', textAlign: 'center', maxWidth: 'clamp(150px, 13vw, 260px)' }}>
      <div style={{ ...t.bodyBold, color: tone === 'blue' ? c.white : c.ink }}>{n.title}</div>
      <div style={{ ...t.note, color: tone === 'blue' ? 'rgba(255,255,255,0.9)' : c.body, marginTop: 2 }}>{n.role}</div>
    </div>
  );
  if (!slide) {
    return (
      <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={STAKEHOLDERS.headline} lead={STAKEHOLDERS.lead} />}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ ...panel('blue') }}><div style={{ ...t.bodyBold, color: c.white }}>{STAKEHOLDERS.center.title}</div><div style={{ ...t.note, color: c.white }}>{STAKEHOLDERS.center.role}</div></div>
          <div style={t.label}>{STAKEHOLDERS.innerLabel}</div>
          <div style={grid(mobile ? 1 : 2)}>{STAKEHOLDERS.inner.map((n) => <div key={n.title} style={panel('tint')}><div style={t.bodyBold}>{n.title}</div><div style={t.note}>{n.role}</div></div>)}</div>
          <div style={t.label}>{STAKEHOLDERS.outerLabel}</div>
          <div style={grid(mobile ? 1 : 2)}>{STAKEHOLDERS.outer.map((n) => <div key={n.title} style={panel('white')}><div style={t.bodyBold}>{n.title}</div><div style={t.note}>{n.role}</div></div>)}</div>
        </div>
      </Slide>
    );
  }
  const outerPos = [[16, 22], [84, 22], [16, 78], [84, 78]];
  const innerPos = [[50, 20], [50, 80]];
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={STAKEHOLDERS.headline} lead={STAKEHOLDERS.lead} />}>
      <div data-rv style={{ position: 'absolute', inset: 0 }}>
        <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', height: '100%', aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: 999, background: c.white, boxShadow: shadow.sm }} />
        <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', height: '68%', aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: 999, background: c.primaryTint }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: '32%', aspectRatio: '1', borderRadius: 999, background: c.primary, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '2%' }}>
          <div>
            <div style={{ ...t.title, color: c.white }}>{STAKEHOLDERS.center.title}</div>
            <div style={{ ...t.note, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>{STAKEHOLDERS.center.role}</div>
          </div>
        </div>
        {STAKEHOLDERS.inner.map((n, i) => (
          <div key={n.title} style={{ position: 'absolute', left: `${innerPos[i][0]}%`, top: `${innerPos[i][1]}%`, transform: 'translate(-50%, -50%)' }}>{node(n, 'white')}</div>
        ))}
        {STAKEHOLDERS.outer.map((n, i) => (
          <div key={n.title} style={{ position: 'absolute', left: `${outerPos[i][0]}%`, top: `${outerPos[i][1]}%`, transform: 'translate(-50%, -50%)' }}>{node(n, 'white')}</div>
        ))}
        <div style={{ position: 'absolute', right: 0, bottom: 0, display: 'grid', gap: 8 }}>
          <span style={{ ...t.note, display: 'flex', gap: 8, alignItems: 'center', color: c.body }}><i style={{ width: 14, height: 14, borderRadius: 999, background: c.primaryTint }} />{STAKEHOLDERS.innerLabel}</span>
          <span style={{ ...t.note, display: 'flex', gap: 8, alignItems: 'center', color: c.body }}><i style={{ width: 14, height: 14, borderRadius: 999, background: c.white, boxShadow: shadow.md }} />{STAKEHOLDERS.outerLabel}</span>
        </div>
      </div>
    </Slide>
  );
}

/* 10 현장 조사 계획 */
export function Empathize({ active, s }) {
  const { narrow } = useMode();
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={EMPATHIZE.headline} lead={EMPATHIZE.lead} right={<Pending text={EMPATHIZE.status} />} />} center>
      <div style={grid(narrow ? 1 : 2)}>
        {EMPATHIZE.plan.map((p, i) => (
          <div key={p.who} data-rv style={{ ...panel(i % 3 === 0 ? 'tint' : 'white'), display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'clamp(12px, 1.4vw, 24px)', alignItems: 'start', minHeight: narrow ? 0 : 'clamp(150px, 23vh, 280px)', padding: 'clamp(22px, 2.2vw, 44px)' }}>
            <span style={{ ...t.numSm, fontSize: 'clamp(24px, 1.6vw + 6px, 44px)' }}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={t.title}>{p.who}</span>
                <span style={t.label}>{p.how}</span>
              </div>
              <p style={{ ...t.body, margin: '8px 0 0' }}>{p.ask}</p>
              <p style={{ ...t.note, margin: '8px 0 0' }}>확인할 화면 <b style={{ color: c.primaryDeep }}>{p.check}</b></p>
            </div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

/* 11 문제 정의. 파란 전면 장표 */
export function Define({ active, s }) {
  const { narrow } = useMode();
  return (
    <Slide active={active} bg={c.primary} header={<Header eyebrow={s.eyebrow} headline={DEFINE.headline} onBlue />} center>
      <span aria-hidden="true" style={{ position: 'absolute', right: '-14vw', top: '-30%', width: '46vw', height: '46vw', borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
      <p data-rv style={{ position: 'relative', margin: 0, color: c.white, fontWeight: 700, fontSize: 'clamp(22px, 2.2vw + 4px, 54px)', lineHeight: 1.45, letterSpacing: '-0.02em', maxWidth: '24em', wordBreak: 'keep-all' }}>
        {DEFINE.problem}
      </p>
      <div data-rv style={{ position: 'relative', marginTop: 'clamp(20px, 4vh, 48px)', background: c.white, borderRadius: space.radius, padding: 'clamp(18px, 2vw, 36px)', maxWidth: 1100 }}>
        <div style={{ ...t.eyebrow, fontSize: 'clamp(13px, 0.5vw + 8px, 18px)' }}>{DEFINE.hmwLabel}</div>
        <p style={{ ...t.title, margin: '8px 0 0' }}>{DEFINE.hmw}</p>
      </div>
      <div data-rv style={{ position: 'relative', ...grid(narrow ? 1 : 3), marginTop: 'clamp(20px, 4vh, 48px)', maxWidth: 1100 }}>
        {DEFINE.evidence.map((e) => (
          <div key={e.label}>
            <div style={{ ...t.numSm, color: c.white }}>{e.value}</div>
            <div style={{ ...t.note, color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>{e.label}</div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

/* 12 서비스 공백. 채운 카드와 흰 카드 교차(강릉페이 UX 전략 장표) */
export function Gaps({ active, s }) {
  const { narrow, mobile } = useMode();
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={GAPS.headline} lead={GAPS.lead} />} center>
      <div style={grid(narrow ? 1 : 2)}>
        {GAPS.items.map((g, i) => {
          const blue = i === 0 || i === 3;
          const fg = blue ? c.white : c.ink;
          return (
            <div key={g.no} data-rv style={{ ...panel(blue ? 'blue' : 'white'), boxShadow: blue ? 'none' : shadow.md, padding: 'clamp(20px, 2vw, 40px)' }}>
              <div style={{ ...t.numSm, color: blue ? c.white : c.primary }}>{g.no}</div>
              <div style={{ ...t.title, color: fg, marginTop: 12, fontSize: 'clamp(19px, 0.9vw + 9px, 30px)' }}>{g.title}</div>
              {!mobile ? <p style={{ ...t.body, color: blue ? 'rgba(255,255,255,0.92)' : c.body, margin: '10px 0 0' }}>{g.desc}</p> : null}
              <div style={{ marginTop: 14 }}>
                {g.done ? <span style={{ ...t.label, color: blue ? c.white : c.primary }}>반영 화면 {g.done}</span> : <Pending onBlue={blue} />}
              </div>
            </div>
          );
        })}
      </div>
    </Slide>
  );
}

/* 13 담당자 여정 */
export function Journey({ active, s }) {
  const { narrow, mobile } = useMode();
  if (mobile) {
    return (
      <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={JOURNEY.headline} lead={JOURNEY.lead} />}>
        <div style={{ display: 'grid', gap: 10 }}>
          {JOURNEY.stages.map((st, i) => (
            <div key={st} style={{ ...panel('white'), padding: 16 }}>
              <div style={t.label}>{String(i + 1).padStart(2, '0')} {st}</div>
              <div style={{ ...t.note, color: c.sub, marginTop: 6 }}>현재 {JOURNEY.now[i]}</div>
              <div style={{ ...t.bodyBold, color: c.primaryDeep, marginTop: 4 }}>{JOURNEY.after[i]}</div>
            </div>
          ))}
        </div>
      </Slide>
    );
  }
  const cols = `clamp(80px, 8vw, 140px) repeat(5, minmax(0, 1fr))`;
  const size = 'clamp(40px, 3.2vw, 64px)';
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={JOURNEY.headline} lead={JOURNEY.lead} />} center>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap }}>
        <span />
        <div style={{ gridColumn: '2 / -1' }}>
          <CircleRow
            items={JOURNEY.stages}
            size={size}
            render={(st, i) => ({ style: { background: i === 2 ? c.primary : c.primaryTint, color: i === 2 ? c.white : c.primaryDeep }, inner: <span style={{ ...t.bodyBold, color: 'inherit' }}>{String(i + 1).padStart(2, '0')}</span> })}
            below={(st) => <span style={t.title}>{st}</span>}
          />
        </div>
        {[['현재', JOURNEY.now, false], ['미리 도입 후', JOURNEY.after, true]].map(([label, cells, on]) => [
          <div key={`${label}-l`} data-rv style={{ ...t.bodyBold, color: on ? c.primary : c.sub, alignSelf: 'center', marginTop: 12 }}>{label}</div>,
          ...cells.map((cell, i) => (
            <div key={`${label}-${i}`} data-rv style={{ ...panel(on ? 'blue' : 'white'), padding: 'clamp(12px, 1.2vw, 22px)', marginTop: 12, ...(on ? t.bodyBold : t.body), color: on ? c.white : c.body, minHeight: narrow ? 0 : 'clamp(72px, 10vh, 120px)' }}>{cell}</div>
          )),
        ])}
      </div>
    </Slide>
  );
}

/* 14 아이디어 발전 */
export function Ideate({ active, s }) {
  const { narrow, mobile } = useMode();
  const size = mobile ? '56px' : 'clamp(64px, 5.4vw, 112px)';
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={IDEATE.headline} lead={IDEATE.lead} right={!mobile ? <span style={{ display: 'grid', gap: 6, justifyItems: 'end' }}><span style={t.bodyBold}>{IDEATE.methodsTitle}</span><Pending text={IDEATE.methodsStatus} /></span> : null} />} center>
      <div style={{ overflowX: narrow ? 'auto' : 'visible' }}>
        <div style={{ minWidth: narrow ? 720 : 0 }}>
          <CircleRow
            items={IDEATE.versions}
            size={size}
            render={(v, i) => ({ style: { background: i === 3 ? c.primary : c.primaryTint, color: i === 3 ? c.white : c.primaryDeep }, inner: <span style={{ ...t.numSm, fontSize: 'clamp(20px, 1.4vw + 4px, 40px)', color: 'inherit' }}>{v.v}</span> })}
            below={(v, i) => (
              <div style={{ ...panel(i === 3 ? 'tint' : 'white'), textAlign: 'left' }}>
                <div style={{ ...t.title }}>{v.title}</div>
                <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
                  {v.items.map((it) => <li key={it} style={t.body}>{it}</li>)}
                </ul>
                <div style={{ ...t.label, marginTop: 12 }}>{v.note}</div>
              </div>
            )}
          />
        </div>
      </div>
    </Slide>
  );
}

/* 15 서비스 블루프린트. 선 대신 띠 색으로 영역을 나눈다 */
export function Blueprint({ active, s }) {
  const { narrow } = useMode();
  const bands = [c.card, c.primarySoft, c.muted];
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={BLUEPRINT.headline} lead={BLUEPRINT.lead} />} center>
      <div style={{ overflowX: narrow ? 'auto' : 'visible' }}>
        <div style={{ minWidth: narrow ? 820 : 0, display: 'grid', gap: 'clamp(6px, 0.8vh, 10px)' }}>
          <div data-rv style={{ display: 'grid', gridTemplateColumns: `clamp(110px, 9vw, 170px) repeat(5, minmax(0, 1fr))`, gap: 10 }}>
            <span />
            {BLUEPRINT.stages.map((st, i) => (
              <div key={st} style={{ ...t.title, display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ ...t.label }}>{String(i + 1).padStart(2, '0')}</span>{st}</div>
            ))}
          </div>
          {BLUEPRINT.lanes.map((ln, li) => (
            <div key={ln.name} data-rv>
              {li > 0 ? <div style={{ ...t.note, fontWeight: 700, color: c.primary, margin: '6px 0 6px' }}>{li === 1 ? BLUEPRINT.lineA : BLUEPRINT.lineB}</div> : null}
              <div style={{ display: 'grid', gridTemplateColumns: `clamp(110px, 9vw, 170px) repeat(5, minmax(0, 1fr))`, gap: 10, background: bands[li], borderRadius: space.radius, padding: 'clamp(10px, 1vw, 16px)', boxShadow: li === 0 ? shadow.sm : 'none' }}>
                <div style={{ ...t.bodyBold, color: li === 1 ? c.primaryDeep : c.ink, alignSelf: 'center' }}>{ln.name}</div>
                {ln.cells.map((cell, ci) => (
                  <div key={ci} style={{ ...t.body, minHeight: 'clamp(48px, 7vh, 86px)', display: 'flex', alignItems: 'center', padding: cell ? 'clamp(8px, 0.8vw, 14px)' : 0, borderRadius: space.radiusSm, background: cell ? (li === 0 ? c.primary : c.card) : 'transparent', color: li === 0 && cell ? c.white : c.body, fontWeight: li === 0 && cell ? 700 : 400 }}>
                    {cell}
                    {li === 1 && ci === 0 ? <span style={{ marginLeft: 'auto', paddingLeft: 8, ...t.label }}>AI</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* 16 AI 적용 */
export function Ai({ active, s }) {
  const { narrow, mobile } = useMode();
  const size = mobile ? '52px' : 'clamp(56px, 4.4vw, 88px)';
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={AI.headline} lead={AI.lead} right={!mobile ? <Pending text={AI.pending} /> : null} />}>
      <div style={{ display: 'grid', gap: 'clamp(18px, 3.4vh, 44px)' }}>
        <div style={{ overflowX: mobile ? 'auto' : 'visible' }}>
          <div style={{ minWidth: mobile ? 620 : 0 }}>
            <CircleRow
              items={AI.steps}
              size={size}
              render={(st) => ({ style: { background: st.ai ? c.primary : c.primaryTint, color: st.ai ? c.white : c.primaryDeep }, inner: <span style={{ ...t.numSm, fontSize: 'clamp(20px, 1.4vw + 4px, 38px)', color: 'inherit' }}>{st.no}</span> })}
              below={(st) => (
                <>
                  <div style={{ ...t.title }}>{st.title}</div>
                  <div style={{ ...t.label, color: st.ai ? c.primary : c.sub, marginTop: 2 }}>{st.who}</div>
                  <p style={{ ...t.note, color: c.body, margin: '6px 0 0', padding: '0 6%' }}>{st.desc}</p>
                </>
              )}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1fr) minmax(0, 1.15fr)', gap, alignItems: 'start', minHeight: 0 }}>
          <div style={{ display: 'grid', gap }}>
            <div data-rv style={panel('blue')}>
              <div style={{ ...t.title, color: c.white }}>{AI.why.title}</div>
              <p style={{ ...t.body, color: 'rgba(255,255,255,0.92)', margin: '8px 0 0' }}>{AI.why.desc}</p>
            </div>
            <div data-rv style={panel('white')}>
              <div style={t.title}>{AI.not.title}</div>
              <p style={{ ...t.body, margin: '8px 0 0' }}>{AI.not.desc}</p>
            </div>
          </div>
          {!mobile ? <div data-rv style={{ ...panel('white') }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={t.title}>{AI.exTitle}</span>
              <span style={t.note}>{AI.exNote}</span>
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
              {AI.examples.map((ex) => (
                <div key={ex.quote} style={{ background: ex.ok ? c.bg : c.alertSoft, borderRadius: space.radiusSm, padding: 'clamp(12px, 1vw, 18px)' }}>
                  <div style={{ ...t.note }}>서류 원문</div>
                  <div style={{ ...t.bodyBold }}>{ex.original}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={t.body}>AI 근거 "{ex.quote}", 등급 초안 <b>{ex.grade}</b></span>
                    <span style={{ ...t.bodyBold, color: ex.ok ? c.primary : c.alert }}>{ex.result}</span>
                  </div>
                </div>
              ))}
            </div>
          </div> : null}
        </div>
      </div>
    </Slide>
  );
}

/* 17~22 프로토타입 코치마크 */
export function Proto({ active, s }) {
  const p = PROTOS[s.id];
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={p.headline} lead={p.lead} />}>
      <Coachmark src={p.src} marks={p.marks} ratio={p.ratio} active={active} alt={`${p.headline}`} />
    </Slide>
  );
}

/* 23 공개 자료. 강릉페이 IA 장표처럼 회색 판 위 트리 */
export function Data({ active, s }) {
  const { narrow, slide, mobile } = useMode();
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={DATA.headline} lead={DATA.lead} right={!narrow ? <StatChips items={[{ value: '11종', label: '공개 자료' }, { value: '3종', label: '실시간 API', ink: true }]} /> : null} />}>
      <div data-rv style={{ background: c.muted, borderRadius: space.radius, padding: 'clamp(16px, 2vw, 40px)', height: slide ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...t.title, color: c.primaryDeep, textAlign: 'center' }}>미리의 부족분 계산에 들어가는 자료</div>
        <div style={{ ...grid(narrow ? 1 : 3), marginTop: 'clamp(16px, 3vh, 36px)', flex: '1 1 auto', alignItems: 'start' }}>
          {DATA.groups.map((g) => (
            <div key={g.title} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 4px 4px' }}><span style={t.title}>{g.title}</span><span style={{ ...t.label }}>{g.items.length}종</span></div>
              {g.items.map((it) => (
                mobile ? (
                  <div key={it.name} style={{ ...t.note, color: c.body }}><b style={{ color: c.ink }}>{it.name}</b> {it.org}, {it.at}</div>
                ) : (
                  <div key={it.name} style={{ background: c.card, borderRadius: space.radiusSm, padding: 'clamp(10px, 1vw, 16px)' }}>
                    <div style={t.bodyBold}>{it.name}</div>
                    <div style={{ ...t.note, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{it.org}</span><span style={{ whiteSpace: 'nowrap' }}>{it.at}</span></div>
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* 24 시나리오 결과 */
export function Scenarios({ active, s }) {
  const { narrow, slide } = useMode();
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={SCENARIOS.headline} lead={SCENARIOS.lead} right={!narrow ? <StatChips items={[{ value: '744명', label: 'S-3 초고속 확산', alert: true }]} /> : null} />}>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1.3fr) minmax(0, 1fr)', gap, height: slide ? '100%' : 'auto' }}>
        <div data-rv style={{ ...panel('white'), display: 'flex', flexDirection: 'column' }}>
          <span style={t.bodyBold}>시나리오별 미이송 예상(명)</span>
          <div style={{ flex: '1 1 auto', minHeight: 0, marginTop: 16 }}>
            <BarChart bars={SCENARIOS.bars.map((b) => ({ ...b, label: b.id }))} active={active} max={840} unit="명" barMax={48} height={slide ? '100%' : 260} minHeight={220} colorOf={(b) => (b.value > 0 ? c.alert : c.barIdle)} />
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8, alignContent: 'center' }}>
          {SCENARIOS.bars.map((b) => (
            <div key={b.id} data-rv style={{ background: c.card, borderRadius: space.radiusSm, padding: 'clamp(12px, 1.2vw, 20px)', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center' }}>
              <span style={{ ...t.label, color: c.ink }}>{b.id}</span>
              <span><span style={{ ...t.bodyBold, display: 'block' }}>{b.label}</span><span style={t.note}>{b.note}</span></span>
              <span style={{ ...t.bodyBold, color: b.value > 0 ? c.alert : c.sub, fontVariantNumeric: 'tabular-nums' }}>{b.value}명</span>
            </div>
          ))}
          <p style={{ ...t.note, margin: '6px 0 0' }}>{SCENARIOS.basis}</p>
        </div>
      </div>
    </Slide>
  );
}

/* 25 디자인 시스템 */
export function DesignSystem({ active, s }) {
  const { narrow, mobile } = useMode();
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={DESIGN_SYSTEM.headline} lead={DESIGN_SYSTEM.lead} />} center>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'clamp(20px, 3vw, 64px)', alignItems: 'start' }}>
        <div data-rv>
          <div style={grid(mobile ? 3 : 5)}>
            {DESIGN_SYSTEM.colors.map((col) => (
              <div key={col.name}>
                <div style={{ aspectRatio: '1 / 1', borderRadius: '50%', background: col.hex, boxShadow: col.hex === '#F4F5F6' ? shadow.md : 'none' }} />
                <div style={{ ...t.bodyBold, marginTop: 10 }}>{col.name}</div>
                <div style={{ ...t.note, fontVariantNumeric: 'tabular-nums' }}>{col.hex}</div>
                <div style={{ ...t.note, color: c.body }}>{col.use}</div>
              </div>
            ))}
          </div>
          <div style={{ ...panel('tint'), marginTop: 'clamp(16px, 3vh, 36px)' }}>
            <p style={{ ...t.body, color: c.primaryDeep, margin: 0 }}>{DESIGN_SYSTEM.rule}</p>
          </div>
          <p style={{ ...t.note, margin: '12px 0 0' }}>{DESIGN_SYSTEM.src}</p>
        </div>
        {!mobile ? <div data-rv style={{ ...panel('white') }}>
          <div style={t.label}>{DESIGN_SYSTEM.font}</div>
          <div style={{ display: 'grid', gap: 'clamp(8px, 1.4vh, 16px)', marginTop: 14 }}>
            {DESIGN_SYSTEM.type.map((ty) => (
              <div key={ty.role} style={{ display: 'grid', gridTemplateColumns: 'clamp(92px, 8vw, 150px) 1fr', alignItems: 'baseline', gap: 12 }}>
                <span style={t.note}>{ty.role} {ty.size}/{ty.weight}</span>
                <span style={{ fontSize: Math.min(ty.size * 1.1, ty.size + 6), fontWeight: ty.weight, color: c.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>미이송 예상 291명</span>
              </div>
            ))}
          </div>
        </div> : null}
      </div>
    </Slide>
  );
}

/* 26 사용성 평가 계획 */
export function Evaluate({ active, s }) {
  const { narrow, mobile } = useMode();
  const size = mobile ? '64px' : 'clamp(84px, 7vw, 140px)';
  return (
    <Slide active={active} header={<Header eyebrow={s.eyebrow} headline={EVALUATE.headline} lead={EVALUATE.lead} right={<Pending text={EVALUATE.status} />} />} center>
      <CircleRow
        items={EVALUATE.tasks}
        size={size}
        render={(tk, i) => ({ style: { background: i === 1 ? c.primary : c.primaryTint, color: i === 1 ? c.white : c.primaryDeep }, inner: <span style={{ ...t.numSm, fontSize: 'clamp(22px, 1.6vw + 4px, 44px)', color: 'inherit' }}>{tk.no}</span> })}
        below={(tk) => (
          <>
            <div style={t.title}>{tk.title}</div>
            <p style={{ ...t.body, margin: '6px 0 0', padding: '0 6%' }}>{tk.goal}</p>
          </>
        )}
      />
      <div data-rv style={{ ...panel('white'), marginTop: 'clamp(24px, 5vh, 56px)', display: 'flex', alignItems: 'center', gap: 'clamp(16px, 2.4vw, 48px)', flexWrap: 'wrap', justifyContent: narrow ? 'flex-start' : 'center' }}>
        <span style={{ ...t.title, color: c.primary }}>{EVALUATE.measuresTitle}</span>
        {EVALUATE.measures.map((m) => <span key={m} style={t.bodyBold}>{m}</span>)}
      </div>
    </Slide>
  );
}

/* 27 배운 점 */
export function Lessons({ active, s }) {
  return (
    <Slide active={active} bg={`linear-gradient(180deg, ${c.white} 0%, ${c.primaryTint} 100%)`} center>
      <span aria-hidden="true" style={{ position: 'absolute', left: '-6vw', bottom: '-10vw', width: '30vw', height: '30vw', borderRadius: 999, background: c.primaryMid, opacity: 0.6 }} />
      <div data-rv style={{ position: 'relative', textAlign: 'center' }}>
        <p style={{ ...t.eyebrow, margin: 0 }}>{s.eyebrow}</p>
        <h2 style={{ margin: '12px 0 0', fontWeight: 700, fontSize: 'clamp(48px, 7vw, 150px)', letterSpacing: '-0.04em', lineHeight: 1.05, color: c.primary }}>{LESSONS.headline}</h2>
        <div style={{ marginTop: 'clamp(16px, 3vh, 32px)' }}><Pending text={LESSONS.status} /></div>
        <p style={{ ...t.lead, color: c.body, margin: '12px auto 0', maxWidth: '30em' }}>{LESSONS.note}</p>
      </div>
    </Slide>
  );
}

/* 28 마무리 */
export function Outro({ active, s }) {
  const { narrow } = useMode();
  return (
    <Slide active={active} bg={`linear-gradient(180deg, ${c.white} 0%, ${c.primaryTint} 100%)`} center>
      <span aria-hidden="true" style={{ position: 'absolute', right: '-8vw', top: '-12vw', width: '36vw', height: '36vw', borderRadius: 999, background: c.primaryMid, opacity: 0.5 }} />
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'clamp(24px, 4vw, 80px)', alignItems: 'center' }}>
        <div data-rv>
          <p style={{ ...t.eyebrow, margin: 0 }}>{s.eyebrow}</p>
          <h2 style={{ margin: '12px 0 0', fontWeight: 700, fontSize: 'clamp(64px, 8vw, 168px)', letterSpacing: '-0.05em', lineHeight: 1, color: c.primary }}>{META.service}</h2>
          <p style={{ ...t.headline, margin: '16px 0 0' }}>{OUTRO.headline}</p>
          <div style={{ display: 'grid', gap: 12, marginTop: 'clamp(20px, 4vh, 48px)' }}>
            {OUTRO.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', gap: 16, alignItems: 'baseline' }}>
                <span style={{ ...t.label, color: c.sub, minWidth: 48 }}>{l.label}</span>
                <span style={{ ...t.bodyBold, color: c.primary }}>{l.url.replace('https://', '')}</span>
              </a>
            ))}
          </div>
          <p style={{ ...t.note, margin: 'clamp(20px, 4vh, 48px) 0 0' }}>{OUTRO.credit}, {META.members}</p>
        </div>
        {!narrow ? (
          <div data-rv style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px, 1.4vw, 28px)' }}>
            <img src="/shots/shortage.png" alt="" style={{ width: '68%', aspectRatio: '1.6', objectFit: 'cover', borderRadius: 14, boxShadow: shadow.lg }} />
            <div style={{ width: '24%', aspectRatio: '0.5', borderRadius: 24, overflow: 'hidden', boxShadow: shadow.lg }}>
              <img src="/shots/helper.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          </div>
        ) : null}
      </div>
    </Slide>
  );
}

export const RENDERERS = {
  cover: Cover, summary: Summary, process: Process, incident: Incident, yeongnam: Yeongnam, region: Region, grades: Grades,
  desk: Desk, stakeholders: Stakeholders, empathize: Empathize, define: Define, gaps: Gaps, journey: Journey, ideate: Ideate,
  blueprint: Blueprint, ai: Ai, 'proto-intake': Proto, 'proto-shortage': Proto, 'proto-map': Proto, 'proto-roster': Proto,
  'proto-dispatch': Proto, 'proto-helper': Proto, data: Data, scenarios: Scenarios, 'design-system': DesignSystem,
  evaluate: Evaluate, lessons: Lessons, outro: Outro,
};

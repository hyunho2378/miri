// 섹션 공용 조각. 전 섹션이 같이 쓴다.
// Eyebrow: 전 섹션 공용 아이브로우. 레드 원 + 영문/국문 스택. 개별 하드코딩 금지.
// Badge: 필 배지. filled면 red 채움.
// StepDots: 서브 진행 표시. 활성만 red.
// GlassRim: 유리 림 보더.

import { colors, typography, motion, inkA, whiteA } from '../tokens.js';

// 유리 림 라이트. 위쪽이 진하고 아래로 옅어지는 그라디언트를 mask로 뚫어 링만 남긴다.
// **border-image나 두 겹 background-clip 트릭이 아니다.** 링이 반투명이라
// 그 트릭을 쓰면 아래 레이어가 원 전체로 비친다(컨셉 섹션에서 실측으로 확인한 함정).
// 라이트 반전: 흰 림은 안 보이므로 잉크 파생으로 바꿔 옅은 다크 링으로 읽히게 한다.
export const GLASS_RING = {
  background: `linear-gradient(160deg, ${inkA(0.28)}, ${inkA(0.06)} 55%, ${inkA(0.14)})`,
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  maskComposite: 'exclude',
  pointerEvents: 'none',
};

/** 원 위에 얹는 유리 림 한 겹. inset 0으로 부모를 덮는다. */
export function GlassRim({ width = 1.2 }) {
  return (
    <span
      aria-hidden="true"
      style={{ ...GLASS_RING, position: 'absolute', inset: 0, borderRadius: '50%', padding: width }}
    />
  );
}

/**
 * 전 섹션 공용 아이브로우 v2 (DESIGN 4절, BRAND_REBOOT_PLAN 2.2). **개별 하드코딩 아이브로우를 두지 않는다.**
 *
 * **불릿 원(레드 점)을 없앴다.** 원이 지던 존재감을 크기가 대신 진다.
 * 영문 위 국문 아래 스택은 유지한다. 국문이 없으면 단일 라벨로 뜬다.
 *
 * **크기와 굵기는 tokens.eyebrow가 쥔다(21px 700 고정, brand와 정합).**
 * 700인 것은 취향이 아니라 대비 요건이다. red 아이브로우가 4.02:1이라 21px가 대형(굵기 700)으로
 * 인정돼야 기준 3.0으로 통과한다. 굵기를 낮추거나 크기를 줄이면 그 순간 미달로 돌아간다.
 *
 * **라이트 반전: 전역은 잉크 단색이다.** 영문 tone 기본이 red에서 ink로 바뀌었다(브랜드 레드 전역 금지).
 * 네이비 등 슬라이드 고유 액센트가 필요하면 호출부가 tone으로 넘긴다(컬러 시스템만 해당).
 *
 * @param {string} en 영문 라벨(필수)
 * @param {string} [ko] 국문 라벨. 없으면 단일 라벨
 * @param {string} [tone] 영문 라벨 색. 기본 ink
 */
export function Eyebrow({ en, ko, tone = colors.text.primary, onDark = false }) {
  const base = {
    // 아이브로우는 Pretendard(본문 SUIT와 분리). tokens.eyebrow.family가 단일 원천.
    fontFamily: typography.eyebrow.family,
    fontSize: typography.eyebrow.size,
    fontWeight: typography.eyebrow.weight,
    letterSpacing: typography.eyebrow.tracking,
    lineHeight: typography.eyebrow.leading,
    whiteSpace: 'nowrap',
  };
  // 다크(네이비) 배경 슬라이드에서는 국문도 흰색으로(기본은 잉크).
  const koColor = onDark ? colors.white : colors.text.primary;
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ ...base, color: tone }}>{en}</span>
      {ko ? <span style={{ ...base, color: koColor }}>{ko}</span> : null}
    </span>
  );
}

/**
 * **전 슬라이드 공용 2단 헤더(PV3).** 컬러 시스템 슬라이드 구조를 그대로 옮긴 단일 틀이다.
 * 좌측 열에 아이브로우(auto 폭), 우측 열에 헤드라인+서브. 두 열 top 정렬, gap는 컬러 시스템 실측값.
 * **콘텐츠는 이 헤더 아래(또는 섹션이 절대배치로) 흐른다.** 슬라이드마다 헤더를 다시 짜지 않는다.
 *
 * @param {{en:string, ko?:string, tone?:string}} eyebrow 아이브로우 라벨
 * @param {string|string[]|React.ReactNode} headline 헤드라인. 문자열/배열이면 줄 단위, 노드면 그대로
 * @param {string|string[]} [sub] 서브 문장(들)
 * @param {string} [headlineColor] 헤드라인 색(기본 잉크; onDark면 흰색)
 * @param {boolean} [onDark] 다크(네이비) 배경 슬라이드. 아이브로우/헤드라인/서브를 흰 계열로.
 * @param {object} [rightStyle] 우측 열에 얹는 스타일(유파 포커스 페이드 등)
 */
export function SlideHeader({ eyebrow, headline, sub, headlineColor, onDark = false, rightStyle }) {
  const hColor = headlineColor || (onDark ? colors.white : colors.text.primary);
  const subColor = onDark ? whiteA(0.82) : colors.text.secondary;
  const ebTone = onDark ? colors.white : eyebrow.tone;
  const isText = typeof headline === 'string' || (Array.isArray(headline) && headline.every((h) => typeof h === 'string'));
  const headNode = isText
    ? (Array.isArray(headline) ? headline : [headline]).map((h, i) => (
        <span key={i} style={{ display: 'block' }}>{h}</span>
      ))
    : headline;
  const subs = sub == null ? [] : Array.isArray(sub) ? sub : [sub];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(16px, 4vw, 96px)', flexShrink: 0 }}>
      <div style={{ flex: '0 0 auto' }}>
        <Eyebrow en={eyebrow.en} ko={eyebrow.ko} tone={ebTone} onDark={onDark} />
      </div>
      <div style={{ flex: '1 1 auto', minWidth: 0, ...rightStyle }}>
        <h2
          style={{
            margin: 0,
            fontFamily: typography.family,
            fontSize: typography.headline.size,
            fontWeight: typography.headline.weight,
            letterSpacing: typography.headline.tracking,
            lineHeight: 1.5,
            color: hColor,
          }}
        >
          {headNode}
        </h2>
        {subs.map((line, i) => (
          <p
            key={i}
            style={{
              // 헤드라인↔본문(과 본문 줄 사이) 일관 간격. 너무 붙지도 벌어지지도 않게.
              margin: 'clamp(10px, 1.6vh, 20px) 0 0',
              fontFamily: typography.family,
              fontSize: typography.body.size,
              fontWeight: typography.body.weight,
              lineHeight: typography.body.leading,
              color: subColor,
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function Badge({ text, filled }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 16px',
        borderRadius: 999,
        fontFamily: typography.family,
        fontSize: 'clamp(0.66rem, 1vw, 0.8rem)',
        fontWeight: 700,
        letterSpacing: '0.2em',
        color: filled ? colors.text.onFill : colors.text.secondary,
        // filled면 네이비 프라이머리 채움 + 밝은 글자(유파 활성 배지), 아니면 잉크 아웃라인.
        background: filled ? colors.navy : colors.surface.pill,
        boxShadow: filled ? 'none' : `inset 0 0 0 1px ${colors.line.strong}`,
      }}
    >
      {text}
    </span>
  );
}

export function StepDots({ count, active, onDark = false }) {
  const on = onDark ? colors.white : colors.ink;
  const off = onDark ? whiteA(0.35) : colors.line.strong;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 'clamp(22px, 3.6vh, 44px)',
        zIndex: 6,
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={{
            width: i === active ? 22 : 8,
            height: 3,
            borderRadius: 999,
            // 활성만 강조. onDark면 흰 계열.
            background: i === active ? on : off,
            boxShadow: 'none',
            transition: `width 300ms ${motion.easeOut}, background-color 300ms ease`,
          }}
        />
      ))}
    </div>
  );
}

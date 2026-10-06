// 미리 케이스 스터디 토큰. 값은 미리 서비스(client/src/tokens.js)의 KRDS 전사값을 그대로 쓴다.
// 원칙
// 1. 유채색은 파랑(KRDS primary)과 빨강(KRDS point) 두 가지. 빨강은 부족, 미이송, 원문 불일치 수치에만 쓴다.
// 2. 보더를 쓰지 않는다. 면 구분은 바탕색(gray 5)과 흰 카드, 그림자 한 단계로만 한다(미리 무보더 원칙).
// 3. 서체는 Pretendard GOV, 굵기는 400과 700 두 가지. 글자색은 gray 70보다 옅게 쓰지 않는다.
// 4. 위계는 강릉페이 PPT를 따른다. 파란 영문 아이브로우 위, 명사형 헤드라인 아래.
//    크기는 PPT(1920 기준 아이브로우 32, 헤드라인 45)와 강릉페이 웹(헤드라인 최대 54) 사이로 잡았다.

export const krds = {
  gray: { 0: '#ffffff', 5: '#f4f5f6', 10: '#e6e8ea', 20: '#cdd1d5', 30: '#b1b8be', 40: '#8a949e', 50: '#6d7882', 60: '#58616a', 70: '#464c53', 80: '#33363d', 90: '#1e2124', 95: '#131416' },
  primary: { 5: '#ecf2fe', 10: '#d8e5fd', 20: '#b1cefb', 30: '#86aff9', 40: '#4c87f6', 50: '#256ef4', 60: '#0b50d0', 70: '#083891' },
  point: { 5: '#fbeff0', 10: '#f5d6d9', 50: '#d63d4a', 60: '#ab2b36' },
};

const g = krds.gray;
const p = krds.primary;
const r = krds.point;

export const c = {
  bg: g[5],
  card: g[0],
  ink: g[90],
  body: g[80],
  sub: g[70],
  primary: p[50],
  primaryDeep: p[60],
  primarySoft: p[5],
  primaryTint: p[10],
  primaryMid: p[20],
  alert: r[50],
  alertSoft: r[5],
  muted: g[10],
  barIdle: g[30],
  white: g[0],
};

export const shadow = {
  sm: '0 2px 10px rgba(20,23,46,0.07)',
  md: '0 8px 28px rgba(20,23,46,0.12)',
  lg: '0 24px 60px rgba(20,23,46,0.16)',
};

export const font = "'Pretendard GOV Variable', 'Pretendard GOV', 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif";

// 400과 700만 쓴다
export const t = {
  eyebrow: { fontSize: 'clamp(14px, 0.9vw + 6px, 24px)', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.3, color: c.primary, textTransform: 'uppercase' },
  headline: { fontSize: 'clamp(24px, 1.9vw + 10px, 48px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.3, color: c.ink, wordBreak: 'keep-all' },
  lead: { fontSize: 'clamp(15px, 0.55vw + 9px, 22px)', fontWeight: 400, lineHeight: 1.6, color: c.sub, wordBreak: 'keep-all' },
  title: { fontSize: 'clamp(17px, 0.7vw + 9px, 27px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.35, color: c.ink, wordBreak: 'keep-all' },
  body: { fontSize: 'clamp(14px, 0.45vw + 9px, 20px)', fontWeight: 400, lineHeight: 1.6, color: c.body, wordBreak: 'keep-all' },
  bodyBold: { fontSize: 'clamp(14px, 0.45vw + 9px, 20px)', fontWeight: 700, lineHeight: 1.5, color: c.ink, wordBreak: 'keep-all' },
  label: { fontSize: 'clamp(13px, 0.35vw + 8px, 17px)', fontWeight: 700, lineHeight: 1.4, color: c.primary, letterSpacing: '0.01em' },
  note: { fontSize: 'clamp(12px, 0.3vw + 8px, 16px)', fontWeight: 400, lineHeight: 1.55, color: c.sub, wordBreak: 'keep-all' },
  num: { fontSize: 'clamp(34px, 3.4vw + 6px, 80px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: c.primary, fontVariantNumeric: 'tabular-nums' },
  numSm: { fontSize: 'clamp(26px, 2vw + 6px, 52px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: c.primary, fontVariantNumeric: 'tabular-nums' },
};

export const space = {
  x: 'clamp(20px, 4.2vw, 96px)',
  top: 'clamp(28px, 6.4vh, 80px)',
  bottom: 'clamp(56px, 9vh, 100px)',
  gap: 'clamp(12px, 1.4vw, 28px)',
  radius: 'clamp(12px, 1.1vw, 20px)',
  radiusSm: 'clamp(8px, 0.7vw, 12px)',
};

export const ease = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  gsapOut: 'power3.out',
};

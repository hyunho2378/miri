// 미리 케이스 스터디. VORTEX presentation-v2 팔레트를 그대로 옮기고 액센트만 미리(KRDS) 파랑과 빨강으로 바꿨다.
// presentation-v2 팔레트 v2. **다크 → 라이트 반전.** 배경 #F6F6F6 + 잉크 #101010이 전역 기준이다.
// 전 섹션(S1~)이 이 팔레트를 공유한다. 값 수정은 여기서만. shared/tokens.js와는 별개다.
//
// **브랜드 레드/블랙과 미드나잇 네이비는 컬러 시스템 슬라이드 안에서만 쓴다(견본 내용).**
// 다른 슬라이드에 액센트로 칠하지 않는다. 전역은 잉크 단색이다.
//
// **생블랙(#000000)과 생화이트(#FFFFFF)를 텍스트 색으로 쓰지 않는다.** 전경은 ink(#101010),
// 밝은 파생은 white(#FDFDFD)에서 나온다. 예외는 메탈릭 그라디언트의 하이라이트 스톱 하나뿐이다.

// 전경 잉크의 채널. 흑 계열 텍스트/선 값은 전부 여기서 파생한다. 하드코딩을 막는 유일한 통로다.
const INK_RGB = '16, 16, 16';
// 배경 채널. 사진 위 라이트 스크림 등 배경색을 알파로 깔 때 쓴다.
const BG_RGB = '246, 246, 246';
// 밝은 파생 채널. red 채움 위 흰 글자, 실버 하이라이트 등 라이트 위에서 드물게 쓴다.
const WHITE_RGB = '253, 253, 253';
// 다크 스크림 채널(#111A26). 디자인 키워드 카드의 사진 위 가독 그라디언트 전용.
// **브랜드 네이비(#263E5F, 컬러 시스템 전용)와 다른**, 사진 위 흰 텍스트를 받치는 어두운 네이비다.
const SCRIM_RGB = '17, 26, 38';

/** ink에서 알파만 바꿔 파생시킨다. 예: inkA(0.5) */
export const inkA = (a) => `rgba(${INK_RGB}, ${a})`;
/** bg에서 알파만 바꿔 파생시킨다. 사진 위 라이트 스크림 전용. 예: bgA(0.8) */
export const bgA = (a) => `rgba(${BG_RGB}, ${a})`;
/** white에서 알파만 바꿔 파생시킨다. 예: whiteA(0.5) */
export const whiteA = (a) => `rgba(${WHITE_RGB}, ${a})`;
/** 다크 네이비 스크림에서 알파만 바꿔 파생시킨다. 키워드 카드 사진 위 가독 그라디언트 전용. 예: scrimA(0.9) */
export const scrimA = (a) => `rgba(${SCRIM_RGB}, ${a})`;

export const colors = {
  // ── 전역 기준 두 색 ────────────────────────────────────────────────
  bg: '#F6F6F6', // 페이지 배경 기준(전 슬라이드). 생화이트 아님
  raised: '#FFFFFF', // 라이트 위 살짝 뜬 카드 면(카드/플레이스홀더)
  ink: '#101010', // 전경 기준(텍스트, 선 파생 원천). 생블랙 아님

  // ── 컬러 시스템 견본 전용(다른 슬라이드 금지) ────────────────────────
  black: '#101010', // 잉크 리터럴. 컬러 시스템 Primary 견본과 그라디언트 스톱에서 값으로 쓴다
  deep: '#0A0A0A',
  navy: '#256EF4', // 미리 액센트(KRDS primary 50). 원래 VORTEX 네이비 자리. 아이브로우 영문, 번호, 강조 숫자, 코치마크.
  accent: '#256EF4',
  accentSoft: '#D8E5FD',
  // 부족, 위험, 미이송 수치에만 쓰는 빨강(KRDS point 50). 다른 강조에 쓰지 않는다
  alert: '#D63D4A',
  alertSoft: '#FBEFF0',
  // 원래 VORTEX 네이비 설명: 컬러 시스템 견본 + 전역 액센트(아이브로우/아이콘/숫자/버튼).
  red: '#E60D15', // **브랜딩 레드. 컬러 시스템 견본 전용.** 전역 액센트로 쓰지 않는다
  redDeep: '#80070C', // 브랜드 그라디언트의 어두운 레드 스톱
  redGlow: 'rgba(230, 13, 21, 0.45)',

  white: '#FDFDFD', // red 채움 위 글자, 실버 하이라이트 파생. 생화이트 아님

  // 실버 화이트 메탈릭. 워드마크/검/HUD 재질 표현 전용. 라이트 위에서는 잘 안 보이므로 아껴 쓴다.
  // hi의 #FFFFFF는 **그라디언트 하이라이트 스톱 예외**다. 텍스트 색으로 직접 쓰지 않는다.
  silver: {
    hi: '#FFFFFF',
    mid: '#D8E2F0',
    shadow: '#6E7B92',
    gradient: 'linear-gradient(175deg, #FFFFFF 0%, #D8E2F0 45%, #6E7B92 78%, #D8E2F0 100%)',
  },

  // 흑 계열 텍스트. 전부 ink에서 파생한다.
  text: {
    primary: '#101010',
    secondary: inkA(0.72),
    dim: inkA(0.5),
    faint: inkA(0.34),
    onFill: '#FDFDFD', // red 채움 위 텍스트(컬러 시스템 견본에서만)
  },

  // 보더와 구분선과 표면. 같은 ink에서 파생한다.
  line: {
    default: inkA(0.14),
    strong: inkA(0.28),
    faint: inkA(0.08),
    hairline: inkA(0.05),
  },
  surface: {
    glass: inkA(0.03),
    pill: inkA(0.05),
  },

  // 궤적: 내 검 실버-시안, 상대 레드(arena 소유 색 규칙 유지). 데모 섹션 캔버스 전용.
  trail: {
    self: '#A9DFFF',
    selfGlow: 'rgba(169, 223, 255, 0.4)',
    opponent: '#FF3B4E',
    opponentGlow: 'rgba(255, 59, 78, 0.4)',
  },
};

// 브랜드 그라디언트. 컬러 시스템 섹션이 이 값과 아래 스톱 배열을 그대로 진열한다.
export const brandGradient =
  `linear-gradient(105deg, ${colors.white} 0%, ${colors.red} 42%, ${colors.redDeep} 72%, ${colors.black} 100%)`;

// 위 그라디언트의 스톱을 순서대로. 컬러 시스템의 Color1~4 라벨이 이 배열에서 값을 읽는다.
export const brandGradientStops = [colors.white, colors.red, colors.redDeep, colors.black];

// **새 색 체계(컬러 시스템 견본 전용). 브랜딩 네이비 / 브랜딩 실버 두 그라디언트.**
// 이 슬라이드는 색 견본이 내용이라 여기서만 네이비/실버가 보인다(전역 라이트 규칙과 별개).
export const brandNavyGradient = 'linear-gradient(150deg, #101925 0%, #3C5E8B 100%)';
export const brandNavyStops = ['#101925', '#3C5E8B'];
export const brandSilverGradient = 'linear-gradient(150deg, #FDFDFD 0%, #C4C4C4 100%)';
export const brandSilverStops = ['#FDFDFD', '#C4C4C4'];

/** '#E60D15' → '230, 13, 21'. 컬러 시스템이 RGB 표기를 토큰에서 유도하게 하는 유일한 통로. */
export const hexToRgbText = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

// ── 전역 그리드 (컬러 시스템 슬라이드 실측 기준) ──────────────────────────
// 컬러 시스템 슬라이드의 실제 마진을 재서 뽑았다(1920x1080에서 좌우 60px, 상단 78px, 하단 59px).
// **전 슬라이드가 이 그리드를 공통으로 쓴다.** 페이지마다 다른 마진을 두지 않는다.
// 아이브로우는 항상 좌상단(marginX, marginTop)에 앉고 헤드라인은 그 오른쪽 또는 아래 일관된 자리에 온다.
export const grid = {
  marginX: 'clamp(16px, 3.13vw, 76px)', // 좌우 마진(1920에서 60px)
  marginTop: 'clamp(28px, 7.2vh, 78px)', // 상단, 아이브로우 top(1080에서 78px)
  marginBottom: 'clamp(20px, 5.5vh, 60px)', // 하단(1080에서 59px)
};

// ── 폰트 ─────────────────────────────────────────────────────────────
// 본문 설명은 SUIT, 아이브로우는 Pretendard. 두 웹폰트는 index.html에서 로드한다.
// fallback으로 시스템 한글 스택을 끝에 둔다(웹폰트 미로드 시에도 읽힌다).
const BODY_STACK =
  "'SUIT Variable', SUIT, 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
const EYEBROW_STACK =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";

// **본문 body와 아이브로우 eyebrow를 분리한다.** 확정: body = SUIT, eyebrow = Pretendard.
// display(제목)는 아직 미정이라 Pretendard 계열을 유지한다. 참조처는 S1/S3 컨셉명뿐.
export const fontFamily = {
  body: BODY_STACK,
  eyebrow: EYEBROW_STACK,
  display: EYEBROW_STACK,
};

export const typography = {
  // 본문 계열(SUIT). 기존 typography.family 참조가 그대로 본문 폰트를 가리키게 유지한다.
  family: fontFamily.body,
  // 디스플레이(제목) 계열. 미정이라 아이브로우와 같은 Pretendard 계열.
  displayFamily: fontFamily.display,
  fontFamily,

  // ── 역할별 타이포 스케일 (PV2, 전 슬라이드 단일) ─────────────────────────
  // **슬라이드마다 크기를 다시 적지 않는다.** 아래 role 하나씩만 참조한다.
  // 기준은 컬러 시스템 슬라이드(그리드 기준 슬라이드)의 실측값이다. 절제된 크기 + 굵기/여백 위계.
  //   1440에서 headline 19.4 / body 15 / caption 13.5, eyebrow 21. 헤드라인과 본문 차이를 크게 안 벌린다.
  // 아이브로우 v2. 21px 700 고정(반응형 clamp 금지 사유는 DESIGN 4절). 색은 잉크 단색.
  eyebrow: { size: '1.3125rem', weight: 700, tracking: '0.06em', leading: 1.25, family: fontFamily.eyebrow },
  // 헤드라인. 전 슬라이드 설명형 문장이 이 하나를 쓴다(컬러 시스템 헤드라인과 동일 clamp).
  headline: { size: 'clamp(0.92rem, 1.35vw, 1.5rem)', weight: 700, tracking: '-0.02em', leading: 1.4 },
  // 본문. 헤드라인 아래 설명, 카드 본문, 인용 등(컬러 시스템 서브와 동일 clamp).
  body: { size: 'clamp(0.72rem, 1.04vw, 1.16rem)', weight: 400, tracking: '0em', leading: 1.65 },
  // 캡션. 소형 라벨, 카드 부라벨, HEX/RGB 등(컬러 시스템 라벨과 동일 clamp).
  caption: { size: 'clamp(0.62rem, 0.94vw, 1.05rem)', weight: 400, tracking: '0.01em', leading: 1.6 },
  // 디스플레이. 대형 워드마크(컨셉/네이밍 VORTEX, 데모 ENTER)만. 셋을 한 크기로 통일한다.
  display: { size: 'clamp(2.6rem, 9.4vw, 8.6rem)', weight: 300, tracking: '0.005em', leading: 1 },
};

export const motion = {
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)', // 진입, 이탈
  easeInOut: 'cubic-bezier(0.77, 0, 0.175, 1)', // 화면 내 이동
  // GSAP 문자열 이즈. 위 CSS 곡선과 같은 성격으로 맞춘다(GSAP은 cubic-bezier 문자열을 안 받는다).
  gsapOut: 'power3.out',
  gsapInOut: 'power2.inOut',
  budget: {
    targetFps: 60,
    minFps: 30,
    dprCap: 2, // 전 캔버스 공통 DPR 상한
  },
};

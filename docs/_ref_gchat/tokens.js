// tokens.js G-Chat 디자인 토큰 단일 출처
// tailwind.config.js가 이 파일을 import한다. 컴포넌트는 Tailwind 클래스로만 쓴다.
// 이 파일 밖에서 hex와 px를 직접 쓰지 않는다. DESIGN.md와 값이 다르면 여기가 맞다.

export const colors = {
  page: '#FFFFFF',
  canvas: '#F5F7FA',
  mute: '#F0F2F5',
  subtle: '#F8F9FB',

  text: {
    pri: '#101010',
    sec: '#3D3F45',
    meta: '#6B6F76',
    ter: '#9A9EA5',
    inverse: '#FFFFFF'
  },

  primary: {
    DEFAULT: '#2563EB',
    hover: '#1D4ED8',
    soft: '#EFF6FF',
    line: '#BFDBFE',
    text: '#1E40AF'
  },

  line: {
    sub: '#ECEEF1',
    def: '#DDE1E6',
    strong: '#C5CAD1'
  },

  success: { DEFAULT: '#16A34A', soft: '#F0FDF4', text: '#166534' },
  warning: { DEFAULT: '#D97706', soft: '#FFFBEB', text: '#92400E' },
  danger:  { DEFAULT: '#DC2626', soft: '#FEF2F2', text: '#991B1B' },
  info:    { DEFAULT: '#2563EB', soft: '#EFF6FF', text: '#1E40AF' },

  chart: {
    1: '#2563EB',
    2: '#93C5FD',
    3: '#DBEAFE',
    4: '#C5CAD1'
  }
}

// prefers-contrast: more 에서 교체하는 값. index.css @media 에서 CSS 변수로 덮는다
export const contrastOverrides = {
  'line-sub': colors.line.def,
  'text-meta': colors.text.sec
}

// 타이포. index.css @layer components 의 .type-* 클래스가 이 값을 그대로 쓴다
export const typography = {
  display: { size: 'clamp(28px, 2vw + 20px, 40px)', weight: 700, tracking: '-0.03em', leading: 1.15 },
  h1:      { size: 'clamp(22px, 1vw + 18px, 30px)', weight: 700, tracking: '-0.02em', leading: 1.2 },
  h2:      { size: 'clamp(18px, 0.5vw + 16px, 22px)', weight: 600, tracking: '-0.02em', leading: 1.25 },
  h3:      { size: 'clamp(16px, 0.3vw + 15px, 18px)', weight: 700, tracking: '-0.015em', leading: 1.3 },
  kpi:     { size: 'clamp(26px, 1.2vw + 20px, 36px)', weight: 700, tracking: '-0.02em', leading: 1.1 },
  body:    { size: 'clamp(15px, 0.2vw + 14px, 17px)', weight: 400, tracking: '-0.01em', leading: 1.7 },
  bodySm:  { size: 'clamp(13px, 0.15vw + 12.5px, 14px)', weight: 400, tracking: '-0.005em', leading: 1.55 },
  caption: { size: 'clamp(11px, 0.1vw + 10.5px, 12px)', weight: 500, tracking: '0', leading: 1.4 },
  meta:    { size: '12px', weight: 400, tracking: '0.01em', leading: 1.4 }
}

export const spacing = {
  0.5: '2px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px',
  8: '32px', 10: '40px', 12: '48px', 14: '56px', 16: '64px', 20: '80px', 24: '96px',
  // 레이아웃 고정 치수
  nav: '64px',
  'nav-m': '56px',
  topbar: '56px',
  sidebar: '240px',
  rail: '64px',
  'chat-rail': '56px',
  'source-col': '340px',
  'source-col-md': '320px'
}

export const radius = {
  none: '0',
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px'
}

export const shadow = {
  none: 'none',
  card: '0 0 0 1px rgba(16,16,16,0.06)',
  float: '0 4px 12px -2px rgba(16,16,16,0.10), 0 12px 32px -8px rgba(16,16,16,0.16)'
}

export const screens = {
  xs: '320px',
  sm: '390px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
  '3xl': '1920px',
  '4xl': '2560px',
  '5xl': '3840px'
}

export const layout = {
  pageMax: '1400px',
  wideMax: '1600px',
  chatMax: '1140px',
  composerMax: '680px',
  textMax: '720px',
  // 페이지 좌우 패딩. Tailwind 클래스 px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16
  pagePx: { xs: 16, md: 24, lg: 32, xl: 40, '3xl': 64 }
}

export const motion = {
  duration: { fast: '120ms', base: '200ms', enter: '240ms', page: '320ms' },
  easing: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    standard: 'cubic-bezier(0.2, 0, 0, 1)'
  },
  press: 'scale(0.97)',
  skeleton: { duration: '1.4s', from: colors.line.def, to: colors.text.ter }
}

export const zIndex = {
  base: '0',
  raised: '10',
  nav: '40',
  dropdown: '50',
  drawer: '60',
  modal: '70',
  toast: '80'
}

export const icon = {
  sizes: [16, 20, 24, 32, 48],
  stroke: 1.75
}

import { colors, spacing, radius, shadow, screens, zIndex, layout, motion } from './src/tokens.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens,
    extend: {
      fontFamily: { pretendard: ['"Pretendard Variable"', '"Pretendard"'] },
      colors,
      spacing,
      borderRadius: radius,
      // DESIGN_DELTA.md 변경 3. card 와 float 는 기존 컴포넌트가 쓰는 이름이라 sm/lg 별칭으로 남긴다
      boxShadow: { ...shadow, card: shadow.sm, float: shadow.lg },
      zIndex,
      maxWidth: {
        page: layout.pageMax,
        wide: layout.wideMax,
        chat: layout.chatMax,
        composer: layout.composerMax,
        text: layout.textMax
      },
      transitionDuration: motion.duration,
      // DESIGN.md 모션 표 이름(ease-out / ease-in-out / ease-drawer / ease-spring)
      transitionTimingFunction: {
        out: motion.easing.out,
        'in-out': motion.easing.inOut,
        drawer: motion.easing.drawer,
        spring: motion.easing.spring
      }
    }
  },
  plugins: []
}

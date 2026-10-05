// mapTheme.js 지도 바탕 스타일 주소와 겹침 레이어 색. 색은 전부 tokens.js 에서 가져온다(hex 직접 입력 금지).
// 바탕 타일: OpenFreeMap(키 불필요, OpenMapTiles 스키마, 저작권 OpenStreetMap 기여자). 2026. 10. 6. 응답 200 확인
import { colors } from '../../tokens.js'

export const STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  fallback: 'https://tiles.openfreemap.org/styles/liberty'
}

// 부족분 단계 색. 0 은 중립 회색, 1~4 는 heatDanger. 단계 기준은 lib/geo.js SEVERITY_STEPS
export const SEVERITY_COLOR = [
  colors.chart[4],
  colors.chart.heatDanger[1],
  colors.chart.heatDanger[2],
  colors.chart.heatDanger[3],
  colors.chart.heatDanger[4]
]
// 범례 견본 Tailwind 클래스(같은 순서). 색만으로 구분하지 않도록 범례에 수치 구간 글자를 같이 쓴다
export const SEVERITY_SWATCH = ['bg-chart-4', 'bg-chart-heatDanger-1', 'bg-chart-heatDanger-2', 'bg-chart-heatDanger-3', 'bg-chart-heatDanger-4']

export const OVERLAY = {
  light: {
    dongLine: colors.chart[4],
    cityLine: colors.text.sec,
    label: colors.text.sec,
    halo: colors.page,
    fire: colors.warning.DEFAULT,
    vehicle: colors.primary.DEFAULT,
    vehicleOff: colors.text.meta,
    shelter: colors.success.DEFAULT,
    stroke: colors.page,
    highlight: colors.primary.DEFAULT
  },
  dark: {
    dongLine: colors.text.meta,
    cityLine: colors.text.ter,
    label: colors.line.def,
    halo: colors.text.pri,
    fire: colors.warning.DEFAULT,
    vehicle: colors.primary.line,
    vehicleOff: colors.text.ter,
    shelter: colors.success.DEFAULT,
    stroke: colors.text.pri,
    highlight: colors.primary.line
  }
}

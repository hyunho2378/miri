// regions/data.js 현재 지역(REGION)의 자료를 예전 이름 그대로 내보낸다.
// 화면과 계산 모듈은 mock/donghaeData.js 대신 이 파일을 읽어 지역이 바뀌어도 같은 코드로 돈다.
import { REGION } from './index.js'

export const {
  DATA_SOURCES, DONG_STATS, LTC, VILLAGES, TEMP_SHELTERS, LTC_RESIDENTIAL, LTC_DAYCARE, DONG_CENTERS, SENIOR_CENTERS, ALLOC
} = REGION.data
export const REGION_BBOX_2D = REGION.map.bbox
export const REGION_CENTER = REGION.map.center
export const REGION_OUTLINE = REGION.map.outline
export const REGION_DONG_GEO = REGION.map.dongGeo
export const VILLAGE_TERRAIN = REGION.terrain
export const ROAD_ROUTES = REGION.roads
export const REGION_NAME = REGION.name
export const REGION_SHORT = REGION.shortName
export const ORG = REGION.org
export { REGION }

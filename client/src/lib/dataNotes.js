// dataNotes.js 자료 안내. 화면마다 쓰던 출처, 기준일, 계산 가정, 시연 자료 설명을 한 곳에 모은다.
// 화면에는 담당자가 할 일과 결과만 두고, 이 내용은 설정의 '자료 안내'와 상단 '시연 데이터' 표지에서 연다.
import { rosterBreakdown, rosterSourceText, DISABLED_NOTE } from './rosterCount.js'
import { VEHICLE_NOTE } from './shortage.js'
import { DATA_SOURCES } from '../mock/donghaeData.js'

export const DATA_NOTES = [
  { key: 'demo', title: '시연 자료', text: '마을과 대피소와 건물은 실제 위치, 대상자 개인과 차량은 가상입니다. 대상자 수는 장기요양 재가 수급자 2025년 통계, 명부는 시연용 자료입니다. 계산 규칙 1.2판(2026. 10. 20.).' },
  { key: 'roster', title: '대상자 명부', text: '이름 없이 대상자 코드로 표시합니다. 마지막 확인이 빨간 글자면 90일이 지났거나 기록이 없어 재확인이 필요합니다.' },
  { key: 'rosterScope', title: '명부에 아직 없는 대상', text: DISABLED_NOTE },
  { key: 'vehicles', title: '차량 운영 규칙', text: `${VEHICLE_NOTE}. 차종별 회차당 정원은 협의 전 가정값입니다. 협약 만료는 명부 기준일로 판정합니다.` },
  { key: 'boarding', title: '탑승과 하차 시간', text: '왕복 시간은 편도 주행 시간의 두 배에 탑승과 하차 시간을 더해 셉니다. 장애인 단체 자문에 따르면 숙련자는 휠체어 특장차 탑승과 안전벨트 착용을 5분 안에 마칩니다.' },
  { key: 'assembly', title: '집결지와 대피소', text: `집결지는 각 법정동 경로당 가운데 분포 중심에 가까운 곳입니다(${DATA_SOURCES.seniorCenters.org}). 대피소는 집결지에서 도로 주행 시간이 가장 짧은 임시주거시설이며, 확산 시나리오에서는 대피 대상 구역 밖 시설로 바뀝니다.` },
  { key: 'shelters', title: '이재민 임시주거시설', text: `${DATA_SOURCES.shelters.org} 공개 목록, ${DATA_SOURCES.shelters.period}. 수용 가능 인원은 시설 전체 기준이며 대상자에게 모두 쓸 수 있다고 가정합니다.` },
  { key: 'scenario', title: '확산 시나리오', text: '발화 지점과 확산 속도는 기본 시나리오 가정값입니다. 차량 위치는 기관 조사 전 가정이며 소속 동 행정복지센터 둘레에 둡니다.' },
  { key: 'sources', title: '데이터 출처', text: '실제 공개 자료와 가정값을 나눠 적습니다. 대상자 개인, 차량 수량, 도우미 배치는 가정입니다.' }
]

// 명부 구성 설명 문장(자료 안내에서 숫자를 함께 보일 때)
export const rosterNote = (persons) => rosterSourceText(rosterBreakdown(persons))

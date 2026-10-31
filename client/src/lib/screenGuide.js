// 화면 안내 패널의 내용. 화면(경로)마다 README 구조로 쓴다.
// 1단계 제목(화면 이름), 2단계 소제목 세 개(하는 일, 눈여겨볼 곳, 다음에 갈 곳), 3단계 항목 줄.
// 항목은 한 줄에 한 사실, 개조식 명사형. 단추와 영역 이름은 화면에 있는 글자를 그대로 쓴다.
// 코치마크 투어가 있는 화면은 패널 아래 '화면 투어 시작' 단추가 보인다(tours.js 의 경로와 같다).

export const SECTIONS = ['이 화면에서 하는 일', '눈여겨볼 곳', '다음에 갈 곳']

export const GUIDES = {
  '/console': {
    title: '현황판',
    does: [
      '기준 배정 시 이동 불가 인원 확인',
      '대피 대상부터 협약 후까지 단계별 인원 확인',
      '처리할 일 목록 확인과 해당 화면 이동'
    ],
    look: [
      '상단 상태 띠: 기한 초과 우려와 협약 차량 확보 필요',
      '마을별 이동 불가 인원 막대와 이송 등급 선택',
      '이동 불가 발생 마을 목록, 선택 시 마을 상세',
      '오늘 산불 여건: 산불위험지수, 기상특보, 바람과 습도'
    ],
    next: [
      { text: '부족분 계산: 조건별 이동 불가 인원', to: '/console/shortage' },
      { text: '차량과 도우미: 협약 차량 확인', to: '/console/resources' },
      { text: '상황판: 지도에서 보기', to: '/console/map' }
    ]
  },
  '/console/shortage': {
    title: '부족분 계산',
    does: [
      '확산 조건별 이동 불가 인원 확인',
      '기준 배정과 추천 배정 결과 비교',
      '0명이 되는 협약 차량 구성 확인'
    ],
    look: [
      '확산 조건: 조건 선택과 계산 조건 변경',
      '조건별 이동 불가 인원 표',
      '계산 근거',
      '계산 조건 저장과 비교'
    ],
    next: [
      { text: '협약 차량 확인: 차량과 도우미', to: '/console/resources' },
      { text: '협약 추진 기안: 문서 센터', to: '/console/workspace?kind=doc&new=gian-simple' },
      { text: '발령 운영: 훈련 발령', to: '/console/dispatch' }
    ]
  },
  '/console/dispatch': {
    title: '발령 운영',
    does: [
      '발령 개시부터 이송 진행까지 4단계 진행',
      '추천 배정 계산과 배정표 보내기',
      '도우미 응답과 이송 단계별 인원 확인'
    ],
    look: [
      '발령 기준과 현재 단계의 다음 행동 단추',
      '자동 진행과 훈련 속도',
      '도우미 응답, 미배정, 이송 실패 인원',
      '소방 인계 대상'
    ],
    next: [
      { text: '소방 인계: 전달 기록', to: '/console/handover' },
      { text: '이송 기록: 끝난 발령 확인', to: '/console/records' },
      { text: '상황판: 지도에서 진행 보기', to: '/console/map' }
    ]
  },
  '/console/handover': {
    title: '소방 인계',
    does: [
      '기한 안에 옮기지 못하는 인원 목록 확인',
      '소방 인계 대상 선택 후 소방 인계'
    ],
    look: [
      '소방 인계 대상 목록',
      '발령 전 예상 인원',
      '전달 기록'
    ],
    next: [
      { text: '발령 운영: 진행 중인 발령', to: '/console/dispatch' },
      { text: '부족분 계산: 이동 불가 원인', to: '/console/shortage' }
    ]
  },
  '/console/intake': {
    title: '서류 읽기',
    does: [
      '서류 사진 올리기와 AI 읽기',
      '읽은 결과를 원본과 대조해 확정',
      '확인된 이송 등급의 명부 반영'
    ],
    look: [
      '서류 읽기 단계 표시',
      '확인 대기 목록과 선택한 서류',
      '원본 서류, 근거 문구, 이송 등급, 특이사항 대조',
      '탑승 메모(선택)'
    ],
    next: [
      { text: '현장 소식: 전해 들은 말 읽기', to: '/console/notes' },
      { text: '대상자 명부: 반영 결과 확인', to: '/console/roster' }
    ]
  },
  '/console/notes': {
    title: '현장 소식',
    does: [
      '요양보호사, 이장, 가족이 전한 말 받기',
      'AI 제안과 근거를 보고 명부 반영 또는 반영 안 함',
      '거동 변화의 명부 반영'
    ],
    look: [
      '소식 받기와 소식 입력 방법',
      '전해 들은 말 입력, 예시 읽기',
      '소식을 전한 사람과 대상자',
      '확인 대기 목록과 선택한 소식'
    ],
    next: [
      { text: '서류 읽기: 서류 사진', to: '/console/intake' },
      { text: '대상자 명부: 바뀐 등급 확인', to: '/console/roster' }
    ]
  },
  '/console/roster': {
    title: '대상자 명부',
    does: [
      '대상자 목록 조회와 필터',
      '이송 등급과 서류 근거 확인',
      '돌봄과 접근 정보 수정과 저장'
    ],
    look: [
      '마을, 동, 보기 필터',
      '선택한 대상자: 이송 등급, 서류 근거',
      '돌봄과 접근',
      '마지막 확인 시점과 등급 확인'
    ],
    next: [
      { text: '서류 읽기: 확인 대기 서류', to: '/console/intake' },
      { text: '차량과 도우미: 배정 자원', to: '/console/resources' }
    ]
  },
  '/console/map': {
    title: '상황판',
    does: [
      '지도에서 확산 범위와 마을 상황 확인',
      '시간 축으로 도달 시각 확인'
    ],
    look: [
      '지도와 바탕 선택',
      '확산 조건',
      '시간 축',
      '레이어와 범례',
      '상황 요약 접기와 펼치기'
    ],
    next: [
      { text: '발령 운영: 훈련 발령', to: '/console/dispatch' },
      { text: '현황판: 숫자로 보기', to: '/console' }
    ]
  },
  '/console/resources': {
    title: '차량과 도우미',
    does: [
      '차량, 도우미, 대피소 목록 조회',
      '협약 확정과 미확정 차량 구분',
      '항목 추가, 수정, 삭제'
    ],
    look: [
      '차량 목록',
      '도우미 목록',
      '대피소 목록',
      '보기 필터'
    ],
    next: [
      { text: '부족분 계산: 필요한 협약 대수', to: '/console/shortage' },
      { text: '발령 운영: 배정표 보내기', to: '/console/dispatch' }
    ]
  },
  '/console/records': {
    title: '이송 기록',
    does: [
      '끝난 발령 기록 조회',
      '마을별 미완료 추이 확인'
    ],
    look: [
      '발령 기록 목록',
      '마을별 미완료 추이'
    ],
    next: [
      { text: '발령 운영: 새 발령', to: '/console/dispatch' },
      { text: '현황판: 오늘 현황', to: '/console' }
    ]
  },
  '/console/settings': {
    title: '운영 기준',
    does: [
      '계산 기준과 확인 알림 기준 조정',
      '마을, 지정 대피소, 사용자와 역할 확인'
    ],
    look: [
      '계산 기준: 이송 완료 기한, 준비 시간, 탑승과 하차 시간',
      '확인 알림 기준: 서류 확인 지연 알림, 협약 만료 임박 기준',
      '마을과 지정 대피소',
      '사용자와 역할, 기관 정보',
      '데이터 출처와 자료 안내'
    ],
    next: [
      { text: '부족분 계산: 기준 반영 결과', to: '/console/shortage' },
      { text: '현황판: 오늘 현황', to: '/console' }
    ]
  },
  '/console/workspace': {
    title: '문서 센터',
    does: [
      '서식 종류별 문서 조회',
      '새 문서 작성과 사본 만들기',
      '협약 추진 기안 작성'
    ],
    look: [
      '서식 종류와 종류 필터',
      '문서 목록, 사본 만들기, 삭제'
    ],
    next: [
      { text: '부족분 계산: 기안에 들어갈 숫자', to: '/console/shortage' },
      { text: '현황판: 오늘 현황', to: '/console' }
    ]
  }
}

// 경로에 맞는 안내를 찾는다. 하위 경로(이송 기록 상세, 문서 편집 등)는 가장 긴 상위 경로의 안내를 쓴다.
export function guideFor(pathname) {
  if (GUIDES[pathname]) return { path: pathname, ...GUIDES[pathname] }
  const hit = Object.keys(GUIDES)
    .filter((p) => p !== '/console' && pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return hit ? { path: hit, ...GUIDES[hit] } : null
}

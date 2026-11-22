// 미리 케이스 스터디 v3 문구. 플러스엑스 T Universe 상세 페이지의 장 순서와 글 분량을 그대로 따른다.
// 장 머리: 영문 대문자 라벨, 제목 한두 줄, 본문 두세 줄. 숫자는 상세기획서와 같은 값만 쓴다.

export const LINKS = {
  service: 'https://miri-indol.vercel.app',
  mobile: 'https://miri-indol.vercel.app/m/h/demo',
  figma: 'https://www.figma.com/design/aWTIYw8qx594JnY9EHZYr1/-Civic-Tech--Miri-Wildfire-Evacuation_DS?node-id=13-2',
};

export const OVERVIEW = {
  badge: 'Overview',
  title: ['We arrange a helper and a ride', 'for every neighbor who cannot walk', 'before the wildfire arrives'],
  sub: [
    '미리는 산불이 났을 때 혼자 걷기 어려운 주민을 옮겨 줄 도우미와 차를 평소에 약속해 두는 동해시 재난 이송 서비스입니다.',
    '시와 동 재난 담당자는 컴퓨터에서, 도우미와 현장 담당자는 휴대폰에서 같은 계획을 봅니다.',
  ],
};

export const CONTEXT = {
  badge: 'Context',
  title: ['2022년 3월 5일 새벽', '불은 네 시간 만에 동해 마을에 닿았습니다'],
  sub: ['강릉 옥계에서 시작된 산불이 동해시 망상동까지 번졌고, 담당 공무원이 직접 뛰어다니며 주민을 대피시켰습니다.'],
  src: '출처: 연합뉴스, 뉴스핌 보도(2022. 3. 5.)',
  rows: [
    { time: '01:08', text: '강릉시 옥계면 남양리 발화', w: 0.26 },
    { time: '05:10', text: '동해시 망상동 만우마을 도달', w: 1 },
    { time: '아침', text: '요양원 입소자 포함 주민 228명 대피', w: 0.62 },
  ],
  badgeText: '4시간 2분',
};

export const INTERVIEW = {
  badge: 'Field Interview',
  title: ['동해의 재난 담당과 돌봄 현장을', '직접 찾아갔습니다'],
  sub: ['망상동 행정복지센터와 노인종합복지관을 찾아가 면담했고 시청 안전과 서면 답변과 현직 소방관 인터뷰를 더했습니다.'],
  words: ['Mangsang', 'Welfare', 'City Hall'],
  chats: [
    '지정을 해서 그분들 대피하게끔 구조를 만들어 놨어요',
    '연락이 안되면 더 이상 할 방도가 없죠',
    '공무원들만 할 수 있는 훈련 수준이니까',
  ],
  keywords: ['도우미', '차량', '명단', '연락', '훈련', '소방', '동의', '약속'],
};

export const RESEARCH = {
  badge: 'User Research',
  title: ['계획서에는 정해져 있었지만', '실제로 움직인 기록은 없었습니다'],
  cards: [
    { kind: 'q', user: '망상동 재난 담당', title: '“막 발로 뛰면서 대피 먼저 시켰으니까 그때는 이런 체계가 없었어요”' },
    { kind: 'p', src: '/v3/photo-mangsang.webp', user: '2026. 10. 26.', title: '망상동 행정복지센터 재난 담당 면담' },
    { kind: 'q', user: '동해시청 안전과', title: '“지방정부의 일방적인 지정으로 실제 운용효과를 이룰 수 있을지 가능성이 높지 않다고 판단됨”' },
    { kind: 'p', src: '/v3/photo-welfare.webp', user: '2026. 10. 26.', title: '노인종합복지관 사회복지사 면담' },
    { kind: 'q', user: '망상동 재난 담당', title: '“구성은 되어있지만 그런 경우는 생각을 안 해봤어요”' },
    { kind: 'q', user: '노인종합복지관 사회복지사', title: '“저희 대상자 아니고 저희 가족 아니에요. 그러니까 저희가 도와줄 이유는 없어요”' },
  ],
};

export const MAP = {
  badge: 'Stakeholder Map',
  title: ['이해관계자 지도'],
  hub: '동 재난\n담당자',
  nodes: [
    { id: 'fire', name: '동해소방서', icon: 'flame' },
    { id: 'safe', name: '시 안전과', icon: 'landmark' },
    { id: 'traf', name: '시 교통과', icon: 'bus' },
    { id: 'tong', name: '통장과 반장', icon: 'users' },
    { id: 'taxi', name: '택시와 운송조합', icon: 'car' },
    { id: 'resi', name: '거동 불편 주민', icon: 'accessibility' },
    { id: 'care', name: '요양보호사와 생활지원사', icon: 'heart' },
    { id: 'welf', name: '복지관과 유케어센터', icon: 'building' },
  ],
};

export const DEFINE = {
  badge: 'Define',
  title: ['도와줄 사람과 차는 이미 정해져 있었지만', '그날 올지는 불이 난 뒤에야 알게 됩니다'],
  sub: ['그래서 화면보다 먼저 사람과 기관이 평소에 맺는 약속 네 가지를 설계했습니다.'],
  boxes: [
    { eng: 'CONSENT', t: '도우미 본인의 약속', s: '할 수 있는 도움을 직접 고르고 동의합니다. 불이 난 날 한 번 더 수락해야 배정이 확정됩니다.' },
    { eng: 'CONTRACT', t: '차의 약속', s: '시 안전과와 교통과가 택시 운송조합과 평소에 승용차 협약을 맺습니다.' },
    { eng: 'CONDITION', t: '몸 상태 소식', s: '요양보호사와 생활지원사가 아는 변화가 복지관을 거쳐 동 담당자에게 닿습니다.' },
    { eng: 'HANDOVER', t: '소방에 미리 넘기기', s: '끝내 옮기지 못할 분은 불이 닿기 전에 위치와 함께 소방에 넘깁니다.' },
  ],
};

export const INSIGHT = {
  side: ['FROM', 'FIELD', '', 'TO', 'MIRI'],
  big: ['BEFORE', 'THE FIRE'],
  circles: ['Helper', 'Officer', 'Car', 'Fire'],
  circlesEnd: 'Miri',
  circlesSub: '도우미와 담당자, 차와 소방이 같은 계획을 불이 나기 전에 나눠 봅니다.',
};

export const UI = {
  badge: 'UI Elements',
  fontName: 'Pretendard GOV',
  fontNote: '공공 서비스 화면 글꼴',
  colors: [
    { name: 'Miri Blue', hex: '#1E6EF4', on: '#fff' },
    { name: 'Deep Blue', hex: '#005BC1', on: '#fff' },
    { name: 'Alert Red', hex: '#BA1A1A', on: '#fff' },
    { name: 'Black & White', hex: '#111114', on: '#fff', pair: '#FFFFFF' },
  ],
  icons: ['house', 'file-text', 'users', 'map', 'car', 'bell', 'flame', 'clipboard-check', 'phone', 'shield', 'calendar', 'accessibility', 'bus', 'send', 'settings'],
};

export const CONSOLE = {
  badge: 'Web Console',
  title: ['See Today\u2019s Gap'],
  sub: ['시와 동 재난 담당자가 매일 여는 현황판입니다. 아래 화면은 서비스와 같은 코드로 움직여 메뉴와 버튼을 직접 눌러 볼 수 있습니다.'],
  screens: [
    { id: '01', route: '/console', name: '현황판', cap: '오늘 옮기지 못하는 사람과 처리할 일' },
    { id: '10', route: '/console/map', name: '상황판', cap: '산불 확산 가정 위 마을별 인원' },
    { id: '05', route: '/console/roster', name: '대상자 명부', cap: '마지막 확인 날짜와 돌봄 접근' },
    { id: '06', route: '/console/resources', name: '차량과 도우미', cap: '약속된 차와 확인 전 차' },
    { id: '02', route: '/console/shortage', name: '부족분 계산', cap: '승용차 협약 대수별 이동 불가 인원' },
    { id: '03', route: '/console/intake', name: '서류 읽기', cap: 'AI 판독 초안과 담당자 승인' },
    { id: '07', route: '/console/dispatch', name: '발령 운영', cap: '훈련 발령과 배정 기준' },
    { id: '08', route: '/console/handover', name: '소방 인계', cap: '기한 전에 넘기는 목록' },
  ],
};

export const MOBILE = {
  badge: 'Helper Mobile',
  title: ['Answer on the Day'],
  sub: ['불이 난 날 도우미 휴대폰에 배정 알림이 옵니다. 수락하면 배정이 확정되고 불가를 누르면 다음 도우미에게 넘어갑니다.'],
  steps: ['참여 동의', '배정 알림', '지금 차례'],
  relayTitle: '10분 동안 답이 없으면\n다음 도우미에게',
  relay: ['도우미 1  응답 없음', '도우미 2  수락'],
  handTitle: '끝내 옮기지 못할 분은\n불이 닿기 전에 소방으로',
};

export const AI = {
  badge: 'AI Reading',
  title: ['AI Reads, People Decide'],
  sub: ['동마다 서식이 다른 종이 서류와 현장 전화를 AI가 읽고, 담당자가 원문과 대조해 승인해야 명단에 들어갑니다. 계산과 배정은 정해진 규칙으로 처리합니다.'],
  items: [
    { k: '서류 읽기', v: '시험 서류 40명 가운데 35명을 찾았습니다' },
    { k: '등급 판정', v: '찾은 35명 가운데 31명이 정답과 같았습니다' },
    { k: '안전 기준', v: '실제보다 낮은 등급으로 판정한 사람은 없었습니다' },
    { k: '개인정보', v: '언어 모델로 보낸 개인정보 문자열은 없었습니다' },
  ],
  src: '산출: 개인정보 없이 만든 시험 서류 15장 40명을 5번씩 판독해 정답지와 대조',
};

export const SHORTAGE = {
  badge: 'Shortage',
  title: ['Count the Gap', 'Before the Fire'],
  sub: ['막대를 움직이면 서비스와 같은 계산 코드가 마을마다 다시 계산합니다. 시연 명부 기준입니다.'],
  max: 30,
  ticks: [0, 5, 10, 15, 20, 25, 30],
  label: '더 약속하는 승용차',
  result: '기한 안에 옮기지 못하는 사람',
  say: (cars, v) => (cars === 0 ? `지금 차량만으로는 ${v}명을 기한 안에 옮기지 못합니다.` : v === 0 ? `승용차 ${cars}대를 더 약속하면 모두 옮길 수 있습니다.` : `승용차 ${cars}대를 더 약속해도 ${v}명이 남습니다.`),
};

export const CARS = {
  badge: 'Promised Cars',
  title: ['Prioritized by', 'Who Rides First'],
  sub: ['차종별 정원과 침상, 리프트 여부로 누가 어느 차에 먼저 타야 하는지 정합니다.'],
  cards: [
    { name: '침상 승합차', sub: '누워서 이동', c: '#1E6EF4' },
    { name: '리프트 승합차', sub: '휠체어 탑승', c: '#FFFFFF', dark: true },
    { name: '승합차', sub: '보조 보행', c: '#BA1A1A' },
    { name: '협약 승용차', sub: '부축 이동', c: '#005BC1' },
  ],
  screens: ['06', '07', '08'],
};

export const DELIVER = {
  badge: 'Deliver',
  title: ['실제 담당자와 현장이', '같은 화면을 써 봅니다'],
  sub: ['담당자 화면과 도우미 휴대폰을 실제 사람이 과업 네 가지로 써 보고 성공 여부와 걸린 시간, 막힌 곳을 기록합니다.'],
  tasks: [
    { role: '담당자', t: '서류 확인으로 이송 등급 확정' },
    { role: '담당자', t: '부족한 차량 확인과 훈련 발령' },
    { role: '도우미', t: '휴대폰으로 배정 수락과 현장 보고' },
    { role: '담당자', t: '소방 인계 문서 받아 보기' },
  ],
  changed: [
    { who: '동해시청 안전과', what: '요청해야 쓰는 차량을 확인 전 차량으로 따로 계산' },
    { who: '망상동 행정복지센터', what: '대체 도우미도 없으면 다음 할 일을 고르는 화면' },
    { who: '노인종합복지관', what: '수락한 도우미에게만 보이는 탑승 메모' },
    { who: '파주소방서 소방관', what: '소방 인계 목록에 급한 순서와 동호수, 층' },
    { who: '한림대학교 방기석 교수', what: '배정 알림의 수락과 불가, 10분 무응답이면 교체' },
    { who: '강원대학교 최충익 교수', what: '야간과 휴일, 평일 낮을 나눠 계산' },
  ],
};

export const AWARD = {
  badge: 'Award',
  title: ['2026 AI 디지털 기반', '사회문제 해결 챌린지'],
  rows: [
    { k: '부문', v: '서비스 개발' },
    { k: '결과', v: '본선 진출 7팀 선정, 수상 확정' },
    { k: '본선 발표', v: '2026. 12. 2.(수) NIA 서울사무소' },
    { k: '시상식', v: '2026. 12. 15.(화) COEX' },
  ],
};

export const CREDITS = {
  name: '미리',
  sub: '동해시 재난취약자 사전 이송 서비스',
  team: 'Team Oasis',
  people: ['주현호', '허준희', '김서환', '김채린'],
  course: '한림대학교 서비스 디자인 2026',
  links: [
    { label: '서비스 열기', href: LINKS.service },
    { label: '휴대폰 체험', href: LINKS.mobile },
    { label: '디자인 시스템', href: LINKS.figma },
  ],
};

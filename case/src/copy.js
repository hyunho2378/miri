// 미리 케이스 스터디 문구. 화면 문구의 단일 원천이다.
// 규칙: 한다체, 명사형 라벨, 줄표와 가운데점과 느낌표 금지. 수치는 기준과 출처를 붙인다.
// 하지 않은 조사와 평가는 "진행 예정", 쓰지 않은 회고는 "작성 예정"으로 둔다. 지어낸 인사이트를 넣지 않는다.

export const META = {
  service: '미리',
  serviceEn: 'MIRI',
  oneLine: '동해시 재난취약자 사전 이송 배정 서비스',
  team: 'Team 오아시스',
  members: ['주현호', '허준희', '김서환', '김채린', '김민준'],
  course: '2026-2 서비스디자인',
  school: '한림대학교',
  live: 'https://miri-indol.vercel.app',
  repo: 'https://github.com/hyunho2378/miri',
};

// 챕터. 더블 다이아몬드 네 단계에 앞뒤 두 장을 붙였다.
export const CHAPTERS = [
  { id: 'intro', en: 'Intro', ko: '개요' },
  { id: 'discover', en: 'Discover', ko: '발견' },
  { id: 'define', en: 'Define', ko: '정의' },
  { id: 'develop', en: 'Develop', ko: '개발' },
  { id: 'deliver', en: 'Deliver', ko: '전달' },
  { id: 'outro', en: 'Outro', ko: '마무리' },
];

// 슬라이드 목록. id로 렌더러를 고른다. 순서를 바꿔도 id만 맞으면 된다.
export const SECTION_LABELS = [
  { id: 'cover', chapter: 'intro', en: 'Case Study', ko: '표지' },
  { id: 'summary', chapter: 'intro', en: 'Summary', ko: '주제 요약' },
  { id: 'process', chapter: 'intro', en: 'Process', ko: '진행 과정' },
  { id: 'incident', chapter: 'discover', en: 'Background', ko: '배경 1, 2022 동해 산불' },
  { id: 'yeongnam', chapter: 'discover', en: 'Background', ko: '배경 2, 2025 영남 산불' },
  { id: 'region', chapter: 'discover', en: 'Region', ko: '동해시 고령화' },
  { id: 'grades', chapter: 'discover', en: 'Target', ko: '이송 대상' },
  { id: 'desk', chapter: 'discover', en: 'Desk Research', ko: '기존 서비스 조사' },
  { id: 'stakeholders', chapter: 'discover', en: 'Stakeholders', ko: '이해관계자' },
  { id: 'empathize', chapter: 'discover', en: 'Empathize', ko: '현장 조사' },
  { id: 'define', chapter: 'define', en: 'Problem', ko: '문제 정의' },
  { id: 'gaps', chapter: 'define', en: 'Service Gaps', ko: '서비스 공백' },
  { id: 'journey', chapter: 'define', en: 'Journey', ko: '여정 비교' },
  { id: 'ideate', chapter: 'develop', en: 'Ideate', ko: '아이디어 발전' },
  { id: 'blueprint', chapter: 'develop', en: 'Blueprint', ko: '서비스 흐름' },
  { id: 'ai', chapter: 'develop', en: 'AI', ko: 'AI 적용' },
  { id: 'proto-intake', chapter: 'develop', en: 'Prototype 1', ko: '서류 읽기' },
  { id: 'proto-shortage', chapter: 'develop', en: 'Prototype 2', ko: '부족분 계산' },
  { id: 'proto-map', chapter: 'develop', en: 'Prototype 3', ko: '상황판' },
  { id: 'proto-roster', chapter: 'develop', en: 'Prototype 4', ko: '대상자 명부' },
  { id: 'proto-dispatch', chapter: 'develop', en: 'Prototype 5', ko: '발령 운영' },
  { id: 'proto-helper', chapter: 'develop', en: 'Prototype 6', ko: '도우미 화면' },
  { id: 'data', chapter: 'deliver', en: 'Open Data', ko: '공공데이터' },
  { id: 'scenarios', chapter: 'deliver', en: 'Result', ko: '시나리오 결과' },
  { id: 'design-system', chapter: 'deliver', en: 'Design System', ko: '디자인 시스템' },
  { id: 'evaluate', chapter: 'deliver', en: 'Evaluate', ko: '사용성 평가' },
  { id: 'lessons', chapter: 'outro', en: 'Lessons Learned', ko: '배운 점' },
  { id: 'outro', chapter: 'outro', en: 'Thank you', ko: '링크' },
];

export const COVER = {
  kicker: '2026-2 서비스디자인 텀 프로젝트',
  title: '미리',
  titleEn: 'MIRI',
  sub: '동해시 재난취약자 사전 이송 배정 서비스',
  note: '산불이 마을에 닿기 전에 누구를 어떤 차로 옮길지 평시에 정해 둔다',
};

export const SUMMARY = {
  headline: '대피 알림은 있지만 거동이 불편한 사람을 옮길 차와 사람은 미리 정해져 있지 않다',
  sub: [
    '미리는 동해시 재난 담당자가 쓰는 웹 서비스다. 종이 대피계획서를 AI로 읽어 이송 등급 명부를 만들고, 산불 확산 가정에 따라 마을별로 옮기지 못하는 인원을 계산하고, 발령 때 차량과 도우미와 대상자를 묶어 보낸다.',
  ],
  stats: [
    { value: '2,005', unit: '명', label: '동해시 장기요양 재가 수급자', basis: '국민건강보험공단 노인장기요양보험통계, 2025년' },
    { value: '37', unit: '곳', label: '마을(법정동) 단위 계산', basis: '동해시 법정동, 행정동 10곳' },
    { value: '11', unit: '종', label: '연결한 공개 자료', basis: 'KOSIS, 국민재난안전포털, 기상청 등' },
  ],
  features: [
    { no: '01', title: '서류 읽기', img: '/shots/intake.png', pos: '64% 62%', desc: '대피계획서 사진에서 거동 상태 문구를 찾아 이송 등급 초안과 근거 문구를 만든다. 담당자가 원문과 대조해 확인한다.' },
    { no: '02', title: '부족분 계산', img: '/shots/shortage.png', pos: '28% 36%', desc: '확산 속도와 방향 가정으로 마을 도달 시각을 구하고, 그 안에 옮기지 못하는 인원과 필요한 추가 차량을 낸다.' },
    { no: '03', title: '배정과 전달', img: '/shots/helper.png', pos: '50% 22%', desc: '침상부터 도보 순으로 차량과 도우미를 묶고, 옮기지 못한 사람 목록을 소방에 넘긴다.' },
  ],
};

export const PROCESS = {
  headline: '더블 다이아몬드 네 단계로 진행했다. 현장 조사와 사용성 평가는 아직 남아 있다',
  phases: [
    { en: 'Discover', ko: '발견', items: ['사고 기록과 정책 자료 조사', '동해시 공개 통계 수집', '기존 서비스 비교'], pending: ['담당자 인터뷰'] },
    { en: 'Define', ko: '정의', items: ['문제 정의', '서비스 블루프린트 공백 도출', '현재와 도입 후 여정 비교'], pending: [] },
    { en: 'Develop', ko: '개발', items: ['아이디어 발전', 'AI 서류 판독 설계', '웹 프로토타입 구현'], pending: [] },
    { en: 'Deliver', ko: '전달', items: ['실제 공개 데이터 연결', '시나리오 계산'], pending: ['사용성 평가', '전시'] },
  ],
};

export const INCIDENT = {
  headline: '2022년 3월 강릉 옥계에서 난 산불은 네 시간 만에 동해시 망상동에 닿았다',
  sub: ['동해시 안에서도 요양원 두 곳을 포함해 주민이 대피했다. 불이 시 경계를 넘는 데 걸린 시간이 이송을 준비할 수 있는 시간의 상한이었다.'],
  events: [
    { time: '01:20', title: '강릉시 옥계면 남양리 발화', src: '연합뉴스, 2022. 3. 5.' },
    { time: '05:30', title: '동해시 망상동까지 확산', src: '연합뉴스, 2022. 3. 5.' },
    { time: '당일', title: '동해노인요양원, 이레요양원 등 228명 대피', src: '뉴스핌, 2022. 3. 5.' },
  ],
};

export const YEONGNAM = {
  headline: '2025년 영남 산불 사망자 30명 중 28명이 60대 이상이었다',
  sub: ['정부는 혼자 대피하기 어려운 사람에게 조력자를 미리 지정하라고 했고, 한 달 뒤 재난취약자를 8시간 전에 대피시키는 체계를 지자체에 제시했다.'],
  facts: [
    { value: '28', unit: '/30명', label: '사망자 중 60대 이상', src: '한국경제, 2025. 3. 31.(행정안전부, 산림청 집계 인용)' },
    { value: '8.2', unit: 'km/h', label: '의성 산불 확산 속도', src: '국가산림위성정보활용센터 분석, 2025. 3. 27.' },
    { value: '3', unit: '명', label: '와상 입소자를 태운 차량 대피 중 사망', src: '경향신문, 2025. 3. 27.' },
    { value: '8', unit: '시간 전', label: '재난취약자 대피 기한', src: '행정안전부 초고속 산불 대비 주민대피 체계 개선방안, 2025. 4. 16.' },
  ],
  quote: { text: '혼자 대피가 어려운 노약자, 장애인 등에 대해서는 조력자를 미리 지정하고 산불 위험징후가 보일 때 함께 대피하도록 미리 준비하라', src: '중앙재난안전대책본부 6차 회의, 안전저널 2025. 3. 27.' },
};

export const REGION = {
  headline: '동해시 주민 네 명 중 한 명 이상이 65세 이상이고, 산과 맞닿은 동일수록 비율이 높다',
  sub: ['65세 이상 23,590명, 주민등록인구의 27.6%다. 행정동 10곳 중 발한동, 묵호동, 삼화동, 망상동은 45% 안팎이다.'],
  basis: '주민등록인구 2026년 9월, 행정안전부(KOSIS DT_1B04005N). 행정동별 65세 이상 비율',
  bars: [
    { label: '발한동', value: 50.5 },
    { label: '묵호동', value: 48.5 },
    { label: '삼화동', value: 46.2 },
    { label: '망상동', value: 44.9 },
    { label: '부곡동', value: 41.8 },
    { label: '송정동', value: 38.5 },
    { label: '동호동', value: 34.6 },
    { label: '천곡동', value: 24.0 },
    { label: '북평동', value: 23.6 },
    { label: '북삼동', value: 18.7 },
  ],
  total: { value: '27.6', label: '동해시 전체' },
};

export const GRADES = {
  headline: '집에서 장기요양을 받는 2,005명을 이송 방법에 따라 네 등급으로 나눴다',
  sub: ['장기요양 등급은 이송 방법을 직접 알려 주지 않는다. 1등급은 침상, 2등급은 휠체어, 3등급과 4등급은 부축, 5등급과 인지지원등급은 도보로 대응한 것은 팀 가정이며, 서류 읽기로 사람마다 바로잡는다.'],
  basis: '재가 수급자 = 급여이용수급자 2,668명 중 시설급여 663명 제외. 국민건강보험공단 노인장기요양보험통계 2025년(KOSIS DT_35006_N030)',
  map: [
    { from: '1등급', n: '73', to: '침상' },
    { from: '2등급', n: '150', to: '휠체어' },
    { from: '3등급, 4등급', n: '593 + 867', to: '부축' },
    { from: '5등급, 인지지원등급', n: '289 + 33', to: '도보' },
  ],
  bars: [
    { label: '침상', value: 73, need: '구급차 또는 침상 승합차' },
    { label: '휠체어', value: 150, need: '리프트 승합차, 도우미 2명' },
    { label: '부축', value: 1460, need: '승용차, 도우미 1명' },
    { label: '도보', value: 322, need: '버스 또는 승용차, 인솔 1명' },
  ],
};

export const DESK = {
  headline: '기존 서비스는 알리거나 사람을 지정하는 데서 멈춘다. 기한 안에 옮길 수 있는지는 아무도 계산하지 않는다',
  cols: ['구분', '기존 서비스', '하는 일', '하지 않는 일'],
  rows: [
    ['알림', '재난문자, 안전디딤돌', '위험과 대피 장소 안내', '거동 불편자 이송'],
    ['사전 등록', '119안심콜', '병력과 보호자 정보를 미리 등록해 출동 때 참고', '재난 전 이송 배정'],
    ['사람 지정', '제주 대피 도우미, 충남 안전 파트너', '취약자 곁의 조력자 지정', '기한 안 이송 가능 여부 판단'],
    ['종이 계획', '산불 취약 특수보호시설 대피계획 가이드라인', '시설별 대피 계획 작성', '재가 거주자, 차량 부족 계산'],
    ['자원 관리', '재난관리자원 통합관리시스템(KRMS)', '장비와 물자 현황 관리', '취약자 개인별 차량 배정'],
    ['해외', '일본 NEC 피난 행동 지원 서비스', '개별 피난 계획을 디지털로 작성하고, 재난 때 지원자에게 요청을 보내 안부를 모은다', '시간 제약 계산과 부족분 산정'],
  ],
  note: 'NEC는 NEC 보도자료 2023. 8. 28. 기준. 나머지 행은 팀 기획 자료 기준이며 세부 기능 대조는 진행 예정',
};

export const STAKEHOLDERS = {
  headline: '여섯 주체가 화면 안팎에서 정보와 책임을 주고받는다',
  center: { title: '시 재난 담당자', role: '주사용자. 명부 확인, 부족분 계산, 발령' },
  nodes: [
    { title: '동 행정복지센터', role: '대피계획서를 받아 사진으로 올린다', on: true },
    { title: '대피 도우미', role: '휴대폰으로 배정을 받고 도착을 알린다', on: true },
    { title: '요양시설 관리자', role: '입소자 대피와 차량 상황을 공유한다', on: false },
    { title: '재난취약자와 보호자', role: '조작 없이 도움을 받는다', on: false },
    { title: '동해소방서', role: '옮기지 못한 사람 목록을 넘겨받는다', on: false },
    { title: '데이터 제공 기관', role: '산림청, 기상청, 국민건강보험공단, 행정안전부', on: false },
  ],
  legend: ['화면을 직접 쓰는 주체', '화면 밖에서 주고받는 주체'],
};

export const EMPATHIZE = {
  headline: '현장 조사는 동해시 담당자와 도우미를 만나는 순서로 진행한다',
  status: '진행 예정',
  plan: [
    { who: '동해시 재난안전 담당자', how: '심층 인터뷰', ask: '발령 때 차량을 어떻게 구하는지, 명부는 어디에 어떤 형태로 있는지', check: '부족분 계산, 발령 운영' },
    { who: '동 행정복지센터 복지 담당', how: '심층 인터뷰', ask: '대피계획서와 대피카드를 누가 쓰고 어떻게 보관하는지', check: '서류 읽기 1단계' },
    { who: '요양보호사, 사회복지사', how: '인터뷰', ask: '거동 상태를 누가 어떤 말로 기록하는지', check: '서류 읽기 등급 판정' },
    { who: '동해소방서', how: '인터뷰', ask: '옮기지 못한 사람 목록을 어떤 형식으로 받아야 쓸 수 있는지', check: '소방 인계' },
  ],
  note: '조사 결과와 인사이트는 조사를 마친 뒤 이 장에 채운다',
};

export const DEFINE = {
  headline: '재난 알림 체계는 갖춰졌지만 이송 체계는 비어 있다',
  problem: '거동이 불편한 사람은 알림을 받아도 차와 사람이 와야 대피할 수 있다. 그런데 대피 기한 안에 차와 사람이 충분한지 계산하는 도구가 없다.',
  hmw: '동해시 담당자가 산불 전에 마을별로 옮기지 못할 인원을 알고, 발령 때 바로 배정하게 하려면 어떻게 해야 할까',
  split: [
    { k: '의료시설 부족', v: '병상과 진료의 문제', on: false },
    { k: '이송 자원 부족', v: '차량, 도우미, 시간의 문제', on: true },
  ],
};

export const GAPS = {
  headline: '기능을 화면으로 옮기면서 사람 사이의 빈 곳 네 군데가 드러났다',
  items: [
    { no: '01', title: '도착 확인이 없다', desc: '배정표를 보내면 서비스가 끝나는 구조였다. 도우미의 도착과 이송 성공 여부를 되받는 접점을 넣었다.', done: '도우미 화면 도착 보고' },
    { no: '02', title: '등급을 누가 정하는지 모른다', desc: '명부가 이미 네 등급으로 정리돼 있다는 보장이 없다. 대피계획서를 읽어 등급 초안을 만드는 서류 읽기를 주 기능으로 올렸다.', done: '서류 읽기 메뉴' },
    { no: '03', title: '도우미 경험이 없다', desc: '도우미가 누구인지, 거절하거나 겹치면 어떻게 되는지가 없었다. 담당 마을과 등급을 가진 도우미 모델을 만들었다.', done: '차량과 도우미 화면' },
    { no: '04', title: '대상자가 언제 아는지 모른다', desc: '낯선 사람이 갑자기 오면 거부할 수 있다. 평시에 먼저 연락할 사람을 정하는 기능은 다음 단계로 둔다.', done: '진행 예정' },
  ],
};

export const JOURNEY = {
  headline: '담당자의 하루는 전화로 차를 찾는 일에서 숫자를 확인하는 일로 바뀐다',
  stages: ['평시', '확산 예측', '발령', '이송', '사후'],
  now: ['명부가 종이와 파일로 흩어져 있다', '화재를 알고 나서 상황을 파악한다', '전화로 가용 차량을 수소문한다', '즉석 판단으로 배정한다', '사후에야 옮기지 못한 사람을 안다'],
  after: ['서류를 읽어 등급 명부를 만든다', '마을별 부족분을 미리 본다', '도달 시각 순으로 발령 기한을 본다', '침상부터 자동 배정해 도우미에게 보낸다', '옮기지 못한 사람 목록을 바로 소방에 넘긴다'],
  note: '현재 여정은 팀 기획 자료 기준. 담당자 인터뷰로 확인 진행 예정',
};

export const IDEATE = {
  headline: '처음 세 기능에서 시작해, 공백을 메우면서 서류 읽기를 중심에 두었다',
  versions: [
    { v: 'v1', title: '기획서', items: ['부족분 계산기', '8시간 시계', '배정표'], note: '공모전 계획서 단계' },
    { v: 'v2', title: '블루프린트 점검', items: ['도우미 도착 보고', '소방 인계 목록', '이송 등급 판정 주체 정의'], note: '서비스 공백 반영' },
    { v: 'v3', title: '실제 데이터', items: ['동해시 마을 37곳', '실제 대피소와 도로 시간', '산불 확산 가정 시나리오'], note: '공개 데이터 연결' },
    { v: 'v4', title: '현재', items: ['서류 읽기를 주 메뉴로', '명부 지도와 서식 출력', '오늘 예보 바람으로 다시 계산'], note: '실제 관리 프로그램 조사 반영' },
  ],
  methods: { title: '아이디어 발상 기법', status: '작성 예정' },
};

export const BLUEPRINT = {
  headline: '평시부터 사후까지 다섯 단계에서 화면 앞과 뒤가 맞물린다',
  stages: ['평시', '확산 예측', '발령', '이송 실행', '사후'],
  lanes: [
    { name: '대상자와 보호자', cells: ['', '', '', '도우미와 차량 도착', ''] },
    { name: '화면 앞', cells: ['서류 읽기, 부족분 확인', '상황판, 발령 기한', '발령 준비, 배정 전송', '도우미 휴대폰 배정표', '이송 기록'] },
    { name: '화면 뒤', cells: ['명부와 차량 입력, 계산', '기상특보와 바람 수신', '침상부터 도보 순 배정', '도착 보고 집계', '미이송자 소방 인계'] },
  ],
  ai: [0],
};

export const AI = {
  headline: 'AI는 서류를 읽는 한 곳에만 쓰고, 읽은 근거를 원문과 대조해 담당자가 확정한다',
  steps: [
    { no: '01', title: '서류 올리기', who: '동 담당자', desc: '대피계획서나 대피카드를 찍거나 스캔해 올린다' },
    { no: '02', title: '문구 찾기', who: 'Gemini 2.5 Flash', desc: '거동 상태 문구를 찾아 이송 등급 초안과 근거 문구를 만든다. 이름과 연락처는 읽지 않는다', ai: true },
    { no: '03', title: '원문 대조', who: '규칙', desc: '근거 문구가 서류 원문에 실제로 있는지 글자로 대조해 일치와 불일치를 표시한다' },
    { no: '04', title: '담당자 확인', who: '시 담당자', desc: '원본과 근거를 보고 확인, 수정, 제외한다. 확인해야 명부와 계산에 들어간다' },
  ],
  why: {
    title: 'AI가 필요한 이유',
    desc: '대피계획서는 동마다 서식이 다르고 거동 상태는 손글씨 문장으로 적힌다. "보행기 이용 천천히 이동" 같은 문장을 등급으로 옮기는 일은 정해진 칸을 읽는 규칙으로 처리하기 어렵다.',
  },
  not: {
    title: 'AI를 쓰지 않는 곳',
    desc: '부족분 계산과 차량 배정은 공식과 정해진 순서로 계산하는 규칙 기반 탐색이다. 같은 입력이면 같은 결과가 나와야 담당자가 검증할 수 있다.',
  },
  examples: {
    title: '판독 예시',
    note: '시연용 가상 서식 DOC-0003. 실제 개인 정보 없음',
    rows: [
      { row: '순번 1', original: '거동 상태 보행기 이용 천천히 이동', quote: '보행기 이용 천천히 이동', grade: '부축', result: '원문 일치', ok: true },
      { row: '순번 2', original: '거동 상태 판독 불가', quote: '휠체어로 이동', grade: '휠체어', result: '원문 불일치', ok: false },
    ],
  },
  pending: '판독 정확도 측정 진행 예정',
};

// 코치마크. x, y는 캡처 이미지 기준 백분율(0~100). 캡처는 1440x900 화면을 2배로 찍었다.
export const PROTOS = {
  'proto-intake': {
    headline: '서류 읽기. 원문과 맞지 않는 판독부터 먼저 보여 준다',
    src: '/shots/intake.png',
    marks: [
      { x: 39.2, y: 31, title: '확인 순서', desc: '원문 불일치, 확인 권장, 원문 일치 순으로 줄을 세운다' },
      { x: 56.2, y: 67.5, title: '판독 영역', desc: 'AI가 읽은 칸을 원본 위에 표시한다' },
      { x: 88.5, y: 71, title: '근거 문구 대조', desc: '근거가 원문에 없으면 빨간 글씨로 알린다' },
      { x: 93.8, y: 83.8, title: '담당자 확정', desc: '확인해야 명부와 계산에 들어간다' },
    ],
  },
  'proto-shortage': {
    headline: '부족분 계산. 옮기지 못하는 인원과 필요한 차량을 한 줄로 낸다',
    src: '/shots/shortage.png',
    marks: [
      { x: 28, y: 33, title: '미이송 예상', desc: '시나리오 S-1에서 291명. 빨강은 이 숫자에만 쓴다', alert: true },
      { x: 47, y: 31.8, title: '필요 추가 차량', desc: '승용차 19대를 더하면 0명이 된다(차량 대수는 가정)' },
      { x: 62.8, y: 66.8, title: '마을별 부족분', desc: '부족한 마을부터 37곳을 정렬한다' },
      { x: 84.5, y: 51.4, title: '계산 조건', desc: '확산 속도, 사전 발령, 준비 시간을 바꿔 다시 계산한다' },
    ],
  },
  'proto-map': {
    headline: '상황판. 산불 가정 구역과 마을별 부족분을 지도 위 막대로 본다',
    src: '/shots/map-3d.png',
    marks: [
      { x: 70.5, y: 14.2, title: '오늘 산불 위험', desc: '산림청 산불위험지수와 기상청 바람을 불러온다' },
      { x: 45, y: 33, title: '확산 가정 구역', desc: '발화 지점과 방향, 속도로 그린 띠' },
      { x: 59.4, y: 37.6, title: '부족분 막대', desc: '막대 높이가 마을별 부족 인원이다' },
      { x: 35, y: 73.9, title: '대피소 교체', desc: '평시 대피소가 구역 안이면 밖으로 바꾼다' },
      { x: 60.8, y: 88, title: '시간 흐름', desc: '발령 뒤 마을 도달 순서를 재생한다' },
    ],
  },
  'proto-roster': {
    headline: '대상자 명부. 목록, 지도, 서식 출력 세 가지로 같은 명부를 본다',
    src: '/shots/roster-print.png',
    marks: [
      { x: 32.4, y: 12, title: '보기 전환', desc: '실제 관리 프로그램처럼 목록, 지도, 출력 세 보기를 둔다' },
      { x: 40.5, y: 49.8, title: '집결지와 대피소', desc: '마을 경로당과 평시 대피소, 왕복 시간을 머리에 적는다' },
      { x: 40.5, y: 54.8, title: '빈 이름 칸', desc: '이름과 연락처는 지자체 서버 원본에서 채워 쓴다' },
      { x: 94.9, y: 32.9, title: '마을별 인쇄', desc: '한 마을에 한 장씩 A4로 뽑아 현장에 들고 간다' },
    ],
  },
  'proto-dispatch': {
    headline: '발령 운영. 배정을 확정해 도우미에게 보내고, 진행 상황을 되받는다',
    src: '/shots/dispatch.png',
    marks: [
      { x: 62, y: 13.2, title: '발령 상태 띠', desc: '경과 시간, 첫 도달까지 남은 시간, 미이송 예상을 늘 띄운다', alert: true },
      { x: 57.5, y: 22.5, title: '다섯 단계', desc: '평시, 실행대기 발령, 배정 검토, 이송 진행, 종료' },
      { x: 54.5, y: 41, title: '배정 결과', desc: '차량 39대가 174회 왕복하고, 285명은 기한 안에 옮기지 못한다' },
      { x: 26.5, y: 78.8, title: '기본 순서와 비교', desc: '침상부터 도보 순 기본 순서보다 미이송을 15명 줄인 배정을 규칙 기반 탐색으로 찾는다' },
    ],
  },
  'proto-helper': {
    headline: '도우미 화면. 휴대폰 한 화면에서 순서대로 출발과 도착을 보고한다',
    src: '/shots/helper.png',
    ratio: 0.5,
    marks: [
      { x: 29, y: 12.2, title: '내 배정', desc: '차량, 대상자 수, 대피소, 첫 출발 시각만 보여 준다' },
      { x: 70, y: 58.6, title: '보호자 연락', desc: '도착 전에 보호자에게 바로 전화한다' },
      { x: 25, y: 73.4, title: '주의사항', desc: '상시 복약, 반려동물 동반 같은 특이사항을 붙인다' },
      { x: 75, y: 89.8, title: '단계 보고', desc: '출발, 도착, 인계를 버튼 하나로 차례로 보고한다' },
      { x: 66, y: 96.2, title: '실패 보고', desc: '옮기지 못하면 사유와 함께 보고해 담당자 화면에 바로 띄운다', alert: true },
    ],
  },
};

export const DATA = {
  headline: '대상자 개인만 가상이고, 마을과 대피소와 도로와 날씨는 실제 공개 자료다',
  groups: [
    { title: '사람', items: [
      { name: '주민등록인구', org: '행정안전부(KOSIS)', at: '2026년 9월' },
      { name: '장기요양 등급 판정과 수급자', org: '국민건강보험공단(KOSIS)', at: '2025년' },
      { name: '장기요양기관 정원과 현원', org: '국민건강보험공단', at: '2026. 10. 6.' },
    ] },
    { title: '장소', items: [
      { name: '이재민 임시주거시설 27곳', org: '행정안전부 국민재난안전포털', at: '2026. 10. 6.' },
      { name: '마을회관과 경로당 138곳', org: '동해시(공공데이터포털)', at: '2025. 11. 4.' },
      { name: '동 행정복지센터 10곳', org: '동해시청 누리집', at: '2026. 10. 6.' },
      { name: '법정동 건축물 통계', org: '국토교통부 건축HUB', at: '2026. 10.' },
      { name: '행정동 경계', org: 'vuski/admdongkor', at: '2023. 7. 1.' },
    ] },
    { title: '이동과 날씨', items: [
      { name: '도로 주행 시간', org: 'OSRM(OpenStreetMap)', at: '2026. 10. 5.' },
      { name: '산불위험지수', org: '산림청', at: '실시간' },
      { name: '기상특보와 단기예보 바람', org: '기상청(공공데이터포털)', at: '실시간' },
    ] },
  ],
  note: '대상자 개인, 차량, 도우미는 가상이다. 이름과 연락처는 화면에 두지 않는다',
};

export const SCENARIOS = {
  headline: '같은 동해시라도 불이 어디서 얼마나 빨리 오느냐에 따라 옮기지 못하는 인원이 0명에서 744명까지 달라진다',
  basis: '차량 42대, 도우미 86명, 탑승 20분은 가정값. 대상자 수는 재가 수급자 추정치를 마을별로 나눈 값',
  bars: [
    { id: 'S-1', label: '옥계 방면 북측 확산', value: 291, note: '시속 2km, 발화와 동시 발령' },
    { id: 'S-2', label: '삼화동 서측 산림 발화', value: 0, note: '시속 1.5km' },
    { id: 'S-3', label: '옥계 방면 초고속 확산', value: 744, note: '시속 8.2km, 3시간 전 발령' },
    { id: 'S-4', label: '시 전체 동시 대피', value: 625, note: '모든 마을 8시간' },
  ],
};

export const DESIGN_SYSTEM = {
  headline: '정부 디자인 시스템 KRDS의 값을 옮겨 쓰고, 색은 파랑과 빨강 두 가지로 줄였다',
  colors: [
    { name: 'Primary', hex: '#256EF4', use: '버튼, 선택, 링크' },
    { name: 'Point', hex: '#D63D4A', use: '부족, 미이송, 원문 불일치' },
    { name: 'Gray 90', hex: '#1E2124', use: '본문' },
    { name: 'Gray 50', hex: '#6D7882', use: '보조 글자' },
    { name: 'Gray 5', hex: '#F4F5F6', use: '바탕' },
  ],
  type: [
    { role: 'Heading 1', size: 32, weight: 700 },
    { role: 'Heading 2', size: 24, weight: 700 },
    { role: 'Heading 3', size: 19, weight: 700 },
    { role: 'Body', size: 17, weight: 400 },
    { role: 'Body small', size: 15, weight: 400 },
    { role: 'Caption', size: 13, weight: 700 },
  ],
  font: 'Pretendard GOV, 굵기 400과 700 두 가지',
  rules: ['주황 계열 경고색 대신 빨강 하나만 쓴다', '성공 표시는 회색으로 둔다', '산불 구역은 잉크색으로 그려 빨강과 겹치지 않게 한다'],
  src: 'KRDS 디지털정부 서비스 UI/UX 가이드라인 토큰',
};

export const EVALUATE = {
  headline: '사용성 평가는 세 과업과 SUS 설문으로 진행한다',
  status: '진행 예정',
  tasks: [
    { no: 'T1', title: '서류 한 건 확인', goal: '원문 불일치 서류를 찾아 등급을 고치고 확정한다' },
    { no: 'T2', title: '조건 바꿔 다시 계산', goal: '확산 속도를 바꾸고 미이송 예상과 추가 차량을 읽는다' },
    { no: 'T3', title: '마을 명부 인쇄', goal: '특정 마을 명부를 서식 출력으로 뽑는다' },
  ],
  measures: ['과업 성공 여부', '과업 시간', 'SUS 10문항 점수', '사후 인터뷰'],
  note: '참여자와 결과는 평가를 마친 뒤 채운다',
};

export const LESSONS = {
  headline: '배운 점은 현장 조사와 사용성 평가를 마친 뒤 팀원 다섯 명이 함께 정리한다',
  status: '작성 예정',
  note: '조사와 평가에서 확인한 사실, 바꾼 설계, 남은 한계를 나눠 적는다',
};

export const OUTRO = {
  headline: '미리, 동해시 재난취약자 사전 이송 배정 서비스',
  links: [
    { label: '서비스', url: 'https://miri-indol.vercel.app' },
    { label: '코드', url: 'https://github.com/hyunho2378/miri' },
  ],
  credit: '한림대학교 2026-2 서비스디자인 Team 오아시스',
};

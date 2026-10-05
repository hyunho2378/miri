// 문서함 양식. 문서는 HTML, 시트는 열과 행, 설문지는 질문 목록.
// 내용의 사실 수치는 넣지 않는다. 빈칸은 ○○○ 로 둔다.

const h = (s) => s.trim().replace(/\n\s+/g, '\n')

export const DOC_TEMPLATES = [
  {
    key: 'blank', title: '빈 문서', desc: '처음부터 쓰기',
    html: '<h1>제목 없는 문서</h1><p></p>'
  },
  {
    key: 'request', title: '기관 협조 요청서', desc: '인터뷰, 자료, 사용성 평가 요청',
    html: h(`
      <h1>재난취약자 대피 지원 서비스 연구 협조 요청</h1>
      <p><b>수신</b> ○○○(○○과장)</p>
      <p><b>발신</b> 한림대학교 서비스디자인 팀 오아시스</p>
      <h2>1. 요청 배경</h2>
      <p>우리 팀은 산불과 대설과 호우 때 스스로 대피하기 어려운 동해시 주민을 제때 옮길 차량과 인력을 평시에 계산하고, 재난 발령 시 배정하는 서비스(미리)를 연구하고 있습니다.</p>
      <h2>2. 요청 내용</h2>
      <ul><li>담당자 인터뷰(60분 내외)</li><li>개인 식별 정보가 없는 통계와 빈 서식</li><li>11월 시안 사용성 평가 참여(선택)</li></ul>
      <h2>3. 일정</h2>
      <ul><li>희망 기간: 2026. 10. 12.(월)∼10. 23.(금)</li><li>회신 기한: 2026. 10. 20.(화)</li></ul>
      <h2>4. 개인정보</h2>
      <p>주민의 성명, 연락처, 주소, 건강 정보는 요청하지 않습니다. 녹음은 동의한 경우에만 하며 2026. 12. 31.까지 파기합니다.</p>
      <h2>5. 연락처</h2>
      <p>담당 ○○○, 전화 ○○○-○○○○-○○○○, 이메일 ○○○</p>
    `)
  },
  {
    key: 'interview', title: '인터뷰 기록지', desc: '6단계 진행, 발화 그대로 기록',
    html: h(`
      <h1>인터뷰 기록</h1>
      <p><b>일시</b> 2026. ○○. ○○. ○○:○○ <b>장소</b> ○○○ <b>진행</b> ○○○ <b>기록</b> ○○○</p>
      <p><b>참여자</b> 소속과 직무만 적음. 이름 적지 않음</p>
      <h2>1. 도입</h2><p>동의서 서명 여부: ○ 녹음 동의 여부: ○</p>
      <h2>2. 분위기 형성</h2><p></p>
      <h2>3. 전반적 질문</h2><p></p>
      <h2>4. 집중 질문</h2><p>발화는 요약하지 않고 들은 그대로 적습니다.</p>
      <h2>5. 확인</h2><p></p>
      <h2>6. 정리</h2><p>받은 자료: ○ 다음 약속: ○</p>
      <h2>당일 해석</h2><p>관찰한 행동과 말한 내용이 다른 지점을 적습니다.</p>
    `)
  },
  {
    key: 'drill', title: '훈련 결과 보고서', desc: '훈련 발령 기록 정리',
    html: h(`
      <h1>대피 훈련 결과 보고</h1>
      <p><b>훈련 일시</b> ○○○ <b>대상 동</b> ○○○ <b>시나리오</b> ○○○</p>
      <h2>1. 결과 요약</h2><ul><li>이송 완료: ○명</li><li>미이송: ○명</li><li>마감까지 걸린 시간: ○분</li></ul>
      <h2>2. 지연 구간</h2><p></p>
      <h2>3. 다음 훈련 전 고칠 것</h2><ul><li></li></ul>
    `)
  },
  {
    key: 'handover', title: '소방 인계서', desc: '옮기지 못한 주민 인계',
    html: h(`
      <h1>미이송 주민 소방 인계서</h1>
      <p><b>인계 시각</b> ○○:○○ <b>인계자</b> ○○○ <b>인수자</b> ○○소방서 ○○○</p>
      <h2>미이송 현황</h2><p>마을, 이송 유형, 인원만 적습니다. 상세 정보는 소방 요청 시 별도 전달합니다.</p>
      <ul><li>○○ 마을: 침상 ○명, 휠체어 ○명</li></ul>
      <h2>현장 특이사항</h2><p></p>
    `)
  },
  {
    key: 'minutes', title: '회의록', desc: '안건, 논의, 결정',
    html: h(`
      <h1>회의록</h1><p><b>일시</b> ○○○ <b>참석</b> ○○○</p>
      <h2>1. 안건</h2><ul><li></li></ul><h2>2. 논의</h2><p></p><h2>3. 결정 사항</h2><ul><li></li></ul><h2>4. 할 일</h2><ul><li>담당 ○○○, 기한 ○○○</li></ul>
    `)
  }
]

const GRADE_OPTIONS = ['침상', '휠체어', '부축', '도보']

export const SHEET_TEMPLATES = [
  { key: 'blank', title: '빈 시트', desc: '처음부터 쓰기', columns: [{ key: 'a', label: '열 1' }, { key: 'b', label: '열 2' }, { key: 'c', label: '열 3' }], rows: [['', '', ''], ['', '', ''], ['', '', '']] },
  {
    key: 'roster', title: '대상자 명부', desc: '명부와 바로 연결', source: 'roster',
    columns: [
      { key: 'code', label: '대상자 코드', readOnly: true },
      { key: 'village', label: '마을', readOnly: true },
      { key: 'grade', label: '이송 등급', options: GRADE_OPTIONS },
      { key: 'tags', label: '특이사항' },
      { key: 'review', label: '확인 상태', readOnly: true }
    ],
    rows: []
  },
  {
    key: 'vehicles', title: '차량 협약 현황', desc: '차종, 정원, 협약 만료',
    columns: [{ key: 'name', label: '차량' }, { key: 'type', label: '차종' }, { key: 'owner', label: '소속' }, { key: 'until', label: '협약 만료' }, { key: 'memo', label: '메모' }],
    rows: [['', '', '', '', ''], ['', '', '', '', '']]
  },
  {
    key: 'drill', title: '훈련 기록', desc: '마을별 실제 소요 시간',
    columns: [{ key: 'date', label: '훈련일' }, { key: 'village', label: '마을' }, { key: 'plan', label: '예상 왕복(분)', type: 'number' }, { key: 'real', label: '실제 왕복(분)', type: 'number' }, { key: 'memo', label: '지연 구간' }],
    rows: [['', '', '', '', '']]
  },
  {
    key: 'accuracy', title: '서류 읽기 정확도 검증표', desc: '정답과 읽은 값 비교',
    columns: [{ key: 'doc', label: '서류' }, { key: 'answer', label: '정답 등급', options: GRADE_OPTIONS }, { key: 'read', label: '읽은 등급', options: GRADE_OPTIONS }, { key: 'evidence', label: '근거 문구 일치', options: ['일치', '불일치'] }, { key: 'memo', label: '메모' }],
    rows: [['가상 서류 1', '', '', '', ''], ['가상 서류 2', '', '', '', ''], ['가상 서류 3', '', '', '', '']]
  }
]

export const QUESTION_TYPES = [
  { value: 'short', label: '단답형' },
  { value: 'long', label: '장문형' },
  { value: 'choice', label: '객관식' },
  { value: 'check', label: '체크박스' },
  { value: 'scale', label: '선형 배율' },
  { value: 'date', label: '날짜' }
]

export const FORM_TEMPLATES = [
  { key: 'blank', title: '빈 설문지', desc: '처음부터 만들기', questions: [{ type: 'short', title: '질문', required: false }] },
  {
    key: 'helper', title: '대피 도우미 모집', desc: '재난 때 이웃 대피를 돕는 주민 모집',
    questions: [
      { type: 'short', title: '이름', required: true },
      { type: 'short', title: '사는 마을', required: true },
      { type: 'choice', title: '도울 수 있는 일', required: true, options: ['부축해서 함께 걷기', '휠체어 밀기', '차량 운전', '연락과 안내'] },
      { type: 'check', title: '연락 가능한 시간', required: false, options: ['평일 낮', '평일 밤', '주말'] },
      { type: 'choice', title: '도우미 교육 참여', required: true, options: ['참여', '어려움'] }
    ]
  },
  {
    key: 'report', title: '도우미 현장 보고', desc: '이송 완료와 문제 보고',
    questions: [
      { type: 'short', title: '대상자 코드', required: true },
      { type: 'choice', title: '결과', required: true, options: ['이송 완료', '부재', '거부', '도움 필요'] },
      { type: 'long', title: '현장 상황', required: false }
    ]
  },
  {
    key: 'ut', title: '사용성 평가 사후 설문', desc: '과업 후 만족도와 의견',
    questions: [
      { type: 'short', title: '참여자 번호', required: true },
      { type: 'scale', title: '부족한 마을을 찾기 쉬웠다', required: true, min: 1, max: 5 },
      { type: 'scale', title: '서류에서 읽은 등급을 믿을 수 있었다', required: true, min: 1, max: 5 },
      { type: 'scale', title: '발령 후 배정표를 확정하기 쉬웠다', required: true, min: 1, max: 5 },
      { type: 'long', title: '가장 헷갈린 화면과 이유', required: false }
    ]
  },
  {
    key: 'consent', title: '인터뷰 참여 동의', desc: '참여, 녹음, 사진 동의',
    questions: [
      { type: 'short', title: '소속', required: true },
      { type: 'choice', title: '인터뷰 참여에 동의합니까', required: true, options: ['동의', '동의하지 않음'] },
      { type: 'choice', title: '인터뷰 녹음에 동의합니까', required: true, options: ['동의', '동의하지 않음'] },
      { type: 'choice', title: '발언 익명 인용에 동의합니까', required: true, options: ['동의', '동의하지 않음'] }
    ]
  }
]

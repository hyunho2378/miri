// 문서함 양식. 문서는 HTML, 시트는 열과 행, 설문지는 질문 목록.
// 내용의 사실 수치는 넣지 않는다. 빈칸은 ○○○ 로 둔다.

const GRADE_OPTIONS = ['침상', '휠체어', '부축', '도보']

// 문서 서식은 docTemplates.js(공공기관 서식)로 옮겼다
export { DOC_TEMPLATES, DOC_CATEGORIES } from './docTemplates.js'

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

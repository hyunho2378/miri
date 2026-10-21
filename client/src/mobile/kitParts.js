// 휴대폰 화면 부품표. 화면은 이 표에 있는 ui.jsx 부품만 쓴다(시험 kitParts.test.mjs 가 강제).
// 노드: iOS 27 키트(qjJ2EH6y1qJOEJAf95bZCv, iOS and iPadOS 27 UI Kit 27.1.0), M3 키트(QNhGkHwMSJUyaqkTLPBxXU, Material 3 Design Kit V1.24).
// 사람이 읽는 표: 공모전/모바일UI/부품표_20261022.md. 키트에 없는 부품은 새로 만들지 않고 키트 부품 조합(combo)으로만 둔다.
// status: 'kit' 키트 부품 그대로, 'combo' 키트 부품 조합, 'replace' 키트에 대응 부품이 없어 화면 재구성 때 빼는 부품.
export const KIT_PARTS = {
  AppBar: { use: '화면 제목과 뒤로, 큰 제목', ios: ['1:54472 Toolbar - Top - iPhone', '5827:57551 _Title - iPhone - Large Title', '12883:6008 Toolbar - Top - iPhone Duo', '12884:8278 _Title - iPhone Duo - Large Title'], android: ['58114:20565 App bar'], status: 'kit' },
  List: { use: '묶음 목록', ios: ['507:24675 Lists'], android: ['59106:13028 List'], status: 'kit' },
  ListRow: { use: '목록 행(제목만, 제목과 보조 한 줄, 값 오른쪽)', ios: ['550:50430 Row', '550:50627 Row Regular 52', '550:50515 Row Tall 68', '550:49677 Row - Button'], android: ['59106:13183 List item'], status: 'kit' },
  Button: { use: '채움 큰 버튼(filled), 보조(tonal, gray), 글자 버튼(plain), 위험(danger, danger-tonal)', ios: ['5473:21667 Button - Liquid Glass - Text', '507:24673 Buttons'], android: ['57994:2227 Button', '58651:11237 Button - tonal', '58650:8094 Button - text'], status: 'kit', note: '테두리 버튼(M3 Button - outline 58650:10213)은 무테두리 규칙으로 쓰지 않고 tonal 로 둔다' },
  IconButton: { use: '앱 바의 아이콘 버튼', ios: ['1:54472 Toolbar 버튼 44'], android: ['58663:30358 Icon button - standard'], status: 'kit' },
  BottomNav: { use: '탭 바, 내비게이션 바, 레일, 듀오 세로 막대', ios: ['3:70967 Tab Bar - iPhone', '12887:20935 Tab Bar - iPhone Duo'], android: ['58016:37236 Navigation Bar: Horizontal items', '58016:36879 Navigation Rail'], status: 'kit' },
  Sheet: { use: '아래 시트, 가운데 시트', ios: ['10525:1632 Sheet - iPhone'], android: ['51827:5859 Bottom sheet'], status: 'kit' },
  Dialog: { use: '확인 대화상자', ios: ['63:57121 Alert'], android: ['50723:10929 Basic dialog'], status: 'kit' },
  Progress: { use: '진행 막대(단계 1/4, 완료 n/전체)', ios: ['9:55875 Progress Bar - Determinate Linear'], android: ['58005:7997 Linear-determinate progress indicator'], status: 'kit' },
  Spinner: { use: '불러오는 중', ios: ['5425:3431 Progress Bar - Indeterminate Circular'], android: ['58005:8525 Circular-indeterminate progress indicator'], status: 'kit' },
  Toggle: { use: '켜고 끄기', ios: ['507:24690 Toggles'], android: ['54446:25289 Switch'], status: 'kit' },
  Segmented: { use: '보기 고르기', ios: ['507:24683 Segmented Controls'], android: ['53923:36615 Segmented button'], status: 'kit' },
  EmptyState: { use: '빈 화면', ios: ['5583:24408 Empty States'], android: [], status: 'combo', note: 'M3 키트에 빈 화면 부품 없음. 글자 역할(Styles 49823:12141)과 Button 57994:2227 조합' },
  FilledInput: { use: '한 줄 입력', ios: ['553:22762 Text Fields'], android: ['52798:24373 Text field'], status: 'kit' },
  FilledTextarea: { use: '여러 줄 입력', ios: ['553:22762 Text Fields'], android: ['52798:24373 Text field'], status: 'kit' },
  TimePicker: { use: '날짜와 시각', ios: ['5442:1885 Date and time - Pickers', '30:53803 Date and time - Collapsed'], android: ['52949:28053 Keyboard picker', '51954:18136 Modal date picker'], status: 'kit' },
  TwoPane: { use: '목록과 상세 두 단', ios: ['12892:62092 Safe Areas and Margins(Duo 안쪽)'], android: ['56384:120 Examples/Layout grid'], status: 'combo', note: '키트 배치 예와 크기 등급 판정(layout.js)' },
  BottomAction: { use: '화면 아래 주 동작 하나와 약한 보조 동작', ios: ['4:55732 Toolbar - Bottom - iPhone', '5473:21667 Button Large 50'], android: ['51159:5105 Bottom app bar', '57994:2227 Button'], status: 'combo' },
  EmergencyButton: { use: '늘 같은 자리의 긴급 버튼', ios: ['1:54472 Toolbar - Top - iPhone 글자 버튼'], android: ['58114:20565 App bar 끝 동작', '58651:11237 Button - tonal'], status: 'combo' },
  InfoSheet: { use: '긴 설명을 한 줄 행 뒤 시트로', ios: ['550:50430 Row', '10525:1632 Sheet - iPhone'], android: ['59106:13183 List item', '51827:5859 Bottom sheet'], status: 'combo' },
  DisplaySettings: { use: '큰 글자 설정', ios: ['550:50430 Row', '507:24690 Toggles'], android: ['59106:13183 List item', '54446:25289 Switch'], status: 'combo' },
  OfflineBanner: { use: '연결 끊김 알림 한 줄', ios: ['550:50430 Row'], android: ['59106:13183 List item'], status: 'combo' },
  Figure: { use: '큰 값 하나(기한, 다음 장소, 결과)와 보조 한 줄', ios: ['0:2194 Text Styles Large Title 34/41', '507:24675 Lists 면'], android: ['49823:12141 Styles Headline Medium 28/36', '59106:13028 List 면'], status: 'combo', note: '키트에 숫자 강조 부품이 없어 글자 역할과 목록 면을 조합(도우미 재구성 2a)' },
  SelectRow: { use: '하나 또는 여러 개 고르기(역할, 불가 사유, 실패 사유)', ios: ['550:50430 Row', '212:117586 _Trailing Checkmark'], android: ['59106:13183 List item', '59106:13365 Trailing element Radio', '59106:13362 Trailing element Checkbox'], status: 'combo', note: 'Chip 대신. iOS 는 끝 체크 표시, Android 는 끝 라디오와 체크 상자' },
  // 아래는 키트에 대응 부품이 없다. 다음 화면 재구성에서 위 부품으로 바꾸고 화면에서 뺀다.
  Chip: { use: '역할과 사유 고르기', ios: [], android: ['53923:28270 Filter chip', '53923:28089 Assistive chip'], status: 'replace', note: 'iOS 키트에 칩 없음. iOS 는 Row 체크 표시 또는 Segmented 로 바꿈' },
  Card: { use: '덩어리 묶기', ios: [], android: ['52350:27728 Card states/Filled'], status: 'replace', note: 'iOS 키트에 카드 없음. 묶음 목록(List)으로 바꿈' },
  Banner: { use: '안내 띠', ios: [], android: [], status: 'replace', note: '두 키트에 없음. 한 줄 Row 또는 InfoSheet 로 바꿈' },
  BottomActions: { use: '하단 버튼 묶음(옛 부품)', ios: ['4:55732 Toolbar - Bottom - iPhone'], android: ['51159:5105 Bottom app bar'], status: 'replace', note: 'BottomAction 으로 바꿈(주 버튼 하나 규칙)' },
  SafetyGuidance: { use: '안전 안내 문단(옛 부품)', ios: [], android: [], status: 'replace', note: '문단 두 개를 화면에 펼침. EmergencyButton 과 InfoSheet 로 바꿈' },
  HelperConsent: { use: '참여 동의 카드(옛 부품)', ios: [], android: [], status: 'replace', note: '문단 세 개. 질문 하나와 버튼 하나 화면으로 바꿈' }
}

// 부품이 아닌 도구(훅, 계산 함수, 껍데기)
export const UI_UTILITIES = ['MobileRoot', 'useLayout', 'keepCodes', 'radioProps', 'useMobileToast', 'trapTab', 'calendarKeyMove']

// 벤치마크 공통 규칙을 숫자로(측정 도구 tools/measure-mobile-screen.js 와 시험이 같이 씀)
export const SCREEN_RULES = {
  maxFilledButtons: 1,      // 한 화면 채움 버튼 하나(벤치마크 규칙 1)
  maxParagraphChars: 80,    // 한 덩어리 글 80자 이하(규칙 4, 7). 긴 설명은 InfoSheet
  maxTextLevels: 4,         // 글자 단계 4개까지(제목, 본문, 보조, 버튼)
  mainButtonInView: true    // 주 과업 화면은 스크롤 없이 주 버튼이 보임
}

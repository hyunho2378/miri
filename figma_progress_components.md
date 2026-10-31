# figma_progress_components.md (작업자 D, 2026. 11. 1.)
- 키트 복사 방식 확인: 키트 파일에서 노드 선택 → Meta+c → 미리 파일 탭 Meta+v 로 부품 세트가 그대로 들어옴(클립보드는 OS 하나라 복사와 붙여넣기를 한 쌍으로). 포크 작업자는 부모의 탭 변수가 없어 키트 탭(DK)과 미리 탭(DM)을 새로 열어야 함.
- 복사해 온 것: iOS 27 키트 Buttons > Button - Content Area(108 변형, 속성 Size, Style, Label Style, Is Enabled, Destructive). Components / Buttons 에 'iOS Kit / Button - Content Area (참조 원본)'로 이름 바꿔 둠. 구조 참조용이라 지우지 말 것.
- 미리 부품(코드 값, 색과 모서리와 간격은 변수 연결, 글꼴 Pretendard GOV, 변수 없는 칠 0):
  | 부품 | 페이지 | 변형 수 | 속성 |
  |---|---|---|---|
  | Button | Components / Buttons | 32 | Variant(primary, secondary, ghost, danger), Size(sm, md, lg, xl), State(Default, Disabled) |
  | IconButton | Components / Buttons | 18 | Variant(ghost, soft, primary), Size(sm, md, lg), State |
  | Chip | Components / Selection | 12 | Variant(outline, filled, selected), Size(sm, md), State |
  | Toggle | Components / Selection | 4 | Checked(Off, On), State |
  | Badge | Components / Data Display | 6 | Tone(neutral, primary, success, warning, danger, critical) |
  | Avatar | Components / Data Display | 3 | Size(sm, md, lg) |
- 알려진 차이와 한계: (1) 단추 높이 44(lg)는 Spacing 변수에 없어 고정값. (2) Badge 안쪽 6은 변수 없는 값. (3) 단추 글자는 글자 스타일 위에 굵게(Bold)를 덮어씀(코드가 font-bold, 스타일 type/*은 600). (4) 아이콘은 자리 표시 점이라 lucide 교체 전. (5) Text, Boolean, Instance swap 컴포넌트 속성은 아직 안 만듦. (6) Material 3 키트의 사용자 복사본은 찾지 못함(커뮤니티 파일 접근은 시도 안 함, 시간 부족).
- 못 한 것(다음 차례): Input, Textarea, Select, MultiSelect, Checkbox, DatePicker, NumberStepper, Pagination, Tabs, SegmentControl, Card, Modal, Drawer, Toast, Tooltip, EmptyState, Skeleton, Disclosure, FilterBar, ChoiceChips, KeyValue, SectionTitle, ExportButton 의 부품화, console/ dashboard/ miri/ 도메인 부품, Components 부모 목차, 각 부품 섹션과 속성 표와 상태 행렬 문서화, 코드 props 와 이름 대조 원장. 빈 페이지 Components / Inputs, Feedback, Overlays, Navigation, Domain 은 아직 안 만듦.

## 작업자 D2 (2026. 11. 1., 이어서)
- 페이지 순서 정리: Components, Buttons, Inputs, Selection, Feedback, Overlays, Navigation, Data Display, Domain, Icons(새). Overlays와 Domain은 아직 빈 페이지.
- 아이콘 부품 10개(Components / Icons): ChevronDown, ChevronRight, X, Check, Info, Search, Plus, Minus, CircleCheck, CircleAlert. 전사본 'Icon / 이름' 프레임을 복제해 부품으로 바꾸고 선을 text/sec 변수에 연결. 전사본에 없는 lucide(ChevronLeft, XCircle, RotateCw)는 못 만듦. 이전 쪽은 ChevronRight 를 180도 돌려 대체, 알림 오류 아이콘은 CircleAlert 로 대체(코드는 XCircle).
- 새 부품(색, 모서리, 간격은 변수 연결, 글자는 type/*, 변수 없는 칠 0):
  | 부품 | 페이지 | 변형 수 | 속성 | 컴포넌트 속성(Text, Boolean, Swap) |
  |---|---|---|---|---|
  | Input | Inputs | 3 | State(Default, Focus, Error) | Label, Value, Hint text, Show hint, Show label, Show left icon |
  | Textarea | Inputs | 3 | State | Label, Value, Hint text, Show hint |
  | Checkbox | Inputs | 6 | Checked(Off, On, Indeterminate) x State(Default, Disabled) | Label |
  | SegmentControl | Selection | 3 | Selected(First, Second, Third) | 없음 |
  | Tabs | Navigation | 4 | Variant(Underline, Pill) x State(Active, Inactive) | Label |
  | Pagination | Navigation | 3 | Page(First, Middle, Last) | 없음 |
  | Disclosure | Navigation | 2 | Open(Closed, Open) | Summary |
  | Card | Data Display | 15 | Tone(Default, Primary, Danger, Mute, Flat) x Padding(sm, md, lg) | Title, Body |
  | KeyValue | Data Display | 2 | Size(md, lg) | 없음 |
  | SectionTitle | Data Display | 2 | Size(md, lg) | Title, Desc, Show eyebrow |
  | Skeleton | Data Display | 3 | Variant(Block, Text, Card) | 없음 |
  | Toast | Feedback | 3 | Tone(Neutral, Primary, Danger) | Message, Icon(Instance swap) |
  | Tooltip | Feedback | 2 | Side(Top, Right) | Label |
- 'Components' 부모 페이지에 목차 프레임(Components / Index) 만듦(페이지별 부품 이름과 변형 수).
- 코드 props 와 이름 차이: Tabs 의 Variant 값은 코드가 소문자(underline, pill), 피그마는 대문자 시작. Card Padding 값 sm, md, lg 는 코드와 같음(데스크톱 값 16, 20, 24). Toast Tone 도 대문자 시작.
- 한계: Input 오류 변형에서 Hint text 속성 기본값이 '도움말'로 덮여 오류 문구가 안 보임(사용 때 글자 바꿔야 함). Card 15 변형의 헤더(eyebrow, actions, meta, media)는 없음(제목과 본문만). EmptyState, Modal, Drawer, Select, MultiSelect, DatePicker, NumberStepper, FilterBar, ChoiceChips, ExportButton, console/ dashboard/ layout/ miri/ 도메인 부품은 못 함. 속성 표와 상태 행렬을 담은 짙은 회색 섹션 문서화도 못 함(세트 설명 Description 에 코드 경로와 값은 적음). Material 3 키트는 이번에 시도 못 함(시간).

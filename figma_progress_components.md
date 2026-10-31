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

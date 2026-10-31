# 피그마 부품 세트 대 코드 부품 대조표 (작업자 D3, 2026. 11. 1.)

피그마 변형 속성 값은 대문자로 시작하고 코드 prop 값은 소문자다(예: Variant=Primary 대 variant primary). 이름이 같으면 같음으로 적는다.

| 피그마 세트 | 페이지 | 변형 속성과 값 | 변형 수 | 코드 파일 | 코드 props | 같음 여부 |
|---|---|---|---|---|---|---|
| ExportButton | Components / Buttons | State(Default, Disabled) | 2 | client/src/components/ui/ExportButton.jsx | columns, rows, filename, label(CSV 내보내기), variant, size. 내부는 Button secondary 와 Download 아이콘(아이콘 부품에 Download 가 없어 ChevronDown 으로 대체). | 이름 같음, 값 대소문자 차이 |
| iOS Kit / Button - Content Area (참조 원본) | Components / Buttons | Size(Small, Medium, Large); Style(Bordered - Prominent, Bordered, Borderless); Label Style(Title and Icon, Icon only, Title only); Is Enabled(True, False); Destructive(True, False) | 108 | - | - | 참조 원본(코드 없음) |
| Button | Components / Buttons | Variant(primary, secondary, ghost, danger); Size(sm, md, lg, xl); State(Default, Disabled) | 32 | client/src/components/ui/Button.jsx | variant(primary, secondary, ghost, danger), size(sm, md, lg, xl), disabled, loading, leftIcon
사용 화면: C-01 현황판 부족분 계산 단추, C-06 협약 추진 기안 등
키트 원본: iOS 27 UI Kit Bu | 이름 같음, 값 대소문자 차이 |
| IconButton | Components / Buttons | Variant(ghost, soft, primary); Size(sm, md, lg); State(Default, Disabled) | 18 | client/src/components/ui/IconButton.jsx | variant(ghost, soft, primary), size(sm, md, lg), radius(full, xs, md)
아이콘은 lucide 20px, 지금은 자리 표시 점(아이콘 교체는 다음 단계)
키트 원본: iOS 27 Buttons > Button - Liquid Glass | 이름 같음, 값 대소문자 차이 |
| Select | Components / Inputs | State(Default, Open, Error, Disabled) | 4 | client/src/components/ui/Select.jsx | label, value, options, placeholder, disabled, error, size(md 44, md 이상 36, sm 32, xs 28), portal. 트리거 높이 36(데스크톱), 모서리 radius/md, 링 1(Error는 danger, Open은 prima | 이름 같음, 값 대소문자 차이 |
| MultiSelect | Components / Inputs | State(Default, Open) | 2 | client/src/components/ui/MultiSelect.jsx | label, values, options, placeholder, disabled, compact. 선택 항목은 체크 아이콘으로 표시. | 이름 같음, 값 대소문자 차이 |
| DatePicker | Components / Inputs | State(Default, Filled, Error) | 3 | client/src/components/ui/DatePicker.jsx | label, value, onChange, hint, error, disabled, placeholder. 트리거 높이 36(데스크톱), 앞 아이콘 CalendarDays 는 아이콘 부품에 없어 Info 로 대체. 열린 달력은 별도 상태 미작성. | 이름 같음, 값 대소문자 차이 |
| Input | Components / Inputs | State(Default, Focus, Error) | 3 | client/src/components/ui/Input.jsx | label, hint, error, leftIcon, rightSlot, compact. Error = error 문구 있음(border danger, 문구 caption danger-text). Focus = focus-within(border primary, 링 2px primary | 이름 같음, 값 대소문자 차이 |
| Textarea | Components / Inputs | State(Default, Focus, Error) | 3 | client/src/components/ui/Textarea.jsx | label, hint, error, rows(기본 4). 안쪽 위아래 10 가로 12 모서리 md. rows 4 기준 높이 104. | 이름 같음, 값 대소문자 차이 |
| Checkbox | Components / Inputs | Checked(Off, On, Indeterminate); State(Default, Disabled) | 6 | client/src/components/ui/Checkbox.jsx | checked, onChange, label, srOnlyLabel, disabled. index.css 전역 규칙: 20x20, 모서리 4, 선 1.5 line-strong, 켬 primary 면과 흰 체크, indeterminate 흰 가로선, 비활성 불투명도 0.4. | 이름 같음, 값 대소문자 차이 |
| ChoiceChips | Components / Selection | Size(sm, md, lg); Selected(Off, On) | 6 | client/src/components/ui/ChoiceChips.jsx | options, value, onChange, label, size(sm 32, md 44 데스크톱 36, lg 48). 선택은 채움과 체크 아이콘(색만으로 표시하지 않음). 한 항목의 변형이며 radiogroup 은 항목을 가로로 나열. | 이름 같음, 값 대소문자 차이 |
| NumberStepper | Components / Selection | Layout(Block, Inline) | 2 | client/src/components/ui/NumberStepper.jsx | label, value, min, max, step, unit, layout(block, inline). 단추는 IconButton sm(32), 값 칸 최소 폭 64. | 이름 같음, 값 대소문자 차이 |
| FilterBar | Components / Selection | Property 1(Default) | 1 | client/src/components/ui/FilterBar.jsx | children, className. role=group, aria-label=필터, 항목 사이 8, 줄바꿈 허용. 항목은 Chip 이나 Select. | 이름 같음, 값 대소문자 차이 |
| Chip | Components / Selection | Variant(outline, filled, selected); Size(sm, md); State(Default, Disabled) | 12 | client/src/components/ui/Chip.jsx | variant(outline, filled, selected), size(sm, md), as
모서리 md 12, 안쪽 16, 글자 type-strong | 이름 같음, 값 대소문자 차이 |
| Toggle | Components / Selection | Checked(Off, On); State(Default, Disabled) | 4 | client/src/components/ui/Toggle.jsx | checked, onChange, label, disabled
트랙 44x24 알약, 손잡이 20 원, 켬 text-pri 면, 끔 line-strong 면
키트 원본: iOS 27 Toggles(구조 참조) | 이름 같음, 값 대소문자 차이 |
| SegmentControl | Components / Selection | Selected(First, Second, Third) | 3 | client/src/components/ui/SegmentControl.jsx | items, value, onChange, label. 바탕 mute, 안쪽 4, 모서리 sm, 항목 높이 32 가로 안쪽 12 모서리 xs, 선택은 page 면과 shadow sm. | 이름 같음, 값 대소문자 차이 |
| EmptyState | Components / Feedback | Tone(Empty, Error); Compact(Off, On) | 4 | client/src/components/ui/EmptyState.jsx | tone(empty, error), title, desc, action, onRetry, image, compact. 기본 위아래 64, compact 32. 오류는 다시 시도 단추 포함. | 이름 같음, 값 대소문자 차이 |
| Toast | Components / Feedback | Tone(Neutral, Primary, Danger) | 3 | client/src/components/ui/Toast.jsx | - | 이름 같음, 값 대소문자 차이 |
| Tooltip | Components / Feedback | Side(Top, Right) | 2 | client/src/components/ui/Tooltip.jsx | label, side(top, right). 면 text-pri, 글자 text-inverse type/meta, 안쪽 위아래 4 가로 8, 모서리 xs, 위치만 다름(top 위 가운데, right 오른쪽 가운데). | 이름 같음, 값 대소문자 차이 |
| Modal | Components / Overlays | Footer(On, Off) | 2 | client/src/components/ui/Modal.jsx | open, onClose, title, footer, className. 폭 최대 560, 모서리 radius/xl(28), 그림자 shadow/lg, 머리 위 24 안쪽, 본문 안쪽 24와 16, 바닥 단추 오른쪽 정렬. 화면 가운데에 뜨는 대화상자(바텀시트 없음). | 이름 같음, 값 대소문자 차이 |
| Drawer | Components / Overlays | Side(Right, Left) | 2 | client/src/components/ui/Drawer.jsx | open, onClose, title, footer, side(right 기본, left), size. 폭 clamp(360, 40vw, 560)에서 데스크톱 1200 기준 480으로 표현, 머리 높이 56, 안쪽 20, 구분선 line/sub. | 이름 같음, 값 대소문자 차이 |
| Tabs | Components / Navigation | Variant(Underline, Pill); State(Active, Inactive) | 4 | client/src/components/ui/Tabs.jsx | items, value, onChange, variant(underline, pill). 높이 40, 가로 안쪽 12, 글자 type/strong. 켬: underline 은 아래 2px text-pri 선, pill 은 text-pri 면과 흰 글자. 꺼짐 text-meta. | 이름 같음, 값 대소문자 차이 |
| Pagination | Components / Navigation | Page(First, Middle, Last) | 3 | client/src/components/ui/Pagination.jsx | page, total, pageSize, onChange. 단추 36x36 모서리 md, 현재 쪽 primary-soft 면과 primary-text 글자(type/strong), 이전과 다음 비활성 불투명도 0.4. 최대 5개 번호. | 이름 같음, 값 대소문자 차이 |
| Disclosure | Components / Navigation | Open(Closed, Open) | 2 | client/src/components/ui/Disclosure.jsx | summary, children, defaultOpen. details/summary. 화살표 16 text-sec, 펼치면 180도 회전, 내용은 위 간격 8. | 이름 같음, 값 대소문자 차이 |
| Badge | Components / Data Display | Tone(neutral, primary, success, warning, danger, critical) | 6 | client/src/components/ui/Badge.jsx | tone(neutral, primary, success, warning, danger, critical)
높이 20, 안쪽 6(변수 없는 값), 모서리 xs 8, 글자 type-caption
키트 원본 없음(미리 고유, StatusPill 규칙) | 이름 같음, 값 대소문자 차이 |
| Avatar | Components / Data Display | Size(sm, md, lg) | 3 | client/src/components/ui/Avatar.jsx | name, size(sm, md, lg)
24, 32, 40 원, primary 면, 첫 글자 | 이름 같음, 값 대소문자 차이 |
| Card | Components / Data Display | Tone(Default, Primary, Danger, Mute, Flat); Padding(sm, md, lg) | 15 | client/src/components/ui/Card.jsx | title, desc, meta, actions, toolbar, eyebrow, media, padding(sm 16, md 20, lg 24 데스크톱), tone(default, primary, danger, mute, flat). 모서리 lg. default 는 page 면과 sh | 이름 같음, 값 대소문자 차이 |
| KeyValue | Components / Data Display | Size(md, lg) | 2 | client/src/components/ui/KeyValue.jsx | items, dense, size(md, lg). 열 간격 16, 행 간격 8(dense 4). md 라벨 caption text-meta 값 bodySm text-sec, lg 라벨 bodySm 값 body text-pri. | 이름 같음, 값 대소문자 차이 |
| SectionTitle | Components / Data Display | Size(md, lg) | 2 | client/src/components/ui/SectionTitle.jsx | title, desc, eyebrow, actions, level, size(md, lg), descSize. md 제목 type/h2, lg 제목 type/h1, 설명 type/meta text-meta. | 이름 같음, 값 대소문자 차이 |
| Skeleton | Components / Data Display | Variant(Block, Text, Card) | 3 | client/src/components/ui/Skeleton.jsx | variant(block, text, card), lines. 막대 색 line-def, 높이 12(text) 모서리 xs. 코드 애니메이션(skeleton-bar, 1.4초 line-def에서 text-ter)은 피그마 프로토타입에 없음. | 이름 같음, 값 대소문자 차이 |

## 알려진 차이
- ExportButton 과 DatePicker 의 아이콘(Download, CalendarDays)은 아이콘 부품에 없어 ChevronDown, Info 로 대체했다.
- Select 트리거 높이는 코드 md 가 모바일 44, md 이상 36이라 데스크톱 값 36으로 그렸다.
- Drawer 폭은 clamp(360, 40vw, 560)의 1200 기준 값 480으로 그렸다.

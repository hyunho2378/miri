# 코드 부품 인벤토리와 키트 대응표 (작업자 D, 2026. 11. 1.)
근거: client/src/components/ui/*.jsx 를 직접 읽음. 값은 Tailwind 클래스 원문과 tokens.js 대응.

## ui/ 부품 (우선순위 1)
| 코드 부품 | props(변형) | 실측 값(Tailwind → px) | 키트 원본(이유) | 미리 부품 이름 | 변형 속성 | 페이지 |
|---|---|---|---|---|---|---|
| Button | variant: primary, secondary, ghost, danger / size: sm, md, lg, xl / disabled, loading, leftIcon | 높이 sm 32, md 40, lg 44, xl 56(전체 폭, 모서리 xl 28). 가로 안쪽 sm 12, md 16, lg 20, xl 20. 모서리 알약(full). 굵기 700. 글자 caption(sm) body-sm(md, lg) h3(xl). secondary 는 안쪽 링 1px text-pri | iOS Buttons > Button - Content Area(Size, Style, Is Enabled, Destructive) | Button | Variant, Size, State(Default, Disabled) | Components / Buttons |
| IconButton | variant: ghost, soft, primary / size: sm, md, lg / radius: full, xs, md | 32, 40, 44 정사각. 아이콘 20 | iOS Buttons > Button - Liquid Glass - Symbol(Style, Is Enabled) | IconButton | Variant, Size, State | Components / Buttons |
| Chip | variant: outline, filled, selected / size: sm, md | 높이 sm 32, md 40 | iOS Segmented / Pop-up Buttons 없음. M3 Chips 쪽 | Chip | Variant, Size | Components / Selection |
| Badge | tone: neutral, primary, success, warning, danger, critical | 높이 20, 안쪽 6, 모서리 xs 8, caption 12 | 키트 없음(미리 고유, StatusPill 규칙) | Badge | Tone | Components / Data Display |
| Toggle | checked, disabled, label | 트랙 44x24 알약, 켬 text-pri 면, 끔 line-strong 면, hit area 모바일 44 | iOS Toggles | Toggle | Checked(On, Off), State(Default, Disabled) | Components / Selection |
| Avatar | size: sm, md, lg | 24, 32, 40 원, primary 면 | 키트 없음 | Avatar | Size | Components / Data Display |
| Tabs | variant: underline, pill | 밑줄 2px / 알약 | iOS Segmented Controls, M3 Tabs | Tabs | Variant | Components / Navigation |
| SegmentControl | items, value | role=radio | iOS Segmented Controls | SegmentControl | 개수 | Components / Selection |
| Card | tone: default, flat 등 / padding: none, sm, md, lg | 모서리 lg 16, 안쪽 sm 12~16, md 16~20, lg 20~24 | iOS Lists(그룹 카드) | Card | Tone, Padding | Components / Data Display |
| Modal, Drawer, Toast, Tooltip, EmptyState, Input, Textarea, Select, MultiSelect, Checkbox, DatePicker, NumberStepper, Pagination, Skeleton, Disclosure, FilterBar, ChoiceChips, KeyValue, SectionTitle, ExportButton | (읽기 전 단계, 다음 차례) | | iOS Alerts, Sheets, Text Fields, Steppers, Empty States 등 | | | |
## console/ dashboard/ miri/ 도메인 부품
다음 차례. 목록: ConditionMenu, DataList, DetailSection, InfoRows, LinkRow, ListDetail, ListItem, NumberFlow, PageHeader, Section, StatusBand, StatusChip, SummaryRows / BarChart, DataTable, Heatmap, StatusPill, TableCard, VillageBars / GradeChip, MetricCard, StepIndicator, DeadlineClock, ShortageValue

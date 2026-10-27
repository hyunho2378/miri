# 콘솔 공용 부품 (목록과 상세 구조)
1. 화면 뼈대: PageShell(hideHeader) 안에 PageHeader, StatusBand, NumberFlow, ListDetail 순으로 쌓는다.
2. PageHeader({ title, action }): 화면 이름과 오른쪽 주 행동 하나. 설명 줄 없음.
3. StatusBand({ tag, tone, action, children }): 쉬운 문장 한 줄. 경보 태그(StatusChip)는 이 띠에만.
4. NumberFlow({ items:[{ label, value, unit, note, tone }] }): 같은 크기 숫자를 화살표로 이어 한 줄.
5. ListDetail({ items, selectedId, onSelect, listLabel, listTitle }) 안에 상세를 children 으로 넣는다. 1040px 이상 두 칸, 좁으면 위아래.
6. items 한 줄은 { id, icon, title, sub, trailing, chip } 이고 ListItem 이 그린다. 선택은 면 색과 굵은 제목만.
7. 키보드는 ListDetail 이 처리한다(위아래, Home, End). 선택 상태는 aria-selected.
8. 상세는 DetailSection title="결론", "할 일", "근거" 순으로 쌓는다. 박스 중첩 금지.
9. StatusChip({ tone: danger | primary | neutral }): 상태 태그. 경보색은 태그와 단추 한두 곳에만.
10. 테두리, 옆 강조 막대, 파란 점 머리표, 설명 줄 금지. 숫자는 기존 계산 함수에서만 읽는다.

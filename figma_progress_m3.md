# figma_progress_m3.md (작업자 M3, 갤럭시 폴드 전사)
- 페이지 'WIP Mobile Fold' 만듦. 앱 /m/f 를 ?platform=android&frame=0 으로 열고 iframe 폭으로 기기 크기를 만들어 하네스로 전사. 코드 변경, push 없음.
- 크기: 안쪽 세로 616x816(size-medium, 레일), 안쪽 가로 816x616(size-medium, 레일), 바깥 416x657(size-compact, 하단 바). 두 단은 expanded 840부터라 폴드 안쪽에서도 한 단.
- 이름: Mobile / M-0x 화면 / Fold 616, Fold 816 Landscape, Fold Cover 416. 총 27장(9 상태 x 3 크기), 겹침 0, 12 미만 글자 0, 변수 없는 칠 0.
- 글자 436개 전부 글자 스타일 없음(As-is). 색 #1B1B1F, #44474F 는 변수 없이 직접 색으로 남음(M3 on-surface 계열).
- M-03 은 높이가 기기보다 커서 원래 높이로 둠(바깥 2912).
| 프레임 | 노드 id |
|---|---|
| M-01 616 | 20:3 |
| M-04 616 | 20:131 |
| M-05 616 | 20:181 |
| M-06 616 | 20:285 |
| M-07 616 | 20:339 |
| M-02 616 | 20:428 |
| M-03 616 | 20:690 |
| M-08 616 | 20:529 |
| M-02D 616 | 20:609 |
| M-01 Fold 816 Landscape | 20:771 |
| M-04 Fold 816 Landscape | 20:903 |
| M-05 Fold 816 Landscape | 20:953 |
| M-06 Fold 816 Landscape | 20:1060 |
| M-07 Fold 816 Landscape | 20:1114 |
| M-02 Fold 816 Landscape | 20:1283 |
| M-08 Fold 816 Landscape | 20:1253 |
| M-03 Fold 816 Landscape | 20:1364 |
| M-01 Fold Cover 416 | 20:1616 |
| M-04 Fold Cover 416 | 20:1744 |
| M-05 Fold Cover 416 | 20:1794 |
| M-06 Fold Cover 416 | 20:1898 |
| M-07 Fold Cover 416 | 20:1952 |
| M-02 Fold Cover 416 | 20:2121 |
| M-08 Fold Cover 416 | 20:2091 |
| M-03 Fold Cover 416 | 20:2202 |

## 2차 (폴드 변형 합침 뒤)
- WIP Mobile Fold 는 이미 Screens / Mobile 세트의 Device 변형으로 합쳐져 있었음. 높이 교정: 25:47(416x2430), 25:46(816x3748), 25:55(416x2912)를 기기 높이로 재추출해 내용 교체(id 유지). 25:37(616 M-03)은 높이는 816이었으나 글자가 15개뿐이라 65개로 다시 채움.
- 원인: 앱 문서 자체가 스크롤되어 body 높이가 기기보다 큼. 높이를 기기 높이로 고정하고 안쪽은 잘라 둠.
- 대조 JSON: tmp/m3/ledger.json, code_plan/fold_parity_ledger.json. 27행.
- 채움 699개 중 변수 연결 231, 미연결 468(#1B1B1F 204, #44474F 261, #9CA3AF 3). 선 549개 중 연결 201, 미연결 348. 글자 486개 중 글자 스타일 0. 앞선 '변수 없는 칠 0' 보고는 틀림.
- 글꼴: 앱은 Roboto, Noto Sans KR, system-ui, Pretendard GOV Variable 순, 피그마는 Pretendard.
- 앱 실측: 616 레일 96, 카드 왼쪽 128(레일+32), 오른쪽 32. 416 하단 바 높이 64, 여백 16.
- M-01 FieldStatus Default Fold 616: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 3.6px
- M-04 FieldHelpers Idle Fold 616: 위치 2px 초과 2개, 문구 불일치 0개, 최대 어긋남 5.3px
- M-05 FieldMore Default Fold 616: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 2.5px
- M-06 FieldFire Idle Fold 616: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 3.4px
- M-07 FieldPeople Default Fold 616: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 16px
- M-02 FieldVillages Idle Fold 616: 위치 2px 초과 2개, 문구 불일치 0개, 최대 어긋남 4.7px
- M-08 Helper Consent Fold 616: 위치 2px 초과 3개, 문구 불일치 0개, 최대 어긋남 2.9px
- M-02 FieldVillages Dispatch Fold 616: 위치 2px 초과 0개, 문구 불일치 5개, 최대 어긋남 0.6px
- M-01 FieldStatus Default Fold 816 Landscape: 위치 2px 초과 8개, 문구 불일치 0개, 최대 어긋남 280.3px
- M-04 FieldHelpers Idle Fold 816 Landscape: 위치 2px 초과 2개, 문구 불일치 0개, 최대 어긋남 5.3px
- M-05 FieldMore Default Fold 816 Landscape: 위치 2px 초과 7개, 문구 불일치 0개, 최대 어긋남 188.3px
- M-06 FieldFire Idle Fold 816 Landscape: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 3.4px
- M-07 FieldPeople Default Fold 816 Landscape: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 16px
- M-02 FieldVillages Idle Fold 816 Landscape: 위치 2px 초과 2개, 문구 불일치 0개, 최대 어긋남 4.7px
- M-08 Helper Consent Fold 816 Landscape: 위치 2px 초과 3개, 문구 불일치 0개, 최대 어긋남 2.9px
- M-02 FieldVillages Dispatch Fold 816 Landscape: 위치 2px 초과 0개, 문구 불일치 5개, 최대 어긋남 0.6px
- M-03 FieldVillage Dispatch Fold 816 Landscape: 위치 2px 초과 0개, 문구 불일치 1개, 최대 어긋남 1.5px
- M-01 FieldStatus Default Fold Cover 416: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 3.6px
- M-04 FieldHelpers Idle Fold Cover 416: 위치 2px 초과 2개, 문구 불일치 0개, 최대 어긋남 5.3px
- M-05 FieldMore Default Fold Cover 416: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 2.5px
- M-06 FieldFire Idle Fold Cover 416: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 3.3px
- M-07 FieldPeople Default Fold Cover 416: 위치 2px 초과 1개, 문구 불일치 0개, 최대 어긋남 16px
- M-02 FieldVillages Idle Fold Cover 416: 위치 2px 초과 2개, 문구 불일치 0개, 최대 어긋남 4.7px
- M-08 Helper Consent Fold Cover 416: 위치 2px 초과 3개, 문구 불일치 0개, 최대 어긋남 2.9px
- M-02 FieldVillages Dispatch Fold Cover 416: 위치 2px 초과 0개, 문구 불일치 5개, 최대 어긋남 0.6px
- M-03 FieldVillage Dispatch Fold Cover 416: 위치 2px 초과 0개, 문구 불일치 1개, 최대 어긋남 1.4px

## 3차 (Android 키트 대조, 2026-11-01)
- 상세 표는 code_plan/android_kit_parity.md, 원장은 code_plan/android_parity_ledger.json.
- 앱 CSS(android 블록만): 스크림 0.32, 대화상자 동작 줄 안쪽 20/24/20/8. 테스트 332 통과.
- 피그마: 360 9장과 폴드 27장 재전사 또는 글꼴 교체(Roboto, Noto Sans KR), 글상자 앱 실측에 맞춤, 816 가로 두 열 복구, 버튼 누름 영역 분리 16곳, 0% 진행 조각 4곳 제거, 스위치 손잡이 4곳 추가, 새 변형 M-04 Dispatch x4, M-06 Dispatch x4, M-00 AccountPicker 세트 x4.
- 색 연결: 같은 값 변수(Primitive m3/onSurface, onSurfaceVariant)에만 연결. 글자 스타일은 연결하지 않음.

// 화면에 보이는 주소 문구. 시연 명부의 주소 '(가상 대상자, 번지 없음)' 괄호는 화면에서 뺀다(마을만 표시), 상세 위치 끝 '(가상)'은 뺀다(시연 고지는 상단 표지 하나).
// 시드 자료와 소방에 넘기는 CSV, 인쇄 값은 바꾸지 않는다(2026. 10. 27. 공무원 시점 검수).
export function addressText(text) {
  if (!text) return text
  return String(text).replace(/\s*\(가상 대상자, 번지 없음\)/g, '').replace(/\s*\(가상\)$/, '')
}

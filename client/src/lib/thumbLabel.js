// 문서함 서식 미리보기의 파란 머리말. '문서 (협조 요청 공문)'처럼 종류 뒤에 서식 이름을 괄호로 적는다.
export const KIND_LABEL = { doc: '문서', sheet: '시트', form: '설문지' }
export const thumbHeadLabel = (kind, title) => `${KIND_LABEL[kind] || KIND_LABEL.doc} (${title})`

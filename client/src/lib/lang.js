// 데이터에 실려 오는 다국어 값을 현재 언어로 고른다. UI 문자열은 i18n 사전이 맡고
// 이 파일은 기관명과 시설명처럼 백엔드(지금은 mock)가 주는 값만 다룬다.
// 값이 문자열이면 그대로 쓴다. 기관을 새로 개통하면 이름이 한 언어뿐이기 때문이다.

export function pickText(value, lang) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[lang] || value.ko || ''
}

// 시설명. name_en name_ja name_zh 가 있으면 그 값을, 없으면 한국어 name 으로 떨어진다
export function facilityName(facility, lang) {
  if (!facility) return ''
  if (lang === 'ko') return facility.name || ''
  return facility[`name_${lang}`] || facility.name || ''
}

// 추천 질문. 설정이 key 를 주면 i18n 사전에서 현재 언어 문장을 꺼낸다.
// key 가 없으면 기관이 직접 등록한 질문이므로 설정에 실린 문자열을 그대로 쓴다
export function localizeSuggestion(s, t) {
  if (!s?.key) return s
  return { ...s, label: t(`chat.suggestion.${s.key}Label`), question: t(`chat.suggestion.${s.key}Question`) }
}

// 운영시간 문자열. 시각 범위(06:00~22:00)는 언어와 무관하지만 휴관 24시간 입실 퇴실 같은
// 낱말은 한국어 원문이라 그대로 두면 언어를 바꿔도 남는다. 낱말만 현재 언어 표기로 바꾼다
const CLOSED = /^(휴관|휴장|정기휴무)$/
const ALL_DAY = /^24\s*시간$/
const STAY = /^입실\s*(\d{1,2}:\d{2})\s*퇴실\s*(\d{1,2}:\d{2})$/

export function hoursText(value, t) {
  const v = (value || '').trim()
  if (!v) return ''
  if (CLOSED.test(v)) return t('common.status.closed')
  if (ALL_DAY.test(v)) return t('facility.hours.allDay')
  const stay = STAY.exec(v)
  if (stay) return t('facility.hours.stay', { in: stay[1], out: stay[2] })
  return v
}

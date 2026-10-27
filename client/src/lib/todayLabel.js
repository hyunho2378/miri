// 화면 머리의 날짜. '10월 27일 화요일'. 오늘 날짜로 계산한다
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export const todayLabel = (d = new Date()) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`

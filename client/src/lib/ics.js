// ics.js 예약 결과를 캘린더 파일로 내보낸다. 의존성 없이 문자열로 만든다.
// RFC 5545 최소 형태. 줄바꿈은 CRLF 여야 하고 본문 쉼표와 세미콜론은 이스케이프한다.
const pad = (n) => String(n).padStart(2, '0')

// 로컬 시각을 그대로 쓴다. TZID 없이 floating time 이면 어느 지역에서 열어도 적힌 시각이다
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

// date "2026-09-12", time "18:00~19:00"
export function buildIcs({ code, title, date, time, location, description }) {
  const [from, to] = String(time || '').split('~')
  const start = new Date(`${date}T${(from || '09:00').trim()}:00`)
  const end = new Date(`${date}T${(to || from || '10:00').trim()}:00`)
  if (end <= start) end.setHours(start.getHours() + 1)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//G-Chat//Reservation//KO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${code}@g-chat`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`,
    location ? `LOCATION:${esc(location)}` : null,
    description ? `DESCRIPTION:${esc(description)}` : null,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')
}

export function downloadIcs(reservation) {
  const text = buildIcs(reservation)
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${reservation.code}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 즉시 해제하면 사파리에서 저장이 취소된다. 다음 틱에 푼다
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

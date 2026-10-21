export const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
export const timeValue = (hour,minute) => String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')

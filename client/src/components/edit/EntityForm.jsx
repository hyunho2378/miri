// 필드 정의 기반 폼(dah EntityCrud 구조, G-Chat 토큰).
// fields: [{ key, label, kind: 'text'|'number'|'select'|'multiselect'|'toggle'|'date', options, hint, required, disabled }]
// date 는 네이티브 날짜 입력 대신 YYYY-MM-DD 텍스트 입력. 값은 ms 로 주고받는다.
import Input from '../ui/Input.jsx'
import MultiSelect from '../ui/MultiSelect.jsx'
import Select from '../ui/Select.jsx'
import Toggle from '../ui/Toggle.jsx'

const pad = (n) => String(n).padStart(2, '0')
export const msToYmd = (ms) => {
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const ymdToMs = (s) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec((s || '').trim())
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
}

export function validate(fields, value) {
  const errors = {}
  for (const f of fields) {
    const v = value[f.key]
    if (f.required && (v == null || v === '' || (Array.isArray(v) && !v.length))) errors[f.key] = `${f.label} 입력 필요`
    if (f.kind === 'date' && v && ymdToMs(v) == null) errors[f.key] = 'YYYY-MM-DD 형식 입력 필요'
  }
  return errors
}

export default function EntityForm({ fields, value, onChange, errors = {} }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const v = value[f.key]
        if (f.kind === 'select') {
          return <Select key={f.key} label={f.label} value={v} options={f.options} onChange={(x) => set(f.key, x)} error={errors[f.key]} disabled={f.disabled} />
        }
        if (f.kind === 'multiselect') {
          return <MultiSelect key={f.key} label={f.label} values={v || []} options={f.options} onChange={(x) => set(f.key, x)} />
        }
        if (f.kind === 'toggle') {
          return <Toggle key={f.key} label={f.label} checked={!!v} onChange={(x) => set(f.key, x)} disabled={f.disabled} />
        }
        return (
          <Input
            key={f.key} label={f.label} value={v ?? ''} hint={f.hint} error={errors[f.key]} disabled={f.disabled}
            inputMode={f.kind === 'number' ? 'numeric' : undefined}
            placeholder={f.kind === 'date' ? 'YYYY-MM-DD' : f.placeholder}
            onChange={(e) => set(f.key, f.kind === 'number' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value)}
          />
        )
      })}
    </div>
  )
}

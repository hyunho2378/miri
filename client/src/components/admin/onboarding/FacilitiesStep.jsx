// 2단계 시설 등록. CSV 를 붙여 넣거나 파일로 올린다. 오류 행은 표에서 바로 보인다.
import { useState } from 'react'
import clsx from 'clsx'
import { Plus, Upload } from 'lucide-react'
import { useLang } from '../../../i18n/LangContext.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import Select from '../../ui/Select.jsx'
import StatusPill from '../../dashboard/StatusPill.jsx'

const TYPES = ['sports', 'culture', 'tourism', 'parking', 'etc']
const COLS = ['name', 'type', 'address', 'phone', 'department', 'hours']
const COL_KEY = {
  name: 'colName', type: 'colType', address: 'colAddress',
  phone: 'colPhone', department: 'colDept', hours: 'colHours'
}

// 열 순서는 시설명, 유형, 주소, 전화, 부서, 운영시간이다. 유형은 목록 안에 있어야 한다
export function parseCsv(text) {
  const rows = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const cells = line.split(',').map((c) => c.trim())
    if (/^(시설명|name)$/i.test(cells[0])) continue          // 머리글 행은 건너뛴다
    const row = Object.fromEntries(COLS.map((c, i) => [c, cells[i] || '']))
    const errors = []
    if (!row.name) errors.push('name')
    if (!TYPES.includes(row.type)) errors.push('type')
    if (cells.length < COLS.length) errors.push('columns')
    rows.push({ ...row, errors })
  }
  return rows
}

export default function FacilitiesStep({ value, onChange }) {
  const { t } = useLang()
  const [draft, setDraft] = useState({ name: '', type: 'sports', address: '', phone: '', department: '', hours: '' })

  const load = (text) => onChange(parseCsv(text))
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then(load)
  }
  const addManual = () => {
    if (!draft.name.trim()) return
    onChange([...value, { ...draft, errors: [] }])
    setDraft({ name: '', type: 'sports', address: '', phone: '', department: '', hours: '' })
  }

  const bad = value.filter((r) => r.errors.length).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="pressable inline-flex items-center gap-2 min-h-11 px-4 rounded-md bg-primary text-text-inverse type-body-sm font-medium hover:bg-primary-hover transition-colors duration-fast cursor-pointer">
          <Upload size={16} aria-hidden="true" />
          {t('admin.onboarding.csvUpload')}
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
        </label>
        <p className="type-meta text-text-meta">{t('admin.onboarding.csvFormat')}</p>
      </div>

      {value.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="type-body-sm text-text-sec tabular-nums">{t('admin.onboarding.csvParsed', { n: value.length })}</p>
            {bad > 0 && (
              <>
                <StatusPill size="sm" status="wrong" label={t('admin.onboarding.csvError', { n: bad })} />
                <p className="type-meta text-text-meta">{t('admin.onboarding.csvErrorHint')}</p>
              </>
            )}
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-subtle">
                  {COLS.map((c) => (
                    <th key={c} className="px-3 py-2 type-caption font-semibold text-text-meta">
                      {t(`admin.onboarding.${COL_KEY[c]}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className={clsx('border-t border-line-sub', r.errors.length && 'bg-danger-soft')}>
                    {COLS.map((c) => (
                      <td key={c} className="px-3 py-2 type-body-sm text-text-sec">
                        {c === 'type' && r.errors.includes('type')
                          ? <span className="text-danger-text">{r[c] || '-'}</span>
                          : c === 'type' ? t(`facility.filter.${r[c]}`) : r[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="border-t border-line-sub pt-5">
        <p className="type-caption text-text-meta">{t('admin.onboarding.csvAdd')}</p>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <Input label={t('admin.onboarding.colName')} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          <Select
            label={t('admin.onboarding.colType')} value={draft.type} onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
            options={TYPES.map((v) => ({ value: v, label: t(`facility.filter.${v}`) }))}
          />
          <Input label={t('admin.onboarding.colAddress')} value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} />
          <Input label={t('admin.onboarding.colPhone')} value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
          <Input label={t('admin.onboarding.colDept')} value={draft.department} onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))} />
          <Input label={t('admin.onboarding.colHours')} value={draft.hours} onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))} />
        </div>
        <div className="mt-3">
          <Button size="sm" variant="secondary" leftIcon={<Plus size={16} aria-hidden="true" />} onClick={addManual}>
            {t('common.action.add')}
          </Button>
        </div>
      </div>
    </div>
  )
}

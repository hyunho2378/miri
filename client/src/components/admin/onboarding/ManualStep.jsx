// 3단계 자료 업로드. 운영 매뉴얼과 규정과 FAQ 를 올린다. 이게 지식베이스의 원본이다.
import { useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { useLang } from '../../../i18n/LangContext.jsx'
import Button from '../../ui/Button.jsx'
import IconButton from '../../ui/IconButton.jsx'
import MultiSelect from '../../ui/MultiSelect.jsx'
import Select from '../../ui/Select.jsx'

const KINDS = ['manual', 'regulation', 'faq', 'notice']
const ACCEPT = '.pdf,.docx,.hwpx,.md'

export default function ManualStep({ value, onChange, facilities }) {
  const { t } = useLang()
  const [kind, setKind] = useState('manual')
  const [facilityIds, setFacilityIds] = useState([])

  const onFiles = (e) => {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    onChange([...value, ...files.map((f) => ({ name: f.name, size: f.size, kind, facilityIds }))])
    e.target.value = ''
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label={t('admin.onboarding.manualKind')} value={kind} onChange={setKind}
          options={KINDS.map((k) => ({ value: k, label: t(`admin.kind.${k}`) }))}
        />
        <MultiSelect
          label={t('admin.onboarding.manualFacility')} value={facilityIds} onChange={setFacilityIds}
          options={facilities.map((f, i) => ({ value: f.id || `new-${i}`, label: f.name }))}
        />
      </div>

      <label className="flex flex-col items-center justify-center gap-2 rounded-lg bg-subtle px-4 py-10 text-center cursor-pointer hover:bg-mute transition-colors duration-fast">
        <Upload size={24} aria-hidden="true" className="text-text-meta" />
        <span className="type-body-sm font-medium text-primary">{t('admin.onboarding.manualPick')}</span>
        <span className="type-meta text-text-meta">{t('admin.onboarding.manualHint')}</span>
        <input type="file" accept={ACCEPT} multiple className="sr-only" onChange={onFiles} />
      </label>

      {value.length === 0 ? (
        <p className="type-body-sm text-text-meta">{t('admin.onboarding.manualEmpty')}</p>
      ) : (
        <div>
          <p className="type-caption text-text-meta tabular-nums">{t('admin.onboarding.manualCount', { n: value.length })}</p>
          <ul className="mt-2 space-y-2">
            {value.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-md bg-subtle px-3 py-2">
                <FileText size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
                <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri">{f.name}</span>
                <span className="shrink-0 type-meta text-text-meta">{t(`admin.kind.${f.kind}`)}</span>
                <IconButton size="sm" aria-label={t('common.action.delete')} onClick={() => onChange(value.filter((_, k) => k !== i))}>
                  <X size={16} aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

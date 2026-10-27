// 서류 업로드와 판독 진행 표시. 실제 파일은 서버 판독(/api/intake), 샘플은 모의 AI 응답.
// 진행 단계: 글자 인식, 등급 판정, 근거 추출, 원문 대조
import { useId, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, FileUp, Loader2, ScanText } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Select from '../ui/Select.jsx'
import Checkbox from '../ui/Checkbox.jsx'

export const READ_STEPS = ['글자 인식', '등급 판정', '근거 추출', '원문 대조']

export function ReadTimeline({ name, step, failed, steps = READ_STEPS, title = '서류 읽기 진행 중' }) {
  return (
    <div role="status" aria-live="polite" className="rounded-md bg-subtle p-4">
      <p className="inline-flex items-center gap-1 type-caption text-text-sec"><ScanText size={16} aria-hidden="true" />{title}</p>
      <p className="mt-1 type-body-sm text-text-pri truncate">{name}</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-4">
        {steps.map((s, i) => {
          const done = step > i
          const active = step === i && !failed
          return (
            <li key={s} className={clsx('flex items-center gap-2 rounded-md px-3 py-2 type-caption animate-fade-in', done ? 'bg-page text-text-sec' : active ? 'bg-text-pri text-text-inverse' : 'bg-mute text-text-meta')}>
              {done ? <Check size={16} aria-hidden="true" /> : active ? <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <span className="h-4 w-4 tabular-nums">{i + 1}</span>}
              {s}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function IntakeUploader({ villages, onFile, onSample, onReal, realCases = [], busy }) {
  const inputId = useId()
  const fileRef = useRef(null)
  const [village, setVillage] = useState(villages[0]?.code)
  const [kind, setKind] = useState('plan')
  const [drag, setDrag] = useState(false)
  // 실제 개인정보 서류 업로드 금지. 가상 자료임을 고른 뒤에만 파일을 받는다
  const [virtualOk, setVirtualOk] = useState(false)
  const take = (file) => { if (file && !busy && virtualOk) onFile(file, { villageCode: village, kind }) }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="대상 마을" value={village} onChange={setVillage} options={villages.map((v) => ({ value: v.code, label: v.label, secondary: v.code }))} />
        <Select label="문서 종류" value={kind} onChange={setKind} options={[{ value: 'plan', label: '대피계획서' }, { value: 'card', label: '대피카드' }, { value: 'etc', label: '기타' }]} />
      </div>
      <div role="note" className="rounded-md bg-danger-soft p-4 text-danger-text">
        <p className="type-strong">개인정보 없는 자료만 업로드</p>
        <p className="mt-1 type-meta">실제 주민의 이름, 연락처, 주소, 주민번호가 담긴 서류는 올리지 마십시오. 개인정보로 보이는 글자가 남으면 읽기를 멈춥니다.</p>
        <Checkbox className="mt-2" checked={virtualOk} onChange={setVirtualOk} label="개인정보 없는 자료임을 확인" />
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]) }}
        className={clsx('rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-fast', drag ? 'border-line-strong bg-primary-soft' : 'border-line-def bg-subtle')}
      >
        <FileUp size={32} aria-hidden="true" className={clsx('mx-auto', drag ? 'text-primary' : 'text-text-meta')} />
        <p className={clsx('mt-2', drag ? 'type-strong text-primary-text' : 'type-body-sm text-text-sec')}>{drag ? '놓으면 서류 읽기 시작' : '사진 또는 스캔 이미지 끌어놓기'}</p>
        <p className="mt-1 type-meta text-text-meta">이미지 파일 6MB 이하</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <label htmlFor={inputId} aria-disabled={busy || !virtualOk} className={clsx('pressable inline-flex items-center gap-2 h-10 min-h-11 md:min-h-0 px-4 rounded-md bg-page text-text-pri shadow-sm hover:bg-mute type-strong cursor-pointer', (busy || !virtualOk) && 'pointer-events-none opacity-40')}>
            <FileUp size={16} aria-hidden="true" />파일 선택
          </label>
          <input id={inputId} ref={fileRef} type="file" accept="image/png,image/jpeg,image/tiff,application/pdf" className="sr-only" disabled={busy || !virtualOk}
            onChange={(e) => { take(e.target.files?.[0]); e.target.value = '' }} />
          <Button variant="secondary" onClick={onSample} disabled={busy} leftIcon={<ScanText size={16} aria-hidden="true" />}>예시 서류 읽기</Button>
        </div>
      </div>
      {realCases.length > 0 && (
        <div className="mt-4">
          <p className="type-strong text-text-pri">읽기 예시</p>
          <p className="mt-1 type-meta text-text-meta">2026. 10. 22. HyperCLOVA X HCX-005가 읽은 결과, 개인정보는 가림</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {realCases.map((c) => (
              <Button key={c.id} variant="primary" onClick={() => onReal?.(c)} disabled={busy}>{c.name.replace(/^(실제 판독 사례|읽기 예시) /, '')}</Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

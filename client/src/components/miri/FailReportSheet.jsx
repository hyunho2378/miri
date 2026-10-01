// 이송 실패 보고(COMPONENTS 3절). 바텀시트가 아니라 Modal. 사유 칩 단일 선택 + 선택 메모.
import { useEffect, useState } from 'react'
import { FAIL_REASONS } from '../../lib/dispatchSim.js'
import Button from '../ui/Button.jsx'
import Chip from '../ui/Chip.jsx'
import Modal from '../ui/Modal.jsx'
import Textarea from '../ui/Textarea.jsx'

export default function FailReportSheet({ open, personCode, onClose, onSubmit }) {
  const [reason, setReason] = useState(null)
  const [memo, setMemo] = useState('')
  useEffect(() => { if (open) { setReason(null); setMemo('') } }, [open])
  return (
    <Modal
      open={open} onClose={onClose} title="이송 실패 보고"
      footer={(
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>취소</Button>
          <Button variant="danger" size="lg" disabled={!reason} onClick={() => onSubmit(reason, memo.trim())}>보고</Button>
        </>
      )}
    >
      <p className="type-body text-text-sec">대상자 <span className="tabular-nums text-text-pri">{personCode}</span>. 담당자 화면 상단에 바로 표시</p>
      <fieldset className="mt-4">
        <legend className="type-caption text-text-sec">실패 사유</legend>
        <div role="radiogroup" aria-label="실패 사유" className="mt-2 flex flex-wrap gap-2">
          {Object.entries(FAIL_REASONS).map(([k, label]) => (
            <Chip
              key={k} size="md" role="radio" aria-checked={reason === k}
              variant={reason === k ? 'selected' : 'outline'} onClick={() => setReason(k)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Textarea className="mt-4" label="메모 (선택)" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="현장 상황" />
    </Modal>
  )
}

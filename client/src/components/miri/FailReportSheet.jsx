// 이송 실패 보고(COMPONENTS 3절). 바텀시트가 아니라 Modal. 사유 칩 단일 선택 + 선택 메모.
import { useEffect, useState } from 'react'
import { FAIL_REASONS } from '../../lib/dispatchSim.js'
import Button from '../ui/Button.jsx'
import ChoiceChips from '../ui/ChoiceChips.jsx'
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
          <Button variant="danger" size="lg" disabled={!reason} onClick={() => onSubmit(reason, memo.trim())}>실패 보고</Button>
        </>
      )}
    >
      <p className="type-body text-text-sec">대상자 <span className="tabular-nums text-text-pri">{personCode}</span>의 이송 실패를 보고합니다. 보고 내용은 담당자 화면 상단에 바로 표시됩니다.</p>
      <fieldset className="mt-4">
        <legend className="type-caption text-text-sec">실패 사유</legend>
        <ChoiceChips
          className="mt-2" label="실패 사유" size="lg" value={reason} onChange={setReason}
          options={Object.entries(FAIL_REASONS).map(([value, label]) => ({ value, label }))}
        />
      </fieldset>
      <Textarea className="mt-4" label="메모(선택)" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="현장 상황을 입력해 주십시오" />
    </Modal>
  )
}

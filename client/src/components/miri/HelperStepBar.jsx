// 도우미 단계 버튼 영역(PATTERNS 36). 다음 단계 하나만 primary 56. 실패 보고는 ghost.
import { AlertTriangle } from 'lucide-react'

export default function HelperStepBar({ nextLabel, onNext, onFail, disabled = false }) {
  return (
    <div className="sticky bottom-0 z-raised bg-page border-t border-line-sub px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <button
        type="button" onClick={onNext} disabled={disabled}
        className="pressable w-full h-14 rounded-xl bg-primary text-text-inverse type-h3 hover:bg-primary-hover disabled:opacity-40"
      >
        {nextLabel}
      </button>
      <button
        type="button" onClick={onFail} disabled={disabled}
        className="pressable mt-2 flex w-full h-11 items-center justify-center gap-2 rounded-md text-text-sec type-body hover:bg-mute disabled:opacity-40"
      >
        <AlertTriangle size={20} aria-hidden="true" />
        이송 실패 보고
      </button>
    </div>
  )
}

// 도우미 단계 버튼 영역(PATTERNS 36). 다음 단계 하나만 primary 56. 실패 보고는 ghost.
import { AlertTriangle } from 'lucide-react'
import Button from '../ui/Button.jsx'

export default function HelperStepBar({ nextLabel, onNext, onFail, disabled = false }) {
  return (
    <div className="sticky bottom-0 z-raised bg-page border-t border-line-sub px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <Button size="xl" variant="primary" onClick={onNext} disabled={disabled}>
        {nextLabel}
      </Button>
      <Button
        size="lg" variant="ghost" onClick={onFail} disabled={disabled} className="mt-2 w-full"
        leftIcon={<AlertTriangle size={20} aria-hidden="true" />}
      >
        이송 실패 보고
      </Button>
    </div>
  )
}

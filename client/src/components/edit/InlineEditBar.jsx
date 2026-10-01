// 권한 편집 바(PATTERNS 39, dah InlineEditBar 구조). 권한이 없으면 미렌더(숨김이 아니라 null).
import { Plus } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore.js'
import Button from '../ui/Button.jsx'

export default function InlineEditBar({ resource, onAdd, addLabel = '추가', children }) {
  const canEdit = useAuthStore((s) => s.canEdit(resource))
  if (!canEdit) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onAdd && (
        <Button variant="secondary" size="md" onClick={onAdd} leftIcon={<Plus size={16} aria-hidden="true" />}>{addLabel}</Button>
      )}
      {children}
    </div>
  )
}

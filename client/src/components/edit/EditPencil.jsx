// 행 단위 편집 진입(dah EditPencil 구조). 권한이 없으면 미렌더.
import { Pencil } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore.js'
import IconButton from '../ui/IconButton.jsx'

export default function EditPencil({ resource, onClick, label = '수정' }) {
  const canEdit = useAuthStore((s) => s.canEdit(resource))
  if (!canEdit) return null
  return (
    <IconButton aria-label={label} size="sm" onClick={(e) => { e.stopPropagation(); onClick?.() }}>
      <Pencil size={16} aria-hidden="true" />
    </IconButton>
  )
}

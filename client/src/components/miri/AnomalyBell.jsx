// 상단바 이상 탐지 버튼. 누르면 전체 목록 드로어. 규칙 기반 탐지임을 명시.
import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import useAnomalies from '../../hooks/useAnomalies.js'
import useNow from '../../hooks/useNow.js'
import Drawer from '../ui/Drawer.jsx'
import IconButton from '../ui/IconButton.jsx'
import AnomalyList from './AnomalyList.jsx'

export default function AnomalyBell() {
  const now = useNow(5000)
  const items = useAnomalies(now)
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton aria-label={`이상 탐지 ${items.length}건`} onClick={() => setOpen(true)}>
        <span className="relative inline-flex">
          <ShieldAlert size={20} aria-hidden="true" />
          {items.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 ring-2 ring-page type-count text-text-inverse">{items.length}</span>
          )}
        </span>
      </IconButton>
      <Drawer open={open} onClose={() => setOpen(false)} title="이상 탐지">
        <p className="mb-3 type-meta text-text-meta">정해 둔 점검 규칙에 해당하는 항목입니다. 기준값은 설정에서 변경합니다.</p>
        <AnomalyList items={items} onNavigate={() => setOpen(false)} />
      </Drawer>
    </>
  )
}

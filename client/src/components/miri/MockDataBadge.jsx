// 가상 데이터 표시(DESIGN 5절). VITE_USE_MOCK=true 일 때만. 누르면 설정의 자료 안내로 간다
import { Link } from 'react-router-dom'
import { USE_MOCK } from '../../lib/api.js'
import Badge from '../ui/Badge.jsx'

export default function MockDataBadge() {
  if (!USE_MOCK) return null
  return (
    <Link to="/console/settings#data-notes" aria-label="시연 데이터, 자료 안내 보기" className="rounded-sm hover:opacity-80">
      <Badge tone="neutral">시연 데이터</Badge>
    </Link>
  )
}

// 가상 데이터 표시(DESIGN 5절). VITE_USE_MOCK=true 일 때만.
import { USE_MOCK } from '../../lib/api.js'
import Badge from '../ui/Badge.jsx'

export default function MockDataBadge() {
  if (!USE_MOCK) return null
  return <Badge tone="neutral">가상 데이터</Badge>
}

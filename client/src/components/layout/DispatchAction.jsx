// 상단 띠의 발령 단추. 평시와 종료 뒤에는 '발령 개시'(앱 안 확인 창), 발령 중에는 '발령 운영' 바로가기.
// 개시와 종료는 시 관리자만. 동 담당자에게는 발령 중일 때 '발령 운영'만 보인다.
import { useState } from 'react'
import { Siren } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'

export default function DispatchAction() {
  const role = useAuthStore((s) => s.user?.role)
  const status = useDispatchStore((s) => s.status)
  const start = useDispatchStore((s) => s.start)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const live = ['standby', 'assigned', 'sent'].includes(status)

  if (live) {
    if (pathname === '/console/dispatch') return null
    return <Button as={Link} to="/console/dispatch" size="md" leftIcon={<Siren size={16} aria-hidden="true" />}>발령 운영</Button>
  }
  if (role !== 'city') return null
  return (
    <>
      <Button size="md" leftIcon={<Siren size={16} aria-hidden="true" />} onClick={() => setOpen(true)}>발령 개시</Button>
      <Modal
        open={open} onClose={() => setOpen(false)} title="훈련 발령 개시"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={() => { setOpen(false); if (start({ kind: 'drill', speed: 60 }) !== false) navigate('/console/dispatch') }}>개시</Button>
          </>
        )}
      >
        <ul className="grid gap-1 type-body text-text-pri">
          <li>구분: 훈련 발령</li>
          <li>속도: 실제 시간의 60배</li>
          <li>개시 후 발령 운영 화면으로 이동</li>
        </ul>
      </Modal>
    </>
  )
}

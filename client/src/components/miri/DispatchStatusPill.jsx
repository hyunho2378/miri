// 발령 상태 필. 훈련 발령이면 라벨 앞에 훈련 표기.
import useDispatchStore from '../../store/useDispatchStore.js'
import StatusPill from '../dashboard/StatusPill.jsx'

export default function DispatchStatusPill() {
  const status = useDispatchStore((s) => s.status)
  const kind = useDispatchStore((s) => s.kind)
  const shown = status === 'closed' ? 'idle' : status
  const label = shown === 'idle' ? '평시' : `${kind === 'drill' ? '훈련 ' : ''}${({ standby: '실행대기 발령', assigned: '배정 검토', sent: '이송 진행' })[shown]}`
  return <StatusPill status={shown} label={label} />
}

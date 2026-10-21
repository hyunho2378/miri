// 부품 견본 /m/kit. 주소 값 ?platform=ios|android 가 있으면 그 한 벌만 390 x 844 로, 없으면 두 벌을 나란히.
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Activity, MapPinned, Users, Menu, Car, Phone, Accessibility } from 'lucide-react'
import { normalizePlatform } from './platform.js'
import {
  MobileRoot, AppBar, Button, Card, List, ListRow, Chip, Segmented, Toggle, Progress, Spinner,
  Sheet, Dialog, Banner, EmptyState, BottomNav, useMobileToast, DisplaySettings, FilledInput
} from './ui.jsx'

function KitBody({ platform }) {
  const [seg, setSeg] = useState('all')
  const [toggle, setToggle] = useState(true)
  const [chip, setChip] = useState('wheel')
  const [sheet, setSheet] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [time, setTime] = useState('14:30')
  const toast = useMobileToast()
  const name = platform === 'android' ? '안드로이드' : '아이폰'
  return (
    <div className="mob-screen">
      <AppBar title={`${name} 부품`} large />
      <main className="mob-content">
        <Banner tone="blue">이송 완료 기한 16:14까지, 남은 시간 2시간 10분</Banner>
        <Card>
          <p className="mob-t-label mob-ink-3">배정 차량 V-09</p>
          <p className="mob-t-title" style={{ margin: '4px 0 8px' }}>괴란동, 묵호진동 4명</p>
          <Progress value={50} label="이송 진행 2명 중 4명" />
          <p className="mob-t-foot" style={{ marginTop: 8 }}>이송 2명 완료, 2명 남음</p>
        </Card>
        <Segmented label="보기" value={seg} onChange={setSeg} options={[{ value: 'all', label: '전체' }, { value: 'wait', label: '대기' }, { value: 'done', label: '완료' }]} />
        <List label="대상자">
          <ListRow lead={<Accessibility size={20} />} title="MS-04-014" subtitle="휠체어, 동행 연락 필요" chevron onClick={() => {}} />
          <ListRow lead={<Car size={20} />} title="MS-04-015" subtitle="부축" meta="경로 확인 필요(직선 기준)" chevron onClick={() => {}} />
          <ListRow lead={<Phone size={20} />} title="담당자 연락" trailing={<Toggle label="문자 알림" checked={toggle} onChange={setToggle} />} />
        </List>
        <div className="mob-kit-grid" role="group" aria-label="칩">
          <Chip selected={chip === 'wheel'} onClick={() => setChip('wheel')}>휠체어</Chip>
          <Chip selected={chip === 'bed'} onClick={() => setChip('bed')}>침상</Chip>
          <Chip tone="red">갱신 지연</Chip>
          <Chip tone="blue">훈련</Chip>
        </div>
        <Button block onClick={() => setDialog(true)}>수락</Button>
        <Card>
          <div className="mob-kit-grid">
            <Button variant="tonal" size="sm" onClick={() => setSheet(true)}>불가 사유</Button>
            <Button variant="gray" size="sm" onClick={() => toast('출발 보고 저장', { label: '되돌리기', onClick: () => {} })}>출발 보고</Button>
            <Button variant="plain" size="sm">연락</Button>
            <Button variant="danger-tonal" size="sm">실패 보고</Button>
            <Spinner />
          </div>
        </Card>
        <label className="mob-h-field"><span className="mob-t-label">증상 시각</span><FilledInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <EmptyState title="전송 대기 없음" body="보낸 보고가 모두 서버에 저장됨" />
        <DisplaySettings />
      </main>
      <BottomNav items={[
        { key: 's', label: '상태', icon: <Activity size={24} aria-hidden="true" />, current: true, badge: 3 },
        { key: 'v', label: '마을', icon: <MapPinned size={24} aria-hidden="true" /> },
        { key: 'h', label: '도우미', icon: <Users size={24} aria-hidden="true" /> },
        { key: 'm', label: '더보기', icon: <Menu size={24} aria-hidden="true" /> }
      ]} />
      <Sheet open={sheet} onClose={() => setSheet(false)} title="불가 사유">
        <List label="불가 사유">
          {['이동 불가', '연락 불가', '건강', '기타'].map((r) => <ListRow key={r} title={r} onClick={() => setSheet(false)} />)}
        </List>
      </Sheet>
      <Dialog open={dialog} onClose={() => setDialog(false)} title="배정을 수락할까요?" body="수락하면 담당자 화면에 바로 표시됨" actions={
        <>
          <Button variant={platform === 'android' ? 'plain' : 'gray'} size="sm" onClick={() => setDialog(false)}>취소</Button>
          <Button variant={platform === 'android' ? 'plain' : 'filled'} size="sm" onClick={() => setDialog(false)}>수락</Button>
        </>
      } />
    </div>
  )
}

export default function KitPage() {
  const { search } = useLocation()
  const only = normalizePlatform(new URLSearchParams(search).get('platform'))
  const list = only ? [only] : ['ios', 'android']
  return (
    <div className={`mob-kit-page ${only ? 'single' : ''}`}>
      {list.map((p) => (
        <div key={p} className="mob-frame" aria-label={p === 'ios' ? '아이폰 부품 견본' : '안드로이드 부품 견본'}>
          <MobileRoot platform={p}>
            <KitBody platform={p} />
          </MobileRoot>
        </div>
      ))}
    </div>
  )
}

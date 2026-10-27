// 부품 견본 /m/kit(개발용 주소, 링크 없음). 부품표(kitParts.js)에 있는 부품만 쓴다.
// 주소 값 ?platform=ios|android 가 있으면 그 한 벌만, 없으면 두 벌을 나란히. 피그마 전수 검증 캡처에 쓴다.
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { House, MapPinned, Users, Menu, Footprints, Phone, Accessibility, Info } from 'lucide-react'
import { normalizePlatform } from './platform.js'
import {
  MobileRoot, AppBar, Button, List, ListRow, Segmented, Toggle, Progress, Spinner,
  Sheet, Dialog, EmptyState, BottomNav, useMobileToast, DisplaySettings, FilledInput,
  Figure, SelectRow, BottomAction, EmergencyButton, InfoSheet
} from './ui.jsx'

function KitBody({ platform }) {
  const [seg, setSeg] = useState('all')
  const [toggle, setToggle] = useState(true)
  const [pick, setPick] = useState('ride')
  const [sheet, setSheet] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [time, setTime] = useState('14:30')
  const toast = useMobileToast()
  const name = platform === 'android' ? '안드로이드' : '아이폰'
  return (
    <div className="mob-screen">
      <AppBar title={`${name} 부품`} large trailing={<EmergencyButton onClick={() => setSheet(true)} />} />
      <main className="mob-content">
        <Figure value="16:14까지" caption="이송 완료 기한, 2시간 10분 남음" />
        <Figure plain label="우리 동 이동 불가 인원" value="24" unit="명"><Progress value={50} label="이송 진행 4명 중 2명" /></Figure>
        <Segmented label="보기" value={seg} onChange={setSeg} options={[{ value: 'all', label: '전체' }, { value: 'wait', label: '대기' }, { value: 'done', label: '완료' }]} />
        <List label="대상자">
          <ListRow lead={<Accessibility size={20} />} title="MS-04-014" subtitle="휠체어, 동행 연락 필요" chevron onClick={() => {}} />
          <ListRow lead={<Footprints size={20} />} title="MS-04-015" subtitle="부축" meta="경로 확인 필요" chevron onClick={() => {}} />
          <ListRow lead={<Phone size={20} />} title="담당자 연락" trailing={<Toggle label="문자 알림" checked={toggle} onChange={setToggle} />} />
        </List>
        <List label="역할 고르기">
          <SelectRow title="차량 동행" subtitle="대상자와 함께 이동" selected={pick === 'ride'} onSelect={() => setPick('ride')} />
          <SelectRow title="도보 지원" selected={pick === 'walk'} onSelect={() => setPick('walk')} />
        </List>
        <List label="안내"><InfoSheet lead={<Info size={20} />} title="응급 대응 안내" summary="이동 중단과 119 연결">
          <List><ListRow title="안전한 곳에서 이동을 멈춥니다" /><ListRow title="119에 위치와 상태를 알립니다" /></List>
        </InfoSheet></List>
        <label className="mob-h-field"><span className="mob-t-label">증상 시각</span><FilledInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <EmptyState title="전송 대기 없음" body="보낸 보고가 모두 서버에 저장됨" />
        <Spinner />
        <DisplaySettings />
      </main>
      <BottomAction primary={{ label: '수락', onClick: () => setDialog(true) }} secondary={{ label: '불가', onClick: () => toast('불가 응답 저장', { label: '되돌리기', onClick: () => {} }) }} />
      <BottomNav items={[
        { key: 's', label: '홈', icon: <House size={24} aria-hidden="true" />, current: true, badge: 3 },
        { key: 'v', label: '마을', icon: <MapPinned size={24} aria-hidden="true" /> },
        { key: 'h', label: '도우미', icon: <Users size={24} aria-hidden="true" /> },
        { key: 'm', label: '더보기', icon: <Menu size={24} aria-hidden="true" /> }
      ]} />
      <Sheet open={sheet} onClose={() => setSheet(false)} title="상태 악화">
        <List label="긴급">
          {['119 전화', '이송 불가', '담당자 전화'].map((r) => <ListRow key={r} title={r} chevron onClick={() => setSheet(false)} />)}
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

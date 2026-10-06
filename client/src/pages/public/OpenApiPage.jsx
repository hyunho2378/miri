// 개방 API 안내. /api/open 을 키 없이 부를 수 있다. 화면에서 바로 호출해 응답 일부를 보인다.
import { useState } from 'react'
import { Play } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'
import { REPO_URL } from '../../lib/links.js'

const ENDPOINTS = [
  { path: '/api/open', desc: '사용법, 항목 목록, 데이터 출처' },
  { path: '/api/open?kind=summary', desc: '행정동별 인구와 고령 인구, 장기요양 통계, 임시주거시설 수용 규모' },
  { path: '/api/open?kind=villages', desc: '마을(법정동) 37곳의 집결지, 추정 대상자 수, 가장 가까운 임시주거시설과 주행 시간' },
  { path: '/api/open?kind=shelters', desc: '이재민 임시주거시설 27곳의 주소, 수용 가능 인원, 면적, 지진 겸용 여부, 좌표' },
  { path: '/api/open?kind=facilities', desc: '노인요양시설과 주야간보호의 정원과 현원, 동 행정복지센터 위치' },
  { path: '/api/open?kind=scenarios', desc: '확산 시나리오 목록과 대피 대상 구역' },
  { path: '/api/open?kind=scenario&id=S-1', desc: '시나리오별 마을 부족분, 시간 부족 인원, 대피소 배정, 필요 추가 차량' }
]

export default function OpenApiPage() {
  const [sel, setSel] = useState(ENDPOINTS[6].path)
  const [out, setOut] = useState(null)
  const [busy, setBusy] = useState(false)
  const run = async (path) => {
    setSel(path); setBusy(true)
    try {
      const r = await fetch(path)
      const j = await r.json()
      setOut({ status: r.status, body: JSON.stringify(j, null, 2) })
    } catch (e) {
      setOut({ status: 0, body: `불러오지 못했습니다(${e.message})` })
    } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto w-full max-w-page space-y-8 px-4 py-10 md:px-6 lg:px-8 page-enter">
      <header>
        <h1 className="type-h1 text-text-pri">개방 API</h1>
        <p className="mt-2 max-w-3xl type-body leading-7 text-text-sec">
          키 없이 GET 으로 부릅니다. 다른 기관과 개발자가 같은 계산 결과를 가져가 쓸 수 있도록 마을 단위 집계만 공개합니다.
          개인 단위 자료는 내보내지 않습니다. 차량과 도우미 수량은 가정값이며 응답의 assumptions 에 표시합니다.
        </p>
      </header>

      <TableCard
        title="호출 주소" count={`${ENDPOINTS.length}건`} desc="응답은 JSON 이며 CORS 를 허용합니다. 결과는 1시간 동안 캐시합니다."
        columns={[
          { key: 'path', label: '주소', render: (x) => <code className="type-body-sm text-text-pri break-all">{x.path}</code> },
          { key: 'desc', label: '내용', render: (x) => <span className="type-body-sm leading-6 text-text-sec">{x.desc}</span> },
          { key: 'run', label: '시험', align: 'right', render: (x) => <Button size="sm" variant={sel === x.path ? 'primary' : 'secondary'} leftIcon={<Play size={14} aria-hidden="true" />} onClick={() => run(x.path)}>호출</Button> }
        ]}
        rows={ENDPOINTS} rowKey={(x) => x.path} pageSize={10} caption="개방 API 주소"
      />

      <Card title="응답" desc={out ? `HTTP ${out.status}, ${sel}` : '위 표에서 호출을 누르면 응답을 보입니다.'}>
        <pre className="max-h-[480px] overflow-auto rounded-md bg-mute p-4 type-meta leading-5 text-text-pri" aria-live="polite" aria-busy={busy}>
          {busy ? '불러오는 중입니다.' : out ? out.body.slice(0, 20000) : '아직 호출하지 않았습니다.'}
        </pre>
      </Card>

      <Card tone="mute" title="예시" desc="터미널이나 다른 서비스에서 이렇게 부릅니다.">
        <pre className="overflow-auto type-meta leading-5 text-text-pri">{`curl "https://miri-indol.vercel.app/api/open?kind=scenario&id=S-1"`}</pre>
        <p className="mt-3 type-body-sm text-text-sec">계산 코드와 원자료 수집 스크립트는 <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-primary-text underline">GitHub 저장소</a>에 있습니다.</p>
      </Card>
    </div>
  )
}

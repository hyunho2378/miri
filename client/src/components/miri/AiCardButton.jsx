// 담당자용 AI 정보(모델 카드). 서류 읽기 화면의 'AI 정보' 버튼을 누르면 가운데 창으로 연다.
// 내용은 lib/aiCard.AI_CARD 한 곳에서 온다(휴대폰 서류 확인 화면과 같은 내용)
import { useState } from 'react'
import { Info } from 'lucide-react'
import { AI_CARD } from '../../lib/aiCard.js'
import Button from '../ui/Button.jsx'
import Drawer from '../ui/Drawer.jsx'
import KeyValue from '../ui/KeyValue.jsx'

export default function AiCardButton({ className }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="ghost" size="sm" className={className} onClick={() => setOpen(true)} leftIcon={<Info size={16} aria-hidden="true" />}>AI 정보</Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="서류 읽기 AI 정보">
        <div className="space-y-5">
          {AI_CARD.map((s) => (
            <section key={s.title} aria-label={s.title}>
              <h3 className="type-strong text-text-pri">{s.title}</h3>
              <KeyValue className="mt-2" items={s.rows.map((r) => ({ label: r.k, value: r.v }))} />
            </section>
          ))}
          <p className="type-meta text-text-meta">항목 구성: Mitchell 외(2019) 모델 카드</p>
        </div>
      </Drawer>
    </>
  )
}

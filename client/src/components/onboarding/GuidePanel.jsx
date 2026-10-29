// 화면 안내. 상단바의 '화면 안내' 단추를 누르면 오른쪽에서 열리는 자체 패널.
// 현재 화면의 설명을 README 구조로 보여 준다(제목, 소제목 세 개, 항목 줄). 내용은 lib/screenGuide.js.
// 코치마크 투어가 있는 화면은 맨 아래 '화면 투어 시작' 단추로만 투어를 연다.
// 닫기: 닫기 단추, Esc, 패널 바깥 누르기.
import { useEffect, useRef } from 'react'
import { ChevronRight, CircleHelp, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import useAdminUi from '../../store/useAdminUi.js'
import Button from '../ui/Button.jsx'
import IconButton from '../ui/IconButton.jsx'
import { SECTIONS, guideFor } from '../../lib/screenGuide.js'
import { startCoachTour } from './CoachTour.jsx'
import { TOURS } from './tours.js'

// 상단바에 놓는 보조 단추. 글자와 물음표 아이콘.
export function GuideButton() {
  const open = useAdminUi((s) => s.guideOpen)
  const setOpen = useAdminUi((s) => s.setGuideOpen)
  return (
    <Button
      size="sm" variant="secondary" collapse="xl" leftIcon={<CircleHelp size={16} aria-hidden="true" />}
      aria-haspopup="dialog" aria-expanded={open} data-guide-trigger="1"
      onClick={() => setOpen(!open)}
    >
      화면 안내
    </Button>
  )
}

export default function GuidePanel() {
  const open = useAdminUi((s) => s.guideOpen)
  const setOpen = useAdminUi((s) => s.setGuideOpen)
  const { pathname } = useLocation()
  const closeRef = useRef(null)
  const guide = guideFor(pathname)
  const hasTour = !!(guide && TOURS[guide.path] && guide.path === pathname)

  // 화면을 옮기면 패널은 닫는다(다음 화면 안내는 다시 눌러 연다)
  useEffect(() => { setOpen(false) }, [pathname, setOpen])

  useEffect(() => {
    if (!open) return undefined
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.querySelector('[data-guide-trigger]')?.focus({ preventScroll: true })
    }
  }, [open, setOpen])

  if (!open) return null
  const lists = guide ? [guide.does, guide.look, guide.next] : []
  const startTour = () => {
    setOpen(false)
    setTimeout(startCoachTour, 260) // 패널이 닫힌 뒤 영역을 밝힌다
  }

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
      <aside
        role="dialog" aria-modal="false" aria-label={`${guide?.title || '화면'} 안내`}
        className="fixed bottom-0 right-0 top-0 z-[80] flex w-[420px] max-w-full flex-col bg-page shadow-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-8 pb-2 pt-8">
          <div className="min-w-0">
            <p className="type-meta text-text-sec">화면 안내</p>
            <h2 className="mt-1 type-h2 text-text-pri">{guide?.title || '이 화면'}</h2>
          </div>
          <IconButton ref={closeRef} aria-label="안내 닫기" onClick={() => setOpen(false)} className="shrink-0 text-text-sec">
            <X size={20} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-4">
          {guide ? (
            <div className="grid gap-8">
              {SECTIONS.map((name, i) => (
                <section key={name} aria-labelledby={`guide-h-${i}`}>
                  <h3 id={`guide-h-${i}`} className="type-title text-text-pri">{name}</h3>
                  <ul className="mt-3 grid gap-1">
                    {lists[i].map((item, k) => (
                      i === 2 ? (
                        <li key={item.to}>
                          <Link to={item.to} className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-1 -mx-3 type-body text-text-pri hover:bg-subtle">
                            <span className="min-w-0">{item.text}</span>
                            <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
                          </Link>
                        </li>
                      ) : (
                        <li key={item} className="flex gap-3 py-1 type-body text-text-pri">
                          {i === 0
                            ? <span aria-hidden="true" className="w-5 shrink-0 text-right font-bold tabular-nums text-primary-text">{k + 1}</span>
                            : <span aria-hidden="true" className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-text-meta" />}
                          <span className="min-w-0">{item}</span>
                        </li>
                      )
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="type-body text-text-sec">이 화면의 안내 없음</p>
          )}
        </div>

        {hasTour && (
          <div className="shrink-0 px-8 pb-8 pt-2">
            <Button size="lg" className="w-full" onClick={startTour}>화면 투어 시작</Button>
          </div>
        )}
      </aside>
    </>
  )
}

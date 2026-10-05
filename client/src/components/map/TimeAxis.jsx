// 상황판 아래 시간 축. 발령(0시간)부터 마지막 마을 도달까지. 슬라이더를 움직이면 시점별 이송 완료 추정이 바뀐다.
// 재생은 anime.js 로 시점 값을 움직인다. 움직임 줄이기 설정이면 1시간 단위로 끊어 넘긴다.
import { useEffect, useId, useRef } from 'react'
import { animate } from 'animejs'
import clsx from 'clsx'
import { Pause, Play } from 'lucide-react'
import IconButton from '../ui/IconButton.jsx'
import { fmtHM, HOUR } from '../../lib/time.js'
import { fmtElapsed } from '../../lib/geo.js'
import { prefersReducedMotion } from '../motion/useReducedMotion.js'

const PLAY_MS_PER_HOUR = 900
const STEP = 0.25
const caption = (prepH) => `단순 비례 가정: 마을별 이송 가능 인원이 준비 완료(발령 후 ${fmtElapsed(prepH)}) 시각부터 그 마을 도달 시각까지 같은 속도로 옮겨진다고 보고 계산한 추정치입니다. 실제 배정 순서와 다를 수 있습니다.`

export default function TimeAxis({ t, onT, timeline, t0, progress, total, playing, onPlaying }) {
  const id = useId()
  const anim = useRef(null)
  const { endH, prepH, firstArrivalH } = timeline
  const atEnd = t >= endH - 1e-6

  useEffect(() => () => anim.current?.pause(), [])

  useEffect(() => {
    if (!playing) { anim.current?.pause(); anim.current = null; return undefined }
    const start = atEnd ? 0 : t
    if (prefersReducedMotion()) {
      // 부드러운 움직임 없이 1시간씩 넘긴다
      let cur = Math.floor(start)
      onT(cur)
      const timer = setInterval(() => {
        cur = Math.min(endH, cur + 1)
        onT(cur)
        if (cur >= endH) { clearInterval(timer); onPlaying(false) }
      }, PLAY_MS_PER_HOUR)
      return () => clearInterval(timer)
    }
    const box = { t: start }
    anim.current = animate(box, {
      t: endH,
      duration: Math.max(300, (endH - start) * PLAY_MS_PER_HOUR),
      ease: 'linear',
      onUpdate: () => onT(Math.round(box.t * 20) / 20),
      onComplete: () => { onT(endH); onPlaying(false) }
    })
    return () => anim.current?.pause()
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps

  // 라벨은 발령, 첫 도달, 마지막 도달 셋. 준비 완료는 눈금과 안내 문장으로만 보인다(라벨이 겹치지 않게)
  // 첫 도달과 마지막 도달이 가까우면(축의 30% 이내) 오른쪽 끝 라벨 하나로 합친다
  const single = Math.abs(firstArrivalH - endH) < 0.01
  const close = !single && (endH - firstArrivalH) / endH < 0.3
  const ticks = single
    ? [{ h: 0, label: '발령' }, { h: endH, label: '도달' }]
    : close
      ? [{ h: 0, label: '발령' }, { h: endH, label: `첫 도달 ${fmtElapsed(firstArrivalH)}, 마지막 도달`, raw: true }]
    : [{ h: 0, label: '발령' }, { h: firstArrivalH, label: '첫 도달' }, { h: endH, label: '마지막 도달' }]
  const hours = Array.from({ length: Math.floor(endH) + 1 }, (_, i) => i)

  const pct = (h) => `${(h / endH) * 100}%`
  const now = t0 + t * HOUR
  const valueText = `발령 후 ${fmtElapsed(t)}, ${fmtHM(now)}. 이송 완료 추정 ${progress.moved}명, 대기 ${progress.waiting}명`

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="type-strong text-text-pri tabular-nums">
          {t <= 0 ? '발령 시각' : `발령 후 ${fmtElapsed(t)}`}
          <span className="ml-2 type-body-sm text-text-meta">{fmtHM(now)}</span>
          {atEnd && <span className="ml-2 type-caption text-text-sec">{single ? '도달 시점' : '마지막 마을 도달 시점'}</span>}
        </p>
        <p className="type-body-sm text-text-sec tabular-nums">
          이송 완료 추정 <span className="type-strong text-text-pri">{progress.moved}명</span>
          <span className="mx-1 text-text-ter" aria-hidden="true">/</span>
          대상자 {total}명, 대기 <span className={progress.waiting ? 'type-strong text-danger-text' : 'type-strong text-text-pri'}>{progress.waiting}명</span>
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <IconButton
          variant="soft" size="md" aria-label={playing ? '재생 멈춤' : '발령부터 재생'}
          onClick={() => onPlaying(!playing)}
        >
          {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </IconButton>
        <div className="relative min-w-0 flex-1 pb-5">
          <label htmlFor={id} className="sr-only">발령 후 경과 시간</label>
          <input
            id={id} type="range" min={0} max={endH} step={STEP} value={t}
            onChange={(e) => { onPlaying(false); onT(Number(e.target.value)) }}
            aria-valuetext={valueText}
            className="block h-6 w-full cursor-pointer accent-primary"
          />
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-5 h-1">
            {hours.map((h) => (
              <span key={h} className={clsx('absolute top-0 h-1 w-px', Math.abs(h - prepH) < 0.01 ? 'bg-primary' : 'bg-line-strong')} style={{ left: pct(h) }} />
            ))}
          </span>
          {ticks.map((x, i) => (
            <span
              key={x.label}
              className={clsx('absolute top-6 whitespace-nowrap type-meta text-text-meta', i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : 'hidden -translate-x-1/2 md:block')}
              style={{ left: pct(x.h) }}
            >
              {x.h ? `${x.label} ${fmtElapsed(x.h)}` : x.label}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-1 type-meta text-text-meta">{caption(prepH)}</p>
    </div>
  )
}

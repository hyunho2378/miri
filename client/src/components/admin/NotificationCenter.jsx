// 알림 센터. Topbar 벨에 붙는 드롭다운이다.
// 알림은 mock 상태(색인 로그·KPI·인계 대기)에서 파생한다. 설정 알림 탭에서 끈 유형은 만들지 않는다.
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Bell, BookOpen, CheckCheck, Rocket, TrendingDown, UserRoundCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import { formatDate } from '../../lib/format.js'
import usePopExit from '../../hooks/usePopExit.js'
import useNotifications, { unreadCount } from '../../store/useNotifications.js'
import IconButton from '../ui/IconButton.jsx'

const ICON = {
  indexFailed: BookOpen,
  accuracyDrop: TrendingDown,
  handoffNew: UserRoundCheck,
  onboardingDone: Rocket
}

export default function NotificationCenter() {
  const { t } = useLang()
  const items = useNotifications((s) => s.items)
  const build = useNotifications((s) => s.build)
  const markRead = useNotifications((s) => s.markRead)
  const markAllRead = useNotifications((s) => s.markAllRead)
  const [open, setOpen] = useState(false)
  const [instant, setInstant] = useState(false)
  const { mounted, closing } = usePopExit(open, instant)
  const rootRef = useRef(null)

  // 관리자 면에 들어오면 한 번 만든다. 설정 알림 탭 값이 유형을 켜고 끈다
  useEffect(() => {
    let alive = true
    Promise.all([
      get('/api/admin/knowledge/index-status'),
      get('/api/admin/kpi?range=7d'),
      get('/api/admin/handoff?status=wait'),
      get('/api/admin/settings')
    ]).then(([index, kpi, handoff, settings]) => {
      if (alive) build({ index, kpi, handoff, settings })
    }).catch(() => {})
    return () => { alive = false }
  }, [build])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const unread = unreadCount(items)

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        size="lg" aria-label={t('admin.topbar.alerts')} aria-expanded={open}
        onClick={(e) => { setInstant(e.detail === 0); setOpen((v) => !v) }}
      >
        <span className="relative inline-flex">
          <Bell size={20} aria-hidden="true" />
          {/* 8단계. 배지가 벨을 거의 다 덮었다. 카운트 인디케이터는 배지가 아니라 16px 알약이다.
              벨 우상단 밖으로 빼고 page 색 링으로 벨 획과 떼어 놓는다.
              두 자리 이상이면 min-w 를 넘겨 알약으로 늘어난다 */}
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 ring-2 ring-page type-count text-text-inverse">
              {unread}
            </span>
          )}
        </span>
      </IconButton>

      {mounted && (
        <div
          className={clsx(
            'absolute right-0 top-full mt-2 z-dropdown w-80 max-w-[calc(100vw-32px)] rounded-lg bg-page shadow-float',
            instant ? 'pop-instant' : closing ? 'pop-panel-exit' : 'pop-panel', 'origin-top-right'
          )}
          role="group" aria-label={t('admin.notify.title')}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line-sub">
            <p className="min-w-0 truncate type-h3 text-text-pri">{t('admin.notify.title')}</p>
            {unread > 0 && (
              <button
                type="button" onClick={markAllRead}
                className="inline-flex shrink-0 items-center gap-1 min-h-11 type-caption text-primary hover:text-primary-hover transition-colors duration-fast"
              >
                <CheckCheck size={14} aria-hidden="true" />
                {t('admin.notify.markAll')}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 type-body-sm text-text-meta">{t('admin.notify.empty')}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {items.map((n) => {
                const Icon = ICON[n.type] || Bell
                return (
                  <li key={n.id}>
                    <Link
                      to={n.to} onClick={() => { markRead(n.id); setOpen(false) }}
                      className={clsx(
                        'flex items-start gap-3 px-4 py-3 transition-colors duration-fast hover:bg-mute',
                        !n.read && 'bg-primary-soft'
                      )}
                    >
                      <span aria-hidden="true" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-mute text-text-sec">
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block type-body-sm font-medium text-text-pri break-keep">{t(`admin.notify.${n.type}`)}</span>
                        <span className="block type-meta text-text-meta break-keep">{t(`admin.notify.${n.type}Desc`, n.vars)}</span>
                        <span className="block type-meta text-text-meta tabular-nums">{formatDate(n.at, 'datetime')}</span>
                      </span>
                      {!n.read && <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

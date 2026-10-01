// 관리자 프로필 드롭다운. Sidebar 하단과 Topbar 가 쓴다.
// 팝 규약은 LangSwitch 와 같다(usePopExit, detail 0 무애니메이션).
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import usePopExit from '../../hooks/usePopExit.js'
import useAuthStore from '../../store/useAuthStore.js'
import { useLang } from '../../i18n/LangContext.jsx'
import Avatar from '../ui/Avatar.jsx'

export default function UserMenu({ compact = false, className }) {
  const { t } = useLang()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [instantPop, setInstantPop] = useState(false)
  const { mounted, closing } = usePopExit(open, instantPop)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  if (!user) return null

  const onKeyDown = (e) => {
    if (e.key !== 'Escape') return
    setInstantPop(true)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div ref={rootRef} className={clsx('relative', className)} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open}
        onClick={(e) => { setInstantPop(e.detail === 0); setOpen((o) => !o) }}
        className={clsx(
          'pressable flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-mute',
          compact && 'justify-center'
        )}
      >
        <Avatar name={user.name} />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate type-body-sm font-medium text-text-pri">{user.name}</span>
            <span className="block truncate type-meta text-text-meta">{t(`admin.role.${user.role}`)}</span>
          </span>
        )}
      </button>

      {mounted && (
        <ul
          role="menu" aria-hidden={closing || undefined}
          className={clsx(
            'pop-panel origin-top absolute bottom-full left-0 mb-2 z-dropdown w-full min-w-[180px]',
            'rounded-md bg-page shadow-md p-1',
            instantPop && 'pop-instant', closing && 'pop-panel-exit'
          )}
        >
          <li role="none">
            <button
              type="button" role="menuitem"
              onClick={async () => { setOpen(false); await logout(); navigate('/admin/login', { replace: true }) }}
              className="flex w-full items-center gap-2 min-h-11 px-3 rounded-xs type-body-sm text-text-sec hover:bg-mute hover:text-text-pri transition-colors duration-fast"
            >
              <LogOut size={16} aria-hidden="true" />
              {t('common.action.logout')}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

// 임베드 위젯 라우트. 공단 홈페이지에 iframe 으로 붙는다.
// PublicLayout 밖이라 TopNav 와 Footer 가 없다(App.jsx). 배경도 투명해야 부모 페이지가 비친다.
// 임베드 형식: <iframe src="{origin}/widget?org={id}&lang=ko" title="..." allowtransparency>
// 쿼리 org 는 기관 id, lang 은 초기 언어다. 설정 채널 탭의 임베드 코드가 이 형식을 만든다(5-G).
import { useEffect, useState } from 'react'
import { LANGS, useLang } from '../../i18n/LangContext.jsx'
import { get } from '../../lib/api.js'
import WidgetShell from '../../components/chat/WidgetShell.jsx'

export default function WidgetPage() {
  const { lang, setLang } = useLang()
  const [settings, setSettings] = useState(null)

  const params = new URLSearchParams(window.location.search)
  const initialLang = params.get('lang')
  const org = params.get('org') || ''

  // 부모 페이지가 지정한 언어로 연다. 없으면 기본 한국어 그대로다
  useEffect(() => {
    if (initialLang && LANGS.includes(initialLang)) setLang(initialLang)
  }, [initialLang, setLang])

  useEffect(() => {
    let alive = true
    get('/api/settings/public').then((s) => { if (alive) setSettings(s) }).catch(() => {})
    return () => { alive = false }
  }, [org])

  // 위젯은 진입 애니메이션이 없다. 부모 페이지 위에 얹히는 조각이라 페이지처럼 등장하면 안 된다
  return <WidgetShell settings={settings} lang={lang} />
}

// 봄내 LangContext 이식. 언어 상태는 in-memory Context. 웹스토리지 금지(DESIGN.md 절대 규칙).
// lang 은 ko en ja zh 네 가지. 기본 ko. 공단 시민 서비스라 한국어가 기본이다.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './en/index.js'
import ja from './ja/index.js'
import ko from './ko/index.js'
import zh from './zh/index.js'

export const LANGS = ['ko', 'en', 'ja', 'zh']
export const dicts = { ko, en, ja, zh }

const LangContext = createContext(null)

export const pick = (dict, key) => key.split('.').reduce((o, k) => o?.[k], dict)

export function LangProvider({ children }) {
  const [lang, setLang] = useState('ko')

  // html lang 동기화. 스크린리더 발음과 폰트 스택의 근거다
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  // 키가 없으면 키 문자열을 그대로 돌려주고 warn 한다. 화면이 비지 않게
  // vars 는 {org} 같은 자리표시자 치환용. 기관명은 설정값에서 오므로 사전에 박지 않는다
  const t = useCallback((key, vars) => {
    const value = pick(dicts[lang], key)
    if (typeof value !== 'string') {
      console.warn(`[i18n] missing key: ${key}`)
      return key
    }
    if (!vars) return value
    return value.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

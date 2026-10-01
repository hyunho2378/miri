import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en/index.js';
import ko from './ko/index.js';
import th from './th/index.js';

// 언어 상태는 in-memory Context · 웹스토리지 금지(DESIGN §13). 기본 EN.
// v3.1: lang ∈ 'en'|'ko'|'th' (PATTERNS §18). th 폰트 스택은 index.css의 :lang(th) 규칙이 처리.
const dicts = { en, ko, th };
const LangContext = createContext(null);

const pick = (dict, key) => key.split('.').reduce((o, k) => o?.[k], dict);

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en');

  // html lang 속성 동기화 · th 폰트 스택(:lang(th))과 스크린리더 발음의 근거
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // t: 키 미존재 시 키 문자열 반환 + console.warn (COMPONENTS A1)
  const t = useCallback(
    (key) => {
      const value = pick(dicts[lang], key);
      if (typeof value !== 'string') {
        console.warn(`[i18n] missing key: ${key}`);
        return key;
      }
      return value;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

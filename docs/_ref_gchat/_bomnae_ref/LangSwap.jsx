// PATTERNS §1 기준 구현의 v3.1 3언어 확장(§18) · 레이아웃 시프트 0. 임의 변형 금지.
// 세 언어를 같은 grid 셀에 겹치고 비활성 언어를 invisible 처리. 폭은 최장 언어 기준 고정.
import { useLang } from './LangContext';
import en from './en/index.js';
import ko from './ko/index.js';
import th from './th/index.js';

const dicts = { en, ko, th };
const LANGS = ['en', 'ko', 'th'];
const pick = (dict, key) => key.split('.').reduce((o, k) => o?.[k], dict);

export default function LangSwap({ k, as: Tag = 'span', className = '' }) {
  const { lang } = useLang();
  return (
    <Tag className={`grid ${className}`}>
      {LANGS.map((code) => (
        <span
          key={code}
          aria-hidden={lang !== code}
          className={`col-start-1 row-start-1 ${lang === code ? '' : 'invisible'}`}
        >
          {pick(dicts[code], k) ?? k}
        </span>
      ))}
    </Tag>
  );
}

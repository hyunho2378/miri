// FieldSelect · v3.1 Skyscanner식 커스텀 셀렉트(DESIGN §7, PATTERNS §11).
// 네이티브 select·time input 전면 금지의 대체재. 시간 라벨도 사전 경유(OS 로케일 누수 차단).
// props: label(사전 키), value(옵션 id), placeholder(사전 키), options[{id,icon,primary,secondary}], onChange.
// primary/secondary는 호출부가 t()로 이미 현지화한 문자열을 넘긴다.
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import LangSwap from '../../i18n/LangSwap';
import { useLang } from '../../i18n/LangContext';
import usePopExit from './usePopExit';

export default function FieldSelect({ label, value, placeholder, options, onChange, compact = false }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [instantPop, setInstantPop] = useState(false);
  const { mounted: popMounted, closing: popClosing } = usePopExit(open, instantPop);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => o.id === value) ?? null;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // 열릴 때 선택 옵션으로 하이라이트 이동 + 스크롤 정렬
  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, options.findIndex((o) => o.id === value));
    setHighlight(idx);
    requestAnimationFrame(() => {
      listRef.current?.children[idx]?.scrollIntoView({ block: 'nearest' });
    });
  }, [open, options, value]);

  const pick = (id, viaKeyboard = false) => {
    onChange(id);
    setInstantPop(viaKeyboard);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setInstantPop(true); // §17.1 키보드 개시 무애니메이션
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      setInstantPop(true);
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : options.length - 1;
      setHighlight((h) => {
        const next = (h + delta) % options.length;
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(options[highlight].id, true);
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      {/* 닫힘 상태 = 무보더 surface 면 + 라벨(caption inkMeta) + 값/플레이스홀더 */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          setInstantPop(e.detail === 0); // detail 0 = 키보드 발화 클릭(§17.1)
          setOpen((v) => !v);
        }}
        // [H2-6] compact: 라벨 좌 caption + 값 우측 정렬 한 줄(h-48) · 기본: 기존 2행 문법
        className={
          compact
            ? 'flex h-48 w-full items-center justify-between gap-12 rounded-md bg-surface px-16 text-left transition-shadow duration-fast focus:shadow-md'
            : 'flex w-full flex-col gap-4 rounded-md bg-surface p-16 text-left transition-shadow duration-fast focus:shadow-md'
        }
      >
        <LangSwap k={label} className={`text-caption font-medium text-inkMeta ${compact ? 'shrink-0' : ''}`} />
        <span className={`flex items-center gap-8 ${compact ? 'min-w-0 justify-end' : 'justify-between'}`}>
          {selected ? (
            <span className={`text-body font-medium text-ink ${compact ? 'truncate' : ''}`}>{selected.primary}</span>
          ) : (
            <LangSwap k={placeholder} className="text-body font-medium text-inkSec" />
          )}
          <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-inkMeta" />
        </span>
      </button>

      {popMounted && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={t(label)}
          aria-hidden={popClosing || undefined}
          // 최대 높이 320px는 PATTERNS §11 명세값 · §34 팝 진입 0.97→1(origin=트리거 하단 전개)
          className={`pop-panel origin-top ${instantPop ? 'pop-instant' : ''} absolute inset-x-0 top-full z-dialog mt-8 max-h-[320px] overflow-y-auto rounded-lg bg-white p-8 shadow-md ${popClosing ? 'pop-panel-exit' : ''}`}
        >
          {options.map((option, i) => {
            const Icon = option.icon;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  onClick={(e) => pick(option.id, e.detail === 0)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex min-h-44 w-full items-center gap-12 rounded-sm px-12 text-left transition-colors duration-fast ${
                    highlight === i || option.id === value ? 'bg-surface' : ''
                  }`}
                >
                  {Icon && <Icon size={20} aria-hidden="true" className="shrink-0 text-inkMeta" />}
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-12">
                    <span className="truncate text-body font-medium text-ink">{option.primary}</span>
                    {option.secondary && (
                      <span className="shrink-0 text-caption font-medium text-inkMeta">
                        {option.secondary}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

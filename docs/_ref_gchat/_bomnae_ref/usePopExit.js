// §34 팝 퇴장 역재생 훅 · 닫힘 시 durPop(180ms) 동안 마운트를 유지해
// .pop-panel-exit(0.97+투명) 역재생 후 제거한다. reduced-motion은 즉시 제거.
// UI 프리미티브가 아니라 공유 동작 훅 — FieldSelect·LangMenu·CalendarField 팝 전용.
import { useEffect, useRef, useState } from 'react';
import { motion } from '../../tokens';

// instant: 키보드 개시 닫힘(§17.1 키보드 무애니메이션) — 지연 없이 즉시 제거
export default function usePopExit(open, instant = false) {
  const [mounted, setMounted] = useState(open);
  const timer = useRef(0);

  useEffect(() => {
    if (open) {
      clearTimeout(timer.current);
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMounted(false);
      return undefined;
    }
    timer.current = setTimeout(() => setMounted(false), parseInt(motion.durPop, 10));
    return () => clearTimeout(timer.current);
  }, [open, mounted, instant]);

  return { mounted, closing: mounted && !open };
}

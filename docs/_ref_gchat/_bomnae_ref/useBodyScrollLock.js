// §18([H1]) 오버레이 열림 시 body 스크롤 락 · Dialog·BottomSheet 공용 동작 훅.
// StepStage는 자체 락 보유(§41) — 중첩 시 이전 값 복원 순서를 위해 open 기준 훅으로 통일.
// UI 프리미티브가 아니라 공유 동작 훅(usePopExit 선례 · 새 컴포넌트 아님).
import { useEffect } from 'react';

export default function useBodyScrollLock(open) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

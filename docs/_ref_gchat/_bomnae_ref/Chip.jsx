// 필터/탭 칩 · DESIGN §7: Medium 500, caption, pill. 44px 타깃.
// v3.1 무보더: 보더 폐지, 면 색으로 상태 표현(기본 surface / 활성 primary).
export default function Chip({ active = false, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`pressable inline-flex min-h-44 items-center justify-center rounded-pill px-16 text-caption font-medium ${
        active ? 'bg-primary text-white' : 'bg-surface text-inkSec hover:text-ink'
      } ${disabled ? 'pointer-events-none opacity-40' : ''}`}
    >
      {children}
    </button>
  );
}

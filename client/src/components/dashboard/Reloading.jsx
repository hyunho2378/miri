// 7단계. 기간 탭이나 분석 탭을 바꿀 때 화면 전체가 스켈레톤으로 깜빡이던 것을 막는다.
// 이전 데이터를 지우지 않고 그대로 둔 채 차트와 표 영역만 흐려 두었다가 새 값이 오면 교체한다.
// 페이지 골격과 KPI 카드 라벨과 사이드바는 언마운트되지 않는다.
import clsx from 'clsx'

export default function Reloading({ busy = false, className, children }) {
  return (
    <div
      aria-busy={busy || undefined}
      className={clsx('min-w-0 transition-opacity duration-fast', busy && 'opacity-40', className)}
    >
      {children}
    </div>
  )
}

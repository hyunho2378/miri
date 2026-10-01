// CTA 버튼 · DESIGN §7 + §16.8 v3.2 버튼 페어(Apple 패턴).
// primary: primary 면+white / secondary: 투명+primary 텍스트+1.5px primary 보더(무보더 원칙의 명시적 예외 1호)
//   · hover 8% 틴트는 §16.8이 허용한 상호작용 피드백 예외(스케일상 /10 스텝 적용)
// ghost: 흐름 전진 텍스트 버튼. 폭은 텍스트+패딩으로 결정(§16.8 · 임의 고정폭 금지).
// v3.2 §16.1: navy는 티켓 면 전용 · hover는 elevation/불투명도 피드백으로 대체([CR] 수정)
// [V4] secondary 1.5px 보더 = ring(box-shadow inset)로 구현 — border-box라도 콘텐츠 폭을 먹지 않아
//   primary와 padding·height·radius·font·박스 치수가 완전 동일(색만 차이). 히어로 CTA 대칭 담보.
const VARIANTS = {
  primary: 'bg-primary text-white hover:shadow-md',
  secondary: 'bg-transparent text-primary ring-1.5 ring-inset ring-primary hover:bg-primary/10',
  ghost: 'bg-transparent text-primary hover:opacity-80',
  // onPhoto: 히어로 사진 위 흰 pill(primary 블루와 페어). primary와 padding·height·radius·font 동일(면 색만 차이).
  onPhoto: 'bg-white text-primary hover:shadow-md',
};

const SIZES = {
  md: 'px-24',
  lg: 'px-32',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  as: Tag = 'button',
  disabled = false,
  children,
  ...rest
}) {
  return (
    <Tag
      disabled={Tag === 'button' ? disabled : undefined}
      className={`pressable inline-flex h-48 items-center justify-center gap-8 whitespace-nowrap rounded-pill font-semibold lg:h-44 ${VARIANTS[variant]} ${SIZES[size]} ${disabled ? 'pointer-events-none opacity-40' : ''}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

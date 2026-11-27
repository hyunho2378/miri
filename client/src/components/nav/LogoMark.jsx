// 미리 로고 기호: 휠체어 바퀴 자리에 초시계를 넣은 모양. 바탕은 주색 토큰을 따른다
export default function LogoMark({ size = 32, className }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
        <path d="M36.2 21.5 L35 37" strokeWidth="7" />
        <path d="M37 28.5 L46.5 28.5" strokeWidth="5.4" />
        <path d="M35 37 L44 37 L48.6 48.6 L52.6 48.6" strokeWidth="6" />
        <circle cx="22" cy="42" r="10.4" strokeWidth="4.6" />
        <path d="M17.6 38.4 L22 42 L27.4 37.6" strokeWidth="2.6" />
        <path d="M22 29.2 L22 31" strokeWidth="3" />
        <path d="M18.6 27.6 L25.4 27.6" strokeWidth="3.4" />
      </g>
      <circle cx="22" cy="42" r="2" fill="#FFFFFF" />
      <circle cx="38" cy="12.6" r="5.6" fill="#FFFFFF" />
    </svg>
  )
}

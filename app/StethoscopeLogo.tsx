export default function StethoscopeLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 10v15c0 8.3 6.7 15 15 15s15-6.7 15-15V10"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M14 10h8M44 10h8"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M33 40v5c0 7.2 5.8 13 13 13 5.8 0 10.7-3.7 12.4-8.9"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="57" cy="43" r="6" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

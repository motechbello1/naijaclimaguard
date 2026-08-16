import Link from "next/link";

type BrandMarkProps = {
  className?: string;
  title?: string;
  inverse?: boolean;
};

export function BrandMark({ className = "h-10 w-10", title = "NaijaClimaGuard", inverse = false }: BrandMarkProps) {
  const id = inverse ? "ncg-mark-inverse" : "ncg-mark";

  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className}>
      <defs>
        <linearGradient id={`${id}-river`} x1="14" y1="22" x2="51" y2="47" gradientUnits="userSpaceOnUse">
          <stop stopColor={inverse ? "#d9ff57" : "#10c98f"} />
          <stop offset="1" stopColor={inverse ? "#10c98f" : "#087354"} />
        </linearGradient>
      </defs>
      <path
        d="M32 4.5c-4.6 7.2-9.5 12.6-14.7 18.1C11.9 28.3 8.8 34 8.8 41c0 12.1 9.8 19 23.2 19s23.2-6.9 23.2-19c0-7-3.1-12.7-8.5-18.4C41.5 17.1 36.6 11.7 32 4.5Z"
        fill={inverse ? "#071713" : "#ecfff5"}
        stroke={inverse ? "#d9ff57" : "#062c22"}
        strokeWidth="3.3"
        strokeLinejoin="round"
      />
      <path d="M16.5 31c7.4-7 12.6 7.1 22.9.2 3.7-2.5 6.2-1.1 8.2.8" fill="none" stroke={`url(#${id}-river)`} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M15.2 39.5c7.3-6.7 13.3 6.8 23.3.2 3.4-2.2 5.7-1.1 7.7.5" fill="none" stroke={`url(#${id}-river)`} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M18 47.7c7-5.3 12.3 5 21.3.1" fill="none" stroke={`url(#${id}-river)`} strokeWidth="4.6" strokeLinecap="round" />
      <circle cx="49" cy="32" r="3.7" fill="#d9ff57" stroke="#062c22" strokeWidth="1.6" />
      <circle cx="47.5" cy="40.5" r="2.7" fill={inverse ? "#ecfff5" : "#10c98f"} />
      <circle cx="41.2" cy="48" r="2.4" fill={inverse ? "#ecfff5" : "#10c98f"} />
    </svg>
  );
}

export function BrandLockup({ href = "/", inverse = false, compact = false, className = "" }: { href?: string; inverse?: boolean; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={`flex min-w-0 items-center gap-2.5 ${className}`} data-ncg-no-translate="true">
      {inverse ? <BrandMark inverse className="h-10 w-10 shrink-0" /> : <>
        <BrandMark className="h-10 w-10 shrink-0 dark:hidden" />
        <BrandMark inverse className="hidden h-10 w-10 shrink-0 dark:block" />
      </>}
      {!compact && <span className="font-display text-base font-black tracking-[-.035em] sm:text-lg">NaijaClima<span className={inverse ? "text-[#d9ff57]" : "text-emerald-700 dark:text-[#d9ff57]"}>Guard</span></span>}
    </Link>
  );
}

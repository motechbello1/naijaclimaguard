import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";

type BrandMarkProps = {
  className?: string;
  title?: string;
  inverse?: boolean;
  style?: CSSProperties;
};

export function BrandMark({ className = "h-10 w-10", title = "NaijaClimaGuard", inverse = false, style }: BrandMarkProps) {
  return (
    <span role="img" aria-label={title} data-ncg-brand="approved-v3" data-inverse={inverse || undefined} className={`ncg-brand-mark ${className}`} style={style}>
      <Image unoptimized className="ncg-brand-light" src="/brand/symbol-light-v3.png?v=4" width={512} height={512} alt="" aria-hidden="true" draggable={false} />
      <Image unoptimized className="ncg-brand-dark" src="/brand/symbol-dark-v3.png?v=4" width={512} height={512} alt="" aria-hidden="true" draggable={false} />
    </span>
  );
}

export function BrandLockup({ href = "/", inverse = false, compact = false, className = "" }: { href?: string; inverse?: boolean; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={`flex min-w-0 items-center gap-2.5 ${className}`} data-ncg-no-translate="true">
      <BrandMark inverse={inverse} className="h-10 w-10 shrink-0" />
      {!compact && <span className="font-display text-base font-black tracking-[-.035em] sm:text-lg">NaijaClima<span className={inverse ? "text-[#d9ff57]" : "text-emerald-700 dark:text-[#d9ff57]"}>Guard</span></span>}
    </Link>
  );
}

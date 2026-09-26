import type { Depth } from "@/lib/floodpass/truth-engine";

/**
 * Simple cartoon drawings for water depth. Research with low-literacy users
 * found simple cartoon drawings work better than photos or abstract icons.
 */
export default function DepthIcon({ depth, size = 72 }: { depth: Depth; size?: number }) {
  const waterY: Record<Depth, number> = { ANKLE: 62, KNEE: 50, WAIST: 36, CAR_ROOF: 20, UNKNOWN: 70 };
  const y = waterY[depth];
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
      {depth === "CAR_ROOF" ? (
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
          <path d="M10 46h52v-9l-7-11H24l-8 11h-6z" />
          <circle cx="22" cy="48" r="5" />
          <circle cx="50" cy="48" r="5" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <circle cx="36" cy="12" r="6" />
          <path d="M36 18v24M36 26l-10 8M36 26l10 8M36 42l-8 22M36 42l8 22" />
        </g>
      )}
      <path d={`M0 ${y} q9 -5 18 0 t18 0 t18 0 t18 0 V72 H0z`} fill="#3b82f6" opacity="0.55" />
    </svg>
  );
}

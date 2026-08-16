type ChartPoint = {
  label: string;
  primary: number;
  secondary?: number;
};

type ChartEvent = {
  index: number;
  label: string;
};

type Props = {
  points: ChartPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  events?: ChartEvent[];
  primaryColor?: string;
  secondaryColor?: string;
};

const WIDTH = 1000;
const HEIGHT = 300;
const PAD_X = 36;
const PAD_Y = 24;

function pathFor(values: number[], maxValue: number) {
  if (!values.length) return "";
  const width = WIDTH - PAD_X * 2;
  const height = HEIGHT - PAD_Y * 2;
  const denominator = Math.max(values.length - 1, 1);
  return values.map((value, index) => {
    const x = PAD_X + (index / denominator) * width;
    const y = HEIGHT - PAD_Y - (Math.max(value, 0) / Math.max(maxValue, 1)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export default function AccessibleSeriesChart({
  points,
  primaryLabel,
  secondaryLabel,
  events = [],
  primaryColor = "#06b6d4",
  secondaryColor = "#f59e0b",
}: Props) {
  const primary = points.map((point) => point.primary);
  const secondary = points.map((point) => point.secondary ?? 0);
  const primaryMax = Math.max(...primary, 1);
  const secondaryMax = Math.max(...secondary, 1);
  const primaryPath = pathFor(primary, primaryMax);
  const secondaryPath = pathFor(secondary, secondaryMax);
  const first = points[0]?.label ?? "";
  const middle = points[Math.floor(points.length / 2)]?.label ?? "";
  const last = points[points.length - 1]?.label ?? "";

  return (
    <figure className="w-full" aria-label={`${primaryLabel}${secondaryLabel ? ` and ${secondaryLabel}` : ""} over time`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[300px] w-full overflow-visible" role="img">
        <title>{primaryLabel}{secondaryLabel ? ` and ${secondaryLabel}` : ""}</title>
        {[0.25, 0.5, 0.75].map((fraction) => <line key={fraction} x1={PAD_X} y1={PAD_Y + fraction * (HEIGHT - PAD_Y * 2)} x2={WIDTH - PAD_X} y2={PAD_Y + fraction * (HEIGHT - PAD_Y * 2)} stroke="currentColor" strokeOpacity="0.09" strokeDasharray="5 7" />)}
        {events.map((event) => {
          const x = PAD_X + (event.index / Math.max(points.length - 1, 1)) * (WIDTH - PAD_X * 2);
          return <g key={`${event.index}-${event.label}`}><line x1={x} y1={PAD_Y} x2={x} y2={HEIGHT - PAD_Y} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 6" /><text x={x + 5} y={PAD_Y + 10} fill="#ef4444" fontSize="10" transform={`rotate(90 ${x + 5} ${PAD_Y + 10})`}>{event.label}</text></g>;
        })}
        <polyline points={primaryPath} fill="none" stroke={primaryColor} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {secondaryLabel && <polyline points={secondaryPath} fill="none" stroke={secondaryColor} strokeWidth="3" strokeDasharray="9 7" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        <text x={PAD_X} y={HEIGHT - 4} fill="currentColor" opacity=".45" fontSize="11">{first}</text>
        <text x={WIDTH / 2} y={HEIGHT - 4} fill="currentColor" opacity=".45" fontSize="11" textAnchor="middle">{middle}</text>
        <text x={WIDTH - PAD_X} y={HEIGHT - 4} fill="currentColor" opacity=".45" fontSize="11" textAnchor="end">{last}</text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2"><span className="h-1 w-5 rounded-full" style={{ backgroundColor: primaryColor }} />{primaryLabel} · max {primaryMax.toFixed(1)}</span>
        {secondaryLabel && <span className="inline-flex items-center gap-2"><span className="h-1 w-5 rounded-full" style={{ backgroundColor: secondaryColor }} />{secondaryLabel} · max {secondaryMax.toFixed(1)}</span>}
      </figcaption>
    </figure>
  );
}

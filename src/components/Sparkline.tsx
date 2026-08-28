export default function Sparkline({
  points,
  currency = "",
}: {
  points: { checkedAt: number; price: number }[];
  currency?: string;
}) {
  if (points.length < 2) return null;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const W = 560;
  const H = 120;
  const PAD = 8;
  const xy = points.map((p, i) => [
    PAD + (i / (points.length - 1)) * (W - 2 * PAD),
    H - PAD - ((p.price - min) / span) * (H - 2 * PAD),
  ]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = xy[xy.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Price history chart">
        <polyline
          points={line}
          fill="none"
          stroke="#059669"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lx} cy={ly} r="4" fill="#059669" />
      </svg>
      <div className="flex justify-between text-xs text-stone-500">
        <span>
          low {currency}
          {min}
        </span>
        <span>
          high {currency}
          {max}
        </span>
      </div>
    </div>
  );
}

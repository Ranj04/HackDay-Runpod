// Per-rep radar (Prompt VIZ, Phase 3). A hand-rolled SVG spider chart over the
// four SHARED CONTRACT `dimensions` axes — zero chart deps. Themed off semantic
// tokens (blue --primary normally, orange --accent-brand for the worst rep), so
// it tracks light/dark + the AA work automatically. Renders nothing when a rep
// has no `dimensions` (the field is optional), so consumers degrade gracefully.
import type { RepDimensions } from "@/lib/sample-report";

const AXES = [
  { key: "release_angle", label: "Release", angle: -90 }, // top
  { key: "arc", label: "Arc", angle: 0 }, //               right
  { key: "knee_bend", label: "Knee", angle: 90 }, //       bottom
  { key: "follow_through", label: "Follow", angle: 180 }, // left
] as const satisfies ReadonlyArray<{ key: keyof RepDimensions; label: string; angle: number }>;

const C = 80; // center
const R = 48; // outer radius (100 = the reference ring); leaves room for labels
const RINGS = [0.25, 0.5, 0.75, 1];

function point(angleDeg: number, frac: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [C + R * frac * Math.cos(a), C + R * frac * Math.sin(a)];
}

function poly(frac: (ax: (typeof AXES)[number]) => number): string {
  return AXES.map((ax) => {
    const [x, y] = point(ax.angle, frac(ax));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v / 100));
}

export function RepRadar({
  dimensions,
  tone = "default",
}: {
  dimensions?: RepDimensions;
  tone?: "default" | "worst";
}) {
  if (!dimensions) return null; // optional contract field — degrade gracefully

  const color = tone === "worst" ? "var(--accent-brand)" : "var(--primary)";
  const dataPoints = AXES.map((ax) => point(ax.angle, clamp01(dimensions[ax.key])));
  const avg = Math.round(
    AXES.reduce((s, ax) => s + dimensions[ax.key], 0) / AXES.length,
  );

  return (
    <svg
      viewBox="0 0 160 160"
      className="h-[150px] w-[150px]"
      role="img"
      aria-label={`Form breakdown: ${AXES.map((ax) => `${ax.label} ${Math.round(dimensions[ax.key])}`).join(", ")} out of 100`}
    >
      {/* grid rings (outer ring = the reference, drawn stronger) */}
      {RINGS.map((f) => (
        <polygon
          key={f}
          points={poly(() => f)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={f === 1 ? 1.25 : 0.75}
          strokeOpacity={f === 1 ? 0.9 : 0.55}
        />
      ))}

      {/* spokes + axis labels */}
      {AXES.map((ax) => {
        const [sx, sy] = point(ax.angle, 1);
        const [lx, ly] = point(ax.angle, 1.28);
        // Middle-anchor every label so the widest one ("Follow", on the left)
        // extends only half its width past the vertex and stays inside the SVG,
        // instead of clipping to "ow"/"Ar".
        return (
          <g key={ax.key}>
            <line
              x1={C}
              y1={C}
              x2={sx}
              y2={sy}
              stroke="var(--border)"
              strokeWidth={0.75}
              strokeOpacity={0.55}
            />
            <text
              x={lx}
              y={ly}
              fontSize={9}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--muted-foreground)"
              className="font-mono"
            >
              {ax.label}
            </text>
          </g>
        );
      })}

      {/* data layer — fades in on mount (snaps to visible under reduced-motion) */}
      <g style={{ animation: "viz-fade-in 0.6s ease-out both" }}>
        <polygon
          points={dataPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
          fill={color}
          fillOpacity={0.18}
          stroke={color}
          strokeWidth={1.75}
          strokeLinejoin="round"
          pathLength={100}
          style={{ strokeDasharray: 100, animation: "radar-draw 0.8s ease-out both" }}
        />
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.4} fill={color} />
        ))}

        {/* center readout — overall match, reads instantly as "analysis" */}
        <text
          x={C}
          y={C - 1}
          fontSize={15}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--foreground)"
          className="font-mono font-semibold"
        >
          {avg}
        </text>
      </g>
    </svg>
  );
}

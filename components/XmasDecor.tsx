"use client";

// Ambient Christmas decorations — falling snow with drift, twinkling stars
// and a soft snowdrift glow along the bottom. Fixed overlay, purely visual,
// rendered by MaintenanceGate when site_settings.theme === "xmas".
// All positions/durations derive from a deterministic hash so SSR markup
// matches the client and there's no hydration mismatch.

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Snowflake({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} 12 12)`}>
          <path d="M12 2.5v19" />
          <path d="M12 2.5l-1.8 2.2M12 2.5l1.8 2.2" />
          <path d="M12 21.5l-1.8-2.2M12 21.5l1.8-2.2" />
          <path d="M12 7l-2.6-1.5M12 7l2.6-1.5" />
          <path d="M12 17l-2.6 1.5M12 17l2.6 1.5" />
        </g>
      ))}
    </svg>
  );
}

const FLAKES = 28;

export default function XmasDecor() {
  const flakes = Array.from({ length: FLAKES }, (_, i) => ({
    left: hash(i * 3 + 1) * 100,
    size: 7 + hash(i * 3 + 2) * 15,
    duration: 10 + hash(i * 3 + 3) * 14,
    delay: -(hash(i * 7 + 4) * 24),
    sway: (hash(i * 7 + 5) - 0.5) * 140,
    opacity: 0.3 + hash(i * 7 + 6) * 0.55,
    color: hash(i * 11) > 0.75 ? "#e0f2fe" : "#ffffff",
  }));

  const stars = Array.from({ length: 10 }, (_, i) => ({
    left: 4 + hash(i * 13 + 2) * 92,
    top: 6 + hash(i * 13 + 3) * 55,
    size: 10 + hash(i * 13 + 4) * 12,
    duration: 2.6 + hash(i * 13 + 5) * 3.4,
    delay: -(hash(i * 13 + 6) * 6),
  }));

  return (
    <div className="xmas-decor" aria-hidden="true">
      {/* Falling snow — nearer flakes are bigger, brighter and faster */}
      {flakes.map((f, i) => (
        <span
          key={i}
          className="xmas-snow"
          style={{
            left: `${f.left}%`,
            top: 0,
            color: f.color,
            ["--dur" as string]: `${f.duration}s`,
            ["--delay" as string]: `${f.delay}s`,
            ["--sway" as string]: `${f.sway}px`,
            ["--flake-o" as string]: f.opacity,
          }}
        >
          <Snowflake size={f.size} />
        </span>
      ))}

      {/* Twinkling stars scattered through the upper half of the viewport */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="xmas-twinkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            fontSize: s.size,
            ["--dur" as string]: `${s.duration}s`,
            ["--delay" as string]: `${s.delay}s`,
          }}
        >
          ✦
        </span>
      ))}

      {/* Soft snowdrift glow along the bottom edge */}
      <div className="xmas-drift" />
    </div>
  );
}

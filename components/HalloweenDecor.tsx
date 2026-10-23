"use client";

// Ambient Halloween decorations — fixed overlay, purely visual.
// Rendered by MaintenanceGate only when site_settings.theme === "halloween".

function Cobweb({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="150"
      height="150"
      viewBox="0 0 150 150"
      className="halloween-web"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden="true"
    >
      <g stroke="rgba(220, 200, 255, 0.55)" strokeWidth="1.2" fill="none">
        <path d="M0 0 L150 0 M0 0 L0 150" stroke="none" />
        {/* radial threads */}
        <path d="M0 0 L140 8" />
        <path d="M0 0 L110 60" />
        <path d="M0 0 L60 110" />
        <path d="M0 0 L8 140" />
        <path d="M0 0 L140 46" />
        <path d="M0 0 L46 140" />
        {/* concentric arcs */}
        <path d="M34 3 Q42 22 30 34 Q22 42 3 34" />
        <path d="M62 5 Q80 42 60 62 Q42 80 5 62" />
        <path d="M92 7 Q120 60 90 92 Q60 120 7 92" />
        <path d="M122 9 Q155 78 118 120 Q78 155 9 122" />
      </g>
    </svg>
  );
}

export default function HalloweenDecor() {
  return (
    <div className="halloween-decor" aria-hidden="true">
      {/* Cobwebs in the top corners */}
      <div style={{ top: 0, left: 0 }}>
        <Cobweb />
      </div>
      <div style={{ top: 0, right: 0 }}>
        <Cobweb flip />
      </div>

      {/* Bats flapping across the sky at different heights and speeds */}
      <span className="halloween-bat" style={{ top: "9vh", animationDelay: "0s", animationDuration: "13s" }}>🦇</span>
      <span className="halloween-bat hidden md:block" style={{ top: "16vh", animationDelay: "5s", animationDuration: "17s", fontSize: "1.2rem" }}>🦇</span>
      <span className="halloween-bat hidden md:block" style={{ top: "5vh", animationDelay: "9s", animationDuration: "20s", fontSize: "2rem" }}>🦇</span>

      {/* A ghost drifting around the lower-left */}
      <span className="halloween-ghost" style={{ left: "4vw", bottom: "12vh" }}>👻</span>

      {/* Jack-o'-lanterns glowing in the bottom corners */}
      <span className="halloween-pumpkin" style={{ right: "3vw", bottom: "3vh" }}>🎃</span>
      <span className="halloween-pumpkin hidden md:block" style={{ right: "9vw", bottom: "5vh", fontSize: "1.6rem", animationDelay: "1.8s" }}>🎃</span>

      {/* Spider dangling from the top on a thread */}
      <span className="halloween-spider hidden md:block" style={{ top: 0, left: "78vw", fontSize: "1.4rem" }}>🕷️</span>

      {/* Fog rolling along the bottom of the viewport */}
      <div className="halloween-fog" />
    </div>
  );
}

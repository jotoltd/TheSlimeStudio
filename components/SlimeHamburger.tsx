"use client";

export default function SlimeHamburger({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="md:hidden relative w-11 h-11 rounded-full bg-aquamarine/40 border-2 border-sky-blue-light/60 grid place-items-center cursor-pointer flex-shrink-0 transition-colors hover:bg-aquamarine/60"
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <line
          x1="3" y1="6" x2="19" y2="6"
          stroke="rgb(var(--c-ink))" strokeWidth="2.5" strokeLinecap="round"
          className="origin-center transition-all duration-300"
          style={{
            transform: open ? "translateY(5px) rotate(45deg)" : "none",
          }}
        />
        <line
          x1="3" y1="11" x2="19" y2="11"
          stroke="rgb(var(--c-ink))" strokeWidth="2.5" strokeLinecap="round"
          className="transition-all duration-300"
          style={{ opacity: open ? 0 : 1, transform: open ? "scaleX(0.3)" : "scaleX(1)", transformOrigin: "center" }}
        />
        <line
          x1="3" y1="16" x2="19" y2="16"
          stroke="rgb(var(--c-ink))" strokeWidth="2.5" strokeLinecap="round"
          className="origin-center transition-all duration-300"
          style={{
            transform: open ? "translateY(-5px) rotate(-45deg)" : "none",
          }}
        />
      </svg>
      {/* little slime splat accent */}
      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-hot-pink" />
    </button>
  );
}

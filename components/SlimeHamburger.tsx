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
      className="md:hidden relative w-12 h-12 bg-none border-none cursor-pointer p-0 grid place-items-center"
      onClick={onClick}
      aria-label="Toggle menu"
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        className="overflow-visible"
      >
        <g className="sm-grp" data-open={open}>
          {/* Slime blob — mint with pink drip */}
          <g className="sm-blob">
            <path
              d="M22 8 C27 8 31 11 32 16 C35 17 37 20 36 24 C35 27 33 29 31 30 C32 33 30 36 27 37 C25 38 22 38 22 36 C21 38 18 38 16 37 C13 36 11 33 12 30 C10 29 8 27 8 24 C7 20 9 17 12 16 C13 11 17 8 22 8 Z"
              fill="#abf7dc"
              stroke="#64d8ec"
              strokeWidth="1.5"
            />
            <path
              d="M22 8 C24 8 25 9 25 11 C25 13 23 14 22 14 C21 14 19 13 19 11 C19 9 20 8 22 8 Z"
              fill="#ffc4fb"
              opacity="0.85"
            />
            <circle cx="16" cy="15" r="2.5" fill="white" opacity="0.5" />
          </g>

          {/* Hamburger lines */}
          <g className="sm-lines">
            <line x1="12" y1="16" x2="32" y2="16" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round" className="sm-ln sm-ln-1" />
            <line x1="12" y1="22" x2="32" y2="22" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round" className="sm-ln sm-ln-2" />
            <line x1="12" y1="28" x2="32" y2="28" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round" className="sm-ln sm-ln-3" />
          </g>

          {/* X lines (open state) */}
          <g className="sm-x">
            <line x1="14" y1="14" x2="30" y2="30" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round" className="sm-x-1" />
            <line x1="30" y1="14" x2="14" y2="30" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round" className="sm-x-2" />
          </g>
        </g>
      </svg>

      <style>{`
        .sm-grp { transform-origin: 22px 22px; }

        /* ===== IDLE LOOP (closed): slime → lines → slime, 3.5s ===== */
        .sm-grp[data-open="false"] .sm-blob {
          animation: smBlobCycle 3.5s ease-in-out infinite;
          transform-origin: 22px 22px;
        }
        @keyframes smBlobCycle {
          0%, 30%   { opacity: 1; transform: scale(1) rotate(0deg); }
          10%       { transform: scale(1.08, 0.92) rotate(-2deg); }
          20%       { transform: scale(0.94, 1.06) rotate(2deg); }
          38%       { opacity: 0.8; transform: scale(1.15, 0.7) rotate(0deg); }
          45%, 65%  { opacity: 0; transform: scale(0.4, 0.3); }
          72%       { opacity: 0.5; transform: scale(1.1, 0.85) rotate(0deg); }
          80%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .sm-grp[data-open="false"] .sm-lines {
          animation: smLinesCycle 3.5s ease-in-out infinite;
          transform-origin: 22px 22px;
        }
        @keyframes smLinesCycle {
          0%, 40%   { opacity: 0; transform: scale(0.5); }
          48%       { opacity: 0.4; transform: scale(0.8); }
          55%, 62%  { opacity: 1; transform: scale(1); }
          70%       { opacity: 0.4; transform: scale(0.8); }
          78%, 100% { opacity: 0; transform: scale(0.5); }
        }

        .sm-grp[data-open="false"] .sm-ln-1 { animation: smLn1 3.5s ease-in-out infinite; }
        .sm-grp[data-open="false"] .sm-ln-2 { animation: smLn2 3.5s ease-in-out infinite; }
        .sm-grp[data-open="false"] .sm-ln-3 { animation: smLn3 3.5s ease-in-out infinite; }
        @keyframes smLn1 {
          0%, 42% { transform: translateY(0); }
          55%, 62% { transform: translateY(0); }
          78%, 100% { transform: translateY(0); }
        }
        @keyframes smLn2 {
          0%, 44% { transform: scaleX(0.3); transform-origin: 22px 22px; }
          55%, 62% { transform: scaleX(1); transform-origin: 22px 22px; }
          78%, 100% { transform: scaleX(0.3); transform-origin: 22px 22px; }
        }
        @keyframes smLn3 {
          0%, 46% { transform: translateY(0); }
          55%, 62% { transform: translateY(0); }
          78%, 100% { transform: translateY(0); }
        }

        .sm-grp[data-open="false"] .sm-x { opacity: 0; }

        /* ===== OPEN STATE: show X, hide slime and lines ===== */
        .sm-grp[data-open="true"] .sm-blob {
          animation: smBlobOut 0.3s ease-out forwards;
        }
        @keyframes smBlobOut {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.4, 0.3); }
        }

        .sm-grp[data-open="true"] .sm-lines {
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .sm-grp[data-open="true"] .sm-x {
          animation: smXIn 0.35s ease-out 0.1s both;
          transform-origin: 22px 22px;
        }
        @keyframes smXIn {
          0%   { opacity: 0; transform: scale(0.5) rotate(-90deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .sm-grp[data-open="false"] .sm-blob,
          .sm-grp[data-open="false"] .sm-lines,
          .sm-grp[data-open="false"] .sm-ln-1,
          .sm-grp[data-open="false"] .sm-ln-2,
          .sm-grp[data-open="false"] .sm-ln-3 {
            animation: none;
          }
          .sm-grp[data-open="false"] .sm-blob { opacity: 0; }
          .sm-grp[data-open="false"] .sm-lines { opacity: 1; }
          .sm-grp[data-open="false"] .sm-x { opacity: 0; }
        }
      `}</style>
    </button>
  );
}

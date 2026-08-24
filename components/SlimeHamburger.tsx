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
      className="md:hidden relative w-11 h-11 bg-none border-none cursor-pointer p-0 grid place-items-center"
      onClick={onClick}
      aria-label="Toggle menu"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        className="overflow-visible"
      >
        {/* Slime blob that morphs — animates continuously */}
        <g className="slime-hamburger-group" data-open={open}>
          {/* Slime splat blob */}
          <path
            className="slime-blob"
            d="M20 6 C24 6 27 8 28 11 C31 11 34 14 34 18 C34 21 32 23 30 24 C31 27 29 30 26 31 C24 33 21 32 20 30 C19 32 16 33 14 31 C11 30 9 27 10 24 C8 23 6 21 6 18 C6 14 9 11 12 11 C13 8 16 6 20 6 Z"
            fill="#abf7dc"
            stroke="#64d8ec"
            strokeWidth="1.5"
            opacity="0.9"
          />
          {/* Shine dot */}
          <circle className="slime-shine" cx="15" cy="13" r="2" fill="white" opacity="0.6" />

          {/* Three lines that appear when open */}
          <line
            className="slime-line slime-line-1"
            x1="12" y1="16" x2="28" y2="16"
            stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round"
          />
          <line
            className="slime-line slime-line-2"
            x1="12" y1="20" x2="28" y2="20"
            stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round"
          />
          <line
            className="slime-line slime-line-3"
            x1="12" y1="24" x2="28" y2="24"
            stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round"
          />
        </g>
      </svg>

      <style>{`
        .slime-hamburger-group {
          transform-origin: 20px 20px;
        }

        /* === CLOSED STATE: looping slime wobble === */
        .slime-blob {
          transform-origin: 20px 20px;
          animation: slimeWobble 2.5s ease-in-out infinite;
        }

        @keyframes slimeWobble {
          0%, 100% {
            transform: scale(1, 1);
            d: path("M20 6 C24 6 27 8 28 11 C31 11 34 14 34 18 C34 21 32 23 30 24 C31 27 29 30 26 31 C24 33 21 32 20 30 C19 32 16 33 14 31 C11 30 9 27 10 24 C8 23 6 21 6 18 C6 14 9 11 12 11 C13 8 16 6 20 6 Z");
          }
          25% {
            transform: scale(1.08, 0.92);
            d: path("M20 7 C25 7 28 9 29 12 C32 12 35 15 34 19 C34 22 32 24 30 25 C32 28 29 31 26 32 C24 34 21 33 20 31 C19 33 16 34 14 32 C11 31 8 28 10 25 C8 24 5 22 6 19 C6 15 9 12 12 12 C13 9 16 7 20 7 Z");
          }
          50% {
            transform: scale(0.95, 1.05);
            d: path("M20 5 C23 5 26 7 27 10 C30 10 33 13 33 17 C33 20 31 22 29 23 C30 26 28 29 25 30 C23 32 20 31 20 29 C19 31 16 32 14 30 C11 29 9 26 10 23 C8 22 6 20 7 17 C7 13 10 10 13 10 C14 7 17 5 20 5 Z");
          }
          75% {
            transform: scale(1.05, 0.95);
            d: path("M20 7 C24 7 27 9 28 12 C31 12 34 15 34 19 C34 22 32 24 30 25 C31 28 29 31 26 32 C24 34 21 33 20 31 C19 33 16 34 14 32 C11 31 9 28 10 25 C8 24 6 22 6 19 C6 15 9 12 12 12 C13 9 16 7 20 7 Z");
          }
        }

        .slime-shine {
          animation: slimeShine 2.5s ease-in-out infinite;
        }

        @keyframes slimeShine {
          0%, 100% { opacity: 0.6; transform: translate(0, 0); }
          50% { opacity: 0.3; transform: translate(2px, 1px); }
        }

        /* Lines hidden when closed */
        .slime-line {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        /* === OPEN STATE: blob shrinks, lines appear === */
        .slime-hamburger-group[data-open="true"] .slime-blob {
          animation: slimeSplat 0.4s ease-out forwards;
        }

        @keyframes slimeSplat {
          0% {
            transform: scale(1);
            opacity: 0.9;
          }
          60% {
            transform: scale(1.3, 0.7);
            opacity: 0.5;
          }
          100% {
            transform: scale(0.4, 0.3);
            opacity: 0;
          }
        }

        .slime-hamburger-group[data-open="true"] .slime-shine {
          animation: slimeShineOut 0.3s ease-out forwards;
        }

        @keyframes slimeShineOut {
          to { opacity: 0; }
        }

        .slime-hamburger-group[data-open="true"] .slime-line {
          opacity: 1;
          transition: opacity 0.15s ease 0.2s;
        }

        .slime-hamburger-group[data-open="true"] .slime-line-1 {
          animation: lineIn1 0.3s ease-out 0.15s both;
        }
        .slime-hamburger-group[data-open="true"] .slime-line-2 {
          animation: lineIn2 0.3s ease-out 0.2s both;
        }
        .slime-hamburger-group[data-open="true"] .slime-line-3 {
          animation: lineIn3 0.3s ease-out 0.25s both;
        }

        @keyframes lineIn1 {
          from { transform: translateY(-4px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes lineIn2 {
          from { transform: scale(0.5); opacity: 0; transform-origin: 20px 20px; }
          to { transform: scale(1); opacity: 1; transform-origin: 20px 20px; }
        }
        @keyframes lineIn3 {
          from { transform: translateY(4px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* When transitioning back to closed, re-trigger wobble */
        .slime-hamburger-group[data-open="false"] .slime-blob {
          animation: slimeReturn 0.3s ease-out, slimeWobble 2.5s ease-in-out 0.3s infinite;
        }

        @keyframes slimeReturn {
          0% { transform: scale(0.4, 0.3); opacity: 0; }
          60% { transform: scale(1.15, 0.85); opacity: 0.7; }
          100% { transform: scale(1, 1); opacity: 0.9; }
        }
      `}</style>
    </button>
  );
}

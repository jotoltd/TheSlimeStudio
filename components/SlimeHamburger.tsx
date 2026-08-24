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
        <g className="slime-menu-group" data-open={open}>
          {/* Slime blob — mint body */}
          <path
            className="slime-menu-blob"
            d="M20 6 C24 6 27 8 28 11 C31 11 34 14 34 18 C34 21 32 23 30 24 C31 27 29 30 26 31 C24 33 21 32 20 30 C19 32 16 33 14 31 C11 30 9 27 10 24 C8 23 6 21 6 18 C6 14 9 11 12 11 C13 8 16 6 20 6 Z"
            fill="#abf7dc"
            stroke="#64d8ec"
            strokeWidth="1.5"
          />
          {/* Pink slime drip on top */}
          <path
            className="slime-menu-drip"
            d="M20 6 C22 6 23 7 23 9 C23 11 21 12 20 12 C19 12 17 11 17 9 C17 7 18 6 20 6 Z"
            fill="#ffc4fb"
            opacity="0.8"
          />
          {/* Shine dot */}
          <circle className="slime-menu-shine" cx="15" cy="13" r="2" fill="white" opacity="0.6" />

          {/* Three hamburger lines — appear during loop and when open */}
          <line
            className="slime-menu-line slime-menu-line-1"
            x1="11" y1="15" x2="29" y2="15"
            stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round"
          />
          <line
            className="slime-menu-line slime-menu-line-2"
            x1="11" y1="20" x2="29" y2="20"
            stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round"
          />
          <line
            className="slime-menu-line slime-menu-line-3"
            x1="11" y1="25" x2="29" y2="25"
            stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round"
          />
        </g>
      </svg>

      <style>{`
        .slime-menu-group {
          transform-origin: 20px 20px;
        }

        /*
         * IDLE LOOP (menu closed): 4s cycle
         * 0-35%:   Slime blob wobbles/morphs
         * 42%:     Slime splats flat
         * 50-70%:  Lines visible (hamburger state)
         * 78%:     Slime re-forms
         * 88-100%: Back to slime blob
         */
        .slime-menu-group[data-open="false"] .slime-menu-blob {
          animation: blobMorphLoop 4s ease-in-out infinite;
          transform-origin: 20px 20px;
        }

        @keyframes blobMorphLoop {
          0%, 35% {
            opacity: 1;
            transform: scale(1, 1);
            d: path("M20 6 C24 6 27 8 28 11 C31 11 34 14 34 18 C34 21 32 23 30 24 C31 27 29 30 26 31 C24 33 21 32 20 30 C19 32 16 33 14 31 C11 30 9 27 10 24 C8 23 6 21 6 18 C6 14 9 11 12 11 C13 8 16 6 20 6 Z");
          }
          15% {
            transform: scale(1.06, 0.94);
            d: path("M20 7 C25 7 28 9 29 12 C32 12 35 15 34 19 C34 22 32 24 30 25 C32 28 29 31 26 32 C24 34 21 33 20 31 C19 33 16 34 14 32 C11 31 8 28 10 25 C8 24 5 22 6 19 C6 15 9 12 12 12 C13 9 16 7 20 7 Z");
          }
          25% {
            transform: scale(0.96, 1.04);
            d: path("M20 5 C23 5 26 7 27 10 C30 10 33 13 33 17 C33 20 31 22 29 23 C30 26 28 29 25 30 C23 32 20 31 20 29 C19 31 16 32 14 30 C11 29 9 26 10 23 C8 22 6 20 7 17 C7 13 10 10 13 10 C14 7 17 5 20 5 Z");
          }
          42% {
            opacity: 1;
            transform: scale(1.2, 0.6);
            d: path("M20 10 C26 10 32 11 33 14 C34 16 33 18 32 19 C33 21 33 23 31 24 C29 25 25 25 20 25 C15 25 11 25 9 24 C7 23 7 21 8 19 C7 18 6 16 7 14 C8 11 14 10 20 10 Z");
          }
          50%, 70% {
            opacity: 0;
            transform: scale(0.3, 0.2);
          }
          78% {
            opacity: 0.5;
            transform: scale(1.15, 0.8);
            d: path("M20 8 C24 8 27 10 28 13 C31 13 34 16 33 19 C33 22 31 24 29 25 C30 27 28 30 25 31 C23 33 20 32 20 30 C19 32 16 33 14 31 C11 30 9 27 10 24 C8 23 6 21 7 18 C7 14 10 11 13 12 C14 9 17 8 20 8 Z");
          }
          88%, 100% {
            opacity: 1;
            transform: scale(1, 1);
            d: path("M20 6 C24 6 27 8 28 11 C31 11 34 14 34 18 C34 21 32 23 30 24 C31 27 29 30 26 31 C24 33 21 32 20 30 C19 32 16 33 14 31 C11 30 9 27 10 24 C8 23 6 21 6 18 C6 14 9 11 12 11 C13 8 16 6 20 6 Z");
          }
        }

        .slime-menu-group[data-open="false"] .slime-menu-drip {
          animation: dripLoop 4s ease-in-out infinite;
          transform-origin: 20px 9px;
        }

        @keyframes dripLoop {
          0%, 35% { opacity: 0.8; transform: scale(1, 1); }
          15% { transform: scale(1.1, 1.2); }
          25% { transform: scale(0.9, 0.8); }
          42% { opacity: 0.3; transform: scale(1.3, 0.5); }
          50%, 70% { opacity: 0; transform: scale(0.2, 0.1); }
          78% { opacity: 0.4; transform: scale(1.1, 1.1); }
          88%, 100% { opacity: 0.8; transform: scale(1, 1); }
        }

        .slime-menu-group[data-open="false"] .slime-menu-shine {
          animation: shineLoop 4s ease-in-out infinite;
        }

        @keyframes shineLoop {
          0%, 35% { opacity: 0.6; }
          42% { opacity: 0; }
          50%, 70% { opacity: 0; }
          78% { opacity: 0.3; }
          88%, 100% { opacity: 0.6; }
        }

        .slime-menu-group[data-open="false"] .slime-menu-line-1 {
          animation: lineLoop1 4s ease-in-out infinite;
        }
        .slime-menu-group[data-open="false"] .slime-menu-line-2 {
          animation: lineLoop2 4s ease-in-out infinite;
        }
        .slime-menu-group[data-open="false"] .slime-menu-line-3 {
          animation: lineLoop3 4s ease-in-out infinite;
        }

        @keyframes lineLoop1 {
          0%, 42% { opacity: 0; transform: translateY(0); }
          50% { opacity: 0.5; transform: translateY(2px); }
          58%, 68% { opacity: 1; transform: translateY(0); }
          76% { opacity: 0.5; transform: translateY(2px); }
          82%, 100% { opacity: 0; transform: translateY(0); }
        }
        @keyframes lineLoop2 {
          0%, 44% { opacity: 0; transform: scaleX(0.3); transform-origin: 20px 20px; }
          52% { opacity: 0.5; transform: scaleX(0.6); transform-origin: 20px 20px; }
          60%, 66% { opacity: 1; transform: scaleX(1); transform-origin: 20px 20px; }
          74% { opacity: 0.5; transform: scaleX(0.6); transform-origin: 20px 20px; }
          82%, 100% { opacity: 0; transform: scaleX(0.3); transform-origin: 20px 20px; }
        }
        @keyframes lineLoop3 {
          0%, 46% { opacity: 0; transform: translateY(0); }
          54% { opacity: 0.5; transform: translateY(-2px); }
          62%, 66% { opacity: 1; transform: translateY(0); }
          74% { opacity: 0.5; transform: translateY(-2px); }
          82%, 100% { opacity: 0; transform: translateY(0); }
        }

        /* === OPEN STATE: slime gone, X lines === */
        .slime-menu-group[data-open="true"] .slime-menu-blob {
          animation: blobSplatOut 0.35s ease-out forwards;
        }
        @keyframes blobSplatOut {
          0% { opacity: 1; transform: scale(1); }
          60% { opacity: 0.4; transform: scale(1.3, 0.6); }
          100% { opacity: 0; transform: scale(0.3, 0.2); }
        }

        .slime-menu-group[data-open="true"] .slime-menu-drip {
          animation: dripOut 0.3s ease-out forwards;
        }
        @keyframes dripOut {
          to { opacity: 0; transform: scale(0.2, 0.1); }
        }

        .slime-menu-group[data-open="true"] .slime-menu-shine {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .slime-menu-group[data-open="true"] .slime-menu-line {
          opacity: 1;
        }
        .slime-menu-group[data-open="true"] .slime-menu-line-1 {
          animation: lineToX1 0.3s ease-out 0.1s both;
        }
        .slime-menu-group[data-open="true"] .slime-menu-line-2 {
          animation: lineToX2 0.3s ease-out 0.1s both;
        }
        .slime-menu-group[data-open="true"] .slime-menu-line-3 {
          animation: lineToX3 0.3s ease-out 0.1s both;
        }

        @keyframes lineToX1 {
          from { transform: translateY(0) rotate(0deg); opacity: 0; }
          to { transform: translateY(5px) rotate(45deg); opacity: 1; }
        }
        @keyframes lineToX2 {
          from { opacity: 0; }
          to { opacity: 0; }
        }
        @keyframes lineToX3 {
          from { transform: translateY(0) rotate(0deg); opacity: 0; }
          to { transform: translateY(-5px) rotate(-45deg); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .slime-menu-group[data-open="false"] .slime-menu-blob,
          .slime-menu-group[data-open="false"] .slime-menu-drip,
          .slime-menu-group[data-open="false"] .slime-menu-shine,
          .slime-menu-group[data-open="false"] .slime-menu-line-1,
          .slime-menu-group[data-open="false"] .slime-menu-line-2,
          .slime-menu-group[data-open="false"] .slime-menu-line-3 {
            animation: none;
          }
          .slime-menu-group[data-open="false"] .slime-menu-line {
            opacity: 1;
          }
          .slime-menu-group[data-open="false"] .slime-menu-blob,
          .slime-menu-group[data-open="false"] .slime-menu-drip,
          .slime-menu-group[data-open="false"] .slime-menu-shine {
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
}

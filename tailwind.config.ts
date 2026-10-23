import type { Config } from "tailwindcss";

// Palette lives in CSS variables (see globals.css :root) so the whole site can
// be re-themed at runtime via html[data-theme="..."].
function themed(name: string) {
  return `rgb(var(${name}) / <alpha-value>)`;
}

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — Mint
        aquamarine: themed("--c-aquamarine"),
        "sky-blue-light": themed("--c-sky-blue-light"),
        // Secondary — Lavender
        "bright-lavender": themed("--c-bright-lavender"),
        "blush-pop": themed("--c-blush-pop"),
        // Accent — Coral
        "canary-yellow": themed("--c-canary-yellow"),
        peach: themed("--c-peach"),
        // Neutrals
        ink: themed("--c-ink"),
        "ink-soft": themed("--c-ink-soft"),
        cream: themed("--c-cream"),
        pagebg: themed("--c-body-bg"),
        card: themed("--c-card"),
        "on-accent": themed("--c-on-accent"),
        // Brand accents & surfaces (hex values kept as tokens so themes recolour them)
        "hot-pink": themed("--c-hot-pink"),
        magenta: themed("--c-magenta"),
        "pink-soft": themed("--c-pink-soft"),
        "soft-pink": themed("--c-soft-pink"),
      },
      fontFamily: {
        display: ["Avenir", "Avenir Next", "var(--font-poppins)", "system-ui", "sans-serif"],
        body: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "12px",
        md: "20px",
        lg: "32px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;

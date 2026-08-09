import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — Mint
        aquamarine: "#abf7dc",
        "sky-blue-light": "#64d8ec",
        // Secondary — Lavender
        "bright-lavender": "#CBC3E3",
        "blush-pop": "#E0B0FF",
        // Accent — Coral
        "canary-yellow": "#F2734C",
        peach: "#F2734C",
        // Neutrals
        ink: "#211B3D",
        "ink-soft": "#5A5278",
        cream: "#FBF8F5",
      },
      fontFamily: {
        display: ["Avenir", "Avenir Next", "Poppins", "system-ui", "sans-serif"],
        body: ["Poppins", "system-ui", "sans-serif"],
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

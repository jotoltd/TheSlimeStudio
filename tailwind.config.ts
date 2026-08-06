import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aquamarine: "#abf7dc",
        "blush-pop": "#ffc4fb",
        "canary-yellow": "#fffd74",
        "bright-lavender": "#c4aef0",
        "sky-blue-light": "#64d8ec",
        ink: "#2b2350",
        "ink-soft": "#5a5278",
        cream: "#fffaff",
        peach: "#FAA989",
      },
      fontFamily: {
        display: ["Chewy", "Poppins", "system-ui", "sans-serif"],
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

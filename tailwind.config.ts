import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        midnight: "#0B1120",
        "midnight-light": "#111827",
        "midnight-border": "#1e293b",
        cloud: "#F8FAFC",
        radar: { DEFAULT: "#10B981", dim: "#10B98122", glow: "#10B98144" },
        cyan: { DEFAULT: "#06B6D4", dim: "#06B6D422" },
        ocean: { DEFAULT: "#0369A1", dim: "#0369A122" },
        forest: "#059669",
        amber: { DEFAULT: "#F59E0B", dim: "#F59E0B22" },
        crimson: { DEFAULT: "#EF4444", dim: "#EF444422" },
      },
      fontFamily: {
        display: ['"Inter"', "system-ui", "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
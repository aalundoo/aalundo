import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#08080c",
          900: "#0c0c12",
          850: "#101018",
          800: "#15151f",
          700: "#1c1c2a",
        },
        brand: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        accent: {
          500: "#d946ef",
        },
        live: {
          400: "#34d399",
          500: "#10b981",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px -12px rgba(124,58,237,0.5)",
        "speak": "0 0 0 3px rgba(16,185,129,0.5), 0 0 28px -2px rgba(16,185,129,0.7)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-22px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        ring: {
          "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.55)" },
          "100%": { boxShadow: "0 0 0 14px rgba(16,185,129,0)" },
        },
      },
      animation: {
        float: "float 9s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        ring: "ring 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

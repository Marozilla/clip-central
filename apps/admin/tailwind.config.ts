import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cc: {
          white: "#ffffff",
          blue: "#2b78e4",
          green: "#37c136",
          orange: "#ef790f",
          gold: "#f4c543",
          black: "#050505",
          surface: "#0c0c0e",
          elevated: "#141418",
          border: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(43, 120, 228, 0.35)",
        "glow-green": "0 0 30px -8px rgba(55, 193, 54, 0.3)",
        card: "0 4px 24px -4px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "mesh-gradient":
          "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(43,120,228,0.18), transparent 50%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(55,193,54,0.08), transparent 45%), radial-gradient(ellipse 50% 30% at 50% 100%, rgba(239,121,15,0.06), transparent 50%)",
        "btn-primary": "linear-gradient(135deg, #2b78e4 0%, #1a5bb8 100%)",
        "dot-bar": "linear-gradient(90deg, #2b78e4, #37c136, #f4c543, #ef790f)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;

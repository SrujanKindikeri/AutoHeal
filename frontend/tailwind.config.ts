import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Apple Cinematic Palette
        surface: {
          background: "#08080a",
          primary: "#0f0f14",
          secondary: "#16161f",
          elevated: "#1e1e2a",
          glass: "rgba(18, 18, 24, 0.72)",
          "glass-hover": "rgba(25, 25, 34, 0.85)",
          "glass-card": "rgba(22, 22, 30, 0.55)",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.06)",
          glass: "rgba(255, 255, 255, 0.09)",
          strong: "rgba(255, 255, 255, 0.16)",
          focus: "#2997ff",
        },
        content: {
          primary: "#f5f5f7",
          secondary: "rgba(245, 245, 247, 0.75)",
          muted: "rgba(245, 245, 247, 0.45)",
          inverse: "#08080a",
        },
        accent: {
          blue: "#2997ff",
          "blue-hover": "#0071e3",
          purple: "#bf5af2",
          "purple-hover": "#a838eb",
          pink: "#ff375f",
          gold: "#ffd60a",
          emerald: "#30d158",
          coral: "#ff453a",
        },
        // MovieFlow Legacy Shorthands
        mf: {
          dark: "#08080a",
          card: "#121217",
          subtle: "#1c1c24",
          border: "rgba(255, 255, 255, 0.08)",
          accent: "#2997ff",
          "accent-hover": "#0071e3",
          gold: "#ffd60a",
          purple: "#bf5af2",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Cascadia Mono",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        "display-lg": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "heading-xl": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
        "heading-lg": ["1.75rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        "heading-md": ["1.375rem", { lineHeight: "1.3", letterSpacing: "-0.005em" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.4", letterSpacing: "0em" }],
        "body-lg": ["1rem", { lineHeight: "1.5" }],
        "body-md": ["0.875rem", { lineHeight: "1.5" }],
        "body-sm": ["0.75rem", { lineHeight: "1.45" }],
        caption: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.02em" }],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-elevated": "0 16px 48px 0 rgba(0, 0, 0, 0.5)",
        "glow-blue": "0 0 30px -5px rgba(41, 151, 255, 0.35)",
        "glow-purple": "0 0 30px -5px rgba(191, 90, 242, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
        glass: "20px",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out forwards",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

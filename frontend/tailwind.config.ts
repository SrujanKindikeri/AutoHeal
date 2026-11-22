import type { Config } from "tailwindcss";

const config: Config = {
  // Class-based dark mode with a class that is never added anywhere in the app,
  // so no automatic (media-query) dark theme can ever apply. Light-only UI.
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Apple palette — white/light theme (direct values so opacity
        // modifiers like bg-surface-primary/80 keep working in Tailwind v3).
        surface: {
          background: "#FFFFFF",
          card: "#FFFFFF",
          primary: "#F5F5F7",
          secondary: "#FAFAFC",
          elevated: "#F5F5F7",
          glass: "rgba(255, 255, 255, 0.85)",
          "glass-hover": "rgba(248, 248, 250, 0.95)",
          "glass-card": "rgba(255, 255, 255, 0.95)",
        },
        border: {
          default: "#D2D2D7",
          subtle: "#E8E8ED",
          glass: "#D2D2D7",
          "glass-hover": "#B0B0B5",
          strong: "#B0B0B5",
          focus: "#2563EB",
        },
        content: {
          primary: "#1D1D1F",
          secondary: "#6E6E73",
          muted: "#86868B",
          inverse: "#FFFFFF",
        },
        accent: {
          blue: "#2563EB",
          "blue-hover": "#1D4ED8",
          purple: "#bf5af2",
          "purple-hover": "#a838eb",
          pink: "#ff375f",
          gold: "#D97706",
          emerald: "#16A34A",
          coral: "#dc2626",
          "coral-hover": "#B91C1C",
        },
        // MovieFlow Legacy Shorthands — re-pointed to light values
        mf: {
          dark: "#FFFFFF",
          card: "#FFFFFF",
          subtle: "#F5F5F7",
          border: "#D2D2D7",
          accent: "#2563EB",
          "accent-hover": "#1D4ED8",
          gold: "#ffd60a",
          purple: "#bf5af2",
        },
        // shadcn-style semantic tokens wired to CSS variables (globals.css :root)
        theme: {
          background: "var(--background)",
          "background-secondary": "var(--background-secondary)",
          "background-tertiary": "var(--background-tertiary)",
          foreground: "var(--foreground)",
          "foreground-secondary": "var(--foreground-secondary)",
          "muted-foreground": "var(--muted-foreground)",
          card: "var(--card)",
          "card-foreground": "var(--card-foreground)",
          popover: "var(--popover)",
          "popover-foreground": "var(--popover-foreground)",
          primary: "var(--primary)",
          "primary-foreground": "var(--primary-foreground)",
          secondary: "var(--secondary)",
          "secondary-foreground": "var(--secondary-foreground)",
          muted: "var(--muted)",
          accent: "var(--accent)",
          "accent-foreground": "var(--accent-foreground)",
          input: "var(--input)",
          ring: "var(--ring)",
          sidebar: "var(--sidebar)",
          "sidebar-foreground": "var(--sidebar-foreground)",
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
        glass: "0 1px 3px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06)",
        "glass-elevated":
          "0 4px 16px rgba(0, 0, 0, 0.12), 0 24px 48px rgba(0, 0, 0, 0.08)",
        "glow-blue": "0 0 30px -5px rgba(37, 99, 235, 0.25)",
        "glow-purple": "0 0 30px -5px rgba(191, 90, 242, 0.25)",
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

/** @type {import('tailwindcss').Config} */

/** RGB channel CSS vars → Tailwind opacity modifiers (bg-ink/40, etc.) */
const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: channel("--ink"),
          soft: channel("--ink-soft"),
          mute: channel("--ink-mute"),
        },
        paper: {
          DEFAULT: channel("--paper"),
          raised: channel("--paper-raised"),
          line: channel("--paper-line"),
        },
        accent: {
          DEFAULT: channel("--accent"),
          light: channel("--accent-light"),
          mute: channel("--accent-mute"),
          invert: channel("--accent-text"),
        },
        highlight: {
          DEFAULT: channel("--highlight"),
          soft: "rgb(var(--highlight) / 0.14)",
        },
        success: channel("--success"),
        warning: channel("--warning"),
        danger: channel("--danger"),
        info: channel("--info"),
        sidebar: {
          DEFAULT: channel("--sidebar"),
          text: channel("--sidebar-text"),
          mute: channel("--sidebar-mute"),
          active: channel("--sidebar-active"),
        },
      },
      fontFamily: {
        sans: [
          "var(--font-cairo)",
          "Cairo",
          "IBM Plex Sans Arabic",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["var(--font-outfit)", "Outfit", "ui-monospace", "monospace"],
        display: ["var(--font-cairo)", "Cairo", "sans-serif"],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
        inset: "inset 0 -1px 0 rgb(var(--ink) / 0.08)",
      },
      borderRadius: {
        panel: "var(--radius)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "chart-rise": {
          from: { opacity: "0", transform: "translateY(12px) scaleY(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scaleY(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) both",
        "chart-rise": "chart-rise 0.5s cubic-bezier(0.32, 0.72, 0, 1) both",
      },
    },
  },
  plugins: [],
};

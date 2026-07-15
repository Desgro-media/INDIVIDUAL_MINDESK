import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":  "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-mesh":
          "radial-gradient(ellipse 80% 55% at 15% 8%, rgba(120,155,255,0.20) 0%, transparent 58%), " +
          "radial-gradient(ellipse 55% 70% at 85% 85%, rgba(160,90,255,0.14) 0%, transparent 58%), " +
          "linear-gradient(140deg, var(--bg-from) 0%, var(--bg-mid) 50%, var(--bg-to) 100%)",
      },
      colors: {
        accent: {
          DEFAULT: "#4f6ef7",
          dim:     "#7b8ff5",
          surface: "rgba(79,110,247,0.10)",
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.60)",
          raised:  "rgba(255,255,255,0.75)",
          deep:    "rgba(255,255,255,0.38)",
        },
      },
      backdropBlur: {
        xs:  "4px",
        sm:  "14px",
        md:  "24px",
        lg:  "36px",
        xl:  "48px",
      },
      backdropSaturate: {
        "180": "180%",
        "200": "200%",
      },
      borderRadius: {
        "2xl":  "20px",
        "3xl":  "24px",
        "4xl":  "32px",
        "pill": "9999px",
      },
      boxShadow: {
        "glass":       "0 4px 24px rgba(80,110,200,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
        "glass-raised":"0 12px 40px rgba(80,110,200,0.12), 0 4px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.92)",
        "glass-deep":  "0 8px 32px rgba(80,110,200,0.10), inset 0 1px 0 rgba(255,255,255,0.90)",
        "accent":      "0 4px 20px rgba(79,110,247,0.42), 0 2px 8px rgba(79,110,247,0.20)",
        "accent-lg":   "0 8px 32px rgba(79,110,247,0.52), 0 4px 16px rgba(79,110,247,0.28)",
      },
      animation: {
        "pulse-ring":    "pulseRing 2s ease-in-out infinite",
        "float":         "liquidFloat 3.5s ease-in-out infinite",
        "spin-slow":     "spinSlow 8s linear infinite",
        "bounce-soft":   "bounceSoft 2s ease-in-out infinite",
        "fade-in-up":    "fadeInUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "scale-in":      "springIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "slide-in-right":"slideInRight 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "glow-pulse":    "glowPulse 2.5s ease-in-out infinite",
        "shimmer":       "shimmer 2.5s linear infinite",
        "marquee":       "marquee 30s linear infinite",
      },
      keyframes: {
        pulseRing: {
          "0%, 100%": { transform: "scale(1)",    opacity: "0.6" },
          "50%":      { transform: "scale(1.15)", opacity: "0.3" },
        },
        liquidFloat: {
          "0%, 100%": { transform: "translateY(0) scale(1)"      },
          "40%":      { transform: "translateY(-8px) scale(1.01)" },
          "70%":      { transform: "translateY(-3px) scale(0.99)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(22px) scale(0.97)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)"       },
        },
        springIn: {
          "0%":   { opacity: "0", transform: "scale(0.88) translateY(18px)" },
          "65%":  { opacity: "1", transform: "scale(1.03) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)"       },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(26px)" },
          to:   { opacity: "1", transform: "translateX(0)"    },
        },
        spinSlow: {
          from: { transform: "rotate(0deg)"   },
          to:   { transform: "rotate(360deg)" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)"  },
          "50%":      { transform: "translateY(-6px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(79,110,247,0)"    },
          "50%":      { boxShadow: "0 0 0 8px rgba(79,110,247,0.12)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% center" },
          to:   { backgroundPosition:  "200% center"  },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

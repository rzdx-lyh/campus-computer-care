/** 用途：配置 Tailwind CSS 扫描范围与校园蓝主题扩展。 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Hiragino Sans GB"', '"Segoe UI"', "system-ui", "sans-serif"],
        serif: ['Georgia', '"Songti SC"', '"STSong"', '"Noto Serif CJK SC"', '"Source Han Serif SC"', "SimSun", "serif"],
        mono: ['"SFMono-Regular"', "Menlo", "Consolas", '"Liberation Mono"', "monospace"],
      },
      colors: {
        campus: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#bfe1fe",
          300: "#92cefd",
          400: "#5eb2fa",
          500: "#3892f6",
          600: "#2273eb",
          700: "#1a5dd8",
          800: "#1d4eaf",
          900: "#1e458a",
        },
      },
      boxShadow: {
        soft: "0 18px 50px -24px rgba(30, 69, 138, 0.28)",
      },
      animation: {
        "fade-up": "fadeUp 0.45s ease-out both",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

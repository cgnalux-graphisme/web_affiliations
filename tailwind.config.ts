import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Palette stricte de la vitrine "éditorial militant" (/actions).
      colors: {
        militant: {
          rouge: "#E32119",
          bordeaux: "#AA0F33",
          charbon: "#222222",
          ardoise: "#7C90A0",
        },
      },
      fontFamily: {
        condensed: ["var(--font-condensed)", "Arial Narrow", "sans-serif"],
        barlow: ["var(--font-barlow)", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

// ── Palette stricte du site ACCG Nalux ───────────────────────────────────────
const ROUGE = "#E32119";
const BORDEAUX = "#931510";
const CHARBON = "#222222";
const BLANC = "#FFFFFF";
const ARDOISE = "#7C90A0";

/**
 * COUCHE DE COMPATIBILITÉ (migration de l'ancien design).
 * Les anciens écrans (formulaires C1, C3.2, SEPA, préavis, indépendants…) utilisent
 * les couleurs Tailwind par défaut (red-700, gray-500, blue-600…). Plutôt que de
 * réécrire des milliers de classes, ces échelles sont remappées sur la palette :
 *   - teintes très claires (50-100) → blanc (pas de teinte hors palette) ;
 *   - teintes de bordure (200-300) → ardoise ;
 *   - teintes soutenues → bordeaux (accents) ou charbon (texte), jamais de grand
 *     fond noir : une classe bg-gray-900 reste rare dans l'ancien code.
 * Vert et bleu disparaissent : ils sont réservés à la CSC et à Synova.
 * Pour tout NOUVEAU code : utiliser les couleurs `militant-*`.
 */
const echelle = (claires: string, bordures: string, soutenues: string, foncees: string) => ({
  50: claires,
  100: claires,
  200: bordures,
  300: bordures,
  400: soutenues,
  500: soutenues,
  600: soutenues,
  700: soutenues,
  800: foncees,
  900: foncees,
  950: foncees,
});

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        militant: {
          rouge: ROUGE,
          bordeaux: BORDEAUX,
          charbon: CHARBON,
          ardoise: ARDOISE,
        },
        // Couche de compatibilité (voir plus haut).
        // 800 = survol des boutons (petite surface) ; 900-950 servent de fonds de
        // blocs dans l'ancien code → bordeaux, jamais de grand fond noir.
        red: { ...echelle(BLANC, ARDOISE, BORDEAUX, BORDEAUX), 400: ROUGE, 500: ROUGE, 800: CHARBON },
        gray: { ...echelle(BLANC, ARDOISE, CHARBON, CHARBON) },
        slate: { ...echelle(BLANC, ARDOISE, CHARBON, CHARBON) },
        blue: { ...echelle(BLANC, ARDOISE, BORDEAUX, CHARBON) },
        green: { ...echelle(BLANC, ARDOISE, BORDEAUX, CHARBON) },
        emerald: { ...echelle(BLANC, ARDOISE, BORDEAUX, CHARBON) },
        amber: { ...echelle(BLANC, ARDOISE, BORDEAUX, CHARBON) },
      },
      fontFamily: {
        condensed: ["var(--font-condensed)", "Arial Narrow", "sans-serif"],
        barlow: ["var(--font-barlow)", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

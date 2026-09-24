import localFont from "next/font/local";

// Polices auto-hébergées (paquets @fontsource) : aucun appel à Google Fonts.
export const condensed = localFont({
  src: [
    { path: "../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2", weight: "600" },
    { path: "../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2", weight: "700" },
    { path: "../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-condensed",
  fallback: ["Arial Narrow", "sans-serif"],
});
export const barlow = localFont({
  src: [
    { path: "../node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/barlow/files/barlow-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../node_modules/@fontsource/barlow/files/barlow-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-barlow",
  fallback: ["Arial", "sans-serif"],
});

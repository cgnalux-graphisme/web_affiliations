import { Font } from "@react-pdf/renderer";

/** Palette stricte du site, pour les documents PDF générés. */
export const PDF_COULEURS = {
  rouge: "#E32119",
  bordeaux: "#AA0F33",
  charbon: "#222222",
  blanc: "#FFFFFF",
  ardoise: "#7C90A0",
} as const;

let enregistrees = false;

/**
 * Barlow / Barlow Condensed (licence OFL), servies depuis /public/fonts en .woff.
 * Graisses disponibles : Barlow 400 (+ italique) et 600 ; Barlow Condensed 600 et 800.
 * À appeler dans le navigateur avant de générer un PDF.
 */
export function enregistrerPolicesPdf(origine: string) {
  if (enregistrees) return;
  Font.register({
    family: "Barlow",
    fonts: [
      { src: `${origine}/fonts/barlow-400.woff`, fontWeight: 400 },
      { src: `${origine}/fonts/barlow-400-italic.woff`, fontWeight: 400, fontStyle: "italic" },
      { src: `${origine}/fonts/barlow-600.woff`, fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Barlow Condensed",
    fonts: [
      { src: `${origine}/fonts/barlow-condensed-600.woff`, fontWeight: 600 },
      { src: `${origine}/fonts/barlow-condensed-800.woff`, fontWeight: 800 },
    ],
  });
  // Pas de césure automatique au milieu des mots.
  Font.registerHyphenationCallback((mot) => [mot]);
  enregistrees = true;
}

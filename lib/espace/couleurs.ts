/**
 * Couleur foncée d'une app de l'Espace CG (boutons, onglets, liens) : la couleur de l'app mélangée à du noir.
 * Le mélange habituel est 72 % ; une couleur claire (ex. l'orange #E69F00) est assombrie davantage, juste assez
 * pour que le texte blanc reste lisible (contraste AA ≥ 4,5:1). Pur : utilisable partout.
 */

const PART_HABITUELLE = 72;
const HEX = /^#([0-9a-f]{6})$/i;

function canaux(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const l = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
}

export function contrasteAvecBlanc(hex: string): number {
  return 1.05 / (luminance(canaux(hex)) + 0.05);
}

function melange(hex: string, part: number): string {
  return `#${canaux(hex).map((c) => Math.round((c * part) / 100).toString(16).padStart(2, "0")).join("")}`;
}

export function foncePourTexteBlanc(couleur: string): { hex: string; part: number } {
  if (!HEX.test(couleur)) return { hex: "", part: PART_HABITUELLE };
  for (let part = PART_HABITUELLE; part >= 30; part -= 2) {
    const hex = melange(couleur, part);
    if (contrasteAvecBlanc(hex) >= 4.5) return { hex, part };
  }
  return { hex: melange(couleur, 30), part: 30 };
}

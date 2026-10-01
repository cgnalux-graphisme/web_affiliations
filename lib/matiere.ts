/**
 * Jauge « Matière » du panneau de rédaction assistée : ce dont l'IA disposera pour écrire, et le meilleur
 * geste suivant pour l'étoffer. Estimation en mots, sans dépendance (navigateur).
 */
import { LECTURES_MAX } from "./redaction-limites";

export type Lisible = "oui" | "non" | "inconnu" | "chargement";

export type SourceMatiere = {
  nom: string;
  resumeMots: number;
  lisible: Lisible;
  lire: boolean;
  texteMots: number;
};

export type NiveauMatiere = "maigre" | "correcte" | "solide";

export type Matiere = {
  niveau: NiveauMatiere;
  /** Remplissage de la jauge, de 0 à 1. */
  remplissage: number;
  conseil: string | null;
  lectures: number;
  /** Coût indicatif du brouillon, en centimes. */
  coutCentimes: number;
};

/** Seuils (mots utiles) : en dessous de MAIGRE, la matière est maigre ; à partir de SOLIDE, elle suffit. */
export const SEUIL_CORRECTE = 200;
export const SEUIL_SOLIDE = 600;
const PLEIN = 900;
/** Estimation d'un article lu par l'IA (non garanti : article payant, page protégée). */
const MOTS_LECTURE = { oui: 700, inconnu: 400 } as const;
const COUT_BASE = 2;
const COUT_LECTURE = 8;

export function compterMots(texte: string): number {
  const t = texte.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** La source peut-elle être lue par l'IA ? (« non » est fiable ; « inconnu » peut échouer) */
export const lecturePossible = (l: Lisible) => l === "oui" || l === "inconnu";

export function evaluerMatiere(sources: SourceMatiere[], notesMots: number): Matiere {
  const lectures = sources.filter((s) => s.lire && lecturePossible(s.lisible)).length;
  const mots =
    sources.reduce((n, s) => {
      const profond = s.texteMots
        ? Math.min(s.texteMots, 2500)
        : s.lire && lecturePossible(s.lisible)
          ? MOTS_LECTURE[s.lisible as "oui" | "inconnu"]
          : 0;
      return n + Math.min(s.resumeMots, 250) + profond;
    }, 0) + Math.min(notesMots, 1500);

  const niveau: NiveauMatiere = mots >= SEUIL_SOLIDE ? "solide" : mots >= SEUIL_CORRECTE ? "correcte" : "maigre";

  let conseil: string | null = null;
  if (niveau !== "solide") {
    // La source la plus détaillée (résumé le plus long) qui n'a encore ni lecture ni texte collé.
    const candidates = sources.filter((s) => !s.texteMots && !s.lire).sort((a, b) => b.resumeMots - a.resumeMots);
    const lisible = lectures < LECTURES_MAX ? candidates.find((s) => s.lisible === "oui") : undefined;
    const aColler = candidates[0];
    conseil = lisible
      ? `Faites lire ${lisible.nom} par l'IA (environ ${COUT_LECTURE} c.), ou collez son texte.`
      : aColler
        ? `Ouvrez ${aColler.nom}, copiez le texte de l'article (Ctrl+A puis Ctrl+C) et cliquez sur « Coller ».`
        : "Ajoutez vos notes (faits, chiffres, contexte local) pour étoffer le brouillon.";
  }

  return {
    niveau,
    remplissage: Math.min(mots / PLEIN, 1),
    conseil,
    lectures,
    coutCentimes: COUT_BASE + lectures * COUT_LECTURE,
  };
}

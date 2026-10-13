import { dateFrToIso, isoToDateFr } from "../dates";
import { DOCUMENT_TAILLE_MAX, QUESTIONS, TYPES_DOCUMENT, type StatutFiche, type TypeFiche } from "./types";

/** Règles pures des fiches de suivi (aucune dépendance serveur : importables côté navigateur). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAMPS_TEXTE = ["titre", ...QUESTIONS.map((q) => q.cle), "texte"] as const;
const CHAMPS_ID = ["entreprise_id", "site_id", "secteur_id"] as const;
/** Longueur maximale d'un champ (le texte de la fiche compris). */
export const TEXTE_MAX = 20000;

type Valeurs = Record<string, string | null>;

/** Ne garde que les champs modifiables d'une fiche, convertis et validés (jamais auteur, statut, type). */
export function validerChamps(champs: Record<string, string>): { ok: true; valeurs: Valeurs } | { ok: false; erreur: string } {
  const valeurs: Valeurs = {};
  const texte = (v: string | undefined) => {
    const t = (v ?? "").replace(/\r\n/g, "\n").trim();
    return t ? t.slice(0, TEXTE_MAX) : null;
  };
  for (const k of CHAMPS_TEXTE) if (k in champs) valeurs[k] = texte(champs[k]);
  for (const k of CHAMPS_ID) {
    if (!(k in champs)) continue;
    const v = texte(champs[k]);
    if (v && !UUID.test(v)) return { ok: false, erreur: "Choix invalide. Rechargez la page puis réessayez." };
    valeurs[k] = v;
  }
  for (const [k, nom] of [["date_debut", "Date de début"], ["date_fin", "Date de fin"]] as const) {
    if (!(k in champs)) continue;
    const v = texte(champs[k]);
    if (!v) {
      valeurs[k] = null;
      continue;
    }
    const iso = dateFrToIso(v);
    if (!iso) return { ok: false, erreur: `${nom} invalide. Format attendu : jj/mm/aaaa` };
    valeurs[k] = iso;
  }
  if (valeurs.date_debut && valeurs.date_fin && valeurs.date_fin < valeurs.date_debut) {
    return { ok: false, erreur: "La fin de la période ne peut pas précéder son début." };
  }
  if (valeurs.date_fin && "date_debut" in valeurs && !valeurs.date_debut) {
    return { ok: false, erreur: "Indiquez la date de début de la période." };
  }
  return { ok: true, valeurs };
}

/** Ce qu'il manque pour marquer une fiche « terminée » (vide = possible). */
export function manquantsPourTerminer(f: {
  type: TypeFiche; titre: string | null; date_debut: string | null; entreprise_id: string | null; secteur_id: string | null; texte: string | null;
}): string[] {
  const m: string[] = [];
  if (!f.titre?.trim()) m.push("le titre");
  if (!f.date_debut) m.push("la date");
  if (f.type === "usine" && !f.entreprise_id) m.push("l'entreprise");
  if (f.type === "sectoriel" && !f.secteur_id) m.push("le secteur");
  if (!f.texte?.trim()) m.push("le texte de la fiche");
  return m;
}

/** L'auteur d'une fiche la modifie ; un SUPER_ADMIN modifie toutes les fiches. */
export function peutModifier(auteurId: string, userId: string, superAdmin: boolean): boolean {
  return superAdmin || auteurId === userId;
}

export function libelleDate(debut: string | null, fin: string | null): string {
  if (!debut) return "";
  if (!fin || fin === debut) return isoToDateFr(debut);
  return `du ${isoToDateFr(debut)} au ${isoToDateFr(fin)}`;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

/** Chemin d'un fichier dans le bucket privé : <fiche>/<uuid>-<nom-nettoye>.<ext>. */
export function cheminFichier(ficheId: string, uuid: string, nom: string): string {
  const point = nom.lastIndexOf(".");
  const ext = point > 0 ? slug(nom.slice(point + 1)).slice(0, 8) : "";
  const base = slug(point > 0 ? nom.slice(0, point) : nom) || "fichier";
  return `${ficheId}/${uuid}-${base}${ext ? `.${ext}` : ""}`;
}

export function nomFichierPdf(date: string | null, lieu: string): string {
  return ["fiche-suivi", date ?? "", slug(lieu)].filter(Boolean).join("-") + ".pdf";
}

export function documentAccepte(f: Pick<File, "type" | "size">): boolean {
  return TYPES_DOCUMENT.includes(f.type) && f.size <= DOCUMENT_TAILLE_MAX;
}

/** Paragraphes d'un texte (séparés par une ou plusieurs lignes vides). */
export function paragraphes(texte: string | null | undefined): string[] {
  return (texte ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type FiltresFiches = {
  debut: string; fin: string; brouillons?: boolean; entrepriseId?: string; secteurId?: string; auteurId?: string;
};

/** Fiches retenues pour le rapport de congrès : la période de la fiche chevauche celle du rapport. */
export function filtrerFiches<T extends {
  date_debut: string | null; date_fin: string | null; entrepriseId: string | null; secteurId: string | null; auteurId: string; statut: StatutFiche;
}>(fiches: T[], f: FiltresFiches): T[] {
  return fiches.filter((x) => {
    if (!x.date_debut) return false;
    const fin = x.date_fin ?? x.date_debut;
    if (x.date_debut > f.fin || fin < f.debut) return false;
    if (!f.brouillons && x.statut !== "terminee") return false;
    if (f.entrepriseId && x.entrepriseId !== f.entrepriseId) return false;
    if (f.secteurId && x.secteurId !== f.secteurId) return false;
    if (f.auteurId && x.auteurId !== f.auteurId) return false;
    return true;
  });
}

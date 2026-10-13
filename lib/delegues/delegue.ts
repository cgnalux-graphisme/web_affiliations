import type { Delegue, DelegueCgLink, EtatCompte } from "./types";

/** Règles du délégué : validation, unité de rattachement, état du compte CG Link, phrases du journal. Pur. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHAMPS = ["prenom", "nom", "email", "telephone", "notes", "unite_id"] as const;

export function validerDelegue(champs: Record<string, string>):
  | { ok: true; valeurs: Partial<Pick<Delegue, (typeof CHAMPS)[number]>> }
  | { ok: false; erreur: string } {
  const valeurs: Record<string, string | null> = {};
  for (const k of CHAMPS) {
    if (!(k in champs)) continue;
    let v: string | null = (champs[k] ?? "").trim() || null;
    if (k === "email" && v) {
      v = v.toLowerCase();
      if (!EMAIL.test(v)) return { ok: false, erreur: "Adresse e-mail invalide. Exemple : prenom.nom@exemple.be" };
    }
    valeurs[k] = v;
  }
  if ("nom" in valeurs && !valeurs.nom) return { ok: false, erreur: "Indiquez le nom du délégué." };
  return { ok: true, valeurs };
}

export function uniteAutorisee(
  uniteId: string | null,
  entrepriseId: string,
  unites: { id: string; entreprise_id: string; statut: string; suivie: boolean }[]
): boolean {
  if (!uniteId) return true;
  const u = unites.find((x) => x.id === uniteId);
  return Boolean(u && u.entreprise_id === entrepriseId && u.statut === "actif" && u.suivie);
}

export const LIBELLES_COMPTE: Record<EtatCompte, string> = {
  actif: "Compte actif", invite: "Invité, jamais connecté", bloque: "Accès bloqué", sans_compte: "Sans compte CG Link",
  introuvable: "Compte CG Link introuvable",
};

export function etatCompte(cglinkId: string | null, entree: DelegueCgLink | undefined, derniereConnexion: string | null | undefined): EtatCompte {
  if (!cglinkId) return "sans_compte";
  if (!entree) return "introuvable";
  if (entree.isActive === false) return "bloque";
  return derniereConnexion ? "actif" : "invite";
}

const pluriel = (n: number, s: string, p = `${s}s`) => `${n} ${n > 1 ? p : s}`;

export function phraseJournal(action: string, d: Record<string, unknown>): string {
  const n = (k: string) => Number(d[k] ?? 0);
  switch (action) {
    case "import":
      return `Import depuis CG Link : ${pluriel(n("crees"), "délégué")}, ${pluriel(n("mandats"), "mandat")}, ${pluriel(n("rejetes"), "texte non importé", "textes non importés")}.`;
    case "creation": return "Délégué créé.";
    case "modification": return "Identité modifiée.";
    case "suppression": return "Délégué supprimé.";
    case "verification": return "Vérification confirmée.";
    case "mandat_ajout": return `Mandat ajouté : ${d.mandat ?? ""}`;
    case "mandat_modification": return `Mandat modifié : ${d.mandat ?? ""}`;
    case "mandat_fin": return `Mandat terminé : ${d.mandat ?? ""}`;
    case "mandat_suppression": return `Mandat supprimé : ${d.mandat ?? ""}`;
    default: return action;
  }
}

/** À l'enregistrement d'une carte : l'unité actuelle reste acceptée même si elle n'est plus suivie ou est arrêtée. */
export function uniteModifiable(
  nouvelle: string | null,
  actuelle: string | null,
  entrepriseId: string,
  unites: { id: string; entreprise_id: string; statut: string; suivie: boolean }[]
): boolean {
  return nouvelle === actuelle || uniteAutorisee(nouvelle, entrepriseId, unites);
}

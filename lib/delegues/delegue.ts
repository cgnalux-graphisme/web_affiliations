import { formaterTelephone } from "../telephone";
import { nissValide } from "../modification";
import { ibanValide, nettoyerIban } from "../iban";
import type { Delegue, DelegueCgLink, EtatCompte } from "./types";

/** Règles du délégué : validation, unité de rattachement, état du compte CG Link, phrases du journal. Pur. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHAMPS = ["prenom", "nom", "email", "telephone", "notes", "unite_id", "adresse_rue", "adresse_numero", "adresse_boite",
  "adresse_code_postal", "adresse_localite", "adresse_pays", "registre_national", "genre", "iban"] as const;

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
    if (k === "telephone" && v) v = formaterTelephone(v);
    if (k === "registre_national" && v) {
      if (!nissValide(v)) return { ok: false, erreur: "Numéro de registre national invalide : vérifiez les 11 chiffres. Exemple : 85.07.30-033.28" };
      v = v.replace(/\D/g, "");
    }
    if (k === "genre" && v && v !== "M" && v !== "F") return { ok: false, erreur: "Choisissez « Délégué » ou « Déléguée »." };
    if (k === "iban" && v) {
      if (!ibanValide(v)) return { ok: false, erreur: "N° de compte invalide : vérifiez l'IBAN. Exemple : BE68 5390 0754 7034" };
      v = nettoyerIban(v);
    }
    valeurs[k] = v;
  }
  if ("nom" in valeurs && !valeurs.nom) return { ok: false, erreur: "Indiquez le nom du délégué." };
  const belge = !valeurs.adresse_pays || /^belgique$/i.test(valeurs.adresse_pays);
  if (belge && valeurs.adresse_code_postal && !/^\d{4}$/.test(valeurs.adresse_code_postal)) {
    return { ok: false, erreur: "Code postal belge : 4 chiffres. Exemple : 5000" };
  }
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

const CHAMPS_ECART: Record<string, string> = {
  nom: "nom", email: "e-mail", telephone: "téléphone", ds: "mandat DS", ce: "mandat CE", cppt: "mandat CPPT", autre: "autres mandats",
};

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
    case "invitation": return "Invitation CG Link envoyée.";
    case "invitation_renvoyee": return "Invitation CG Link renvoyée.";
    case "invitation_annulee": return "Invitation CG Link annulée (compte supprimé).";
    case "blocage": return "Accès CG Link bloqué.";
    case "deblocage": return "Accès CG Link rétabli.";
    case "lien_retire": return "Lien avec CG Link retiré.";
    case "envoi_cglink": return "Carte envoyée à CG Link.";
    case "changement_entreprise": return "Entreprise changée.";
    case "ecart_repris": return `Écart repris de CG Link (${CHAMPS_ECART[String(d.champ)] ?? d.champ}).`;
    case "ecart_ignore": return `Écart avec CG Link ignoré (${CHAMPS_ECART[String(d.champ)] ?? d.champ}).`;
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

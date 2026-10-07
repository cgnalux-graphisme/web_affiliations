/**
 * Back-office des demandes : configuration partagée entre l'écran admin (navigateur) et les routes serveur.
 * Fichier sans dépendance serveur, sans aucune donnée. Les demandes elles-mêmes (données personnelles d'affiliés)
 * ne sont lues que par les routes /api/admin/demandes (clé service_role + vérification super admin).
 *
 * Tables des formulaires publics (écrites par les formulaires avec la clé publique, jamais lisibles par elle) :
 * - web_affiliations  : affiliation (FormulaireWebIndependant) — colonnes à plat, suivi dans `status`.
 * - web_mandats_sepa  : mandat SEPA et changement de compte (FormulaireChangementCompte), `type_demande`.
 * - web_c1, web_c3_2  : formulaires ONEM (FormulaireC1, FormulaireC32) — le formulaire complet dans `data`.
 * - web_modifications : « Signaler un changement » (FormulaireModification) — colonnes à plat.
 */

import { slugifier } from "./articles";

export const TYPES_DEMANDE = ["affiliation", "sepa", "changement", "c1", "c32", "modification"] as const;
export type TypeDemande = (typeof TYPES_DEMANDE)[number];

export function estTypeDemande(v: unknown): v is TypeDemande {
  return typeof v === "string" && (TYPES_DEMANDE as readonly string[]).includes(v);
}

export type TableDemande = "web_affiliations" | "web_mandats_sepa" | "web_c1" | "web_c3_2" | "web_modifications";

export type ConfigDemande = {
  libelle: string;
  /** Libellé au singulier (titre de la vue détail). */
  singulier: string;
  table: TableDemande;
  /** Comment le PDF est reproduit : dans le navigateur (react-pdf) ou sur le serveur (formulaire ONEM rempli). */
  pdf: "navigateur" | "serveur";
  /** Préfixe du nom du fichier PDF téléchargé. */
  fichier: string;
};

export const DEMANDES: Record<TypeDemande, ConfigDemande> = {
  affiliation: { libelle: "Affiliations", singulier: "Affiliation", table: "web_affiliations", pdf: "navigateur", fichier: "affiliation" },
  sepa: { libelle: "Mandats SEPA", singulier: "Mandat SEPA", table: "web_mandats_sepa", pdf: "navigateur", fichier: "mandat-sepa" },
  changement: {
    libelle: "Changements de compte",
    singulier: "Changement de compte",
    table: "web_mandats_sepa",
    pdf: "navigateur",
    fichier: "changement-compte",
  },
  c1: { libelle: "C1", singulier: "Formulaire C1", table: "web_c1", pdf: "serveur", fichier: "formulaire-c1" },
  c32: { libelle: "C3.2", singulier: "Formulaire C3.2", table: "web_c3_2", pdf: "serveur", fichier: "formulaire-c3-2" },
  modification: {
    libelle: "Changements de situation",
    singulier: "Changement de situation",
    table: "web_modifications",
    pdf: "navigateur",
    fichier: "changement-situation",
  },
};

export const PAR_PAGE = 25;

export const TRIS = ["date_desc", "date_asc", "nom_asc", "nom_desc"] as const;
export type Tri = (typeof TRIS)[number];
export const LIBELLES_TRI: Record<Tri, string> = {
  date_desc: "Plus récentes d'abord",
  date_asc: "Plus anciennes d'abord",
  nom_asc: "Nom (A → Z)",
  nom_desc: "Nom (Z → A)",
};
export function estTri(v: unknown): v is Tri {
  return typeof v === "string" && (TRIS as readonly string[]).includes(v);
}

/** Ligne de la liste : le strict nécessaire (jamais d'IBAN ni de NISS dans la liste). */
export type LigneDemande = {
  id: string;
  created_at: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
};

export type ReponseListe = {
  lignes: LigneDemande[];
  total: number;
  page: number;
  parPage: number;
  compteurs: Partial<Record<TypeDemande, number>>;
};

/** Mots de la recherche, sans les caractères qui ont un sens dans un filtre PostgREST. */
export function motsRecherche(q: string | null | undefined): string[] {
  return (q ?? "")
    .replace(/[,()*%\\:."']/g, " ")
    .split(/\s+/)
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
    .slice(0, 5)
    .map((m) => m.slice(0, 60));
}

/**
 * Début du jour (00:00, heure de Bruxelles) d'une date ISO aaaa-mm-jj, en horodatage UTC.
 * Sert aux filtres « du … au … » sur created_at.
 */
export function debutJourBruxelles(iso: string): string {
  const [a, m, j] = iso.split("-").map(Number);
  const midiUtc = new Date(Date.UTC(a, m - 1, j, 12));
  // Décalage de Bruxelles ce jour-là (+1 h en hiver, +2 h en été).
  const heureBxl = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour: "2-digit", hourCycle: "h23" }).format(midiUtc)
  );
  const decalage = heureBxl - 12;
  return new Date(Date.UTC(a, m - 1, j, -decalage)).toISOString();
}

/** Lendemain d'une date ISO aaaa-mm-jj. */
export function lendemain(iso: string): string {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j + 1)).toISOString().slice(0, 10);
}

/** Horodatage → « jj/mm/aaaa hh:mm », heure de Bruxelles. */
export function dateHeureBruxelles(horodatage: string | null | undefined): string {
  if (!horodatage) return "";
  const d = new Date(horodatage);
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("fr-BE", {
    timeZone: "Europe/Brussels",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${v("day")}/${v("month")}/${v("year")} ${v("hour")}:${v("minute")}`;
}

/** Nom de fichier sûr : « affiliation-dupont-jean-24-09-2026.pdf ». */
export function nomFichierPdf(type: TypeDemande, nom: string | null, prenom: string | null, creeLe: string): string {
  const morceau = (s: string | null) => slugifier(s ?? "");
  const date = dateHeureBruxelles(creeLe).slice(0, 10).replace(/\//g, "-");
  return [DEMANDES[type].fichier, morceau(nom), morceau(prenom), date].filter(Boolean).join("-") + ".pdf";
}

import { formaterNiss } from "../modification";

/**
 * Travailleurs d'une entreprise (table `workers` de CG Link), lus à la demande depuis la fiche entreprise et
 * depuis l'app Délégués (choisir un travailleur pour créer un délégué ou compléter son registre national).
 * Pur : types, recherche, mise en forme. Lecture : lib/entreprises/travailleurs-serveur.ts.
 */

export type Participation = Record<string, unknown>;

export type Travailleur = {
  id: string;
  prenom: string;
  nom: string;
  /** Registre national (11 chiffres dans CG Link), ou null. */
  niss: string | null;
  nissManquant: boolean;
  affiliation: string | null;
  statut: string;
  contrat: string;
  info: string | null;
  communication: string | null;
  commentaire: string;
  ajouteMain: boolean;
  greves: Participation[];
  actions: Participation[];
  modifieLe: string | null;
  modifiePar: string | null;
  creeLe: string | null;
  synchro: string;
  /** Entreprise CG Link d'origine (fiches qui regroupent plusieurs entreprises). */
  companyId: string;
};

/** Ligne brute de `workers` (colonnes lues par le serveur). */
export type LigneWorker = {
  id: string;
  first_name: string;
  last_name: string;
  niss: string | null;
  is_niss_missing: boolean;
  affiliation_number: string | null;
  company_id: string;
  status: string;
  contract_type: string;
  info: string | null;
  communication: string | null;
  comment: string | null;
  added_manually: boolean;
  strike_participation: unknown;
  action_participation: unknown;
  last_modified: string | null;
  last_modified_by: string | null;
  created_at: string | null;
  sync_status: string;
};

export const COLONNES_WORKER =
  "id, first_name, last_name, niss, is_niss_missing, affiliation_number, company_id, status, contract_type, info, communication, comment, added_manually, strike_participation, action_participation, last_modified, last_modified_by, created_at, sync_status";

const liste = (v: unknown): Participation[] => (Array.isArray(v) ? v.filter((x): x is Participation => !!x && typeof x === "object") : []);

export function versTravailleur(w: LigneWorker): Travailleur {
  return {
    id: w.id,
    prenom: (w.first_name ?? "").trim(),
    nom: (w.last_name ?? "").trim(),
    niss: w.niss?.trim() || null,
    nissManquant: w.is_niss_missing || !w.niss?.trim(),
    affiliation: w.affiliation_number?.trim() || null,
    statut: w.status,
    contrat: w.contract_type,
    info: w.info?.trim() || null,
    communication: w.communication?.trim() || null,
    commentaire: (w.comment ?? "").trim(),
    ajouteMain: w.added_manually,
    greves: liste(w.strike_participation),
    actions: liste(w.action_participation),
    modifieLe: w.last_modified,
    modifiePar: w.last_modified_by?.trim() || null,
    creeLe: w.created_at,
    synchro: w.sync_status,
    companyId: w.company_id,
  };
}

/** Ordre d'affichage : nom puis prénom, sans tenir compte des accents ni des majuscules. */
export function trierTravailleurs(liste: Travailleur[]): Travailleur[] {
  return [...liste].sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }) || a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" }));
}

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Recherche : chaque mot doit se trouver dans le nom, le prénom, le n° d'affiliation ou le registre national. */
export function filtrerTravailleurs(liste: Travailleur[], recherche: string, statut: string | null = null): Travailleur[] {
  const mots = sansAccents(recherche).split(/\s+/).filter(Boolean);
  return liste.filter((t) => {
    if (statut && t.statut !== statut) return false;
    if (!mots.length) return true;
    const texte = sansAccents(`${t.nom} ${t.prenom} ${t.affiliation ?? ""} ${t.niss ?? ""}`);
    return mots.every((m) => texte.includes(m.replace(/[.\-]/g, "")) || texte.includes(m));
  });
}

/** Registre national affiché « 85.07.30-033.28 » ; tel quel s'il n'a pas 11 chiffres. */
export function nissAffiche(niss: string | null): string {
  if (!niss) return "";
  return /^\d{11}$/.test(niss) ? formaterNiss(niss) : niss;
}

/** Statuts présents dans la liste, dans un ordre stable (Actif d'abord). */
export function statutsPresents(liste: Travailleur[]): string[] {
  const ordre = ["Actif", "Parti", "Autre Syndicat"];
  const presents = [...new Set(liste.map((t) => t.statut))];
  return presents.sort((a, b) => (ordre.indexOf(a) + 1 || 99) - (ordre.indexOf(b) + 1 || 99) || a.localeCompare(b, "fr"));
}

/** Travailleurs qui ressemblent à un délégué (même nom, prénom proche) : proposés en premier. */
export function correspondances(liste: Travailleur[], prenom: string | null, nom: string | null): Travailleur[] {
  const n = sansAccents(nom ?? "").trim();
  const p = sansAccents(prenom ?? "").trim();
  if (!n) return [];
  return liste.filter((t) => sansAccents(t.nom) === n && (!p || sansAccents(t.prenom).startsWith(p.slice(0, 3))));
}

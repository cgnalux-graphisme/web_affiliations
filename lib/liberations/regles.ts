import { dateFrToIso, isoToDateFr } from "../dates";
import { COMMISSIONS_PARITAIRES } from "../commissions-paritaires";
import {
  CHARGES, DUREES, FICHIER_TAILLE_MAX, LIBELLES_MANQUE, TYPES_FICHIER, TYPES_LIBERATION,
  type DateDossier, type Dossier, type Duree, type Manque,
} from "./types";

/** Règles pures de l'app Libérations (aucune dépendance serveur : importables côté navigateur). Testées. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TEXTE_MAX = 5000;
export const DATES_MAX = 30;

const CHAMPS_TEXTE = ["objet", "salle", "ordre_du_jour", "regime_paiement", "lieu_nom", "lieu_complement", "lieu_rue",
  "lieu_numero", "lieu_boite", "lieu_code_postal", "lieu_localite"] as const;
const CHAMPS_ID = ["lieu_id", "secteur_id", "entreprise_id"] as const;
const CHAMPS_OUI_NON = ["perte_salaire", "introduire_cg_federale", "lunch"] as const;

type Valeurs = Record<string, string | boolean | null>;
type Validation<T> = { ok: true; valeurs: T } | { ok: false; erreur: string };

const texte = (v: string | undefined, max = TEXTE_MAX) => {
  const t = (v ?? "").replace(/\r\n/g, "\n").trim();
  return t ? t.slice(0, max) : null;
};

/** « oui » → true, « non » → false, vide → null (pas encore répondu). */
export function ouiNon(v: string | undefined): boolean | null | undefined {
  if (v === "oui") return true;
  if (v === "non") return false;
  if (v === "" || v === undefined) return null;
  return undefined;
}

/**
 * Ne garde que les champs modifiables d'un dossier, convertis et validés (jamais le statut, le demandeur, le numéro).
 * Les réponses dépendantes sont remises à zéro quand la question parente change (ex. pas de perte de salaire →
 * pas de « qui prend en charge »).
 */
export function validerChamps(champs: Record<string, string>): Validation<Valeurs> {
  const valeurs: Valeurs = {};
  if ("type" in champs) {
    if (!TYPES_LIBERATION.some((t) => t.code === champs.type)) return { ok: false, erreur: "Choisissez le type de libération." };
    valeurs.type = champs.type;
  }
  for (const k of CHAMPS_TEXTE) if (k in champs) valeurs[k] = texte(champs[k], k === "ordre_du_jour" ? TEXTE_MAX : 300);
  for (const k of CHAMPS_ID) {
    if (!(k in champs)) continue;
    const v = texte(champs[k]);
    if (v && !UUID.test(v)) return { ok: false, erreur: "Choix invalide. Rechargez la page puis réessayez." };
    valeurs[k] = v;
  }
  for (const k of CHAMPS_OUI_NON) {
    if (!(k in champs)) continue;
    const v = ouiNon(champs[k]);
    if (v === undefined) return { ok: false, erreur: "Réponse invalide. Rechargez la page puis réessayez." };
    valeurs[k] = v;
  }
  if ("perte_salaire_charge" in champs) {
    const v = texte(champs.perte_salaire_charge);
    if (v && !CHARGES.some((c) => c.code === v)) return { ok: false, erreur: "Choisissez qui prend en charge la perte de salaire." };
    valeurs.perte_salaire_charge = v;
  }
  if ("commission_paritaire" in champs) {
    const v = texte(champs.commission_paritaire);
    if (v && !COMMISSIONS_PARITAIRES.some((c) => c.id === v)) return { ok: false, erreur: "Commission paritaire inconnue." };
    valeurs.commission_paritaire = v;
  }
  if ("lieu_autre" in champs) valeurs.lieu_autre = champs.lieu_autre === "oui";
  if ("entreprise_specifique" in champs) valeurs.entreprise_specifique = champs.entreprise_specifique === "oui";

  // Réponses dépendantes.
  if (valeurs.perte_salaire === false || valeurs.perte_salaire === null) valeurs.perte_salaire_charge = null;
  if (valeurs.introduire_cg_federale === true || valeurs.introduire_cg_federale === null) valeurs.regime_paiement = null;
  if (valeurs.entreprise_specifique === false) valeurs.entreprise_id = null;
  if (valeurs.lieu_autre === true) valeurs.lieu_id = null;

  const cp = valeurs.lieu_code_postal;
  if (valeurs.lieu_autre === true && typeof cp === "string" && !/^\d{4}$/.test(cp)) {
    return { ok: false, erreur: "Code postal du lieu : 4 chiffres. Exemple : 5000" };
  }
  return { ok: true, valeurs };
}

/** Heure saisie (« 8:00 », « 08h00 », « 8h », « 0830 ») → « 08:00 ». Vide → null ; invalide → undefined. */
export function normaliserHeure(v: string | null | undefined): string | null | undefined {
  const t = (v ?? "").trim().toLowerCase();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\s*(?:[:h.]\s*(\d{2})?)?$/) ?? t.match(/^(\d{2})(\d{2})$/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** « 08:00:00 » ou « 08:00 » → « 08h00 » (affichage). */
export function heureFr(v: string | null | undefined): string {
  const m = (v ?? "").match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

export type DateSaisie = { jour: string; duree: string; heure_debut: string };

/**
 * Dates saisies (jj/mm/aaaa) → dates à enregistrer (ISO), triées. Les lignes entièrement vides sont ignorées.
 * Refus : date invalide, durée inconnue, heure invalide, même demi-journée deux fois, journée entière + autre
 * créneau le même jour.
 */
export function validerDates(saisies: DateSaisie[]): Validation<DateDossier[]> {
  const lignes = saisies.filter((s) => s.jour.trim() || s.heure_debut.trim());
  if (lignes.length > DATES_MAX) return { ok: false, erreur: `${DATES_MAX} dates maximum par dossier.` };
  const dates: DateDossier[] = [];
  for (const [i, s] of lignes.entries()) {
    const n = i + 1;
    const jour = dateFrToIso(s.jour);
    if (!jour) return { ok: false, erreur: `Date n° ${n} invalide. Format attendu : jj/mm/aaaa` };
    if (!DUREES.some((d) => d.code === s.duree)) return { ok: false, erreur: `Date n° ${n} : choisissez la durée.` };
    const heure = normaliserHeure(s.heure_debut);
    if (heure === undefined) return { ok: false, erreur: `Date n° ${n} : heure invalide. Exemple : 08:00` };
    dates.push({ jour, duree: s.duree as Duree, heure_debut: heure });
  }
  const parJour = new Map<string, Duree[]>();
  for (const d of dates) parJour.set(d.jour, [...(parJour.get(d.jour) ?? []), d.duree]);
  for (const [jour, durees] of parJour) {
    const doublon = new Set(durees).size !== durees.length;
    if (doublon || (durees.length > 1 && durees.includes("journee"))) {
      return { ok: false, erreur: `Le ${isoToDateFr(jour)} apparaît deux fois. Gardez une journée entière, ou un matin et un après-midi.` };
    }
  }
  const rang = (d: Duree) => DUREES.findIndex((x) => x.code === d);
  return { ok: true, valeurs: dates.sort((a, b) => a.jour.localeCompare(b.jour) || rang(a.duree) - rang(b.duree)) };
}

type PourEnvoi = Pick<Dossier, "type" | "objet" | "lieu_id" | "lieu_autre" | "lieu_rue" | "lieu_code_postal" | "lieu_localite"
  | "perte_salaire" | "perte_salaire_charge" | "introduire_cg_federale" | "regime_paiement" | "lunch" | "entreprise_specifique" | "entreprise_id">;

/** Ce qu'il manque pour envoyer la demande (vide = possible). */
export function manquantsPourEnvoyer(d: PourEnvoi, nbDates: number, nbParticipants: number): string[] {
  const m: string[] = [];
  if (!d.type) m.push("le type de libération");
  if (!d.objet?.trim()) m.push("l'objet de la réunion");
  if (nbDates === 0) m.push("au moins une date");
  if (d.lieu_autre ? !(d.lieu_rue?.trim() && d.lieu_code_postal?.trim() && d.lieu_localite?.trim()) : !d.lieu_id) m.push("le lieu");
  if (d.perte_salaire === null) m.push("la perte de salaire (oui / non)");
  else if (d.perte_salaire && !d.perte_salaire_charge) m.push("qui prend en charge la perte de salaire");
  if (d.introduire_cg_federale === null) m.push("l'introduction à la CG fédérale (oui / non)");
  else if (!d.introduire_cg_federale && !d.regime_paiement?.trim()) m.push("le n° de régime de paiement");
  if (d.lunch === null) m.push("le lunch (oui / non)");
  if (d.entreprise_specifique && !d.entreprise_id) m.push("l'entreprise");
  if (nbParticipants === 0) m.push("au moins un participant");
  return m;
}

/** « l'objet, le lieu et au moins une date » */
export function enumeration(elements: string[]): string {
  if (elements.length <= 1) return elements[0] ?? "";
  return `${elements.slice(0, -1).join(", ")} et ${elements[elements.length - 1]}`;
}

type Adresse = { complement?: string | null; rue: string | null; numero: string | null; boite: string | null; code_postal: string | null; localite: string | null };

/** Lignes d'adresse : « Espace Solidarité », « Rue de Namur 47 », « 5000 Beez ». Rien d'inventé. */
export function lignesAdresse(a: Adresse): string[] {
  const rue = [a.rue?.trim(), a.numero?.trim()].filter(Boolean).join(" ") + (a.boite?.trim() ? ` bte ${a.boite.trim()}` : "");
  const ville = [a.code_postal?.trim(), a.localite?.trim()].filter(Boolean).join(" ");
  return [a.complement?.trim() ?? "", rue.trim(), ville].filter(Boolean);
}

/** Adresse du lieu d'un dossier, sur une ligne. */
export function adresseLieu(d: Pick<Dossier, "lieu_complement" | "lieu_rue" | "lieu_numero" | "lieu_boite" | "lieu_code_postal" | "lieu_localite">): string {
  return lignesAdresse({
    complement: d.lieu_complement, rue: d.lieu_rue, numero: d.lieu_numero, boite: d.lieu_boite, code_postal: d.lieu_code_postal, localite: d.lieu_localite,
  }).join(", ");
}

/** Une date affichée : « 12/10/2026, journée entière, 08h00 ». */
export function libelleDate(d: Pick<DateDossier, "jour" | "duree" | "heure_debut">): string {
  const duree = d.duree === "journee" ? "journée entière" : d.duree === "matin" ? "matin" : "après-midi";
  return [isoToDateFr(d.jour), duree, heureFr(d.heure_debut)].filter(Boolean).join(", ");
}

/** Ce qui manque pour un délégué (domicile, genre, registre national). */
export function manquesDelegue(d: {
  adresse_rue: string | null; adresse_code_postal: string | null; adresse_localite: string | null; genre: string | null; registre_national: string | null;
}): Manque[] {
  const m: Manque[] = [];
  if (!(d.adresse_rue?.trim() && d.adresse_code_postal?.trim() && d.adresse_localite?.trim())) m.push("domicile");
  if (!d.genre) m.push("genre");
  if (!d.registre_national) m.push("registre_national");
  return m;
}

/**
 * Résumé des manques d'un dossier : « 2 employeurs sans e-mail », « 1 délégué sans domicile ». Chaque élément est
 * compté une fois par clé (un employeur partagé par deux participants compte pour un).
 */
export function resumeManques(elements: { manque: Manque; cle: string }[]): string[] {
  const ordre = Object.keys(LIBELLES_MANQUE) as Manque[];
  return ordre.flatMap((manque) => {
    const n = new Set(elements.filter((e) => e.manque === manque).map((e) => e.cle)).size;
    if (!n) return [];
    const l = LIBELLES_MANQUE[manque];
    return [`${n} ${n > 1 ? l.plusieurs : l.un}`];
  });
}

export function fichierAccepte(f: { type: string; size: number }): boolean {
  return TYPES_FICHIER.includes(f.type) && f.size > 0 && f.size <= FICHIER_TAILLE_MAX;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

/** Chemin d'une pièce jointe dans le bucket privé : <dossier>/<uuid>-<nom-nettoye>.<ext>. */
export function cheminFichier(dossierId: string, uuid: string, nom: string): string {
  const point = nom.lastIndexOf(".");
  const ext = point > 0 ? slug(nom.slice(point + 1)).slice(0, 8) : "";
  const base = slug(point > 0 ? nom.slice(0, point) : nom) || "fichier";
  return `${dossierId}/${uuid}-${base}${ext ? `.${ext}` : ""}`;
}

// ── Paramètres ──────────────────────────────────────────────────────────────

/** Un lieu de la liste : nom obligatoire, adresse complète (sert au calcul des km). */
export function validerLieu(champs: Record<string, string>): Validation<Record<string, string | null>> {
  const v: Record<string, string | null> = {};
  for (const k of ["nom", "complement", "rue", "numero", "boite", "code_postal", "localite"]) v[k] = texte(champs[k], 200);
  if (!v.nom) return { ok: false, erreur: "Indiquez le nom du lieu." };
  if (!v.rue || !v.code_postal || !v.localite) return { ok: false, erreur: "Indiquez l'adresse complète : rue, code postal et localité." };
  if (!/^\d{4}$/.test(v.code_postal)) return { ok: false, erreur: "Code postal : 4 chiffres. Exemple : 5000" };
  return { ok: true, valeurs: v };
}

/** Taux kilométrique : « 0,4280 » ou « 0.428 » (euros par km), avec sa date de début (jj/mm/aaaa). */
export function validerTaux(champs: Record<string, string>): Validation<{ valable_du: string; taux: number }> {
  const valable = dateFrToIso(champs.valable_du ?? "");
  if (!valable) return { ok: false, erreur: "Date de début invalide. Format attendu : jj/mm/aaaa" };
  const brut = (champs.taux ?? "").trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d{1,4})?$/.test(brut)) return { ok: false, erreur: "Taux invalide. Exemple : 0,4280 (euros par kilomètre)" };
  const taux = Number(brut);
  if (!(taux > 0 && taux < 10)) return { ok: false, erreur: "Taux invalide. Exemple : 0,4280 (euros par kilomètre)" };
  return { ok: true, valeurs: { valable_du: valable, taux } };
}

/** Taux applicable à une date : le plus récent dont la date de début est passée. null = aucun. */
export function tauxAuJour<T extends { valable_du: string; taux: number }>(taux: T[], jour: string): T | null {
  return [...taux].filter((t) => t.valable_du <= jour).sort((a, b) => b.valable_du.localeCompare(a.valable_du))[0] ?? null;
}

/** « 0,4280 € / km » */
export function tauxFr(taux: number): string {
  return `${taux.toFixed(4).replace(".", ",")} € / km`;
}

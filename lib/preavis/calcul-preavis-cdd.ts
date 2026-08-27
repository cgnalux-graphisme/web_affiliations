import { moisEntre } from "./anciennete";
import { preavisGeneralDemission } from "./baremes/general-2014";
import { appliquerReforme2026 } from "./baremes/reforme-2026";
import type { DateISO, DureePreavis } from "./types";

/**
 * Rupture anticipée d'un CDD (contrat à durée déterminée) par le
 * travailleur. Basé sur le support interne "Récap démission" de la
 * Centrale Générale FGTB Namur-Luxembourg (analysé le 2026-08-27), corrigé
 * le 2026-08-27 suite à une précision de l'utilisateur (FGTB) confirmée par
 * recherche indépendante (Securex, Semafor, PeoplePay, Elegis — juin/août
 * 2026) :
 *
 * 1. Pendant la 1ère moitié du 1er CDD (max. 6 mois) : préavis calculé
 *    comme une démission ordinaire (art. 37/2 loi du 3 juillet 1978) sur
 *    l'ancienneté acquise au sein du CDD — PAS un flat "2 semaines". Pour
 *    un CDD ayant débuté à partir du 1er août 2026, la loi du 3 juin 2026
 *    (M.B. 15/6/2026) fixe ce délai à 1 semaine unique durant les 6
 *    premiers mois, dans les deux sens (démission comme licenciement) ;
 *    pour un CDD antérieur, l'ancien barème progressif s'applique toujours
 *    (1 semaine avant 3 mois, 2 semaines de 3 à moins de 6 mois). On
 *    réutilise donc directement preavisGeneralDemission + appliquerReforme2026,
 *    déjà utilisés et sourcés pour le moteur CDI (art. 40 renvoie
 *    explicitement aux délais de l'art. 37/2).
 * 2. D'un commun accord avec l'employeur : sans préavis (Annexe B).
 * 3. En cas d'engagement en CDI chez un autre employeur : préavis d'1
 *    semaine (valeur du support interne FGTB, non revérifiée
 *    indépendamment pour ce cas précis).
 * En dehors de ces cas, la rupture est illégale et peut entraîner une
 * indemnité à payer à l'employeur.
 */

export type CasRuptureCdd = "premiere-moitie" | "commun-accord" | "engagement-cdi-ailleurs" | "aucun";

export type ParametresRuptureCdd =
  | {
      cas: "premiere-moitie";
      dateDebutCdd: DateISO;
      dateFinCdd: DateISO;
      dateRupture: DateISO;
      /** S'agit-il du premier CDD conclu avec cet employeur ? Condition d'application de la règle. */
      premierCdd: boolean;
    }
  | { cas: "commun-accord" }
  | { cas: "engagement-cdi-ailleurs" }
  | { cas: "aucun" };

export interface ResultatRuptureCdd {
  cas: CasRuptureCdd;
  valide: boolean;
  motifInvalide: string | null;
  dureePreavis: DureePreavis | null;
  /** Dernier jour de la "1ère moitié" (cas "premiere-moitie" uniquement, sinon null). */
  dateLimitePremiereMoitie: DateISO | null;
}

function toDate(iso: DateISO): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): DateISO {
  return date.toISOString().slice(0, 10);
}

function joursEntre(debutIso: DateISO, finIso: DateISO): number {
  return Math.round((toDate(finIso).getTime() - toDate(debutIso).getTime()) / 86400000);
}

function ajouterJours(iso: DateISO, jours: number): DateISO {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + jours);
  return toISO(date);
}

function ajouterMoisCalendaires(iso: DateISO, mois: number): DateISO {
  const date = toDate(iso);
  return toISO(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + mois, date.getUTCDate())));
}

const DUREE_PREAVIS_ENGAGEMENT_CDI: DureePreavis = { jours: 7, semaines: 1 };

/**
 * Préavis applicable en cas de rupture pendant la 1ère moitié du CDD :
 * celui d'une démission ordinaire (art. 37/2) sur l'ancienneté acquise
 * depuis le début du CDD, corrigé par la réforme du 1/8/2026 le cas échéant.
 */
function dureePreavisPremiereMoitie(dateDebutCdd: DateISO, dateRupture: DateISO): DureePreavis {
  const moisAnciennete = moisEntre(dateDebutCdd, dateRupture);
  const semainesBase = preavisGeneralDemission(moisAnciennete);
  const semaines = appliquerReforme2026({ dateEmbauche: dateDebutCdd, moisAnciennete, semaines: semainesBase });
  return { jours: semaines * 7, semaines };
}

const MOTIF_HORS_CAS =
  "En dehors des cas prévus par la loi, une rupture anticipée d'un CDD est illégale et peut entraîner une indemnité à payer à votre employeur.";
const MOTIF_PAS_PREMIER_CDD = "Cette règle ne s'applique qu'à votre premier CDD conclu avec cet employeur.";

export function calculerRuptureCdd(params: ParametresRuptureCdd): ResultatRuptureCdd {
  if (params.cas === "commun-accord") {
    return { cas: "commun-accord", valide: true, motifInvalide: null, dureePreavis: null, dateLimitePremiereMoitie: null };
  }

  if (params.cas === "engagement-cdi-ailleurs") {
    return {
      cas: "engagement-cdi-ailleurs",
      valide: true,
      motifInvalide: null,
      dureePreavis: DUREE_PREAVIS_ENGAGEMENT_CDI,
      dateLimitePremiereMoitie: null,
    };
  }

  if (params.cas === "aucun") {
    return { cas: "aucun", valide: false, motifInvalide: MOTIF_HORS_CAS, dureePreavis: null, dateLimitePremiereMoitie: null };
  }

  if (!params.premierCdd) {
    return {
      cas: "premiere-moitie",
      valide: false,
      motifInvalide: MOTIF_PAS_PREMIER_CDD,
      dureePreavis: null,
      dateLimitePremiereMoitie: null,
    };
  }

  const dureeCddJours = joursEntre(params.dateDebutCdd, params.dateFinCdd);
  const dateLimiteParMoitie = ajouterJours(params.dateDebutCdd, Math.floor(dureeCddJours / 2));
  const dateLimitePar6Mois = ajouterMoisCalendaires(params.dateDebutCdd, 6);
  const dateLimite = dateLimiteParMoitie < dateLimitePar6Mois ? dateLimiteParMoitie : dateLimitePar6Mois;

  if (params.dateRupture > dateLimite) {
    return {
      cas: "premiere-moitie",
      valide: false,
      motifInvalide: MOTIF_HORS_CAS,
      dureePreavis: null,
      dateLimitePremiereMoitie: dateLimite,
    };
  }

  return {
    cas: "premiere-moitie",
    valide: true,
    motifInvalide: null,
    dureePreavis: dureePreavisPremiereMoitie(params.dateDebutCdd, params.dateRupture),
    dateLimitePremiereMoitie: dateLimite,
  };
}

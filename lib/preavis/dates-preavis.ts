import { joursOuvrablesApres, premierLundiApres } from "./jours-ouvrables";
import type { DateISO } from "./types";

function toDate(iso: DateISO): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): DateISO {
  return date.toISOString().slice(0, 10);
}

/** Date de début du préavis à partir d'une date d'envoi du recommandé (Art. 37 §2). */
export function debutPreavisDepuisEnvoi(dateEnvoi: DateISO): DateISO {
  const troisiemeJourOuvrable = joursOuvrablesApres(dateEnvoi, 3);
  return premierLundiApres(troisiemeJourOuvrable);
}

/** Date de fin (dernier jour inclus) du préavis, N semaines après le début. */
export function finPreavis(dateDebut: DateISO, semaines: number): DateISO {
  return finPreavisJours(dateDebut, semaines * 7);
}

/**
 * Date de fin (dernier jour inclus) du préavis, en jours exacts. À utiliser
 * de préférence à finPreavis() pour un total ouvrier "sac à dos" (Task 7),
 * dont la partie 1 (pré-2014) peut ne pas être un multiple de 7 jours —
 * passer `semaines * 7` à finPreavis() dans ce cas réintroduirait une
 * imprécision (semaines déjà arrondie à 2 décimales dans DureePreavis).
 */
export function finPreavisJours(dateDebut: DateISO, jours: number): DateISO {
  const debut = toDate(dateDebut);
  debut.setUTCDate(debut.getUTCDate() + jours - 1);
  return toISO(debut);
}

/**
 * Date limite d'envoi du recommandé pour obtenir un début de préavis à la
 * date donnée. Remonte jour par jour depuis la date de début souhaitée
 * jusqu'à trouver le dernier jour d'envoi qui produit ce même résultat via
 * debutPreavisDepuisEnvoi — approche directe et sûre (pas d'inversion
 * algébrique du calendrier), au prix d'une boucle bornée à 21 jours.
 */
export function dateLimiteEnvoiRecommande(dateDebutSouhaitee: DateISO): DateISO {
  let candidate = toDate(dateDebutSouhaitee);
  candidate.setUTCDate(candidate.getUTCDate() - 21);

  let meilleureDate: DateISO | null = null;
  for (let i = 0; i < 28; i++) {
    const iso = toISO(candidate);
    if (debutPreavisDepuisEnvoi(iso) === dateDebutSouhaitee) {
      meilleureDate = iso;
    }
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  if (!meilleureDate) {
    throw new Error(`Aucune date d'envoi trouvée produisant un début de préavis le ${dateDebutSouhaitee}`);
  }
  return meilleureDate;
}

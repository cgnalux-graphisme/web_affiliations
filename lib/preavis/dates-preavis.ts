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
  const debut = toDate(dateDebut);
  debut.setUTCDate(debut.getUTCDate() + semaines * 7 - 1);
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

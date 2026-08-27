import type { DateISO } from "./types";

function toDate(iso: DateISO): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): DateISO {
  return date.toISOString().slice(0, 10);
}

/** Dimanche de Pâques (calendrier grégorien) via l'algorithme de Gauss/Meeus. */
function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jour));
}

function ajouterJours(date: Date, jours: number): Date {
  const copie = new Date(date);
  copie.setUTCDate(copie.getUTCDate() + jours);
  return copie;
}

function joursFeriesLegauxBE(annee: number): Set<DateISO> {
  const p = paques(annee);
  const dates = [
    new Date(Date.UTC(annee, 0, 1)),
    ajouterJours(p, 1), // lundi de Pâques
    new Date(Date.UTC(annee, 4, 1)),
    ajouterJours(p, 39), // Ascension
    ajouterJours(p, 50), // lundi de Pentecôte
    new Date(Date.UTC(annee, 6, 21)),
    new Date(Date.UTC(annee, 7, 15)),
    new Date(Date.UTC(annee, 10, 1)),
    new Date(Date.UTC(annee, 10, 11)),
    new Date(Date.UTC(annee, 11, 25)),
  ];
  return new Set(dates.map(toISO));
}

export function estJourFerieLegalBE(iso: DateISO): boolean {
  const annee = Number(iso.slice(0, 4));
  return joursFeriesLegauxBE(annee).has(iso);
}

/** Jour ouvrable au sens de l'art. 37 : tout jour sauf dimanche et jour férié légal (le samedi compte). */
export function estJourOuvrable(iso: DateISO): boolean {
  const dimanche = toDate(iso).getUTCDay() === 0;
  return !dimanche && !estJourFerieLegalBE(iso);
}

export function joursOuvrablesApres(iso: DateISO, nombre: number): DateISO {
  let date = toDate(iso);
  let restant = nombre;
  while (restant > 0) {
    date = ajouterJours(date, 1);
    if (estJourOuvrable(toISO(date))) {
      restant -= 1;
    }
  }
  return toISO(date);
}

export function premierLundiApres(iso: DateISO): DateISO {
  const date = toDate(iso);
  const jourSemaine = date.getUTCDay(); // 0 = dimanche, 1 = lundi
  if (jourSemaine === 1) return iso;
  const decalage = jourSemaine === 0 ? 1 : 8 - jourSemaine;
  return toISO(ajouterJours(date, decalage));
}

/**
 * Lundi de la semaine qui suit la semaine calendaire contenant `iso` — donc
 * TOUJOURS strictement après la semaine de `iso`, y compris si `iso` est
 * lui-même un lundi (contrairement à premierLundiApres, qui renvoie alors le
 * même jour). C'est la règle utilisée par l'art. 37 pour la prise de cours
 * du préavis envoyé par recommandé : si le 3e jour ouvrable après l'envoi
 * tombe un lundi, le préavis ne démarre pas ce jour-là mais le lundi
 * suivant. Confirmé par un exemple chiffré du support interne "Récap
 * démission" de la Centrale Générale FGTB (envoi un jeudi -> report d'une
 * semaine complète par rapport à un envoi le mercredi précédent).
 */
export function lundiDeLaSemaineSuivante(iso: DateISO): DateISO {
  const date = toDate(iso);
  const jourSemaine = date.getUTCDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  // Recule jusqu'au lundi de la semaine de `iso` (0 jour de recul si `iso` est déjà lundi).
  const decalageVersLundi = jourSemaine === 0 ? 6 : jourSemaine - 1;
  const lundiDeCetteSemaine = ajouterJours(date, -decalageVersLundi);
  return toISO(ajouterJours(lundiDeCetteSemaine, 7));
}

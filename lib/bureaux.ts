/**
 * Bureaux d'accueil de la Centrale Générale FGTB Namur-Luxembourg.
 * Source : ancien site (accg-nalux.be/pages/contact.html), repris le 25/09/2026.
 * Les horaires sont stockés en créneaux "hh:mm" ; l'affichage en est dérivé.
 */

export const JOURS_OUVRABLES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;
export type Jour = (typeof JOURS_OUVRABLES)[number];
export type Creneau = [debut: string, fin: string];
export type Horaires = Record<Jour, Creneau[]>; // [] = fermé
export type Periode = "annee" | "ete";

export type Bureau = {
  ville: string;
  siege: boolean;
  adresse: [ligne1: string, ligne2: string];
  telephone: string; // affichage
  telephoneLien: string; // tel:
  horaires: Record<Periode, Horaires>;
};

export const EMAIL_GENERAL = "cg.nalux@accg.be";

const MATIN: Creneau = ["08:30", "12:00"];
const ETE_APREM: Creneau = ["13:30", "15:00"];
const ETE_STANDARD: Horaires = {
  Lundi: [MATIN, ETE_APREM],
  Mardi: [MATIN, ETE_APREM],
  Mercredi: [MATIN],
  Jeudi: [MATIN, ETE_APREM],
  Vendredi: [MATIN],
};

export const BUREAUX: Bureau[] = [
  {
    ville: "Libramont",
    siege: true,
    adresse: ["Rue Fonteny Maroy 13", "6800 Libramont-Chevigny"],
    telephone: "+32 (0)61 530 160",
    telephoneLien: "+3261530160",
    horaires: {
      annee: {
        Lundi: [MATIN, ["13:00", "16:30"]],
        Mardi: [MATIN, ["13:00", "16:30"]],
        Mercredi: [MATIN],
        Jeudi: [MATIN, ["13:30", "16:00"]],
        Vendredi: [MATIN],
      },
      ete: ETE_STANDARD,
    },
  },
  {
    ville: "Namur",
    siege: false,
    adresse: ["Rue Dewez 40-42 (2e étage)", "5000 Namur"],
    telephone: "+32 (0)81 64 99 61",
    telephoneLien: "+3281649961",
    horaires: {
      annee: {
        Lundi: [MATIN, ["13:30", "16:30"]],
        Mardi: [MATIN, ["13:30", "16:30"]],
        Mercredi: [MATIN],
        Jeudi: [MATIN, ["13:30", "16:30"]],
        Vendredi: [MATIN],
      },
      ete: ETE_STANDARD,
    },
  },
  {
    ville: "Arlon",
    siege: false,
    adresse: ["Rue des Martyrs 80 (2e étage)", "6700 Arlon"],
    telephone: "+32 (0)61 530 166",
    telephoneLien: "+3261530166",
    horaires: {
      annee: {
        Lundi: [MATIN, ["13:00", "16:30"]],
        Mardi: [MATIN, ["13:00", "16:30"]],
        Mercredi: [MATIN],
        Jeudi: [MATIN, ["13:30", "16:00"]],
        Vendredi: [MATIN],
      },
      ete: ETE_STANDARD,
    },
  },
  {
    ville: "Marche-en-Famenne",
    siege: false,
    adresse: ["Rue du Parc Industriel 17", "6900 Marche-en-Famenne"],
    telephone: "+32 (0)61 530 160",
    telephoneLien: "+3261530160",
    horaires: {
      annee: {
        Lundi: [MATIN, ["13:00", "16:30"]],
        Mardi: [MATIN, ["13:00", "16:30"]],
        Mercredi: [MATIN],
        Jeudi: [MATIN],
        Vendredi: [],
      },
      ete: { ...ETE_STANDARD, Jeudi: [MATIN], Vendredi: [] },
    },
  },
];

/** "08:30–12:00 / 13:00–16:30", ou "Fermé". */
export function horaireLisible(creneaux: Creneau[]): string {
  return creneaux.length ? creneaux.map(([a, b]) => `${a}–${b}`).join(" / ") : "Fermé";
}

/** Heure de Bruxelles, quel que soit le fuseau du visiteur ou du serveur. */
export function maintenantBruxelles(date = new Date()): { jour: Jour | null; minutes: number; mois: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-BE", {
      timeZone: "Europe/Brussels",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      month: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const nom = parts.weekday.charAt(0).toUpperCase() + parts.weekday.slice(1);
  const jour = (JOURS_OUVRABLES as readonly string[]).includes(nom) ? (nom as Jour) : null;
  return { jour, minutes: Number(parts.hour) * 60 + Number(parts.minute), mois: Number(parts.month) };
}

/** Juillet et août : horaires d'été. */
export function periodeDuMois(mois: number): Periode {
  return mois === 7 || mois === 8 ? "ete" : "annee";
}

const enMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function estOuvert(bureau: Bureau, periode: Periode, jour: Jour | null, minutes: number): boolean {
  if (!jour) return false;
  return bureau.horaires[periode][jour].some(([a, b]) => minutes >= enMinutes(a) && minutes < enMinutes(b));
}

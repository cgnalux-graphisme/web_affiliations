/**
 * Jour J des libérations (lot 3) : modes de trajet, kilomètres remboursés, plage horaire du QR code, limite des
 * essais. Pur (testé), importable côté navigateur.
 */

export const MODES_TRAJET = [
  { code: "voiture", libelle: "En voiture, seul(e)", rembourse: "lieu", etape: null, conducteur: false, tickets: false },
  { code: "covoit_conducteur", libelle: "En covoiturage, je conduis", rembourse: "lieu", etape: null, conducteur: false, tickets: false },
  { code: "covoit_passager", libelle: "En covoiturage, je suis passager(ère)", rembourse: "aucun", etape: null, conducteur: true, tickets: false },
  { code: "voiture_puis_passager", libelle: "En voiture jusqu'à un point de rendez-vous, puis passager(ère)", rembourse: "etape", etape: "rdv", conducteur: true, tickets: false },
  { code: "train", libelle: "En train", rembourse: "aucun", etape: null, conducteur: false, tickets: true },
  { code: "voiture_train", libelle: "En voiture jusqu'à la gare, puis en train", rembourse: "etape", etape: "gare", conducteur: false, tickets: true },
] as const;
export type ModeTrajet = (typeof MODES_TRAJET)[number]["code"];
export const modeTrajet = (code: string) => MODES_TRAJET.find((m) => m.code === code);
export const libelleMode = (code: string) => modeTrajet(code)?.libelle ?? code;

export const TICKETS_MAX = 6;
/** Plage horaire du QR code (heure de Bruxelles) : de 08h00 à 18h00, chaque jour du dossier (décision de Fred). */
export const QR_DEBUT = 8;
export const QR_FIN = 18;

// ── Heure de Bruxelles ──────────────────────────────────────────────────────

/** { jour: « 2026-10-12 », minutes: minutes depuis minuit } à Bruxelles. */
export function heureBruxelles(d: Date): { jour: string; minutes: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { jour: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/**
 * Le QR code est-il ouvert maintenant ? Oui si aujourd'hui (Bruxelles) est une date du dossier et qu'il est entre
 * 08h00 et 18h00. Renvoie la date du jour (pour la signature) ou la raison du refus.
 */
export function fenetreQr<T extends { id: string; jour: string }>(dates: T[], maintenant: Date):
  | { ouvert: true; date: T }
  | { ouvert: false; raison: "pas_aujourdhui" | "trop_tot" | "trop_tard"; prochaine: string | null } {
  const { jour, minutes } = heureBruxelles(maintenant);
  const date = dates.find((d) => d.jour === jour);
  const prochaine = dates.map((d) => d.jour).filter((j) => j > jour).sort()[0] ?? null;
  if (!date) return { ouvert: false, raison: "pas_aujourdhui", prochaine };
  if (minutes < QR_DEBUT * 60) return { ouvert: false, raison: "trop_tot", prochaine: jour };
  if (minutes >= QR_FIN * 60) return { ouvert: false, raison: "trop_tard", prochaine };
  return { ouvert: true, date };
}

// ── Trajet ──────────────────────────────────────────────────────────────────

export type SaisieTrajet = {
  mode: string; departDomicile: boolean; departAdresse: string; etapeAdresse: string; conducteurNom: string;
};
export type TrajetValide = {
  mode: ModeTrajet; depart_domicile: boolean; depart_adresse: string | null; etape_adresse: string | null; conducteur_nom: string | null;
};

const court = (v: string, max = 300) => v.replace(/\s+/g, " ").trim().slice(0, max) || null;

export function validerTrajet(s: SaisieTrajet): { ok: true; valeurs: TrajetValide } | { ok: false; erreur: string } {
  const m = modeTrajet(s.mode);
  if (!m) return { ok: false, erreur: "Choisis comment tu es venu(e)." };
  const sansDepart = m.rembourse === "aucun";
  const departAdresse = sansDepart || s.departDomicile ? null : court(s.departAdresse);
  if (!sansDepart && !s.departDomicile && (!departAdresse || departAdresse.length < 8)) {
    return { ok: false, erreur: "Indique l'adresse de départ complète : rue, numéro, code postal et localité." };
  }
  const etapeAdresse = m.etape ? court(s.etapeAdresse) : null;
  if (m.etape && (!etapeAdresse || etapeAdresse.length < 4)) {
    return { ok: false, erreur: m.etape === "gare" ? "Indique la gare où tu as pris le train." : "Indique l'adresse du point de rendez-vous." };
  }
  const conducteur = m.conducteur ? court(s.conducteurNom, 120) : null;
  if (m.conducteur && !conducteur) return { ok: false, erreur: "Indique le nom du conducteur ou de la conductrice." };
  return { ok: true, valeurs: { mode: m.code, depart_domicile: sansDepart ? true : s.departDomicile, depart_adresse: departAdresse, etape_adresse: etapeAdresse, conducteur_nom: conducteur } };
}

/**
 * Trajet à mesurer pour le remboursement : départ → lieu (voiture, conducteur), départ → point de rendez-vous ou
 * gare, ou rien (passager, train). En covoiturage, seul le conducteur est remboursé.
 */
export function trajetAMesurer(mode: string, depart: string | null, lieu: string | null, etape: string | null): { de: string; vers: string } | null {
  const m = modeTrajet(mode);
  if (!m || m.rembourse === "aucun" || !depart) return null;
  const vers = m.rembourse === "lieu" ? lieu : etape;
  return vers ? { de: depart, vers } : null;
}

/** Kilomètres remboursés : aller-retour, à 0,1 km près. */
export function kmAllerRetour(metresAller: number): number {
  return Math.round((metresAller * 2) / 100) / 10;
}

export function montantKm(km: number | null, taux: number | null): number | null {
  if (km === null || taux === null) return null;
  return Math.round(km * taux * 100) / 100;
}

// ── Limite des essais (n° de registre national) ─────────────────────────────

/** Au plus 8 essais ratés par appareil en 15 minutes, et 5 par participant en une heure. */
export const ESSAIS_APPAREIL = 8;
export const ESSAIS_PARTICIPANT = 5;

export function essaisEpuises(
  tentatives: { empreinte: string; participant_id: string | null; reussie: boolean; created_at: string }[],
  empreinte: string,
  participantId: string | null,
  maintenant: Date
): boolean {
  const depuis = (minutes: number) => maintenant.getTime() - minutes * 60_000;
  const ratees = tentatives.filter((t) => !t.reussie);
  const parAppareil = ratees.filter((t) => t.empreinte === empreinte && Date.parse(t.created_at) >= depuis(15)).length;
  const parParticipant = participantId ? ratees.filter((t) => t.participant_id === participantId && Date.parse(t.created_at) >= depuis(60)).length : 0;
  return parAppareil >= ESSAIS_APPAREIL || parParticipant >= ESSAIS_PARTICIPANT;
}

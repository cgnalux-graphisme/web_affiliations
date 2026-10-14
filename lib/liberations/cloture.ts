import { modeTrajet } from "./jour-j";

/**
 * Clôture d'un dossier (lot 4) : ce qui manque encore. Décision de Fred (14/10/2026) : la liste est affichée et
 * l'admin peut clôturer quand même après confirmation (délégué absent, ticket perdu…). Pur (testé).
 */

export type EtatCloture = {
  participants: { id: string; nom: string; attestationRecue: boolean }[];
  dates: { id: string }[];
  presences: { participantId: string | null; dateId: string; aVerifier: boolean }[];
  trajets: { mode: string; km: number | null; ticketsVerifies: boolean; nom: string }[];
  /** La CG fédérale prend en charge la perte de salaire : attestations attendues. */
  cgFederale: boolean;
};

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export function manquantsPourCloturer(e: EtatCloture): string[] {
  const m: string[] = [];
  const aVerifier = e.presences.filter((p) => p.aVerifier).length;
  if (aVerifier) m.push(`${pluriel(aVerifier, "présence", "présences")} à vérifier`);
  const sansSignature = e.participants.filter((p) => !e.presences.some((x) => x.participantId === p.id)).map((p) => p.nom);
  if (sansSignature.length) m.push(`aucune signature pour ${sansSignature.join(", ")}`);
  const sansKm = e.trajets.filter((t) => modeTrajet(t.mode)?.rembourse !== "aucun" && t.km === null).map((t) => t.nom);
  if (sansKm.length) m.push(`kilomètres à calculer ou à saisir pour ${[...new Set(sansKm)].join(", ")}`);
  const tickets = e.trajets.filter((t) => modeTrajet(t.mode)?.tickets && !t.ticketsVerifies).map((t) => t.nom);
  if (tickets.length) m.push(`tickets de train à vérifier pour ${[...new Set(tickets)].join(", ")}`);
  if (e.cgFederale) {
    const attendues = e.participants.filter((p) => !p.attestationRecue).map((p) => p.nom);
    if (attendues.length) m.push(`attestation de perte de salaire non reçue pour ${attendues.join(", ")}`);
  }
  return m;
}

/** Provinces belges proposées à la fin des formulaires. */
export const PROVINCES_BELGIQUE = [
  "Anvers",
  "Brabant flamand",
  "Brabant wallon",
  "Bruxelles-Capitale",
  "Flandre occidentale",
  "Flandre orientale",
  "Hainaut",
  "Liège",
  "Limbourg",
  "Luxembourg",
  "Namur",
] as const;

const PROVINCES_SERVICE_CHOMAGE = new Set(["namur", "luxembourg"]);

export function normaliserProvince(valeur: string): string {
  return valeur
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * L'envoi automatique au service chômage n'est ouvert
 * que pour les provinces de Namur et du Luxembourg.
 */
export function peutEnvoyerAuServiceChomage(province: string): boolean {
  return PROVINCES_SERVICE_CHOMAGE.has(normaliserProvince(province));
}

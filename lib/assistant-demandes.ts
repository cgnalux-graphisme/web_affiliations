/**
 * Demandes transmises par l'Assistant CG (table site_chatbot_demandes) : statuts et affichage.
 * Fichier sans dépendance, importable côté client.
 * Valeurs en base : `nouveau` (défaut de la colonne), `en_cours`, `traite`.
 */

export const STATUTS_DEMANDE_CHATBOT = [
  { valeur: "nouveau", libelle: "Nouvelle" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "traite", libelle: "Traitée" },
] as const;
export type StatutDemandeChatbot = (typeof STATUTS_DEMANDE_CHATBOT)[number]["valeur"];

export function estStatutDemande(v: unknown): v is StatutDemandeChatbot {
  return STATUTS_DEMANDE_CHATBOT.some((s) => s.valeur === v);
}

export function libelleStatut(v: string): string {
  return STATUTS_DEMANDE_CHATBOT.find((s) => s.valeur === v)?.libelle ?? v;
}

/** Date et heure de Bruxelles : « 08/10/2026 à 14:05 ». */
export function dateHeureBruxelles(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("fr-BE", {
      timeZone: "Europe/Brussels",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.day}/${p.month}/${p.year} à ${p.hour}:${p.minute}`;
}

export type DemandeChatbot = {
  id: string;
  created_at: string;
  nom: string;
  prenom: string;
  email: string;
  message: string;
  code_postal: string;
  region: string;
  categorie: string;
  cp_code: string | null;
  affilie: boolean | null;
  service_nom: string;
  destinataire_email: string;
  statut: string;
  aRegistre: boolean; // le numéro lui-même n'est jamais envoyé à la page : lu à la demande
};

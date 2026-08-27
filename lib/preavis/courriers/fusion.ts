import { isoToDateFr } from "../../dates";
import type { DateISO } from "../types";
import {
  TEMPLATE_COMMUN_ACCORD,
  TEMPLATE_NOTIFICATION_DEMISSION,
  MENTION_PRESTATION_AVEC,
  MENTION_PRESTATION_SANS,
  MENTION_PRESTATION_NON_RESOLUE,
} from "./templates";

/** Pointillés de remplacement pour un champ non renseigné (fidèle à la mise en page des documents originaux). */
const POINTILLES = "...........................................";

type Champs = Record<string, string>;

function fusionner(template: string, champs: Champs): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_correspondance, jeton: string) => champs[jeton] ?? POINTILLES);
}

/** Coordonnées d'identité communes aux deux courriers, toutes optionnelles (design spec §3). */
export interface DonneesIdentite {
  nomTravailleur?: string;
  domicileTravailleur?: string;
  nomEmployeur?: string;
  lieuSignature?: string;
  dateSignatureIso?: DateISO;
}

export interface DonneesConventionCommunAccord extends DonneesIdentite {
  siegeEmployeur?: string;
  dateFinContratIso: DateISO;
  /** true = "après l'exécution de la journée de travail", false = "sans prestation ce jour-là", non précisé = les deux options + note "biffer" (comme l'original). */
  avecPrestation?: boolean;
}

function formaterMentionPrestation(avecPrestation: boolean | undefined): string {
  if (avecPrestation === true) return MENTION_PRESTATION_AVEC;
  if (avecPrestation === false) return MENTION_PRESTATION_SANS;
  return MENTION_PRESTATION_NON_RESOLUE;
}

export function genererConventionCommunAccord(donnees: DonneesConventionCommunAccord): string {
  const champs: Champs = {
    NOM_TRAVAILLEUR: donnees.nomTravailleur ?? POINTILLES,
    DOMICILE_TRAVAILLEUR: donnees.domicileTravailleur ?? POINTILLES,
    NOM_EMPLOYEUR: donnees.nomEmployeur ?? POINTILLES,
    // Non collecté par le wizard (design spec §3) : toujours en pointillés.
    REPRESENTANT_EMPLOYEUR: POINTILLES,
    SIEGE_EMPLOYEUR: donnees.siegeEmployeur ?? POINTILLES,
    DATE_FIN_CONTRAT: isoToDateFr(donnees.dateFinContratIso),
    MENTION_PRESTATION: formaterMentionPrestation(donnees.avecPrestation),
    LIEU_SIGNATURE: donnees.lieuSignature ?? POINTILLES,
    DATE_SIGNATURE: donnees.dateSignatureIso ? isoToDateFr(donnees.dateSignatureIso) : POINTILLES,
  };
  return fusionner(TEMPLATE_COMMUN_ACCORD, champs);
}

export interface DonneesNotificationDemission extends DonneesIdentite {
  dureeJours: number;
  dateDebutPreavisIso: DateISO;
  dateFinPreavisIso: DateISO;
}

/**
 * "13 semaines" — exprimé uniquement en semaines (arrondi à la semaine la
 * plus proche), pour rester compréhensible sans connaissance du détail légal
 * en jours. Le nombre de jours exact reste la donnée de référence utilisée
 * pour tous les calculs de dates ; seul l'affichage est simplifié.
 */
export function formaterDureePreavis(jours: number): string {
  const semaines = Math.round(jours / 7);
  return semaines <= 1 ? "1 semaine" : `${semaines} semaines`;
}

export function genererNotificationDemission(donnees: DonneesNotificationDemission): string {
  const champs: Champs = {
    NOM_TRAVAILLEUR: donnees.nomTravailleur ?? POINTILLES,
    DOMICILE_TRAVAILLEUR: donnees.domicileTravailleur ?? POINTILLES,
    NOM_EMPLOYEUR: donnees.nomEmployeur ?? POINTILLES,
    DUREE_PREAVIS: formaterDureePreavis(donnees.dureeJours),
    DATE_DEBUT_PREAVIS: isoToDateFr(donnees.dateDebutPreavisIso),
    DATE_FIN_PREAVIS: isoToDateFr(donnees.dateFinPreavisIso),
    LIEU_SIGNATURE: donnees.lieuSignature ?? POINTILLES,
    DATE_SIGNATURE: donnees.dateSignatureIso ? isoToDateFr(donnees.dateSignatureIso) : POINTILLES,
  };
  return fusionner(TEMPLATE_NOTIFICATION_DEMISSION, champs);
}

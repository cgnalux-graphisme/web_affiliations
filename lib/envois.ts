import type { TypeDemande } from "./demandes";

/**
 * Envois automatiques d'e-mails par les formulaires : configuration partagée (écran Paramètres,
 * back-office des demandes, routes d'envoi). Fichier sans dépendance, sans donnée personnelle.
 * Les adresses internes sont en base (site_destinataires) ; DESTINATAIRES_DEFAUT ne sert que si la
 * table est illisible (migration pas encore exécutée, panne) : les envois ne s'arrêtent jamais.
 */

export const ENVOIS = ["affiliation", "sepa", "changement", "c1", "c32", "parcours_onem", "modification"] as const;
export type Envoi = (typeof ENVOIS)[number];
/** Envoi journalisé mais sans destinataire interne : copie envoyée à l'adresse choisie par le demandeur. */
export type EnvoiJournal = Envoi | "copie_personnelle";

export function estEnvoi(v: unknown): v is Envoi {
  return typeof v === "string" && (ENVOIS as readonly string[]).includes(v);
}

export const INFOS_ENVOIS: Record<Envoi, { titre: string; quand: string }> = {
  affiliation: {
    titre: "Nouvelle affiliation",
    quand: "Dès qu'une demande d'affiliation est envoyée (seule ou dans le parcours de transfert), avec le PDF.",
  },
  sepa: {
    titre: "Nouveau mandat SEPA",
    quand: "Dès qu'un nouveau mandat SEPA est signé, avec le PDF.",
  },
  changement: {
    titre: "Changement de compte",
    quand: "Dès qu'un changement de numéro de compte est signé, avec le PDF.",
  },
  c1: {
    titre: "Formulaire C1 — service chômage",
    quand: "Quand le demandeur (province de Namur ou de Luxembourg) choisit « Envoyer au service chômage ».",
  },
  c32: {
    titre: "Formulaire C3.2 — service chômage",
    quand: "Quand le demandeur (province de Namur ou de Luxembourg) choisit « Envoyer au service chômage ».",
  },
  parcours_onem: {
    titre: "Parcours de transfert — C1 + C3.2 au service chômage",
    quand: "En fin de parcours, quand le demandeur envoie ses C1 et C3.2 ensemble au service chômage.",
  },
  modification: {
    titre: "Changement de situation",
    quand: "Dès qu'un affilié signale un changement (adresse, contact, employeur, régime, situation professionnelle), avec le PDF.",
  },
};

export const LIBELLES_ENVOI_JOURNAL: Record<EnvoiJournal, string> = {
  ...Object.fromEntries(ENVOIS.map((e) => [e, INFOS_ENVOIS[e].titre])),
  copie_personnelle: "Copie envoyée à l'adresse choisie par le demandeur",
} as Record<EnvoiJournal, string>;

/** Adresses en place avant l'écran Paramètres (secours si la table est illisible). */
export const DESTINATAIRES_DEFAUT: Record<Envoi, string[]> = {
  affiliation: ["admin.nalux@accg.be"],
  sepa: ["admin.nalux@accg.be"],
  changement: ["admin.nalux@accg.be"],
  c1: ["jonathan.hubert@accg.be", "op.namlux@fgtb.be"],
  c32: ["jonathan.hubert@accg.be", "op.namlux@fgtb.be"],
  parcours_onem: ["jonathan.hubert@accg.be", "op.namlux@fgtb.be"],
  modification: ["admin.nalux@accg.be"],
};

export const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValide(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.length <= 254 && EMAIL_VALIDE.test(e);
}

/** Référence d'une demande, transmise par les formulaires aux routes d'envoi. */
export type RefDemande = { type: TypeDemande; id: string };

/** Ligne de l'historique d'une demande (site_envois_mails). */
export type EnvoiMail = {
  id: string;
  created_at: string;
  envoi: EnvoiJournal;
  destinataire: string;
  sujet: string | null;
  statut: "envoye" | "echec";
  erreur: string | null;
};

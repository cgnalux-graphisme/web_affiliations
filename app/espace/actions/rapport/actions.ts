"use server";

import { aApp } from "../../../../lib/espace/acces";
import { fichesPourRapport } from "../../../../lib/fiches-suivi/donnees-serveur";
import type { FiltresFiches } from "../../../../lib/fiches-suivi/regles";
import type { FicheAffichee } from "../../../../lib/fiches-suivi/types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

/** Fiches de suivi de la période pour le rapport de congrès (app « actions », lecture côté serveur). */
export async function chargerFichesRapport(f: FiltresFiches): Promise<{ ok: true; fiches: FicheAffichee[] } | { ok: false; erreur: string }> {
  if (!(await aApp("actions"))) return { ok: false, erreur: "Accès refusé. Reconnectez-vous." };
  if (!ISO.test(f.debut) || !ISO.test(f.fin)) return { ok: false, erreur: "Période invalide." };
  const filtres: FiltresFiches = {
    debut: f.debut,
    fin: f.fin,
    brouillons: Boolean(f.brouillons),
    entrepriseId: f.entrepriseId && UUID.test(f.entrepriseId) ? f.entrepriseId : undefined,
    secteurId: f.secteurId && UUID.test(f.secteurId) ? f.secteurId : undefined,
    auteurId: f.auteurId && UUID.test(f.auteurId) ? f.auteurId : undefined,
  };
  const fiches = await fichesPourRapport(filtres);
  if (!fiches) return { ok: false, erreur: "Les fiches de suivi n'ont pas pu être lues (migration 20261013120000 exécutée ?)." };
  return { ok: true, fiches };
}

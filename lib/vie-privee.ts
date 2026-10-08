/**
 * Politique de vie privée (/vie-privee, PAGES-LEGALES.md) : valeurs propres à l'Assistant CG, écrites une seule
 * fois ici et reprises partout (page et suppression automatique des demandes).
 *
 * Validées par le DPO (privacy@accg.be) le 08/10/2026 : toute modification repasse par lui.
 */

/** Garantie qui encadre le transfert vers Anthropic (États-Unis). Validée par le DPO le 08/10/2026. */
export const GARANTIE_TRANSFERT = "des clauses contractuelles types approuvées par la Commission européenne";

/**
 * Durée de conservation des demandes transmises par l'Assistant CG, en mois, après leur traitement.
 * Validée par le DPO le 08/10/2026. Le site supprime chaque jour les demandes traitées depuis plus
 * longtemps (lib/assistant-purge.ts).
 */
export const DUREE_DEMANDES_MOIS = 12;

/** La même durée, telle qu'écrite dans la page. */
export const DUREE_DEMANDES = `${DUREE_DEMANDES_MOIS} mois`;

/** Date de la dernière mise à jour de la politique de vie privée. */
export const MISE_A_JOUR_VIE_PRIVEE = "08/10/2026";

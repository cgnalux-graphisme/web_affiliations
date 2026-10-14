import type { ManifesteApp } from "../_noyau/types";
import { badgeLiberations, ROLES_ADMIN } from "../../../lib/liberations/donnees-serveur";

/**
 * App « Libérations » : demandes de libération des délégués (lot 1), puis courriers, jour J, frais et archive.
 * Admin (ADMIN_OP, SUPER_ADMIN) : tous les dossiers et les paramètres ; permanent : ses dossiers.
 */
export const manifeste: ManifesteApp = {
  code: "liberations",
  sections: [
    { chemin: "dossiers", libelle: "Dossiers", icone: "calendar-check", aussi: ["^/espace/liberations/[0-9a-f-]{36}"] },
    { chemin: "nouvelle", libelle: "Nouvelle demande", icone: "plus" },
    { chemin: "parametres", libelle: "Paramètres", icone: "sliders", roles: ROLES_ADMIN },
    { chemin: "parametres/modeles", libelle: "Modèles de courriers", icone: "mail", roles: ROLES_ADMIN },
  ],
  badge: badgeLiberations,
};

import type { ManifesteApp } from "../_noyau/types";

/** App « Paramètres » : réglages du site public, adresses des envois, comptes et accès de l'Espace CG. */
export const manifeste: ManifesteApp = {
  code: "parametres",
  sections: [
    { chemin: "site", libelle: "Paramètres du site", icone: "sliders" },
    { chemin: "envois", libelle: "Paramètres des envois", icone: "mail" },
    { chemin: "comptes", libelle: "Comptes & accès", icone: "shield" },
    { chemin: "roles", libelle: "Apps par rôle", icone: "grid" },
    { chemin: "journal", libelle: "Journal des accès", icone: "history" },
  ],
};

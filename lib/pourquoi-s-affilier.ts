/*
 * Page « Pourquoi s'affilier » : constantes partagées entre la page (serveur)
 * et ses animations (composants client). Fichier sans dépendance serveur.
 */

/** Affiliés de la Centrale Générale en provinces de Namur et de Luxembourg (chiffre de la maquette validée). */
export const AFFILIES = 25000;

/**
 * Photos d'actions publiées (vue site_photos_public, bucket action-photos), choisies à la main.
 * Si une photo n'est plus publiée, la page s'affiche simplement sans elle.
 */
export const PHOTOS = {
  /** « Vous avez du poids » : poing levé dans les fumigènes (action du 28/08/2026, Bruxelles). */
  poids: {
    chemin: "d6fc84f1-ebbc-4568-bdbb-e4f5b7006889/03-81b2d880-939e-4c76-b12e-11ad9903cd2f.jpg",
    alt: "Militants en veste rouge, l'un d'eux lève le poing dans la fumée des fumigènes.",
  },
  /** « Ensemble, on décide » : tête de la manifestation wallonne du 16/06/2026 à Namur. */
  ensemble: {
    chemin: "fdc7ee21-b415-4914-99ec-f9c64a138b34/01-377d78aa-2496-441d-851d-10eaf596c973.jpg",
    alt: "Tête de cortège à Namur : des dizaines de manifestants derrière une banderole, drapeaux levés.",
  },
} as const;

export type CleePhoto = keyof typeof PHOTOS;

const nombreFr = new Intl.NumberFormat("fr-BE");

/** 25000 → « 25 000 » avec espace insécable (le chiffre ne se coupe jamais en deux lignes). */
export function formatNombre(n: number): string {
  return nombreFr.format(n).replace(/\s/g, " ");
}

/** Vrai si le visiteur a demandé moins d'animations (lu au moment de l'appel, navigateur seulement). */
export function mouvementReduit(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

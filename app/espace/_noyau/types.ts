/**
 * Contrat d'une app de l'Espace CG. Chaque app vit dans app/espace/<code>/ avec :
 * - manifeste.ts : ce fichier (sections du menu + badge facultatif de la tuile) ;
 * - layout.tsx   : la garde serveur (<GardeApp code="…">), qui vérifie site_a_app('<code>') ;
 * - page.tsx     : renvoie vers la première section ;
 * - un dossier par section (/espace/<code>/<chemin>) et ses propres composants.
 * Le nom, la description, l'icône, la couleur et l'ordre de l'app viennent de la table site_apps.
 */

export type SectionApp = {
  /** Chemin sous /espace/<code>/ (ex. « liste », « articles/nouveau »). */
  chemin: string;
  libelle: string;
  /** Nom d'icône (app/espace/_noyau/icones.ts). */
  icone: string;
  /** Autres adresses (expressions régulières) où cette section reste active dans le menu. */
  aussi?: string[];
  /** Section réservée au SUPER_ADMIN (masquée du menu des autres ; la page revérifie le rôle). */
  superAdmin?: boolean;
  /** Section réservée à ces rôles (SUPER_ADMIN toujours) : masquée du menu des autres ; la page revérifie le rôle. */
  roles?: readonly string[];
};

export type ManifesteApp = {
  /** Même code que site_apps.code. */
  code: string;
  sections: SectionApp[];
  /**
   * Badge de la tuile du tableau de bord (ex. « 5 nouvelles »), calculé côté serveur, seulement pour une
   * personne qui a droit à l'app. null = pas de badge. Une erreur n'empêche jamais le tableau de bord de s'afficher.
   */
  badge?: () => Promise<string | null>;
};

/** Données d'une app envoyées au navigateur (sérialisables : pas de fonction). */
export type AppNav = {
  code: string;
  nom: string;
  description: string;
  icone: string;
  couleur: string;
  sections: { route: string; libelle: string; icone: string; aussi?: string[] }[];
};

export function routeSection(code: string, chemin: string): string {
  return `/espace/${code}/${chemin}`;
}

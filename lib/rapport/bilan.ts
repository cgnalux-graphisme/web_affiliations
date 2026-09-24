/** Action telle qu'utilisée par le rapport d'activité (publiée ou non). */
export type ActionRapport = {
  id: string;
  nom: string | null;
  date_action: string; // aaaa-mm-jj
  ville: string | null;
  type_action: string;
  type_action_autre: string | null;
  secteur: string | null; // nom du secteur
  entreprise: string | null;
  front_commun: boolean;
  front_commun_csc: boolean;
  front_commun_synova: boolean;
  participants_total: number | null;
  participants_centrale: number | null;
  description: string | null;
  photo: string | null; // photo principale (URL, puis data URL une fois préparée)
};

export type Repartition = { libelle: string; nombre: number }[];

export type Bilan = {
  total: number;
  parType: Repartition;
  parSecteur: Repartition;
  parAnnee: { annee: number; nombre: number }[];
  participantsTotal: number;
  participantsCentrale: number;
  /** Nombre d'actions pour lesquelles un nombre de participants a été encodé. */
  actionsAvecParticipants: number;
  frontCommun: { total: number; csc: number; synova: number; lesDeux: number };
};

export const SANS_SECTEUR = "Sans secteur précisé";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Libellé du type pour les statistiques ("autre" regroupe tous les types libres). */
export function libelleType(typeAction: string): string {
  return typeAction === "autre" ? "Autre" : capitalize(typeAction);
}

function repartition(valeurs: string[]): Repartition {
  const compte = new Map<string, number>();
  for (const v of valeurs) compte.set(v, (compte.get(v) ?? 0) + 1);
  return [...compte]
    .map(([libelle, nombre]) => ({ libelle, nombre }))
    .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, "fr"));
}

/** Chiffres clés du rapport pour une période (années de début à fin incluses, même vides). */
export function calculerBilan(actions: ActionRapport[], anneeDebut: number, anneeFin: number): Bilan {
  const parAnnee = [];
  for (let a = anneeDebut; a <= anneeFin; a++) {
    parAnnee.push({ annee: a, nombre: actions.filter((x) => +x.date_action.slice(0, 4) === a).length });
  }

  const fc = actions.filter((a) => a.front_commun);
  const avecParticipants = actions.filter((a) => a.participants_total != null);

  return {
    total: actions.length,
    parType: repartition(actions.map((a) => libelleType(a.type_action))),
    parSecteur: repartition(actions.map((a) => a.secteur ?? SANS_SECTEUR)),
    parAnnee,
    participantsTotal: actions.reduce((s, a) => s + (a.participants_total ?? 0), 0),
    participantsCentrale: actions.reduce((s, a) => s + (a.participants_centrale ?? 0), 0),
    actionsAvecParticipants: avecParticipants.length,
    frontCommun: {
      total: fc.length,
      csc: fc.filter((a) => a.front_commun_csc).length,
      synova: fc.filter((a) => a.front_commun_synova).length,
      lesDeux: fc.filter((a) => a.front_commun_csc && a.front_commun_synova).length,
    },
  };
}

/**
 * Parts du camembert : au plus `max` parts ; au-delà, les plus petites sont
 * regroupées en "Autres types" (le détail reste dans le tableau à côté).
 */
export function partsCamembert(parType: Repartition, max = 4): Repartition {
  if (parType.length <= max) return parType;
  const gardees = parType.slice(0, max - 1);
  const reste = parType.slice(max - 1).reduce((s, p) => s + p.nombre, 0);
  return [...gardees, { libelle: `Autres types (${parType.length - max + 1})`, nombre: reste }];
}

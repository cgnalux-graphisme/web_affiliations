import { describe, expect, it } from "vitest";
import { calculerBilan, partsCamembert, SANS_SECTEUR, type ActionRapport } from "./bilan";

function action(p: Partial<ActionRapport>): ActionRapport {
  return {
    id: Math.random().toString(36),
    nom: null,
    date_action: "2026-05-01",
    ville: null,
    type_action: "manifestation",
    type_action_autre: null,
    secteur: null,
    entreprise: null,
    front_commun: false,
    front_commun_csc: false,
    front_commun_synova: false,
    participants_total: null,
    participants_centrale: null,
    description: null,
    photo: null,
    ...p,
  };
}

describe("calculerBilan", () => {
  const actions = [
    action({ date_action: "2024-02-13", type_action: "grève générale", secteur: "Construction", participants_total: 1000, participants_centrale: 120, front_commun: true, front_commun_csc: true, front_commun_synova: true }),
    action({ date_action: "2026-01-20", type_action: "manifestation", secteur: "Construction", participants_total: 300, participants_centrale: 40, front_commun: true, front_commun_csc: true }),
    action({ date_action: "2026-08-28", type_action: "autre", type_action_autre: "Bulletin 0/20" }),
  ];
  const b = calculerBilan(actions, 2023, 2026);

  it("compte les actions et les participants", () => {
    expect(b.total).toBe(3);
    expect(b.participantsTotal).toBe(1300);
    expect(b.participantsCentrale).toBe(160);
    expect(b.actionsAvecParticipants).toBe(2);
  });

  it("répartit par type et par secteur, du plus fréquent au moins fréquent", () => {
    expect(b.parType).toEqual([
      { libelle: "Autre", nombre: 1 },
      { libelle: "Grève générale", nombre: 1 },
      { libelle: "Manifestation", nombre: 1 },
    ]);
    expect(b.parSecteur).toEqual([
      { libelle: "Construction", nombre: 2 },
      { libelle: SANS_SECTEUR, nombre: 1 },
    ]);
  });

  it("détaille le front commun", () => {
    expect(b.frontCommun).toEqual({ total: 2, csc: 2, synova: 1, lesDeux: 1 });
  });

  it("liste chaque année de la période, même sans action", () => {
    expect(b.parAnnee).toEqual([
      { annee: 2023, nombre: 0 },
      { annee: 2024, nombre: 1 },
      { annee: 2025, nombre: 0 },
      { annee: 2026, nombre: 2 },
    ]);
  });
});

describe("partsCamembert", () => {
  it("regroupe les plus petites parts au-delà de 4", () => {
    const parts = partsCamembert([
      { libelle: "A", nombre: 5 },
      { libelle: "B", nombre: 4 },
      { libelle: "C", nombre: 3 },
      { libelle: "D", nombre: 2 },
      { libelle: "E", nombre: 1 },
    ]);
    expect(parts).toEqual([
      { libelle: "A", nombre: 5 },
      { libelle: "B", nombre: 4 },
      { libelle: "C", nombre: 3 },
      { libelle: "Autres types (2)", nombre: 3 },
    ]);
  });
});

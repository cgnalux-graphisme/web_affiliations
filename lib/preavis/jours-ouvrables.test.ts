import { describe, expect, it } from "vitest";
import {
  estJourFerieLegalBE,
  estJourOuvrable,
  joursOuvrablesApres,
  premierLundiApres,
  lundiDeLaSemaineSuivante,
} from "./jours-ouvrables";

describe("estJourFerieLegalBE", () => {
  it("reconnaît le 1er mai comme férié", () => {
    expect(estJourFerieLegalBE("2026-05-01")).toBe(true);
  });

  it("calcule Pâques 2026 (5 avril) et le lundi de Pâques (6 avril)", () => {
    expect(estJourFerieLegalBE("2026-04-06")).toBe(true);
  });

  it("ne considère pas un jour ordinaire comme férié", () => {
    expect(estJourFerieLegalBE("2026-05-02")).toBe(false);
  });
});

describe("estJourOuvrable", () => {
  it("compte le samedi comme jour ouvrable", () => {
    // 2026-08-22 est un samedi
    expect(estJourOuvrable("2026-08-22")).toBe(true);
  });

  it("ne compte pas le dimanche comme jour ouvrable", () => {
    // 2026-08-23 est un dimanche
    expect(estJourOuvrable("2026-08-23")).toBe(false);
  });

  it("ne compte pas un jour férié comme jour ouvrable", () => {
    expect(estJourOuvrable("2026-05-01")).toBe(false);
  });
});

describe("joursOuvrablesApres", () => {
  it("avance de 3 jours ouvrables en sautant le dimanche", () => {
    // Vendredi 2026-08-21 + 3 jours ouvrables -> samedi 22 (1), lundi 24 (2, dimanche 23 sauté), mardi 25 (3)
    expect(joursOuvrablesApres("2026-08-21", 3)).toBe("2026-08-25");
  });
});

describe("premierLundiApres", () => {
  it("retourne le même jour si c'est déjà un lundi", () => {
    expect(premierLundiApres("2026-08-24")).toBe("2026-08-24");
  });

  it("avance au lundi suivant sinon", () => {
    expect(premierLundiApres("2026-08-25")).toBe("2026-08-31");
  });
});

describe("lundiDeLaSemaineSuivante", () => {
  // Exemple chiffré du support "Récap démission" (Centrale Générale FGTB) :
  // un envoi le mercredi (2026-09-02) et un envoi le jeudi (2026-09-03) ne
  // doivent PAS démarrer le préavis le même lundi — l'envoi du jeudi reporte
  // d'une semaine complète supplémentaire.
  it("mercredi + 3 jours ouvrables (samedi 2026-09-05) -> lundi 2026-09-07", () => {
    // Samedi n'est pas lui-même un lundi : on avance simplement au lundi de la semaine suivante.
    expect(lundiDeLaSemaineSuivante("2026-09-05")).toBe("2026-09-07");
  });

  it("jeudi + 3 jours ouvrables (lundi 2026-09-07) -> lundi 2026-09-14 (et non le jour même)", () => {
    // Le 3e jour ouvrable tombe déjà un lundi : la règle empêche un départ le jour même.
    expect(lundiDeLaSemaineSuivante("2026-09-07")).toBe("2026-09-14");
  });

  it("diffère de premierLundiApres précisément quand l'entrée est déjà un lundi", () => {
    expect(premierLundiApres("2026-09-07")).toBe("2026-09-07");
    expect(lundiDeLaSemaineSuivante("2026-09-07")).toBe("2026-09-14");
  });
});

import { describe, expect, it } from "vitest";
import { BUREAUX, estOuvert, horaireLisible, maintenantBruxelles, periodeDuMois } from "./bureaux";

const namur = BUREAUX.find((b) => b.ville === "Namur")!;
const marche = BUREAUX.find((b) => b.ville === "Marche-en-Famenne")!;

describe("bureaux", () => {
  it("affiche les horaires lisiblement", () => {
    expect(horaireLisible(namur.horaires.annee.Lundi)).toBe("08:30–12:00 / 13:30–16:30");
    expect(horaireLisible(marche.horaires.annee.Vendredi)).toBe("Fermé");
  });

  it("passe à l'horaire d'été en juillet et août", () => {
    expect(periodeDuMois(6)).toBe("annee");
    expect(periodeDuMois(7)).toBe("ete");
    expect(periodeDuMois(8)).toBe("ete");
    expect(periodeDuMois(9)).toBe("annee");
  });

  it("calcule l'ouverture selon le créneau", () => {
    expect(estOuvert(namur, "annee", "Lundi", 9 * 60)).toBe(true);
    expect(estOuvert(namur, "annee", "Lundi", 12 * 60 + 30)).toBe(false);
    expect(estOuvert(namur, "ete", "Lundi", 15 * 60 + 30)).toBe(false);
    expect(estOuvert(marche, "annee", "Vendredi", 9 * 60)).toBe(false);
    expect(estOuvert(namur, "annee", null, 9 * 60)).toBe(false);
  });

  it("lit l'heure de Bruxelles (heure d'été belge = UTC+2)", () => {
    // Jeudi 24/09/2026 07:15 UTC = 09:15 à Bruxelles.
    const b = maintenantBruxelles(new Date("2026-09-24T07:15:00Z"));
    expect(b).toEqual({ jour: "Jeudi", minutes: 9 * 60 + 15, mois: 9 });
  });
});

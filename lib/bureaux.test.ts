import { describe, expect, it } from "vitest";
import { BUREAUX, estOuvert, horaireLisible, lienCarteIntegree, maintenantBruxelles, periodeDuMois, prochainChangement } from "./bureaux";

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


describe("prochain changement d'état", () => {
  const namurB = BUREAUX.find((b) => b.ville === "Namur")!;
  const marcheB = BUREAUX.find((b) => b.ville === "Marche-en-Famenne")!;
  const h = (hh: number, mm = 0) => hh * 60 + mm;

  it("dit quand le bureau ferme s'il est ouvert", () => {
    expect(prochainChangement(namurB, "annee", "Lundi", h(9))).toBe("Ferme à 12:00");
  });
  it("dit quand il rouvre le jour même", () => {
    expect(prochainChangement(namurB, "annee", "Lundi", h(12, 30))).toBe("Ouvre à 13:30");
  });
  it("renvoie au lendemain après la fermeture", () => {
    expect(prochainChangement(namurB, "annee", "Mercredi", h(14))).toBe("Ouvre demain à 08:30");
  });
  it("passe le week-end et les jours fermés", () => {
    expect(prochainChangement(namurB, "annee", "Vendredi", h(15))).toBe("Ouvre lundi à 08:30");
    expect(prochainChangement(namurB, "annee", null, h(10))).toBe("Ouvre lundi à 08:30");
    expect(prochainChangement(marcheB, "annee", "Jeudi", h(13))).toBe("Ouvre lundi à 08:30");
  });
  it("retire la précision d'étage de l'adresse de la carte", () => {
    expect(decodeURIComponent(lienCarteIntegree(namurB))).toContain("q=Rue Dewez 40-42, 5000 Namur, Belgique");
  });
});

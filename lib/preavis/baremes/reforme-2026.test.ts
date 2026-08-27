import { describe, expect, it } from "vitest";
import { appliquerReforme2026 } from "./reforme-2026";

describe("appliquerReforme2026", () => {
  it("ne change rien pour un contrat commencé avant le 1/6/2026", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2020-01-01", moisAnciennete: 240, semaines: 62 })).toBe(62);
  });

  it("plafonne à 52 semaines dès 17 ans pour un contrat commencé après le 31/5/2026", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2026-06-01", moisAnciennete: 240, semaines: 62 })).toBe(52);
  });

  it("ne plafonne pas sous 17 ans même pour un contrat post-2026-06-01", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2026-06-01", moisAnciennete: 120, semaines: 33 })).toBe(33);
  });

  it("impose 1 semaine forfaitaire sous 6 mois pour un contrat commencé après le 31/7/2026", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2026-08-01", moisAnciennete: 4, semaines: 4 })).toBe(1);
  });

  it("n'impose pas le forfait 1 semaine pour un contrat commencé entre le 1/6 et le 31/7/2026", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2026-06-15", moisAnciennete: 4, semaines: 4 })).toBe(4);
  });
});

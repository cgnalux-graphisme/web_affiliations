import { describe, expect, it } from "vitest";
import { creerChoix, lireChoix, VERSION_CONSENTEMENT } from "./consentement";

const maintenant = new Date("2026-09-29T10:00:00Z");

describe("consentement aux cookies", () => {
  it("relit un choix enregistré", () => {
    const brut = JSON.stringify(creerChoix(true, maintenant));
    expect(lireChoix(brut, maintenant)?.cartes).toBe(true);
    expect(lireChoix(JSON.stringify(creerChoix(false, maintenant)), maintenant)?.cartes).toBe(false);
  });

  it("ignore un choix absent ou illisible", () => {
    expect(lireChoix(null, maintenant)).toBeNull();
    expect(lireChoix("pas du json", maintenant)).toBeNull();
    expect(lireChoix(JSON.stringify({ version: VERSION_CONSENTEMENT, cartes: "oui", date: maintenant.toISOString() }), maintenant)).toBeNull();
  });

  it("redemande après 6 mois ou si la version change", () => {
    const vieux = creerChoix(true, new Date("2026-03-01T10:00:00Z"));
    expect(lireChoix(JSON.stringify(vieux), maintenant)).toBeNull();
    const autreVersion = { ...creerChoix(true, maintenant), version: VERSION_CONSENTEMENT + 1 };
    expect(lireChoix(JSON.stringify(autreVersion), maintenant)).toBeNull();
  });

  it("refuse une date dans le futur", () => {
    expect(lireChoix(JSON.stringify(creerChoix(true, new Date("2027-01-01T00:00:00Z"))), maintenant)).toBeNull();
  });
});

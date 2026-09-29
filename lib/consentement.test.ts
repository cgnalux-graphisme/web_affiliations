import { describe, expect, it } from "vitest";
import { creerChoix, ELEMENTS_COOKIES, lireChoix, TOUT_ACCEPTE, TOUT_REFUSE, VERSION_CONSENTEMENT } from "./consentement";

const maintenant = new Date("2026-09-29T10:00:00Z");

describe("consentement aux cookies", () => {
  it("relit un choix enregistré, catégorie par catégorie", () => {
    const c = lireChoix(JSON.stringify(creerChoix({ cartes: true, videos: false }, maintenant)), maintenant);
    expect(c?.cartes).toBe(true);
    expect(c?.videos).toBe(false);
    expect(lireChoix(JSON.stringify(creerChoix(TOUT_REFUSE, maintenant)), maintenant)?.cartes).toBe(false);
  });

  it("ignore un choix absent, illisible ou incomplet", () => {
    expect(lireChoix(null, maintenant)).toBeNull();
    expect(lireChoix("pas du json", maintenant)).toBeNull();
    const incomplet = { version: VERSION_CONSENTEMENT, cartes: true, date: maintenant.toISOString() };
    expect(lireChoix(JSON.stringify(incomplet), maintenant)).toBeNull();
  });

  it("redemande après 6 mois ou si la version change (ancien choix « cartes » seul compris)", () => {
    const vieux = creerChoix(TOUT_ACCEPTE, new Date("2026-03-01T10:00:00Z"));
    expect(lireChoix(JSON.stringify(vieux), maintenant)).toBeNull();
    const v1 = { version: 1, cartes: true, date: maintenant.toISOString() };
    expect(lireChoix(JSON.stringify(v1), maintenant)).toBeNull();
  });

  it("refuse une date dans le futur", () => {
    expect(lireChoix(JSON.stringify(creerChoix(TOUT_ACCEPTE, new Date("2027-01-01T00:00:00Z"))), maintenant)).toBeNull();
  });

  it("décrit chaque élément, les indispensables sans catégorie", () => {
    expect(ELEMENTS_COOKIES.filter((e) => e.categorie === null).length).toBe(4);
    expect(ELEMENTS_COOKIES.map((e) => e.categorie).filter(Boolean).sort()).toEqual(["cartes", "videos"]);
  });
});

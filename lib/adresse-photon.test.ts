import { describe, expect, it } from "vitest";
import { suggestionsPhoton, urlPhoton } from "./adresse-photon";

const f = (p: Record<string, string>) => ({ properties: { countrycode: "BE", ...p } });

describe("urlPhoton", () => {
  it("cherche en français, limité à la Belgique", () => {
    expect(urlPhoton("rue de la loi")).toBe("https://photon.komoot.io/api/?q=rue%20de%20la%20loi&lang=fr&limit=10&bbox=2.376,49.496,6.628,51.547");
  });
});

describe("suggestionsPhoton", () => {
  it("garde les rues belges, avec numéro, code postal et localité", () => {
    const r = suggestionsPhoton({ features: [f({ street: "Rue Dewez", housenumber: "40", postcode: "5000", city: "Namur" })] });
    expect(r).toEqual([{ street: "Rue Dewez", housenumber: "40", postcode: "5000", city: "Namur", display: "Rue Dewez 40, 5000 Namur" }]);
  });
  it("écarte l'étranger et les résultats sans rue, prend la localité à défaut de ville", () => {
    const r = suggestionsPhoton({ features: [
      { properties: { countrycode: "FR", street: "Rue X", city: "Sedan" } },
      f({ name: "Gare" }),
      f({ street: "Rue Y", postcode: "6800", locality: "Libramont" }),
    ] });
    expect(r.map((s) => s.display)).toEqual(["Rue Y, 6800 Libramont"]);
  });
  it("dédoublonne une même rue dans une même localité et limite à 6", () => {
    const memes = Array.from({ length: 3 }, (_, i) => f({ street: "Rue Z", housenumber: String(i), postcode: "5000", city: "Namur" }));
    const autres = Array.from({ length: 8 }, (_, i) => f({ street: `Rue ${i}`, postcode: "5000", city: "Namur" }));
    const r = suggestionsPhoton({ features: [...memes, ...autres] });
    expect(r.filter((s) => s.street === "Rue Z")).toHaveLength(1);
    expect(r).toHaveLength(6);
  });
  it("résiste à une réponse vide ou inattendue", () => {
    expect(suggestionsPhoton(null)).toEqual([]);
    expect(suggestionsPhoton({})).toEqual([]);
  });
});

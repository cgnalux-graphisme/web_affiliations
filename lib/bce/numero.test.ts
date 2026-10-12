import { describe, expect, it } from "vitest";
import { chiffres, formaterNumeroBce, formaterNumeroUe, normaliserNumeroBce } from "./numero";

describe("normaliserNumeroBce", () => {
  it("accepte les formats usuels", () => {
    for (const s of ["0850.076.920", "0850 076 920", "BE 0850.076.920", "be0850076920", "850076920", "0850076920"]) {
      expect(normaliserNumeroBce(s)).toBe("0850076920");
    }
  });
  it("refuse une clé de contrôle fausse", () => {
    expect(normaliserNumeroBce("0850.076.921")).toBeNull();
  });
  it("refuse une longueur impossible ou un premier chiffre autre que 0 ou 1", () => {
    expect(normaliserNumeroBce("12345")).toBeNull();
    expect(normaliserNumeroBce("2235300266")).toBeNull();
    expect(normaliserNumeroBce("")).toBeNull();
  });
  it("valide un numéro connu inexistant à la BCE mais bien formé", () => {
    expect(normaliserNumeroBce("0123.456.749")).toBe("0123456749");
  });
});

describe("formats", () => {
  it("affiche avec des points", () => {
    expect(formaterNumeroBce("0850076920")).toBe("0850.076.920");
    expect(formaterNumeroUe("2235300266")).toBe("2.235.300.266");
  });
  it("garde les seuls chiffres", () => {
    expect(chiffres("BE 0850.076-920")).toBe("0850076920");
    expect(chiffres(null)).toBe("");
  });
});

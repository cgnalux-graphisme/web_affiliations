import { describe, expect, it } from "vitest";
import { formaterIban, ibanValide, nettoyerIban } from "./iban";

describe("IBAN", () => {
  it("nettoie et formate", () => {
    expect(nettoyerIban("be68 5390-0754 7034")).toBe("BE68539007547034");
    expect(formaterIban("BE68539007547034")).toBe("BE68 5390 0754 7034");
  });

  it("vérifie la clé de contrôle et la longueur", () => {
    expect(ibanValide("BE68 5390 0754 7034")).toBe(true);
    expect(ibanValide("BE69 5390 0754 7034")).toBe(false);
    expect(ibanValide("BE68 5390 0754 703")).toBe(false);
    expect(ibanValide("LU28 0019 4006 4475 0000")).toBe(true);
    expect(ibanValide("FR14 2004 1010 0505 0001 3M02 606")).toBe(true);
    expect(ibanValide("pas un iban")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { moisEntre } from "./anciennete";

describe("moisEntre", () => {
  it("calcule les mois entiers entre deux dates (exemple employeur ACCG CP124)", () => {
    // Embauche 02/02/1998, début préavis 06/12/2022 -> 298 mois (valeur cachée I9 du classeur)
    expect(moisEntre("1998-02-02", "2022-12-06")).toBe(298);
  });

  it("calcule l'ancienneté acquise depuis le 1/1/2014 (exemple ACCG CP124)", () => {
    expect(moisEntre("2014-01-01", "2022-12-06")).toBe(107);
  });

  it("calcule l'exemple démission ACCG (embauche 1993)", () => {
    expect(moisEntre("1993-02-02", "2022-12-06")).toBe(358);
  });

  it("ne décompte pas le mois courant si le jour n'est pas encore atteint", () => {
    expect(moisEntre("2020-01-15", "2020-03-10")).toBe(1);
  });

  it("décompte le mois courant si le jour est atteint ou dépassé", () => {
    expect(moisEntre("2020-01-15", "2020-03-15")).toBe(2);
  });

  it("retourne 0 si les dates sont identiques", () => {
    expect(moisEntre("2020-01-15", "2020-01-15")).toBe(0);
  });

  it("anniversaire 29 février retombant sur un 28 février (année non bissextile) : le mois n'est pas encore décompté", () => {
    // (2021-2020)*12 + (2-2) = 12 mois bruts, puis -1 car 28 < 29 -> 11
    expect(moisEntre("2020-02-29", "2021-02-28")).toBe(11);
  });

  it("embauche le 31 janvier, jusqu'au 29 février (année bissextile) : le mois n'est pas encore décompté", () => {
    // (2020-2020)*12 + (2-1) = 1 mois brut, puis -1 car 29 < 31 -> 0
    expect(moisEntre("2020-01-31", "2020-02-29")).toBe(0);
  });

  it("retourne 0 (par conception) si finISO est antérieure à debutISO (arguments inversés)", () => {
    expect(moisEntre("2022-01-01", "2020-01-01")).toBe(0);
  });
});

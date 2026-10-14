import { describe, expect, it } from "vitest";
import { euros, lireMontant, montantSaisie, totalGeneral, totalLigne, validerMontants } from "./montants";

describe("montants", () => {
  it("lit les saisies courantes", () => {
    expect([lireMontant("125,50"), lireMontant("125.5"), lireMontant(" 1 200 "), lireMontant("")]).toEqual([125.5, 125.5, 1200, null]);
    expect(lireMontant("12,345")).toBeUndefined();
    expect(lireMontant("-5")).toBeUndefined();
    expect(lireMontant("abc")).toBeUndefined();
  });

  it("valide une ligne et nomme la colonne fautive", () => {
    expect(validerMontants({ salaire_brut: "120", cheques_repas: "1,09" })).toEqual({
      ok: true, valeurs: { salaire_brut: 120, deplacements: null, indemnites: null, petits_frais: null, cheques_repas: 1.09 },
    });
    expect(validerMontants({ indemnites: "x" })).toEqual({ ok: false, erreur: "Indemnités : montant invalide. Exemple : 125,50" });
  });

  it("additionne sans erreur d'arrondi", () => {
    expect(totalLigne({ salaire_brut: 0.1, deplacements: 0.2 })).toBe(0.3);
    expect(totalGeneral([{ salaire_brut: 100.1 }, { salaire_brut: 50.2, cheques_repas: 1.09 }])).toBe(151.39);
  });

  it("affiche en euros", () => {
    expect(euros(1234.5)).toBe("1 234,50 €");
    expect(euros(0)).toBe("0,00 €");
    expect(euros(null)).toBe("");
    expect(montantSaisie(125.5)).toBe("125,50");
    expect(montantSaisie("12")).toBe("12,00");
    expect(montantSaisie(null)).toBe("");
  });
});

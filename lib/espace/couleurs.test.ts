import { describe, expect, it } from "vitest";
import { contrasteAvecBlanc, foncePourTexteBlanc } from "./couleurs";

describe("foncePourTexteBlanc", () => {
  it("garde le mélange habituel (72 %) quand il suffit déjà (rouge, bleu, vert)", () => {
    for (const c of ["#E32119", "#0072B2", "#009E73"]) expect(foncePourTexteBlanc(c).part).toBe(72);
  });
  it("assombrit davantage une couleur claire (orange de l'app Entreprises) jusqu'à 4,5:1", () => {
    const r = foncePourTexteBlanc("#E69F00");
    expect(r.part).toBeLessThan(72);
    expect(contrasteAvecBlanc(r.hex)).toBeGreaterThanOrEqual(4.5);
  });
  it("renvoie une couleur hexadécimale valide, et le mélange habituel pour une valeur illisible", () => {
    expect(foncePourTexteBlanc("#CC79A7").hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(foncePourTexteBlanc("rouge").part).toBe(72);
  });
});

import { describe, expect, it } from "vitest";
import { nombreEnLettresFr } from "./nombre-lettres";

describe("nombreEnLettresFr", () => {
  it("convertit les nombres de base", () => {
    expect(nombreEnLettresFr(0)).toBe("zéro");
    expect(nombreEnLettresFr(1)).toBe("un");
    expect(nombreEnLettresFr(13)).toBe("treize");
    expect(nombreEnLettresFr(17)).toBe("dix-sept");
  });

  it("utilise l'orthographe belge pour 70/80/90", () => {
    expect(nombreEnLettresFr(70)).toBe("septante");
    expect(nombreEnLettresFr(71)).toBe("septante et un");
    expect(nombreEnLettresFr(80)).toBe("quatre-vingts");
    expect(nombreEnLettresFr(81)).toBe("quatre-vingt-un");
    expect(nombreEnLettresFr(90)).toBe("nonante");
    expect(nombreEnLettresFr(91)).toBe("nonante et un");
  });

  it("gère les dizaines avec 'et un' (sauf quatre-vingt-un)", () => {
    expect(nombreEnLettresFr(21)).toBe("vingt et un");
    expect(nombreEnLettresFr(31)).toBe("trente et un");
    expect(nombreEnLettresFr(61)).toBe("soixante et un");
  });

  it("gère les centaines", () => {
    expect(nombreEnLettresFr(100)).toBe("cent");
    expect(nombreEnLettresFr(101)).toBe("cent un");
    expect(nombreEnLettresFr(200)).toBe("deux cents");
    expect(nombreEnLettresFr(213)).toBe("deux cent treize");
  });

  it("accorde au féminin quand demandé (ex. « une semaine »)", () => {
    expect(nombreEnLettresFr(1, { feminin: true })).toBe("une");
    expect(nombreEnLettresFr(21, { feminin: true })).toBe("vingt et une");
    expect(nombreEnLettresFr(81, { feminin: true })).toBe("quatre-vingt-une");
  });

  it("rejette les nombres hors de la plage prise en charge", () => {
    expect(() => nombreEnLettresFr(-1)).toThrow();
    expect(() => nombreEnLettresFr(1000)).toThrow();
    expect(() => nombreEnLettresFr(1.5)).toThrow();
  });
});

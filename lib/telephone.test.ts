import { describe, expect, it } from "vitest";
import { formaterTelephone } from "./telephone";

describe("formaterTelephone", () => {
  it("met un GSM belge au format +32 (0) 4xx xx xx xx, quelle que soit la saisie", () => {
    for (const s of ["0470123456", "0470 12 34 56", "0470/12.34.56", "+32470123456", "+32 (0) 470 12 34 56", "0032 470 12 34 56", "32470123456"]) {
      expect(formaterTelephone(s)).toBe("+32 (0) 470 12 34 56");
    }
  });
  it("met un fixe belge au format de sa zone", () => {
    expect(formaterTelephone("081 64 99 63")).toBe("+32 (0) 81 64 99 63");
    expect(formaterTelephone("02/511.11.11")).toBe("+32 (0) 2 511 11 11");
    expect(formaterTelephone("+32 61 22 33 44")).toBe("+32 (0) 61 22 33 44");
  });
  it("gère le Luxembourg et la France", () => {
    expect(formaterTelephone("+352 621 123 456")).toBe("+352 621 123 456");
    expect(formaterTelephone("00352621123456")).toBe("+352 621 123 456");
    expect(formaterTelephone("+33 6 12 34 56 78")).toBe("+33 (0) 6 12 34 56 78");
  });
  it("laisse intact ce qu'il ne reconnaît pas, et vide reste vide", () => {
    expect(formaterTelephone("12")).toBe("12");
    expect(formaterTelephone("  ")).toBe("");
    expect(formaterTelephone("+44 20 7946 0958")).toBe("+44 20 79 46 09 58");
  });
});

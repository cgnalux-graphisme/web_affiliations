import { describe, expect, it } from "vitest";
import { isoToDateCourte } from "./dates";

describe("isoToDateCourte", () => {
  it("formate une date ISO en jj/mm/aa", () => {
    expect(isoToDateCourte("2026-09-24")).toBe("24/09/26");
    expect(isoToDateCourte("2031-01-05")).toBe("05/01/31");
  });

  it("renvoie une chaîne vide si la date est invalide", () => {
    expect(isoToDateCourte("24/09/2026")).toBe("");
    expect(isoToDateCourte("")).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { peutEnvoyerAuServiceChomage } from "./provinces-service-chomage";

describe("peutEnvoyerAuServiceChomage", () => {
  it("autorise Namur et le Luxembourg", () => {
    expect(peutEnvoyerAuServiceChomage("Namur")).toBe(true);
    expect(peutEnvoyerAuServiceChomage("namur")).toBe(true);
    expect(peutEnvoyerAuServiceChomage("Luxembourg")).toBe(true);
    expect(peutEnvoyerAuServiceChomage("  luxembourg ")).toBe(true);
  });

  it("refuse les autres provinces", () => {
    expect(peutEnvoyerAuServiceChomage("Liège")).toBe(false);
    expect(peutEnvoyerAuServiceChomage("Hainaut")).toBe(false);
    expect(peutEnvoyerAuServiceChomage("Bruxelles-Capitale")).toBe(false);
    expect(peutEnvoyerAuServiceChomage("")).toBe(false);
  });
});

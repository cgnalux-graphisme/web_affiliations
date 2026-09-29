import { describe, expect, it } from "vitest";
import {
  dateMobilisation,
  datesEnChiffres,
  depuisHorodatage,
  estLeJourJ,
  ligneInfo,
  liensPartage,
  lienValide,
  paragraphes,
  rebours,
  versHorodatage,
} from "./mobilisations";

describe("dates à l'heure de Bruxelles", () => {
  it("convertit une saisie d'été (UTC+2) et d'hiver (UTC+1)", () => {
    expect(versHorodatage("14/10/2026", "10:30")).toBe("2026-10-14T08:30:00.000Z");
    expect(versHorodatage("10/12/2026", "10:30")).toBe("2026-12-10T09:30:00.000Z");
    expect(versHorodatage("10/12/2026", "")).toBe("2026-12-09T23:00:00.000Z");
  });
  it("refuse une date ou une heure invalide", () => {
    expect(versHorodatage("31/02/2026", "10:00")).toBeNull();
    expect(versHorodatage("2026-10-14", "10:00")).toBeNull();
    expect(versHorodatage("14/10/2026", "25:00")).toBeNull();
  });
  it("relit l'horodatage en jj/mm/aaaa et hh:mm", () => {
    expect(depuisHorodatage("2026-10-14T08:30:00Z")).toEqual({ date: "14/10/2026", heure: "10:30" });
    expect(dateMobilisation("2026-10-14T08:30:00Z")).toBe("14/10/2026 à 10 h 30");
    expect(dateMobilisation("2026-12-09T23:00:00Z")).toBe("10/12/2026");
  });
});

describe("compte à rebours", () => {
  it("découpe le temps restant", () => {
    const cible = "2026-10-14T08:30:00Z";
    const maintenant = new Date(cible).getTime() - ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
    expect(rebours(cible, maintenant)).toEqual({ jours: 2, heures: 3, minutes: 4, secondes: 5 });
    expect(rebours(cible, new Date(cible).getTime() + 1000)).toBeNull();
  });
  it("reconnaît le jour J à Bruxelles", () => {
    expect(estLeJourJ("2026-10-14T08:30:00Z", new Date("2026-10-14T20:00:00Z").getTime())).toBe(true);
    expect(estLeJourJ("2026-10-14T08:30:00Z", new Date("2026-10-14T22:30:00Z").getTime())).toBe(false);
  });
});

describe("dates en chiffres", () => {
  it("remplace les mois en toutes lettres", () => {
    expect(datesEnChiffres("Le mardi 14 octobre, on y va.", "2026")).toBe("Le mardi 14/10/2026, on y va.");
    expect(datesEnChiffres("Depuis le 1er mai 2025 et le 3 Août", "2026")).toBe("Depuis le 01/05/2025 et le 03/08/2026");
    expect(datesEnChiffres("Le 14 octobre", null)).toBe("Le 14 octobre");
    expect(datesEnChiffres("Il y a 3 mois", "2026")).toBe("Il y a 3 mois");
  });
});

describe("textes", () => {
  it("découpe les paragraphes", () => {
    expect(paragraphes("Un\ndeux\n\n\nTrois")).toEqual(["Un deux", "Trois"]);
  });
  it("repère un libellé d'info pratique", () => {
    expect(ligneInfo("Rendez-vous : 10 h, gare du Nord")).toEqual({ libelle: "Rendez-vous", texte: "10 h, gare du Nord" });
    expect(ligneInfo("Bus au départ de Libramont")).toEqual({ libelle: null, texte: "Bus au départ de Libramont" });
  });
  it("n'accepte que les liens http(s)", () => {
    expect(lienValide("https://www.fgtb.be/inscription")).toBe(true);
    expect(lienValide("javascript:alert(1)")).toBe(false);
    expect(lienValide("")).toBe(false);
  });
  it("compose les liens de partage", () => {
    const l = liensPartage("https://accg-nalux.com/mobilisation/greve", "Grève", "Le 14/10/2026");
    expect(l.map((x) => x.reseau)).toEqual(["facebook", "whatsapp", "x", "email"]);
    expect(l[0].href).toContain(encodeURIComponent("https://accg-nalux.com/mobilisation/greve"));
    expect(l[3].href.startsWith("mailto:?subject=")).toBe(true);
  });
});

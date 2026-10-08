import { describe, expect, it } from "vitest";
import {
  dateMobilisation,
  datesEnChiffres,
  depuisHorodatage,
  estLeJourJ,
  finMiseEnAvant,
  miseEnAvantTerminee,
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

describe("fin de la mise en avant", () => {
  const h = (iso: string) => new Date(iso).getTime();

  it("s'arrête 1 h après l'heure de l'événement", () => {
    const debut = versHorodatage("09/10/2026", "10:30")!; // 08:30 UTC
    expect(finMiseEnAvant(debut)).toBe(h("2026-10-09T09:30:00.000Z"));
    expect(miseEnAvantTerminee(debut, h("2026-10-09T09:29:59.000Z"))).toBe(false);
    expect(miseEnAvantTerminee(debut, h("2026-10-09T09:30:00.000Z"))).toBe(true);
  });

  it("sans heure, reste affichée tout le jour J (jusqu'à minuit à Bruxelles)", () => {
    const jour = versHorodatage("09/10/2026", "")!;
    expect(finMiseEnAvant(jour)).toBe(h(versHorodatage("10/10/2026", "00:00")!));
    expect(miseEnAvantTerminee(jour, h("2026-10-09T20:00:00.000Z"))).toBe(false);
    // Passage à l'heure d'hiver la nuit du 25/10/2026 : minuit du lendemain reste juste.
    expect(finMiseEnAvant(versHorodatage("25/10/2026", "")!)).toBe(h("2026-10-25T23:00:00.000Z"));
  });

  it("sans date, ne s'arrête jamais d'elle-même", () => {
    expect(finMiseEnAvant(null)).toBeNull();
    expect(miseEnAvantTerminee(null, Date.now())).toBe(false);
  });
});

describe("echeance (bandeau de mobilisation)", () => {
  it("compte en jours calendaires à Bruxelles", async () => {
    const { echeance } = await import("./mobilisations");
    const evenement = "2026-10-09T08:00:00Z"; // 09/10/2026 à 10:00 à Bruxelles
    expect(echeance(evenement, Date.parse("2026-10-08T21:30:00Z"))).toEqual({ long: "Demain", court: "Demain" }); // 23:30 le 08/10
    expect(echeance(evenement, Date.parse("2026-10-08T22:30:00Z"))).toEqual({ long: "Aujourd'hui", court: "Aujourd'hui" }); // 00:30 le 09/10
    expect(echeance(evenement, Date.parse("2026-10-06T10:00:00Z"))).toEqual({ long: "Dans 3 jours", court: "J-3" });
    expect(echeance(evenement, Date.parse("2026-10-10T10:00:00Z"))).toBeNull();
    expect(echeance(null, Date.now())).toBeNull();
  });
});

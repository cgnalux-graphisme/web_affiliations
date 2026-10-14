import { describe, expect, it } from "vitest";
import {
  essaisEpuises, fenetreQr, heureBruxelles, kmAllerRetour, montantKm, trajetAMesurer, validerTrajet,
} from "./jour-j";

const DATES = [{ id: "d1", jour: "2026-10-12" }, { id: "d2", jour: "2026-10-13" }];

describe("heure de Bruxelles et fenêtre du QR code", () => {
  it("convertit l'heure (été : UTC+2)", () => {
    expect(heureBruxelles(new Date("2026-10-12T06:30:00Z"))).toEqual({ jour: "2026-10-12", minutes: 8 * 60 + 30 });
    expect(heureBruxelles(new Date("2026-12-01T23:30:00Z"))).toEqual({ jour: "2026-12-02", minutes: 30 });
  });

  it("ouvre de 08h00 à 18h00 les jours du dossier", () => {
    expect(fenetreQr(DATES, new Date("2026-10-12T06:00:00Z"))).toMatchObject({ ouvert: true, date: { id: "d1" } });
    expect(fenetreQr(DATES, new Date("2026-10-13T15:59:00Z"))).toMatchObject({ ouvert: true, date: { id: "d2" } });
  });

  it("refuse avant 8h, après 18h et les autres jours", () => {
    expect(fenetreQr(DATES, new Date("2026-10-12T05:59:00Z"))).toEqual({ ouvert: false, raison: "trop_tot", prochaine: "2026-10-12" });
    expect(fenetreQr(DATES, new Date("2026-10-12T16:00:00Z"))).toEqual({ ouvert: false, raison: "trop_tard", prochaine: "2026-10-13" });
    expect(fenetreQr(DATES, new Date("2026-10-11T10:00:00Z"))).toEqual({ ouvert: false, raison: "pas_aujourdhui", prochaine: "2026-10-12" });
    expect(fenetreQr(DATES, new Date("2026-10-14T10:00:00Z"))).toEqual({ ouvert: false, raison: "pas_aujourdhui", prochaine: null });
  });
});

describe("trajet", () => {
  const base = { mode: "voiture", departDomicile: true, departAdresse: "", etapeAdresse: "", conducteurNom: "" };

  it("valide les six cas", () => {
    expect(validerTrajet(base)).toEqual({ ok: true, valeurs: { mode: "voiture", depart_domicile: true, depart_adresse: null, etape_adresse: null, conducteur_nom: null } });
    expect(validerTrajet({ ...base, mode: "covoit_passager", conducteurNom: "Jean" }).ok).toBe(true);
    expect(validerTrajet({ ...base, mode: "covoit_passager" }).ok).toBe(false);
    expect(validerTrajet({ ...base, mode: "voiture_puis_passager", conducteurNom: "Jean" }).ok).toBe(false);
    expect(validerTrajet({ ...base, mode: "voiture_puis_passager", conducteurNom: "Jean", etapeAdresse: "Gare de Namur" }).ok).toBe(true);
    expect(validerTrajet({ ...base, mode: "train" }).ok).toBe(true);
    expect(validerTrajet({ ...base, mode: "voiture_train" }).ok).toBe(false);
    expect(validerTrajet({ ...base, mode: "voiture_train", etapeAdresse: "Gare de Ciney" }).ok).toBe(true);
    expect(validerTrajet({ ...base, mode: "avion" }).ok).toBe(false);
  });

  it("exige une adresse de départ complète si ce n'est pas le domicile", () => {
    expect(validerTrajet({ ...base, departDomicile: false, departAdresse: "Rue" }).ok).toBe(false);
    const r = validerTrajet({ ...base, departDomicile: false, departAdresse: "  Rue Haute 5,  5000 Namur " });
    expect(r.ok && r.valeurs.depart_adresse).toBe("Rue Haute 5, 5000 Namur");
  });

  it("choisit ce qu'il faut mesurer", () => {
    expect(trajetAMesurer("voiture", "A", "Lieu", null)).toEqual({ de: "A", vers: "Lieu" });
    expect(trajetAMesurer("covoit_conducteur", "A", "Lieu", null)).toEqual({ de: "A", vers: "Lieu" });
    expect(trajetAMesurer("covoit_passager", "A", "Lieu", null)).toBeNull();
    expect(trajetAMesurer("voiture_puis_passager", "A", "Lieu", "RDV")).toEqual({ de: "A", vers: "RDV" });
    expect(trajetAMesurer("train", "A", "Lieu", null)).toBeNull();
    expect(trajetAMesurer("voiture_train", "A", "Lieu", "Gare")).toEqual({ de: "A", vers: "Gare" });
    expect(trajetAMesurer("voiture", null, "Lieu", null)).toBeNull();
  });

  it("calcule l'aller-retour et le montant", () => {
    expect(kmAllerRetour(32_456)).toBe(64.9);
    expect(montantKm(64.9, 0.428)).toBe(27.78);
    expect(montantKm(null, 0.428)).toBeNull();
    expect(montantKm(10, null)).toBeNull();
  });
});

describe("limite des essais", () => {
  const t = (minutes: number, empreinte = "a", participant_id: string | null = "p1", reussie = false) =>
    ({ empreinte, participant_id, reussie, created_at: new Date(Date.parse("2026-10-12T08:00:00Z") - minutes * 60_000).toISOString() });
  const maintenant = new Date("2026-10-12T08:00:00Z");

  it("bloque après 8 essais ratés d'un appareil en 15 minutes", () => {
    expect(essaisEpuises(Array.from({ length: 7 }, () => t(1, "a", null)), "a", null, maintenant)).toBe(false);
    expect(essaisEpuises(Array.from({ length: 8 }, () => t(1, "a", null)), "a", null, maintenant)).toBe(true);
    expect(essaisEpuises(Array.from({ length: 8 }, () => t(20, "a", null)), "a", null, maintenant)).toBe(false);
  });

  it("bloque après 5 essais ratés pour un participant en une heure, quel que soit l'appareil", () => {
    const essais = [t(1, "a"), t(5, "b"), t(10, "c"), t(30, "d"), t(50, "e")];
    expect(essaisEpuises(essais, "z", "p1", maintenant)).toBe(true);
    expect(essaisEpuises(essais, "z", "p2", maintenant)).toBe(false);
    expect(essaisEpuises([...essais.slice(0, 4), t(1, "a", "p1", true)], "z", "p1", maintenant)).toBe(false);
  });
});

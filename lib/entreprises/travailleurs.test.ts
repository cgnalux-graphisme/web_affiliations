import { describe, expect, it } from "vitest";
import { correspondances, filtrerTravailleurs, nissAffiche, statutsPresents, trierTravailleurs, versTravailleur, type LigneWorker } from "./travailleurs";

const ligne = (x: Partial<LigneWorker>): LigneWorker => ({
  id: "w", first_name: "Marie", last_name: "Exemple", niss: "85073003328", is_niss_missing: false, affiliation_number: "12345",
  company_id: "c1", status: "Actif", contract_type: "Ouvrier(e)", info: null, communication: null, comment: "", added_manually: false,
  strike_participation: [], action_participation: [], last_modified: null, last_modified_by: null, created_at: null, sync_status: "synced",
  ...x,
});

const LISTE = [
  versTravailleur(ligne({ id: "1", first_name: "Élodie", last_name: "Dupont" })),
  versTravailleur(ligne({ id: "2", first_name: "Marc", last_name: "Aubry", status: "Parti", niss: null, is_niss_missing: true })),
  versTravailleur(ligne({ id: "3", first_name: "Jean", last_name: "dupont", affiliation_number: "99" })),
];

describe("travailleurs d'une entreprise", () => {
  it("convertit une ligne de CG Link", () => {
    const t = versTravailleur(ligne({ niss: " ", strike_participation: [{ date: "2026-10-01" }, "x"] }));
    expect(t.nissManquant).toBe(true);
    expect(t.niss).toBeNull();
    expect(t.greves).toEqual([{ date: "2026-10-01" }]);
  });

  it("trie par nom puis prénom, sans tenir compte des accents ni des majuscules", () => {
    expect(trierTravailleurs(LISTE).map((t) => t.id)).toEqual(["2", "1", "3"]);
  });

  it("cherche dans le nom, le prénom, le n° d'affiliation et le registre national", () => {
    expect(filtrerTravailleurs(LISTE, "elodie").map((t) => t.id)).toEqual(["1"]);
    expect(filtrerTravailleurs(LISTE, "dupont jean").map((t) => t.id)).toEqual(["3"]);
    expect(filtrerTravailleurs(LISTE, "85.07.30").map((t) => t.id)).toEqual(["1", "3"]);
    expect(filtrerTravailleurs(LISTE, "", "Parti").map((t) => t.id)).toEqual(["2"]);
  });

  it("affiche le registre national formaté", () => {
    expect(nissAffiche("85073003328")).toBe("85.07.30-033.28");
    expect(nissAffiche("ABC")).toBe("ABC");
    expect(nissAffiche(null)).toBe("");
  });

  it("liste les statuts présents, Actif d'abord", () => {
    expect(statutsPresents(LISTE)).toEqual(["Actif", "Parti"]);
  });

  it("propose les travailleurs qui ressemblent au délégué", () => {
    expect(correspondances(LISTE, "Elo", "DUPONT").map((t) => t.id)).toEqual(["1"]);
    expect(correspondances(LISTE, null, "Dupont").map((t) => t.id)).toEqual(["1", "3"]);
    expect(correspondances(LISTE, "Marie", null)).toEqual([]);
  });
});

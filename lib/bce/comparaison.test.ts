import { describe, expect, it } from "vitest";
import type { Entreprise, Unite } from "../entreprises/types";
import type { UniteBce } from "./analyse";
import { aucunChangement, choixParDefaut, comparerBce, majEntrepriseDepuisBce, majUnitesDepuisBce } from "./comparaison";

const E: Entreprise = {
  id: "e1", company_id: null, nom: "X", numero_bce: "0850076920", denomination_bce: "ANCIEN NOM",
  siege_rue: "Rue Fonteny Maroy", siege_numero: "13", siege_boite: null, siege_code_postal: "6800", siege_localite: "Libramont-Chevigny",
  ref_nom: null, ref_fonction: null, ref_email: null, ref_telephone: null, bce_importe_le: null, notes: null, autres_company_ids: [],
};
const ub = (n: string, extra: Partial<UniteBce> = {}): UniteBce => ({
  numero_ue: n, statut: "actif", date_debut: "2022-01-01", denomination: "D",
  rue: "Rue A", numero: "1", boite: null, code_postal: "5000", localite: "Namur", ...extra,
});
const u = (id: string, n: string, extra: Partial<Unite> = {}): Unite => ({
  id, entreprise_id: "e1", site_id: "s1", origine: "bce", suivie: true, ...ub(n), ...extra,
});
const entite = { denomination: "NOUVEAU NOM", siege: { rue: "Rue Fonteny Maroy", numero: "13", boite: null, code_postal: "6800", localite: "Libramont-Chevigny" } };

describe("comparerBce", () => {
  const c = comparerBce(E, [u("a", "2000000001"), u("b", "2000000002"), u("c", "2000000003")], {
    entite,
    unites: [ub("2000000001"), ub("2000000002", { localite: "Jambes", statut: "arrete" }), ub("2000000004")],
  });
  it("trouve la dénomination changée", () => {
    expect(c.identite).toEqual([{ champ: "denomination_bce", libelle: "Dénomination", avant: "ANCIEN NOM", apres: "NOUVEAU NOM" }]);
  });
  it("classe les unités", () => {
    expect(c.nouvelles.map((x) => x.numero_ue)).toEqual(["2000000004"]);
    expect(c.modifiees).toHaveLength(1);
    expect(c.modifiees[0].changements.map((x) => x.champ).sort()).toEqual(["localite", "statut"]);
    expect(c.absentes.map((x) => x.numero_ue)).toEqual(["2000000003"]);
    expect(c.inchangees).toBe(1);
    expect(aucunChangement(c)).toBe(false);
  });
  it("ne signale pas comme absente une unité manuelle ou déjà arrêtée", () => {
    const c2 = comparerBce(E, [u("m", "2000000009", { origine: "manuel" }), u("z", "2000000008", { statut: "arrete" })], { entite, unites: [] });
    expect(c2.absentes).toEqual([]);
  });
  it("applique seulement les cases cochées", () => {
    const choix = choixParDefaut(c);
    expect(majEntrepriseDepuisBce(c, choix)).toEqual({ denomination_bce: "NOUVEAU NOM" });
    const m = majUnitesDepuisBce(c, { ...choix, modifiees: [] }, [ub("2000000004")]);
    expect(m.inserer.map((x) => x.numero_ue)).toEqual(["2000000004"]);
    expect(m.modifier).toEqual([]);
    const m2 = majUnitesDepuisBce(c, choix, []);
    expect(m2.modifier).toEqual([{ id: "b", maj: { localite: "Jambes", statut: "arrete" } }]);
  });
  it("ne voit aucun changement sur des données identiques", () => {
    const c3 = comparerBce({ ...E, denomination_bce: "NOUVEAU NOM" }, [u("a", "2000000001")], { entite, unites: [ub("2000000001")] });
    expect(aucunChangement(c3)).toBe(true);
  });
});

describe("siège comparé en bloc", () => {
  it("propose d'effacer la boîte et le numéro quand le siège change", () => {
    const e = { ...E, denomination_bce: "NOUVEAU NOM", siege_rue: "Rue A", siege_numero: "1", siege_boite: "3" };
    const c = comparerBce(e, [], { entite: { denomination: "NOUVEAU NOM", siege: { rue: "Rue B", numero: null, boite: null, code_postal: "6800", localite: "Libramont-Chevigny" } }, unites: [] });
    expect(c.identite.map((x) => x.champ).sort()).toEqual(["siege_boite", "siege_numero", "siege_rue"]);
    expect(majEntrepriseDepuisBce(c, choixParDefaut(c))).toEqual({ siege_rue: "Rue B", siege_numero: null, siege_boite: null });
  });
  it("n'efface rien quand la BCE ne donne aucun siège", () => {
    const c = comparerBce(E, [], { entite: { denomination: "ANCIEN NOM", siege: { rue: null, numero: null, boite: null, code_postal: null, localite: null } }, unites: [] });
    expect(c.identite).toEqual([]);
  });
});

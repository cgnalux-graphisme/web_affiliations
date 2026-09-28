import { describe, expect, it } from "vitest";
import {
  dateHeureBruxelles,
  debutJourBruxelles,
  estTri,
  estTypeDemande,
  lendemain,
  libelleStatut,
  motsRecherche,
  nomFichierPdf,
} from "./demandes";
import { detailDemande, formaterValeur } from "./demandes-affichage";

// Données fictives uniquement.

describe("demandes", () => {
  it("valide types et tris", () => {
    expect(estTypeDemande("c32")).toBe(true);
    expect(estTypeDemande("web_affiliations")).toBe(false);
    expect(estTri("nom_asc")).toBe(true);
    expect(estTri("id")).toBe(false);
  });

  it("nettoie la recherche (pas d'injection de filtre PostgREST)", () => {
    expect(motsRecherche("  Dupont   Jean ")).toEqual(["Dupont", "Jean"]);
    expect(motsRecherche("a,b)or(id.eq*")).toEqual(["a", "b", "or", "id", "eq"]);
    expect(motsRecherche("")).toEqual([]);
    expect(motsRecherche("un deux trois quatre cinq six")).toHaveLength(5);
  });

  it("début de journée à Bruxelles (hiver +1 h, été +2 h)", () => {
    expect(debutJourBruxelles("2026-01-15")).toBe("2026-01-14T23:00:00.000Z");
    expect(debutJourBruxelles("2026-07-15")).toBe("2026-07-14T22:00:00.000Z");
  });

  it("lendemain", () => {
    expect(lendemain("2026-12-31")).toBe("2027-01-01");
    expect(lendemain("2028-02-28")).toBe("2028-02-29");
  });

  it("date et heure de Bruxelles", () => {
    expect(dateHeureBruxelles("2026-09-24T08:05:00Z")).toBe("24/09/2026 10:05");
    expect(dateHeureBruxelles(null)).toBe("");
  });

  it("nom de fichier PDF propre", () => {
    expect(nomFichierPdf("c1", "Van Dœuf", "Hélène", "2026-09-24T08:05:00Z")).toBe("formulaire-c1-van-doeuf-helene-24-09-2026.pdf");
  });

  it("statuts lisibles", () => {
    expect(libelleStatut("en_attente")).toBe("En attente");
    expect(libelleStatut("a_rappeler")).toBe("A rappeler");
    expect(libelleStatut(null)).toBe("");
  });
});

describe("demandes-affichage", () => {
  it("met les valeurs en forme", () => {
    expect(formaterValeur("x", true)).toBe("Oui");
    expect(formaterValeur("x", null)).toBe("—");
    expect(formaterValeur("date_signature", "2026-09-24")).toBe("24/09/2026");
    expect(formaterValeur("iban", "be68539007547034")).toBe("BE68 5390 0754 7034");
    expect(formaterValeur("type_demande", "changement_compte")).toBe("Changement de compte");
    expect(formaterValeur("cotisation_mensuelle", 16.5)).toBe("16,5");
  });

  it("affiliation : sections prévues, colonnes inconnues affichées aussi", () => {
    const d = detailDemande("affiliation", {
      id: "x",
      created_at: "2026-09-24T08:05:00Z",
      nom: "Test",
      status: "en_attente",
      pdf_generated_url: null,
      signature: "data:image/png;base64,AAAA",
    });
    expect(d.sections[0].titre).toBe("Demande");
    expect(d.sections.at(-1)?.titre).toBe("Autres informations");
    expect(d.sections.at(-1)?.champs.map((c) => c.cle)).toEqual(["pdf_generated_url"]);
    expect(d.signature).toBe("data:image/png;base64,AAAA");
  });

  it("C1 : contenu du formulaire depuis data, listes et signature", () => {
    const d = detailDemande("c1", {
      id: "x",
      created_at: "2026-09-24T08:05:00Z",
      nom: "Test",
      data: {
        motifDemandeAlloc: true,
        cohabitants: [{ nom: "A", lien: "enfant", revenus: false }],
        signature: "javascript:alert(1)",
      },
    });
    const contenu = d.sections.find((s) => s.titre === "Contenu du formulaire")!;
    expect(contenu.champs.map((c) => c.libelle)).toEqual(["Motif demande alloc", "Cohabitants"]);
    expect(contenu.champs[1].liste).toEqual([["Nom : A", "Lien : enfant"]]);
    // Une signature qui n'est pas une image en data URL n'est jamais affichée.
    expect(d.signature).toBeNull();
  });
});

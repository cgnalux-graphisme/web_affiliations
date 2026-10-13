import { describe, expect, it } from "vitest";
import {
  cheminFichier, documentAccepte, filtrerFiches, libelleDate, manquantsPourTerminer, nomFichierPdf, paragraphes,
  peutModifier, validerChamps,
} from "./regles";

describe("validerChamps", () => {
  it("convertit les dates jj/mm/aaaa et vide les champs blancs", () => {
    const r = validerChamps({ titre: "  Grève chez X ", date_debut: "03/02/2026", date_fin: "", origine: " " });
    expect(r).toEqual({ ok: true, valeurs: { titre: "Grève chez X", date_debut: "2026-02-03", date_fin: null, origine: null } });
  });
  it("refuse une date invalide", () => {
    expect(validerChamps({ date_debut: "31/02/2026" })).toEqual({ ok: false, erreur: "Date de début invalide. Format attendu : jj/mm/aaaa" });
  });
  it("refuse une fin avant le début", () => {
    const r = validerChamps({ date_debut: "10/02/2026", date_fin: "09/02/2026" });
    expect(r.ok).toBe(false);
  });
  it("ignore les champs inconnus (auteur, statut…)", () => {
    const r = validerChamps({ auteur_id: "x", statut: "terminee", resultat: "Accord" });
    expect(r).toEqual({ ok: true, valeurs: { resultat: "Accord" } });
  });
  it("refuse un identifiant mal formé", () => {
    expect(validerChamps({ entreprise_id: "abc" }).ok).toBe(false);
  });
});

describe("manquantsPourTerminer", () => {
  const base = { type: "usine" as const, titre: "T", date_debut: "2026-01-01", entreprise_id: "e", secteur_id: null, texte: "Texte" };
  it("fiche complète", () => {
    expect(manquantsPourTerminer(base)).toEqual([]);
  });
  it("usine sans entreprise, sectoriel sans secteur", () => {
    expect(manquantsPourTerminer({ ...base, entreprise_id: null })).toEqual(["l'entreprise"]);
    expect(manquantsPourTerminer({ ...base, type: "sectoriel", entreprise_id: null })).toEqual(["le secteur"]);
  });
  it("sans titre, date ni texte", () => {
    expect(manquantsPourTerminer({ ...base, titre: " ", date_debut: null, texte: null })).toEqual(["le titre", "la date", "le texte de la fiche"]);
  });
});

describe("peutModifier", () => {
  it("auteur ou super admin", () => {
    expect(peutModifier("a", "a", false)).toBe(true);
    expect(peutModifier("a", "b", true)).toBe(true);
    expect(peutModifier("a", "b", false)).toBe(false);
  });
});

describe("libelleDate", () => {
  it("date unique ou période", () => {
    expect(libelleDate("2026-02-03", null)).toBe("03/02/2026");
    expect(libelleDate("2026-02-03", "2026-02-03")).toBe("03/02/2026");
    expect(libelleDate("2026-02-03", "2026-03-10")).toBe("du 03/02/2026 au 10/03/2026");
    expect(libelleDate(null, null)).toBe("");
  });
});

describe("cheminFichier", () => {
  it("nom sans accents ni caractères spéciaux, sous le dossier de la fiche", () => {
    expect(cheminFichier("f1", "u1", "Préavis de grève (signé).PDF")).toBe("f1/u1-preavis-de-greve-signe.pdf");
    expect(cheminFichier("f1", "u1", "...")).toBe("f1/u1-fichier");
  });
});

describe("nomFichierPdf", () => {
  it("date et lieu", () => {
    expect(nomFichierPdf("2026-02-03", "Carmeuse Seilles")).toBe("fiche-suivi-2026-02-03-carmeuse-seilles.pdf");
    expect(nomFichierPdf(null, "")).toBe("fiche-suivi.pdf");
  });
});

describe("documentAccepte", () => {
  it("type et taille", () => {
    expect(documentAccepte({ type: "application/pdf", size: 1000 })).toBe(true);
    expect(documentAccepte({ type: "application/zip", size: 1000 })).toBe(false);
    expect(documentAccepte({ type: "application/pdf", size: 30 * 1024 * 1024 })).toBe(false);
  });
});

describe("paragraphes", () => {
  it("découpe sur les lignes vides", () => {
    expect(paragraphes("Un.\n\n\nDeux\nsuite.\n")).toEqual(["Un.", "Deux\nsuite."]);
    expect(paragraphes(null)).toEqual([]);
  });
});

describe("filtrerFiches", () => {
  const f = (o: Partial<{ id: string; date_debut: string | null; date_fin: string | null; entrepriseId: string | null; secteurId: string | null; auteurId: string; statut: "brouillon" | "terminee" }>) => ({
    id: "x", date_debut: "2025-06-01", date_fin: null, entrepriseId: "e1", secteurId: "s1", auteurId: "a1", statut: "terminee" as const, ...o,
  });
  const fiches = [
    f({ id: "1" }),
    f({ id: "2", date_debut: "2023-01-01" }),
    f({ id: "3", entrepriseId: "e2", secteurId: "s2", auteurId: "a2" }),
    f({ id: "4", statut: "brouillon" }),
    f({ id: "5", date_debut: "2024-12-01", date_fin: "2025-01-15" }), // période à cheval : retenue
  ];
  const periode = { debut: "2025-01-01", fin: "2025-12-31" };
  it("période (chevauchement) et terminées seulement par défaut", () => {
    expect(filtrerFiches(fiches, { ...periode }).map((x) => x.id)).toEqual(["1", "3", "5"]);
  });
  it("brouillons compris, entreprise, secteur, permanent", () => {
    expect(filtrerFiches(fiches, { ...periode, brouillons: true }).map((x) => x.id)).toEqual(["1", "3", "4", "5"]);
    expect(filtrerFiches(fiches, { ...periode, entrepriseId: "e2" }).map((x) => x.id)).toEqual(["3"]);
    expect(filtrerFiches(fiches, { ...periode, secteurId: "s1" }).map((x) => x.id)).toEqual(["1", "5"]);
    expect(filtrerFiches(fiches, { ...periode, auteurId: "a2" }).map((x) => x.id)).toEqual(["3"]);
  });
});

import { describe, expect, it } from "vitest";
import { etatCompte, phraseJournal, uniteAutorisee, uniteModifiable, validerDelegue } from "./delegue";

describe("validerDelegue", () => {
  it("exige le nom", () => {
    expect(validerDelegue({ nom: "  " })).toEqual({ ok: false, erreur: "Indiquez le nom du délégué." });
  });
  it("vérifie l'e-mail et vide les champs blancs", () => {
    expect(validerDelegue({ nom: "Dupont", email: "pas-un-mail" })).toEqual({ ok: false, erreur: "Adresse e-mail invalide. Exemple : prenom.nom@exemple.be" });
    expect(validerDelegue({ nom: "Dupont", prenom: " ", email: "A@B.BE", unite_id: "" })).toEqual({
      ok: true, valeurs: { nom: "Dupont", prenom: null, email: "a@b.be", unite_id: null },
    });
  });
});

describe("uniteAutorisee", () => {
  const unites = [
    { id: "u1", entreprise_id: "e1", statut: "actif", suivie: true },
    { id: "u2", entreprise_id: "e1", statut: "actif", suivie: false },
    { id: "u3", entreprise_id: "e2", statut: "actif", suivie: true },
    { id: "u4", entreprise_id: "e1", statut: "arrete", suivie: true },
  ];
  it("accepte une unité suivie et active de la même entreprise, ou aucune", () => {
    expect(uniteAutorisee("u1", "e1", unites)).toBe(true);
    expect(uniteAutorisee(null, "e1", unites)).toBe(true);
  });
  it("refuse une unité non suivie, arrêtée, d'une autre entreprise ou inconnue", () => {
    expect(uniteAutorisee("u2", "e1", unites)).toBe(false);
    expect(uniteAutorisee("u4", "e1", unites)).toBe(false);
    expect(uniteAutorisee("u3", "e1", unites)).toBe(false);
    expect(uniteAutorisee("zz", "e1", unites)).toBe(false);
  });
});

describe("etatCompte", () => {
  it("distingue les états", () => {
    expect(etatCompte(null, undefined, null)).toBe("sans_compte");
    expect(etatCompte("u", undefined, null)).toBe("introuvable");
    expect(etatCompte("u", { id: "u", isActive: false }, "2026-01-01")).toBe("bloque");
    expect(etatCompte("u", { id: "u", isActive: true }, null)).toBe("invite");
    expect(etatCompte("u", { id: "u" }, "2026-01-01T10:00:00Z")).toBe("actif");
  });
});

describe("phraseJournal", () => {
  it("écrit une phrase lisible", () => {
    expect(phraseJournal("import", { crees: 3, mandats: 5, rejetes: 1 })).toBe("Import depuis CG Link : 3 délégués, 5 mandats, 1 texte non importé.");
    expect(phraseJournal("mandat_ajout", { mandat: "DS eff." })).toBe("Mandat ajouté : DS eff.");
    expect(phraseJournal("inconnue", {})).toBe("inconnue");
  });
});

describe("uniteModifiable", () => {
  const unites = [{ id: "u1", entreprise_id: "e1", statut: "arrete", suivie: true }];
  it("laisse enregistrer une carte dont l'unité actuelle n'est plus suivie ou est arrêtée", () => {
    expect(uniteModifiable("u1", "u1", "e1", unites)).toBe(true);
  });
  it("refuse de choisir une nouvelle unité non autorisée", () => {
    expect(uniteModifiable("u1", null, "e1", unites)).toBe(false);
  });
});

describe("validerDelegue : téléphone et adresse", () => {
  it("met le téléphone au format +32 (0) …", () => {
    expect(validerDelegue({ nom: "Dupont", telephone: "0470/12.34.56" })).toEqual({ ok: true, valeurs: { nom: "Dupont", telephone: "+32 (0) 470 12 34 56" } });
  });
  it("accepte l'adresse complète et nettoie le code postal", () => {
    const r = validerDelegue({ nom: "Dupont", adresse_rue: "Rue Dewez", adresse_numero: "40", adresse_boite: "", adresse_code_postal: " 5000 ", adresse_localite: "Namur", adresse_pays: "Belgique" });
    expect(r).toEqual({ ok: true, valeurs: { nom: "Dupont", adresse_rue: "Rue Dewez", adresse_numero: "40", adresse_boite: null, adresse_code_postal: "5000", adresse_localite: "Namur", adresse_pays: "Belgique" } });
  });
  it("refuse un code postal belge qui n'a pas 4 chiffres", () => {
    expect(validerDelegue({ nom: "Dupont", adresse_code_postal: "50000", adresse_pays: "Belgique" })).toEqual({ ok: false, erreur: "Code postal belge : 4 chiffres. Exemple : 5000" });
  });
});

import { describe, expect, it } from "vitest";
import { A_VERIFIER_NOM, decouperNom } from "./noms";

describe("decouperNom", () => {
  it("« Prénom Nom » : rien à vérifier (167 cas sur 176)", () => {
    expect(decouperNom("Jean Dupont")).toEqual({ prenom: "Jean", nom: "Dupont", aVerifier: null });
  });
  it("le mot en majuscules est le nom, quelle que soit sa place", () => {
    expect(decouperNom("DUPONT Jean")).toEqual({ prenom: "Jean", nom: "DUPONT", aVerifier: null });
    expect(decouperNom("Jean DUPONT")).toEqual({ prenom: "Jean", nom: "DUPONT", aVerifier: null });
  });
  it("3 mots ou plus : premier mot = prénom, à vérifier", () => {
    expect(decouperNom("Marie Claire Van Damme")).toEqual({ prenom: "Marie", nom: "Claire Van Damme", aVerifier: A_VERIFIER_NOM });
    expect(decouperNom("Jean VAN DAMME")).toEqual({ prenom: "Jean", nom: "VAN DAMME", aVerifier: A_VERIFIER_NOM });
  });
  it("un seul mot ou rien", () => {
    expect(decouperNom("Dupont")).toEqual({ prenom: null, nom: "Dupont", aVerifier: A_VERIFIER_NOM });
    expect(decouperNom("   ")).toEqual({ prenom: null, nom: "Sans nom", aVerifier: "Nom absent dans CG Link" });
    expect(decouperNom(null).nom).toBe("Sans nom");
  });
  it("ignore les espaces en trop", () => {
    expect(decouperNom("  Jean   Dupont ")).toEqual({ prenom: "Jean", nom: "Dupont", aVerifier: null });
  });
});

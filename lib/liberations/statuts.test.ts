import { describe, expect, it } from "vitest";
import { actionPermise, actionsPossibles, peutModifier, peutSupprimer, tonStatut } from "./statuts";

const ADMIN = { admin: true, demandeur: false };
const DEMANDEUR = { admin: false, demandeur: true };
const AUTRE = { admin: false, demandeur: false };

describe("actions sur un dossier", () => {
  it("le demandeur envoie son brouillon, puis peut le reprendre ou l'annuler tant qu'il n'est pas pris en charge", () => {
    expect(actionsPossibles("brouillon", DEMANDEUR)).toEqual(["soumettre", "annuler"]);
    expect(actionsPossibles("demande", DEMANDEUR)).toEqual(["remettre_brouillon", "annuler"]);
    expect(actionsPossibles("en_traitement", DEMANDEUR)).toEqual([]);
  });

  it("l'admin prend en charge, annule et archive", () => {
    expect(actionsPossibles("demande", ADMIN)).toEqual(["remettre_brouillon", "prendre_en_charge", "annuler"]);
    expect(actionsPossibles("en_traitement", ADMIN)).toEqual(["marquer_envoyee", "annuler"]);
    expect(actionsPossibles("liberation_envoyee", ADMIN)).toEqual(["passer_aux_frais", "annuler"]);
    expect(actionsPossibles("jour_j", ADMIN)).toEqual(["passer_aux_frais", "annuler"]);
    expect(actionsPossibles("frais", ADMIN)).toEqual(["cloturer", "annuler"]);
    expect(actionsPossibles("annule", ADMIN)).toEqual(["archiver"]);
    expect(actionsPossibles("cloture", ADMIN)).toEqual(["archiver"]);
    expect(actionsPossibles("archive", ADMIN)).toEqual(["desarchiver"]);
    expect(actionsPossibles("archive", DEMANDEUR)).toEqual([]);
  });

  it("personne d'autre n'agit", () => {
    expect(actionsPossibles("demande", AUTRE)).toEqual([]);
    expect(actionPermise("prendre_en_charge", "demande", DEMANDEUR)).toBe(false);
    expect(actionPermise("archiver", "annule", DEMANDEUR)).toBe(false);
  });
});

describe("modification et suppression", () => {
  it("le demandeur modifie jusqu'à la prise en charge", () => {
    expect(peutModifier("brouillon", DEMANDEUR)).toBe(true);
    expect(peutModifier("demande", DEMANDEUR)).toBe(true);
    expect(peutModifier("en_traitement", DEMANDEUR)).toBe(false);
    expect(peutModifier("demande", AUTRE)).toBe(false);
  });

  it("l'admin modifie jusqu'à la clôture", () => {
    expect(peutModifier("frais", ADMIN)).toBe(true);
    expect(peutModifier("cloture", ADMIN)).toBe(false);
    expect(peutModifier("annule", ADMIN)).toBe(false);
    expect(peutModifier("archive", ADMIN)).toBe(false);
  });

  it("seul un brouillon se supprime", () => {
    expect(peutSupprimer("brouillon", DEMANDEUR)).toBe(true);
    expect(peutSupprimer("demande", DEMANDEUR)).toBe(false);
    expect(peutSupprimer("brouillon", AUTRE)).toBe(false);
  });

  it("donne un ton à chaque statut", () => {
    expect(tonStatut("demande")).toBe("attente");
    expect(tonStatut("annule")).toBe("erreur");
    expect(tonStatut("archive")).toBe("ok");
    expect(tonStatut("en_traitement")).toBe("info");
    expect(tonStatut("brouillon")).toBeUndefined();
  });
});

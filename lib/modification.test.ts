import { describe, expect, it } from "vitest";
import { COMMISSIONS_PARITAIRES, libelleCommission } from "./commissions-paritaires";
import {
  FORM_VIDE,
  depuisLigne,
  formaterNiss,
  lireHeures,
  nissValide,
  nomFichierModification,
  recapitulatif,
  statutTransfert,
  telephoneValide,
  validerEtape,
  versLigne,
  type FormModification,
} from "./modification";

/** NISS valide construit à partir de 9 chiffres (né avant 2000). */
function niss(base: string): string {
  const cle = 97 - (Number(base) % 97);
  return base + String(cle).padStart(2, "0");
}

const identite: FormModification = {
  ...FORM_VIDE,
  nom: "Dupont",
  prenom: "Marie",
  niss: formaterNiss(niss("850412123")),
  email: "Marie@Exemple.be",
};

const complet: FormModification = {
  ...identite,
  changements: ["adresse", "contact", "employeur", "regime", "situation"],
  adresseRue: "Rue de Bastogne",
  adresseNumero: "12",
  adresseBoite: "",
  adresseCodePostal: "6800",
  adresseLocalite: "Libramont",
  adresseDepuis: "01/10/2026",
  nouvelEmail: "",
  nouveauTelephone: "0470 12 34 56",
  contactDepuis: "01/10/2026",
  employeurNom: "Carmeuse",
  employeurOnssTva: "",
  employeurLocalite: "Seilles",
  employeurCp: "102",
  employeurDepuis: "15/10/2026",
  regime: "temps_partiel",
  regimeHeures: "19,5",
  regimeDepuis: "15/10/2026",
  situation: "profession",
  profession: "Conducteur d'engins",
  professionCp: "124",
  situationDepuis: "15/10/2026",
  dateSig: "07/10/2026",
  lieu: "Namur",
  signature: "data:image/png;base64,AAAA",
};

describe("liste des commissions paritaires", () => {
  it("garde la liste du formulaire d'affiliation (30 CP + « Je ne sais pas » + « Autre »)", () => {
    expect(COMMISSIONS_PARITAIRES).toHaveLength(32);
    expect(COMMISSIONS_PARITAIRES[0]).toEqual({ id: "100", label: "100 - Auxiliaire pour ouvriers" });
    expect(COMMISSIONS_PARITAIRES.at(-2)).toEqual({ id: "999", label: "Je ne sais pas" });
    expect(COMMISSIONS_PARITAIRES.at(-1)).toEqual({ id: "000", label: "000 - Autre" });
    expect(libelleCommission("124")).toBe("124 - Construction");
  });
});

describe("transfert vers une autre centrale", () => {
  it("aucun transfert pour une CP de nos secteurs", () => {
    expect(statutTransfert(complet)).toBe("non");
  });

  it("« Autre » → transfert à organiser", () => {
    expect(statutTransfert({ ...complet, professionCp: "000" })).toBe("a_organiser");
    expect(statutTransfert({ ...complet, employeurCp: "000" })).toBe("a_organiser");
  });

  it("« Je ne sais pas » → secteur à vérifier ; « Autre » l'emporte", () => {
    expect(statutTransfert({ ...complet, employeurCp: "999" })).toBe("a_verifier");
    expect(statutTransfert({ ...complet, employeurCp: "999", professionCp: "000" })).toBe("a_organiser");
  });

  it("ignore les blocs non cochés, le chômage et la mutuelle", () => {
    expect(statutTransfert({ ...complet, changements: ["adresse"], employeurCp: "000", professionCp: "000" })).toBe("non");
    expect(statutTransfert({ ...complet, changements: ["situation"], situation: "chomage", professionCp: "000" })).toBe("non");
    expect(statutTransfert({ ...complet, changements: ["situation"], situation: "mutuelle", professionCp: "999" })).toBe("non");
  });
});

describe("validation", () => {
  it("accepte un formulaire complet à chaque étape", () => {
    for (const etape of [0, 1, 2, 3]) expect(validerEtape(etape, complet)).toEqual({});
  });

  it("identité : tout est obligatoire, NISS contrôlé", () => {
    const e = validerEtape(0, { ...FORM_VIDE, niss: "85.04.12-123.00" });
    expect(Object.keys(e).sort()).toEqual(["email", "niss", "nom", "prenom"]);
    expect(nissValide(niss("850412123"))).toBe(true);
    expect(nissValide("85041212300")).toBe(false);
    // Né après 2000.
    const base = "050412123";
    const cle = String(97 - ((2000000000 + Number(base)) % 97)).padStart(2, "0");
    expect(nissValide(base + cle)).toBe(true);
  });

  it("au moins un changement", () => {
    expect(validerEtape(1, identite).changements).toBeTruthy();
  });

  it("ne contrôle que les blocs cochés", () => {
    expect(validerEtape(2, { ...identite, changements: ["regime"], regime: "temps_plein", regimeDepuis: "01/11/2026" })).toEqual({});
  });

  it("employeur : nom obligatoire, ONSS / TVA, localité et CP facultatifs", () => {
    const f = { ...identite, changements: ["employeur" as const], employeurDepuis: "01/11/2026" };
    expect(validerEtape(2, f)).toEqual({ employeurNom: "Champ obligatoire." });
    expect(validerEtape(2, { ...f, employeurNom: "Carmeuse" })).toEqual({});
  });

  it("temps partiel : moyenne d'heures obligatoire entre 1 et 38", () => {
    const f = { ...identite, changements: ["regime" as const], regime: "temps_partiel" as const, regimeDepuis: "01/11/2026" };
    expect(validerEtape(2, f).regimeHeures).toBeTruthy();
    expect(validerEtape(2, { ...f, regimeHeures: "40" }).regimeHeures).toBeTruthy();
    expect(validerEtape(2, { ...f, regimeHeures: "19" })).toEqual({});
    expect(lireHeures("19,5")).toBe(19.5);
    expect(lireHeures("19.5")).toBe(19.5);
    expect(lireHeures("0")).toBeNull();
    expect(lireHeures("19,25")).toBeNull();
  });

  it("contact : au moins un des deux, chacun contrôlé", () => {
    const f = { ...identite, changements: ["contact" as const], contactDepuis: "01/11/2026" };
    expect(validerEtape(2, f).nouvelEmail).toBeTruthy();
    expect(validerEtape(2, { ...f, nouvelEmail: "pas-un-mail" }).nouvelEmail).toBeTruthy();
    expect(validerEtape(2, { ...f, nouveauTelephone: "12" }).nouveauTelephone).toBeTruthy();
    expect(validerEtape(2, { ...f, nouvelEmail: "m@exemple.be" })).toEqual({});
    expect(telephoneValide("+32 470 12 34 56")).toBe(true);
  });

  it("situation : profession obligatoire seulement pour une nouvelle profession", () => {
    const f = { ...identite, changements: ["situation" as const], situationDepuis: "01/11/2026" };
    expect(validerEtape(2, f).situation).toBeTruthy();
    expect(validerEtape(2, { ...f, situation: "profession" }).profession).toBeTruthy();
    expect(validerEtape(2, { ...f, situation: "chomage" })).toEqual({});
  });

  it("dates « à partir du » au format jj/mm/aaaa", () => {
    const f = { ...identite, changements: ["regime" as const], regime: "temps_plein" as const };
    expect(validerEtape(2, f).regimeDepuis).toBeTruthy();
    expect(validerEtape(2, { ...f, regimeDepuis: "31/02/2026" }).regimeDepuis).toBeTruthy();
  });

  it("signature : date, lieu et signature", () => {
    expect(Object.keys(validerEtape(3, identite)).sort()).toEqual(["dateSig", "lieu", "signature"]);
  });
});

describe("formulaire ↔ ligne en base", () => {
  it("ne remplit que les blocs cochés", () => {
    const l = versLigne({ ...complet, changements: ["regime"] });
    expect(l.changements).toEqual(["regime"]);
    expect(l.adresse_rue).toBeNull();
    expect(l.employeur_cp).toBeNull();
    expect(l.regime_heures).toBe(19.5);
    expect(l.regime_depuis).toBe("2026-10-15");
    expect(l.transfert).toBe("non");
  });

  it("normalise identité et dates", () => {
    const l = versLigne(complet);
    expect(l.niss).toBe(niss("850412123"));
    expect(l.email).toBe("marie@exemple.be");
    expect(l.date_signature).toBe("2026-10-07");
    expect(l.nouvel_email).toBeNull();
  });

  it("aller-retour sans perte", () => {
    const retour = depuisLigne({ ...versLigne(complet), regime_heures: 19.5 });
    expect(retour.changements).toEqual(complet.changements);
    expect(retour.regimeHeures).toBe("19,5");
    expect(retour.employeurDepuis).toBe("15/10/2026");
    expect(retour.professionCp).toBe("124");
    expect(retour.email).toBe("marie@exemple.be");
  });
});

describe("récapitulatif", () => {
  it("liste les blocs cochés, sans les lignes vides", () => {
    const r = recapitulatif(complet);
    expect(r.map((b) => b.changement)).toEqual(["adresse", "contact", "employeur", "regime", "situation"]);
    expect(r[1].lignes.map(([l]) => l)).toEqual(["Nouveau téléphone", "À partir du"]);
    expect(r[2].lignes).toContainEqual(["Commission paritaire", "102 - Carrières"]);
    expect(r[3].lignes).toContainEqual(["Heures / semaine (moyenne)", "19,5 h"]);
  });

  it("nom du fichier sans accents", () => {
    expect(nomFichierModification("Lefèvre", "Zoé")).toBe("changement-situation-lefevre-zoe.pdf");
  });
});

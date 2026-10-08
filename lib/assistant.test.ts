import { describe, expect, it } from "vitest";
import {
  codePostalSeul,
  formaterRegistre,
  masquerDonneesSensibles,
  nettoyerTransmission,
  regionDuCodePostal,
  registreNationalValide,
  validerTransmission,
} from "./assistant";
import { antennesLesPlusProches, choisirAntennes } from "./assistant-antennes";

describe("regionDuCodePostal", () => {
  it("5000-5999 → Namur, 6600-6999 → Luxembourg, le reste hors zone", () => {
    expect(regionDuCodePostal("5590")).toBe("Namur");
    expect(regionDuCodePostal("6600")).toBe("Luxembourg");
    expect(regionDuCodePostal("6999")).toBe("Luxembourg");
    expect(regionDuCodePostal("6000")).toBeNull(); // Charleroi
    expect(regionDuCodePostal("6599")).toBeNull();
    expect(regionDuCodePostal("1000")).toBeNull();
    expect(regionDuCodePostal("559")).toBeNull();
  });
});

describe("codePostalSeul", () => {
  it("reconnaît un message qui n'est qu'un code postal", () => {
    expect(codePostalSeul("5590")).toBe("5590");
    expect(codePostalSeul(" CP 6800. ")).toBe("6800");
    expect(codePostalSeul("code postal : 5000")).toBe("5000");
    expect(codePostalSeul("J'habite à 5590")).toBeNull();
    expect(codePostalSeul("0590")).toBeNull();
  });
});

describe("registreNationalValide", () => {
  it("accepte une clé modulo 97 correcte, avant et après 2000", () => {
    expect(registreNationalValide("85.07.30-033.28")).toBe(true); // né en 1985
    expect(registreNationalValide("05031512367")).toBe(true); // né en 2005 : clé calculée sur 2 + 9 chiffres
  });
  it("refuse une mauvaise clé ou une longueur fausse", () => {
    expect(registreNationalValide("85073003327")).toBe(false);
    expect(registreNationalValide("8507300332")).toBe(false);
  });
  it("met en forme 85.07.30-033.28", () => {
    expect(formaterRegistre("85073003328")).toBe("85.07.30-033.28");
  });
});

describe("masquerDonneesSensibles", () => {
  it("masque registre national, IBAN, e-mail et téléphone, mais garde le code postal", () => {
    const t = masquerDonneesSensibles(
      "J'habite à 5590, mon numéro est 85.07.30-033.28, compte BE68 5390 0754 7034, jean@exemple.be, tél 0478 12 34 56"
    );
    expect(t).toContain("5590");
    expect(t).not.toContain("033.28");
    expect(t).not.toContain("7034");
    expect(t).not.toContain("jean@exemple.be");
    expect(t).not.toContain("12 34 56");
    expect(t).toContain("[numéro masqué]");
    expect(t).toContain("[IBAN masqué]");
  });
  it("masque un registre national tapé sans séparateur", () => {
    expect(masquerDonneesSensibles("85073003328")).not.toContain("85073003328");
  });
});

describe("validerTransmission", () => {
  const ok = { nom: "Dupont", prenom: "Marie", email: "marie@exemple.be", registre_national: "", resume: "Mon C4 n'est pas arrivé.", consentement: true };
  it("accepte une demande complète, registre national facultatif", () => {
    expect(validerTransmission(nettoyerTransmission(ok))).toEqual({});
  });
  it("exige nom, prénom, e-mail valide, résumé et consentement", () => {
    const e = validerTransmission(nettoyerTransmission({ ...ok, nom: "", prenom: " ", email: "x@", resume: "court", consentement: false }));
    expect(Object.keys(e).sort()).toEqual(["consentement", "email", "nom", "prenom", "resume"]);
  });
  it("refuse un registre national invalide", () => {
    expect(validerTransmission(nettoyerTransmission({ ...ok, registre_national: "12345678901" })).registre_national).toBeTruthy();
  });
});

describe("antennes chômage", () => {
  it("donne les deux antennes les plus proches, la plus proche d'abord", () => {
    expect(antennesLesPlusProches("6900")).toEqual(["Marche", "Libramont"]);
    expect(antennesLesPlusProches("5590")).toEqual(["Dinant", "Beauraing"]);
    expect(antennesLesPlusProches("5060")).toEqual(["Tamines", "Namur (bureau central)"]);
    const lux = [{ antenne: "Arlon" }, { antenne: "Bastogne" }, { antenne: "Libramont" }, { antenne: "Marche" }];
    expect(choisirAntennes(lux, "6900").map((a) => a.antenne)).toEqual(["Marche", "Libramont"]);
  });
  it("chaque antenne citée existe dans la province de sa tranche", async () => {
    const { TRANCHES_ANTENNES } = await import("./assistant-antennes");
    const namur = ["Namur (bureau central)", "Andenne", "Tamines", "Beauraing", "Dinant", "Mariembourg"];
    const lux = ["Arlon", "Bastogne", "Libramont", "Marche"];
    for (const t of TRANCHES_ANTENNES) {
      const liste = t.de < 6000 ? namur : lux;
      expect(t.antennes.every((a) => liste.includes(a))).toBe(true);
      expect(t.antennes[0]).not.toBe(t.antennes[1]);
    }
  });
});

describe("ce qui part réellement vers l'IA (messageClassement)", () => {
  it("masque registre national, IBAN, e-mail et téléphones belges ; garde code postal, CP et année", async () => {
    const { messageClassement } = await import("./assistant-ia");
    const { ETAT_INITIAL } = await import("./assistant");
    const messages = [
      "Je m'appelle Marie Dupont, 5590 Ciney. Mon registre national : 85.07.30-033.28 (ou 85073003328, ou 85 07 30 033 28).",
      "Compte BE68 5390 0754 7034 ou BE68539007547034. Mail : marie.dupont@exemple.be (compte français : FR76 3000 6000 0112 3456 7890 189)",
      "Tél : 0478 12 34 56, 0478/12.34.56, +32 478 12 34 56, 081 64 99 61, 081/64.99.61, +32 (0) 81 64 99 63, 0032 478 12 34 56. Je travaille en CP 124 - 200 depuis 2019.",
    ];
    const envoye = messageClassement(
      messages.map((texte) => ({ role: "personne" as const, texte })),
      { ...ETAT_INITIAL, codePostal: "5590" }
    );
    if (process.env.AFFICHER_MASQUAGE) console.log(envoye);
    for (const secret of ["033.28", "85073003328", "033 28", "7034", "539007547034", "marie.dupont@exemple.be", "3456 7890", "12 34 56", "12.34.56", "99 61", "99.61", "99 63"]) {
      expect(envoye).not.toContain(secret);
    }
    expect(envoye).toContain("Compte [IBAN masqué] ou [IBAN masqué].");
    expect(envoye).toContain("5590");
    expect(envoye).toContain("CP 124 - 200");
    expect(envoye).toContain("2019");
  });
});

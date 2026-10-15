import { describe, expect, it } from "vitest";
import {
  MODELES, accords, bureauExpediteur, codeModeleCourrier, dateLongue, donneesCourrier, emailCourrier, fusionner, nomFichierCourrier,
  periode, phraseDates, phraseQuand, textesModeles, variables, variablesInconnues, type ContexteCourrier,
} from "./courriers";

const J = (jour: string, duree: "journee" | "matin" | "apres_midi" = "journee", heure_debut: string | null = null) => ({ jour, duree, heure_debut });

describe("dates en toutes lettres", () => {
  it("écrit le jour de la semaine et le mois", () => {
    expect(dateLongue("2026-10-12")).toBe("lundi 12 octobre 2026");
    expect(dateLongue("2026-11-01")).toBe("dimanche 1er novembre 2026");
    expect(dateLongue("n'importe quoi")).toBe("");
  });

  it("compose une ou plusieurs dates", () => {
    expect(phraseDates([J("2026-10-12")])).toBe("le lundi 12 octobre 2026 toute la journée");
    expect(phraseDates([J("2026-10-13"), J("2026-10-12")])).toBe("les lundi 12 octobre 2026 et mardi 13 octobre 2026, toute la journée");
    expect(phraseDates([J("2026-10-12", "matin"), J("2026-10-13", "apres_midi")]))
      .toBe("les lundi 12 octobre 2026 (en matinée) et mardi 13 octobre 2026 (l'après-midi)");
    expect(phraseDates([])).toBe("");
  });

  it("ajoute l'heure pour la convocation", () => {
    expect(phraseQuand([J("2026-10-12", "journee", "08:00:00")])).toBe("le lundi 12 octobre 2026 à 08h00");
    expect(phraseQuand([J("2026-10-12", "journee", "08:00"), J("2026-10-13")])).toBe("les lundi 12 octobre 2026 à 08h00 et mardi 13 octobre 2026");
  });

  it("nomme la période", () => {
    expect(periode([J("2026-10-12")])).toBe("la journée");
    expect(periode([J("2026-10-12", "matin")])).toBe("la demi-journée");
    expect(periode([J("2026-10-12"), J("2026-10-13")])).toBe("ces journées");
  });
});

describe("accords", () => {
  it("accorde selon le genre, ou écrit les deux formes", () => {
    expect(accords("M").notre_delegue).toBe("notre délégué");
    expect(accords("F").notre_delegue).toBe("notre déléguée");
    expect(accords(null).notre_delegue).toBe("notre délégué(e)");
    expect(accords("F").cher).toBe("Chère");
    expect(accords(null).present).toBe("présent(e)");
  });
});

describe("fusion", () => {
  it("remplace les variables, retire les paragraphes vides et ne laisse rien d'inventé", () => {
    expect(fusionner("Bonjour {{nom}} {{inconnue}},\n\n{{vide}}\n\nFin.", { nom: "Jean", vide: "" })).toBe("Bonjour Jean,\n\nFin.");
  });

  it("repère les variables inconnues", () => {
    expect(variablesInconnues("{{participant}} {{date_naissance}} {{ objet }}")).toEqual(["date_naissance"]);
    for (const m of MODELES) expect(variablesInconnues(m.texte + (m.objet ?? ""))).toEqual([]);
  });

  it("préfère le texte modifié dans Paramètres", () => {
    const t = textesModeles([{ code: "ville", objet: null, texte: "Libramont" }]);
    expect(t.ville).toEqual({ objet: "", texte: "Libramont", modifie: true });
    expect(t.convocation.modifie).toBe(false);
  });
});

const ctx = (charge: "employeur" | "cg_federale" | null, genre: string | null = "F"): ContexteCourrier => ({
  dossier: {
    objet: "Commission Professionnelle Construction", lieu_nom: "Centrale Générale Namur", lieu_complement: null, lieu_rue: "Rue Dewez",
    lieu_numero: "40-42", lieu_boite: null, lieu_code_postal: "5000", lieu_localite: "Namur", salle: "grande salle",
    ordre_du_jour: "Accueil\n- Accord sectoriel", perte_salaire: charge !== null, perte_salaire_charge: charge,
  },
  dates: [J("2026-10-12", "journee", "08:00:00")],
  participant: { prenom: "Marie", nom: "Dupont", genre },
  employeur: "CARMEUSE",
  signataire: { nom: "Magali Houba", fonction: "Secrétaire permanente" },
  correspondant: { nom: "David Binamé", telephone: "081/649964", email: "david@accg.be" },
  textes: textesModeles([]),
});

describe("courriers", () => {
  it("écrit la lettre avec la phrase de l'employeur", () => {
    const d = donneesCourrier("lettre_employeur", "mission_syndicale", ctx("employeur"), ["CARMEUSE"], "2026-10-14");
    expect(d.corps).toContain("libérer notre déléguée Marie Dupont le lundi 12 octobre 2026 toute la journée dans le cadre d'une mission syndicale extérieure (Commission Professionnelle Construction).");
    expect(d.corps).toContain("Il est bien entendu que le salaire pour la journée est à votre charge.");
    expect(d.lieuDate).toBe("Namur, le mercredi 14 octobre 2026");
    expect(d.correspondant).toEqual({ ville: "Namur", lignes: ["David Binamé", "081/649964", "david@accg.be"] });
    expect(d.signature).toEqual({ nom: "Magali Houba", fonction: "Secrétaire permanente" });
  });

  it("parle de l'attestation quand la CG fédérale paie, et rien sans perte de salaire", () => {
    expect(donneesCourrier("lettre_employeur", "credit_heures", ctx("cg_federale"), [], "2026-10-14").corps).toContain("attestation de perte de salaire jointe");
    const sans = donneesCourrier("lettre_employeur", "credit_heures", ctx(null), [], "2026-10-14").corps;
    expect(sans).not.toContain("salaire");
    expect(sans).toContain("crédit d'heures syndicales");
  });

  it("utilise le texte retouché s'il existe", () => {
    expect(donneesCourrier("lettre_employeur", "mission_syndicale", ctx("employeur"), [], "2026-10-14", "Texte libre").corps).toBe("Texte libre");
  });

  it("écrit la convocation avec l'heure, le lieu et l'ordre du jour", () => {
    const d = donneesCourrier("convocation", "formation_syndicale", ctx("employeur", null), [], "2026-10-14");
    expect(d.corps).toContain("Cher(e) Camarade,");
    expect(d.corps).toContain("aura lieu le lundi 12 octobre 2026 à 08h00, à l'adresse suivante : Centrale Générale Namur (grande salle), Rue Dewez 40-42, 5000 Namur.");
    expect(d.corps).toContain("Ordre du jour :\n- Accueil\n- Accord sectoriel");
    expect(d.corps).toContain("David Binamé, 081/649964, david@accg.be");
    expect(d.correspondant).toBeNull();
  });

  it("prépare les e-mails", () => {
    const e = emailCourrier("lettre_employeur", ctx("cg_federale"));
    expect(e.objet).toBe("Demande de libération : Marie Dupont");
    expect(e.texte).toContain("toute la journée, ainsi que l'attestation de perte de salaire à compléter.");
    expect(emailCourrier("convocation", ctx("employeur")).objet).toBe("Convocation : Commission Professionnelle Construction");
  });

  it("donne les variables du participant", () => {
    expect(variables(ctx("employeur")).participant).toBe("Marie Dupont");
    expect(codeModeleCourrier("lettre_employeur", "conge_education")).toBe("lettre_conge_education");
    expect(codeModeleCourrier("convocation", "conge_education")).toBe("convocation");
  });
});

describe("outils", () => {
  it("choisit le bureau expéditeur", () => {
    expect(bureauExpediteur("Libramont").adresse[0]).toBe("Rue Fonteny Maroy 13");
    expect(bureauExpediteur("Ailleurs").ville).toBe("Namur");
  });

  it("nomme le fichier", () => {
    expect(nomFichierCourrier("lettre_employeur", "Marie Dupont")).toBe("lettre-employeur-marie-dupont.pdf");
  });
});

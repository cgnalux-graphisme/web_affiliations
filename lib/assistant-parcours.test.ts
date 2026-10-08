import { describe, expect, it } from "vitest";
import { ETAT_INITIAL, MESSAGE_NON_AFFILIE, REFUS_FOND, type Bloc, type EtatAssistant } from "./assistant";
import {
  appliquerAction,
  construireReponse,
  etapeCourante,
  fusionnerExtraction,
  horairesCompacts,
  resoudreDestinataire,
  bureauDeLaRegion,
  type DonneesAssistant,
  type Extraction,
} from "./assistant-parcours";

// Extrait des tables site_chatbot_* (valeurs relevées le 08/10/2026).
const D: DonneesAssistant = {
  secteurs: [
    { mot_cle: "Construction", centrales: "Centrale Générale", remarque: null },
    { mot_cle: "Nettoyage", centrales: "Centrale Générale", remarque: null },
    { mot_cle: "Titres-services", centrales: "Centrale Générale", remarque: "Arbitrage : CG plutôt qu'Horval" },
    { mot_cle: "Horeca", centrales: "HORVAL", remarque: null },
    { mot_cle: "Pouvoirs locaux (communes, CPAS…)", centrales: "CGSP", remarque: null },
    { mot_cle: "Industrie du bois", centrales: "Centrale Générale", remarque: null },
    { mot_cle: "Grands magasins (employés)", centrales: "SETCa", remarque: "Arbitrage : employés au SETCa, ouvriers chez Horval" },
    { mot_cle: "Grands magasins (ouvriers)", centrales: "HORVAL", remarque: "Arbitrage : employés au SETCa" },
    { mot_cle: "Agriculture", centrales: "HORVAL", remarque: null },
    { mot_cle: "Horticulture", centrales: "HORVAL", remarque: null },
    { mot_cle: "Électricité", centrales: "MWB (Métallos)", remarque: "Arbitrage : mot-clé « électricité » → Métallos" },
    { mot_cle: "Aéroports", centrales: "UBT ; CGSP", remarque: "Arbitrage : proposer les deux (assistance au sol → UBT ; aviation publique → CGSP)" },
  ],
  repartition: [
    { region: "Namur", cp_code: "CP 124 - 200", cp_nom: "Construction", contact_nom: "Céline STALPORT", contact_email: "celine.stalport@accg.be", contact_tel: "+32 (0) 81 64 99 63" },
    { region: "Namur", cp_code: "CP 121 - 200", cp_nom: "Nettoyage", contact_nom: "Christine LAMBLOT", contact_email: "christine.lamblot@accg.be", contact_tel: "+32 (0) 81 64 99 71" },
    { region: "Namur", cp_code: "CP 322,01", cp_nom: "Titres-services", contact_nom: "Christine LAMBLOT", contact_email: "christine.lamblot@accg.be", contact_tel: "+32 (0) 81 64 99 71" },
    { region: "Namur", cp_code: "CP 100", cp_nom: "Suivi du secteur", contact_nom: "Céline STALPORT", contact_email: "celine.stalport@accg.be", contact_tel: "+32 (0) 81 64 99 63" },
    { region: "Luxembourg", cp_code: "CP 132", cp_nom: "Travaux agricoles et horticoles (résiduel)", contact_nom: "Marc LAPRAILLE", contact_email: "marc.lapraille@accg.be", contact_tel: "+32 (0) 61 530 164" },
    { region: "Luxembourg", cp_code: "CP 145", cp_nom: "Entreprises horticoles (résiduel)", contact_nom: "Marc LAPRAILLE", contact_email: "marc.lapraille@accg.be", contact_tel: "+32 (0) 61 530 164" },
    { region: "Luxembourg", cp_code: "CP 144", cp_nom: "Agriculture (résiduel)", contact_nom: "Marc LAPRAILLE", contact_email: "marc.lapraille@accg.be", contact_tel: "+32 (0) 61 530 164" },
    { region: "Luxembourg", cp_code: "CP 121 - 200", cp_nom: "Nettoyage", contact_nom: "Claude DEWEGHE", contact_email: "claude.deweghe@accg.be", contact_tel: "+32 (0) 61 530 165" },
    { region: "Luxembourg", cp_code: "CP 125,02 - 200", cp_nom: "Bois - Scieries", contact_nom: "Marc LAPRAILLE", contact_email: "marc.lapraille@accg.be", contact_tel: "+32 (0) 61 530 164" },
  ],
  centrales: [
    { province: "Namur", centrale: "SETCa", nom_affiche: "SETCa", bureau: "Namur", adresse: "Rue Dewez 40-42", code_postal: "5000", commune: "Namur", telephone: "081/64.99.80", email: "admin.namur@setca-fgtb.be", horaires: "Accueil : lun, mar, jeu, ven 8h-12h", site_web: "https://www.setca-namur.org/" },
    { province: "Luxembourg", centrale: "SETCa", nom_affiche: "SETCa", bureau: "Arlon", adresse: "Rue des Martyrs 80", code_postal: "6700", commune: "Arlon", telephone: "063 23 00 30", email: "admin.arlon@setca-fgtb.be", horaires: null, site_web: null },
    { province: "Luxembourg", centrale: "HORVAL", nom_affiche: "HORVAL", bureau: "Marche (permanence)", adresse: "Rue du Parc Industriel 17", code_postal: "6900", commune: "Marche-en-Famenne", telephone: "084 31 40 24", email: "infonamlux@horval.be", horaires: null, site_web: null },
    { province: "Namur", centrale: "HORVAL", nom_affiche: "Alimentation Hôtellerie Service (Horval)", bureau: "Namur", adresse: "Rue Dewez 15/01", code_postal: "5000", commune: "Namur", telephone: "081/22.33.19", email: "infonamlux@horval.be", horaires: null, site_web: null },
    { province: "Namur", centrale: "UBT", nom_affiche: "UBT", bureau: "Beez", adresse: "Rue de Namur 47", code_postal: "5000", commune: "Beez", telephone: "071/23 13 06", email: null, horaires: "Uniquement sur rendez-vous", site_web: null },
    { province: "Namur", centrale: "CGSP", nom_affiche: "CGSP", bureau: "Namur", adresse: null, code_postal: "5000", commune: "Namur", telephone: "081/72.91.11", email: null, horaires: "Non publiés", site_web: null },
  ],
  antennes: [
    { province: "Luxembourg", antenne: "Arlon", adresse: "Rue des Martyrs 80", code_postal: "6700", commune: "Arlon", telephone: "063 24 22 51", horaires: null },
    { province: "Luxembourg", antenne: "Bastogne", adresse: "Rue des Brasseurs 8", code_postal: "6600", commune: "Bastogne", telephone: "061 21 19 87", horaires: null },
    { province: "Luxembourg", antenne: "Libramont", adresse: "Rue Fonteny Maroy 13", code_postal: "6800", commune: "Libramont", telephone: "061 53 01 70", horaires: null },
    { province: "Luxembourg", antenne: "Marche", adresse: "Rue du Parc Industriel 17", code_postal: "6900", commune: "Marche-en-Famenne", telephone: "084 24 49 79", horaires: null },
    { province: "Namur", antenne: "Namur (bureau central)", adresse: "Rue Dewez 40", code_postal: "5000", commune: "Namur", telephone: "081/64.99.00", horaires: null },
  ],
};

const vide: Extraction = { codePostal: null, categorie: null, demarche: null, secteur: null, statut: null, cpCode: null, employeurNettoyage: null, affilie: null, demandeFond: false, resume: "" };
const avec = (x: Partial<Extraction>): Extraction => ({ ...vide, ...x });
const etat = (e: Partial<EtatAssistant>): EtatAssistant => ({ ...ETAT_INITIAL, ...e });
const textes = (blocs: Bloc[]) => blocs.map((b) => JSON.stringify(b)).join("\n");

describe("parcours de l'Assistant CG", () => {
  it("demande toujours le code postal en premier", () => {
    const r = construireReponse(etat({ categorie: "juridique" }), D);
    expect(textes(r.blocs)).toContain("code postal");
  });

  it("test 1 : construction à Ciney (5590), C4 → affilié ? → Céline STALPORT", () => {
    let e = fusionnerExtraction(ETAT_INITIAL, avec({ codePostal: "5590", categorie: "juridique", secteur: "Construction", statut: "ouvrier", cpCode: "CP 124 - 200", resume: "C4 non reçu." }), D).etat;
    expect(etapeCourante(e, D)).toBe("affilie");
    e = appliquerAction(e, { type: "affilie", valeur: true }, D).etat;
    const r = construireReponse(e, D);
    const contact = r.blocs.find((b) => b.type === "contact");
    expect(contact && contact.type === "contact" && contact.contact.service).toContain("Céline STALPORT");
    expect(textes(r.blocs)).not.toContain("celine.stalport@accg.be"); // jamais l'adresse d'une personne à l'écran
    expect(resoudreDestinataire(e, D)?.destinataireEmail).toBe("celine.stalport@accg.be");
  });

  it("test 2 : nettoyage à Bastogne (6600), salaire non payé → qui vous paie ? → entreprise de nettoyage → Claude DEWEGHE", () => {
    let e = etat({ codePostal: "6600", categorie: "juridique", secteur: "Nettoyage", affilie: true });
    expect(etapeCourante(e, D)).toBe("employeur_nettoyage");
    e = appliquerAction(e, { type: "employeur", valeur: "nettoyage" }, D).etat;
    const r = construireReponse(e, D);
    expect(r.etat.cpCode).toBe("CP 121 - 200");
    expect(resoudreDestinataire(r.etat, D)?.service).toContain("Claude DEWEGHE");
  });

  it("nettoyage : même la commission 121 choisie dans la liste demande qui est l'employeur", () => {
    expect(etapeCourante(etat({ codePostal: "5000", categorie: "juridique", cpCode: "CP 121 - 200" }), D)).toBe("employeur_nettoyage");
  });

  it("nettoyage en titres-services → CP 322,01 de la Centrale Générale", () => {
    const e = appliquerAction(etat({ codePostal: "5000", categorie: "juridique", secteur: "Nettoyage", affilie: true }), { type: "employeur", valeur: "titres_services" }, D).etat;
    const r = construireReponse(e, D);
    expect(r.etat.cpCode).toBe("CP 322,01");
    expect(resoudreDestinataire(r.etat, D)?.service).toContain("Christine LAMBLOT");
  });

  it("nettoyage engagé(e) directement par un hôtel → fiche Horval, sans transmission", () => {
    let e = appliquerAction(etat({ codePostal: "5000", categorie: "juridique", secteur: "Nettoyage" }), { type: "employeur", valeur: "autre" }, D).etat;
    expect(etapeCourante(e, D)).toBe("lieu_nettoyage");
    e = appliquerAction(e, { type: "secteur", valeur: "Horeca" }, D).etat;
    const r = construireReponse(e, D);
    expect(textes(r.blocs)).toContain("infonamlux@horval.be");
    expect(r.blocs.some((b) => b.type === "contact")).toBe(false);
  });

  it("nettoyage dans un hôtel dit d'emblée (lu par l'IA) → Horval, sans question sur l'employeur", () => {
    const e = fusionnerExtraction(etat({ codePostal: "5000" }), avec({ categorie: "juridique", secteur: "Horeca", employeurNettoyage: "autre" }), D).etat;
    expect(etapeCourante(e, D)).toBe("autre_centrale");
  });

  it("nettoyage chez un autre employeur (clinique privée…) → accueil cg.nalux, sans question « affilié »", () => {
    let e = appliquerAction(etat({ codePostal: "5000", categorie: "juridique", secteur: "Nettoyage" }), { type: "employeur", valeur: "autre" }, D).etat;
    e = appliquerAction(e, { type: "lieu_autre" }, D).etat;
    expect(etapeCourante(e, D)).toBe("contact");
    const r = construireReponse(e, D);
    expect(textes(r.blocs)).toContain("ne dépendez probablement pas de la Centrale Générale");
    expect(resoudreDestinataire(r.etat, D)?.destinataireEmail).toBe("cg.nalux@accg.be");
  });

  it("test 3 : scierie à Libramont (6800), frais de déplacement → Marc LAPRAILLE", () => {
    const e = etat({ codePostal: "6800", categorie: "juridique", cpCode: "CP 125,02 - 200", affilie: true });
    expect(resoudreDestinataire(e, D)?.service).toContain("Marc LAPRAILLE");
  });

  it("test 4 : caissière dans un grand magasin à Namur → SETCa Namur, sans transmission", () => {
    const e = etat({ codePostal: "5000", secteur: "Grands magasins (employés)", statut: "employe" });
    const r = construireReponse(e, D);
    expect(etapeCourante(e, D)).toBe("autre_centrale");
    expect(textes(r.blocs)).toContain("SETCa");
    expect(textes(r.blocs)).toContain("admin.namur@setca-fgtb.be");
    expect(r.blocs.some((b) => b.type === "contact")).toBe(false);
    expect(r.etat.termine).toBe(true);
  });

  it("grand magasin sans statut connu : demande ouvrier ou employé", () => {
    expect(etapeCourante(etat({ codePostal: "5000", secteur: "Grands magasins (employés)" }), D)).toBe("statut");
    const e = etat({ codePostal: "5000", secteur: "Grands magasins (employés)", statut: "ouvrier" });
    expect(textes(construireReponse(e, D).blocs)).toContain("HORVAL");
  });

  it("aéroports : propose les deux centrales", () => {
    const r = construireReponse(etat({ codePostal: "5000", secteur: "Aéroports" }), D);
    expect(textes(r.blocs)).toContain("UBT");
    expect(textes(r.blocs)).toContain("CGSP");
  });

  it("agriculture (secteur transféré à l'Horval) : demande d'abord si la personne est déjà affiliée CG", () => {
    const e = etat({ codePostal: "6800", categorie: "juridique", secteur: "Agriculture" });
    expect(etapeCourante(e, D)).toBe("ancien_affilie");
    expect(textes(construireReponse(e, D).blocs)).toContain("HORVAL");
  });

  it("agriculture, nouveau travailleur → fiche Horval, sans transmission", () => {
    const e = appliquerAction(etat({ codePostal: "6800", categorie: "juridique", secteur: "Agriculture" }), { type: "affilie", valeur: false }, D).etat;
    const r = construireReponse(e, D);
    expect(textes(r.blocs)).toContain("infonamlux@horval.be");
    expect(r.blocs.some((b) => b.type === "contact")).toBe(false);
  });

  it("agriculture, ancien affilié CG → reste à la Centrale Générale (CP 144 résiduel, 1re ligne)", () => {
    const e = appliquerAction(etat({ codePostal: "6800", categorie: "juridique", secteur: "Agriculture" }), { type: "affilie", valeur: true }, D).etat;
    const r = construireReponse(e, D);
    expect(r.etat.cpCode).toBe("CP 144");
    expect(resoudreDestinataire(r.etat, D)?.service).toContain("Marc LAPRAILLE");
  });

  it("horticulture (secteur transféré) : ancien affilié CG → CP 145 résiduel, 1re ligne", () => {
    let e = etat({ codePostal: "6800", categorie: "juridique", secteur: "Horticulture" });
    expect(etapeCourante(e, D)).toBe("ancien_affilie");
    e = appliquerAction(e, { type: "affilie", valeur: true }, D).etat;
    const r = construireReponse(e, D);
    expect(r.etat.cpCode).toBe("CP 145");
    expect(resoudreDestinataire(r.etat, D)?.service).toContain("Marc LAPRAILLE");
  });

  it("CP 132 choisie dans la liste : même règle (ancien affilié ? non → Horval)", () => {
    let e = appliquerAction(etat({ codePostal: "6800", categorie: "juridique" }), { type: "cp", valeur: "CP 132" }, D).etat;
    expect(etapeCourante(e, D)).toBe("ancien_affilie");
    expect(textes(construireReponse(e, D).blocs)).toContain("travaux agricoles et horticoles");
    e = appliquerAction(e, { type: "affilie", valeur: false }, D).etat;
    const r = construireReponse(e, D);
    expect(textes(r.blocs)).toContain("infonamlux@horval.be");
    expect(r.blocs.some((b) => b.type === "contact")).toBe(false);
  });

  it("CP 132, ancien affilié → reste à la Centrale Générale", () => {
    const e = appliquerAction(appliquerAction(etat({ codePostal: "6800", categorie: "juridique" }), { type: "cp", valeur: "CP 132" }, D).etat, { type: "affilie", valeur: true }, D).etat;
    expect(resoudreDestinataire(construireReponse(e, D).etat, D)?.service).toContain("Marc LAPRAILLE");
  });

  it("test 5 : prime syndicale (5000) → admin.nalux@accg.be", () => {
    const e = etat({ codePostal: "5000", categorie: "prime" });
    const r = construireReponse(e, D);
    expect(textes(r.blocs)).toContain("admin.nalux@accg.be");
    expect(resoudreDestinataire(e, D)?.destinataireEmail).toBe("admin.nalux@accg.be");
  });

  it("test 6 : chômage temporaire (6900) → les deux antennes les plus proches (Marche, Libramont), My FGTB, pas de transmission", () => {
    const e = etat({ codePostal: "6900", categorie: "chomage" });
    const r = construireReponse(e, D);
    const fiches = r.blocs.find((b) => b.type === "fiches");
    expect(fiches && fiches.type === "fiches" && fiches.fiches.map((f) => f.titre)).toEqual(["Marche", "Libramont"]);
    expect(textes(r.blocs)).toContain("https://www.fgtb.be/my-fgtb");
    expect(r.blocs.some((b) => b.type === "contact")).toBe(false);
    expect(resoudreDestinataire(e, D)).toBeNull();
  });

  it("test 7 : demande d'avis sur le fond → phrase de refus, puis orientation", () => {
    const r = construireReponse(etat({ categorie: "juridique" }), D, { refusFond: true });
    expect(r.blocs[0]).toEqual({ type: "texte", texte: REFUS_FOND });
    expect(textes(r.blocs)).toContain("code postal");
  });

  it("test 9 : code postal 6000 → hors zone, lien vers les sections", () => {
    const r = construireReponse(etat({ codePostal: "6000", categorie: "juridique" }), D);
    expect(textes(r.blocs)).toContain("https://www.accg.be/fr/sections");
    expect(r.etat.termine).toBe(true);
    expect(resoudreDestinataire(r.etat, D)).toBeNull();
  });

  it("test 10 : non affilié → message affiliation et arriérés, puis transmission possible", () => {
    const e = etat({ codePostal: "5590", categorie: "juridique", cpCode: "CP 124 - 200", affilie: false });
    const r = construireReponse(e, D);
    expect(r.blocs.some((b) => b.type === "texte" && b.texte === MESSAGE_NON_AFFILIE)).toBe(true);
    expect(textes(r.blocs)).toContain("/affiliation");
    expect(r.blocs.some((b) => b.type === "contact")).toBe(true);
  });

  it("secteur introuvable après deux tentatives → cg.nalux@accg.be", () => {
    let e = etat({ codePostal: "5000", categorie: "juridique" });
    expect(etapeCourante(e, D)).toBe("secteur");
    e = fusionnerExtraction(e, vide, D).etat;
    expect(e.tentativesCp).toBe(1);
    e = appliquerAction(e, { type: "cp_inconnu" }, D).etat;
    expect(e.tentativesCp).toBe(2);
    e = appliquerAction(e, { type: "affilie", valeur: true }, D).etat;
    expect(resoudreDestinataire(e, D)?.destinataireEmail).toBe("cg.nalux@accg.be");
  });

  it("la liste des secteurs proposés exclut les commissions auxiliaires 100 et 200", () => {
    const r = construireReponse(etat({ codePostal: "5000", categorie: "juridique" }), D);
    const choix = r.blocs.find((b) => b.type === "choix");
    const libelles = choix && choix.type === "choix" ? choix.choix.map((c) => c.libelle) : [];
    expect(libelles).toContain("Construction");
    expect(libelles).not.toContain("Suivi du secteur");
    expect(libelles.at(-1)).toBe("Je ne sais pas");
  });

  it("un bouton de commission paritaire inconnue de la région est ignoré", () => {
    const e = appliquerAction(etat({ codePostal: "5000", categorie: "juridique" }), { type: "cp", valeur: "CP 125,02 - 200" }, D).etat;
    expect(e.cpCode).toBeNull();
  });

  it("une démarche en ligne donne le lien direct, sans transmission", () => {
    const r = construireReponse(etat({ codePostal: "5000", categorie: "demarche", demarche: "sepa" }), D);
    expect(textes(r.blocs)).toContain("/mandat-sepa");
    expect(r.blocs.some((b) => b.type === "contact")).toBe(false);
  });

  it("une information connue n'est pas effacée par un « inconnu »", () => {
    const e = fusionnerExtraction(etat({ codePostal: "5000", categorie: "prime" }), avec({ resume: "x" }), D).etat;
    expect(e.codePostal).toBe("5000");
    expect(e.categorie).toBe("prime");
  });

  it("horaires du bureau de la région, jours identiques regroupés", () => {
    const h = horairesCompacts(bureauDeLaRegion("Namur"), new Date("2026-10-08T10:00:00Z"));
    expect(h).toBe("Lun, mar, jeu : 08:30-12:00 / 13:30-16:30 · Mer, ven : 08:30-12:00");
  });
});

describe("classement de l'IA : nettoyage", () => {
  it("nettoyage sans employeur connu → secteur Nettoyage, donc la question « Qui est votre employeur ? »", async () => {
    const { verifierExtraction } = await import("./assistant-ia");
    const x = verifierExtraction(
      {
        code_postal: "5500",
        categorie: "juridique",
        demarche: "aucune",
        secteur: "inconnu",
        statut: "inconnu",
        commission_paritaire: "inconnue",
        employeur_nettoyage: "inconnu",
        affilie: "inconnu",
        demande_avis_sur_le_fond: false,
        demande_hors_role: false,
        resume: "La personne nettoie dans un hôpital.",
      },
      D
    );
    expect(x.secteur).toBe("Nettoyage");
    expect(etapeCourante(fusionnerExtraction(ETAT_INITIAL, x, D).etat, D)).toBe("employeur_nettoyage");
  });
});

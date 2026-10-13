import { describe, expect, it } from "vitest";
import {
  adresseLieu, cheminFichier, enumeration, fichierAccepte, heureFr, libelleDate, manquantsPourEnvoyer, manquesDelegue,
  normaliserHeure, ouiNon, resumeManques, tauxAuJour, tauxFr, validerChamps, validerDates, validerLieu, validerTaux,
} from "./regles";

const UUID = "0b7c3f7e-5a1d-4c55-9a3e-2f1d8c7b6a50";

describe("validerChamps", () => {
  it("garde les champs connus et ignore le reste", () => {
    const r = validerChamps({ objet: "  Commission Construction ", statut: "cloture", demandeur_id: UUID });
    expect(r).toEqual({ ok: true, valeurs: { objet: "Commission Construction" } });
  });

  it("refuse un type inconnu", () => {
    expect(validerChamps({ type: "vacances" }).ok).toBe(false);
    expect(validerChamps({ type: "credit_heures" })).toEqual({ ok: true, valeurs: { type: "credit_heures" } });
  });

  it("convertit oui / non / vide", () => {
    const r = validerChamps({ perte_salaire: "oui", lunch: "non", introduire_cg_federale: "" });
    expect(r.ok && r.valeurs).toMatchObject({ perte_salaire: true, lunch: false, introduire_cg_federale: null });
    expect(validerChamps({ lunch: "peut-être" }).ok).toBe(false);
  });

  it("efface les réponses dépendantes", () => {
    const r = validerChamps({ perte_salaire: "non", perte_salaire_charge: "employeur", introduire_cg_federale: "oui", regime_paiement: "63.000.35.26.001" });
    expect(r.ok && r.valeurs).toMatchObject({ perte_salaire_charge: null, regime_paiement: null });
    const e = validerChamps({ entreprise_specifique: "non", entreprise_id: UUID });
    expect(e.ok && e.valeurs.entreprise_id).toBeNull();
    const l = validerChamps({ lieu_autre: "oui", lieu_id: UUID, lieu_code_postal: "5000" });
    expect(l.ok && l.valeurs.lieu_id).toBeNull();
  });

  it("garde le régime de paiement si la dépense n'est pas introduite", () => {
    const r = validerChamps({ introduire_cg_federale: "non", regime_paiement: "63.000.35.26.001" });
    expect(r.ok && r.valeurs.regime_paiement).toBe("63.000.35.26.001");
  });

  it("contrôle les identifiants, la charge, la commission paritaire et le code postal", () => {
    expect(validerChamps({ secteur_id: "abc" }).ok).toBe(false);
    expect(validerChamps({ perte_salaire_charge: "etat" }).ok).toBe(false);
    expect(validerChamps({ commission_paritaire: "999999" }).ok).toBe(false);
    expect(validerChamps({ commission_paritaire: "124" }).ok).toBe(true);
    expect(validerChamps({ lieu_autre: "oui", lieu_code_postal: "50000" }).ok).toBe(false);
  });
});

describe("ouiNon", () => {
  it("lit les trois réponses", () => {
    expect([ouiNon("oui"), ouiNon("non"), ouiNon(""), ouiNon("x")]).toEqual([true, false, null, undefined]);
  });
});

describe("heures", () => {
  it("normalise les saisies courantes", () => {
    expect(["8", "8:00", "08h00", "8h", "0830", "8.30", "17h45"].map(normaliserHeure))
      .toEqual(["08:00", "08:00", "08:00", "08:00", "08:30", "08:30", "17:45"]);
    expect(normaliserHeure("")).toBeNull();
    expect(normaliserHeure("25:00")).toBeUndefined();
    expect(normaliserHeure("midi")).toBeUndefined();
  });

  it("affiche l'heure à la belge", () => {
    expect(heureFr("08:00:00")).toBe("08h00");
    expect(heureFr(null)).toBe("");
  });
});

describe("validerDates", () => {
  it("convertit, trie et ignore les lignes vides", () => {
    const r = validerDates([
      { jour: "14/10/2026", duree: "apres_midi", heure_debut: "13h30" },
      { jour: "", duree: "journee", heure_debut: "" },
      { jour: "14/10/2026", duree: "matin", heure_debut: "" },
      { jour: "12/10/2026", duree: "journee", heure_debut: "8h" },
    ]);
    expect(r).toEqual({
      ok: true,
      valeurs: [
        { jour: "2026-10-12", duree: "journee", heure_debut: "08:00" },
        { jour: "2026-10-14", duree: "matin", heure_debut: null },
        { jour: "2026-10-14", duree: "apres_midi", heure_debut: "13:30" },
      ],
    });
  });

  it("refuse une date, une durée ou une heure invalide", () => {
    expect(validerDates([{ jour: "31/02/2026", duree: "journee", heure_debut: "" }]).ok).toBe(false);
    expect(validerDates([{ jour: "12/10/2026", duree: "soir", heure_debut: "" }]).ok).toBe(false);
    expect(validerDates([{ jour: "12/10/2026", duree: "journee", heure_debut: "8h75" }]).ok).toBe(false);
  });

  it("refuse le même créneau deux fois et la journée entière avec un autre créneau", () => {
    expect(validerDates([
      { jour: "12/10/2026", duree: "matin", heure_debut: "" },
      { jour: "12/10/2026", duree: "matin", heure_debut: "" },
    ]).ok).toBe(false);
    expect(validerDates([
      { jour: "12/10/2026", duree: "journee", heure_debut: "" },
      { jour: "12/10/2026", duree: "apres_midi", heure_debut: "" },
    ]).ok).toBe(false);
  });
});

describe("manquantsPourEnvoyer", () => {
  const complet = {
    type: "mission_syndicale" as const, objet: "CP Construction", lieu_id: UUID, lieu_autre: false, lieu_rue: null,
    lieu_code_postal: null, lieu_localite: null, perte_salaire: true, perte_salaire_charge: "employeur" as const,
    introduire_cg_federale: false, regime_paiement: "63.000.35.26.001", lunch: true, entreprise_specifique: false, entreprise_id: null,
  };

  it("rien ne manque", () => {
    expect(manquantsPourEnvoyer(complet, 1, 2)).toEqual([]);
  });

  it("liste ce qui manque", () => {
    expect(manquantsPourEnvoyer({
      ...complet, objet: " ", lieu_id: null, perte_salaire_charge: null, regime_paiement: null, lunch: null, entreprise_specifique: true,
    }, 0, 0)).toEqual([
      "l'objet de la réunion", "au moins une date", "le lieu", "qui prend en charge la perte de salaire",
      "le n° de régime de paiement", "le lunch (oui / non)", "l'entreprise", "au moins un participant",
    ]);
  });

  it("vérifie l'adresse d'un lieu « Autre »", () => {
    const autre = { ...complet, lieu_id: null, lieu_autre: true, lieu_rue: "Rue Haute", lieu_code_postal: "5000", lieu_localite: null };
    expect(manquantsPourEnvoyer(autre, 1, 1)).toEqual(["le lieu"]);
    expect(manquantsPourEnvoyer({ ...autre, lieu_localite: "Namur" }, 1, 1)).toEqual([]);
  });
});

describe("affichage", () => {
  it("énumère", () => {
    expect(enumeration(["a"])).toBe("a");
    expect(enumeration(["a", "b", "c"])).toBe("a, b et c");
  });

  it("compose l'adresse du lieu sans rien inventer", () => {
    expect(adresseLieu({ lieu_complement: "Espace Solidarité", lieu_rue: "Rue de Namur", lieu_numero: "47", lieu_boite: null, lieu_code_postal: "5000", lieu_localite: "Beez" }))
      .toBe("Espace Solidarité, Rue de Namur 47, 5000 Beez");
    expect(adresseLieu({ lieu_complement: null, lieu_rue: "Rue Dewez", lieu_numero: "40-42", lieu_boite: "2", lieu_code_postal: null, lieu_localite: null }))
      .toBe("Rue Dewez 40-42 bte 2");
  });

  it("décrit une date", () => {
    expect(libelleDate({ jour: "2026-10-12", duree: "journee", heure_debut: "08:00:00" })).toBe("12/10/2026, journée entière, 08h00");
    expect(libelleDate({ jour: "2026-10-12", duree: "apres_midi", heure_debut: null })).toBe("12/10/2026, après-midi");
  });
});

describe("manques", () => {
  it("relève domicile, genre et registre national", () => {
    expect(manquesDelegue({ adresse_rue: "Rue A", adresse_code_postal: "5000", adresse_localite: "Namur", genre: "F", registre_national: "85071203328" })).toEqual([]);
    expect(manquesDelegue({ adresse_rue: "Rue A", adresse_code_postal: null, adresse_localite: "Namur", genre: null, registre_national: null }))
      .toEqual(["domicile", "genre", "registre_national"]);
  });

  it("résume en comptant chaque employeur une fois", () => {
    expect(resumeManques([
      { manque: "email_employeur", cle: "e1" },
      { manque: "email_employeur", cle: "e1" },
      { manque: "email_employeur", cle: "e2" },
      { manque: "domicile", cle: "d1" },
    ])).toEqual(["1 délégué sans domicile", "2 employeurs sans e-mail"]);
    expect(resumeManques([])).toEqual([]);
  });
});

describe("pièces jointes", () => {
  it("accepte PDF et images jusqu'à 25 Mo", () => {
    expect(fichierAccepte({ type: "application/pdf", size: 1000 })).toBe(true);
    expect(fichierAccepte({ type: "image/jpeg", size: 26 * 1024 * 1024 })).toBe(false);
    expect(fichierAccepte({ type: "application/msword", size: 1000 })).toBe(false);
    expect(fichierAccepte({ type: "application/pdf", size: 0 })).toBe(false);
  });

  it("nettoie le chemin", () => {
    expect(cheminFichier("d1", "u1", "Invitation fédérale (v2).PDF")).toBe("d1/u1-invitation-federale-v2.pdf");
    expect(cheminFichier("d1", "u1", "../../x")).toBe("d1/u1-fichier.x");
  });
});

describe("paramètres", () => {
  it("valide un lieu", () => {
    expect(validerLieu({ nom: "CEPAG", rue: "Rue de Namur", numero: "47", code_postal: "5000", localite: "Beez" }).ok).toBe(true);
    expect(validerLieu({ nom: "", rue: "Rue", code_postal: "5000", localite: "Beez" }).ok).toBe(false);
    expect(validerLieu({ nom: "X", rue: "Rue", code_postal: "", localite: "Beez" }).ok).toBe(false);
    expect(validerLieu({ nom: "X", rue: "Rue", code_postal: "500", localite: "Beez" }).ok).toBe(false);
  });

  it("valide un taux", () => {
    expect(validerTaux({ valable_du: "01/07/2026", taux: "0,4280" })).toEqual({ ok: true, valeurs: { valable_du: "2026-07-01", taux: 0.428 } });
    expect(validerTaux({ valable_du: "01/07/2026", taux: "abc" }).ok).toBe(false);
    expect(validerTaux({ valable_du: "01/07/2026", taux: "0" }).ok).toBe(false);
    expect(validerTaux({ valable_du: "2026-07-01", taux: "0,4" }).ok).toBe(false);
  });

  it("choisit le taux du jour", () => {
    const taux = [{ valable_du: "2026-01-01", taux: 0.4 }, { valable_du: "2026-07-01", taux: 0.43 }];
    expect(tauxAuJour(taux, "2026-03-15")?.taux).toBe(0.4);
    expect(tauxAuJour(taux, "2026-07-01")?.taux).toBe(0.43);
    expect(tauxAuJour(taux, "2025-12-31")).toBeNull();
    expect(tauxFr(0.428)).toBe("0,4280 € / km");
  });
});

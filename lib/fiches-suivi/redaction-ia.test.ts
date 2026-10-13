import { describe, expect, it } from "vitest";
import { construireTexte, messageFiche, reponsesRemplies, type ContexteFiche } from "./redaction-ia";

const vide = { origine: null, duree: null, echanges_direction: null, courriers: null, evenements: null, resolution: null, resultat: null };
const contexte: ContexteFiche = {
  fiche: { ...vide, type: "usine", titre: "Grève chez Acme", date_debut: "2026-02-03", date_fin: "2026-02-05", origine: "Annonce de 40 licenciements", resultat: "  " },
  entreprise: "Acme", site: "Seilles", secteur: "Construction",
  documents: [{ nom: "preavis.pdf", nature: "preavis", nature_autre: null }],
};

describe("reponsesRemplies", () => {
  it("retire les réponses vides", () => {
    expect(reponsesRemplies(contexte.fiche)).toEqual([{ libelle: "Origine", reponse: "Annonce de 40 licenciements" }]);
  });
});

describe("messageFiche", () => {
  it("donne le contexte, les réponses et les documents (nom + nature)", () => {
    const m = messageFiche(contexte);
    expect(m).toContain("<date>du 03/02/2026 au 05/02/2026</date>");
    expect(m).toContain("<entreprise>Acme (site : Seilles)</entreprise>");
    expect(m).toContain('<reponse question="Origine">');
    expect(m).not.toContain("Résultat");
    expect(m).toContain("- Préavis de grève : preavis.pdf");
  });
});

describe("construireTexte", () => {
  it("nettoie le texte et signale un chiffre inventé", () => {
    const r = construireTexte({ texte: "**Le 03/02/2026**, 40 emplois menacés.\n\n\n\n120 grévistes.", avertissement: "" }, contexte);
    expect(r.texte).toBe("Le 03/02/2026, 40 emplois menacés.\n\n120 grévistes.");
    expect(r.avertissements).toEqual(["Chiffres absents de vos réponses, à vérifier : 120."]);
  });
});

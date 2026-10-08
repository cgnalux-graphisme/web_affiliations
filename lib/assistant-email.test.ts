import { describe, expect, it } from "vitest";
import { htmlEmailAssistant } from "./assistant-email";

const contenu = {
  categorie: "Question juridique",
  prenom: "Marie",
  nom: "Dupont",
  codePostal: "5590",
  region: "Namur",
  commission: "CP 124 - 200 · Construction",
  affilie: true,
  resume: "La personne n'a pas reçu son C4.",
  email: "marie.dupont@exemple.be",
  lien: "https://exemple.be/suivi-actions/chatbot?id=1",
};

describe("e-mail de l'Assistant CG", () => {
  it("contient un bouton Répondre qui ouvre un nouveau message adressé à la personne", () => {
    const html = htmlEmailAssistant(contenu);
    expect(html).toContain("mailto:marie.dupont%40exemple.be?subject=");
    expect(html).toContain("Répondre à Marie Dupont");
  });
  it("ne contient jamais de registre national", () => {
    expect(htmlEmailAssistant(contenu)).not.toMatch(/\d{2}\.\d{2}\.\d{2}-\d{3}\.\d{2}/);
  });
});

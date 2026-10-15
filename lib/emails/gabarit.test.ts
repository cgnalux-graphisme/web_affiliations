import { describe, expect, it } from "vitest";
import { controlesAntiSpam, echapper, gabaritEmail, paragraphe } from "./gabarit";
import { buildEmailHtml } from "./confirmation-affiliation";
import { buildHtml as htmlMandat } from "./mandat-sepa";
import { construireHtml as htmlModification } from "./modification";
import { emailLiberation } from "./liberation";
import { buildC1Html, buildC32Html, buildLivraisonPersonnelleHtml, buildOnemBundleHtml } from "../onem-email-html";
import { htmlContact } from "../contact-email";
import { htmlEmailAssistant } from "../assistant-email";

const P = { nom: "Exemple", prenom: "Marie", email: "marie@exemple.be" };

const EMAILS = {
  affiliation: buildEmailHtml({ ...P, pdfBase64: "", fileName: "", affiliationDebut: "11/2026", cotisationMensuelle: null, modePaiement: "domiciliation", niss: null, premiereEcheanceMontant: null }),
  sepa: htmlMandat({ ...P, pdfBase64: "", fileName: "", nouveauIban: "BE68 5390 0754 7034", typeDemande: "nouveau_mandat" }),
  modification: htmlModification("Marie", "Exemple", [{ changement: "adresse", titre: "Adresse", lignes: [["Rue", "Rue X 1"]] }], "a_organiser"),
  c1: buildC1Html({ ...P, adminEmail: "a@exemple.be" }),
  c32: buildC32Html({ ...P, adminEmail: "a@exemple.be" }),
  bundle: buildOnemBundleHtml({ ...P, adminEmail: "a@exemple.be" }),
  livraison: buildLivraisonPersonnelleHtml({ nom: "Exemple", prenom: "Marie", emailDeclarant: P.email, documents: ["Formulaire C1"], adminEmail: "a@exemple.be" }),
  contact: htmlContact({ nom: "Marie Exemple", email: P.email, sujet: "Question sur ma cotisation", message: "Bonjour,\nune question." }, "15/10/2026 à 10:42"),
  assistant: htmlEmailAssistant({ categorie: "Chômage temporaire", prenom: "Marie", nom: "Exemple", codePostal: "5000", region: "Namur", commission: null, affilie: true, resume: "Carte de contrôle.", email: P.email, lien: "https://exemple.be/espace" }),
  liberation: emailLiberation("lettre_employeur", { objet: "Demande de libération", texte: "Madame, Monsieur,\n\nVous trouverez en pièce jointe notre demande.\n\nSalutations distinguées,\n\nJean Permanent" }),
};

describe("gabarit commun des e-mails", () => {
  it.each(Object.entries(EMAILS))("%s passe tous les contrôles anti-spam", (_nom, e) => {
    const ko = controlesAntiSpam("Objet clair et court", e).filter((c) => !c.ok);
    expect(ko.map((c) => `${c.regle} : ${c.detail}`)).toEqual([]);
  });

  it("neutralise le HTML des valeurs saisies", () => {
    const e = gabaritEmail({ etiquette: "Test", titre: "<b>Titre</b>", apercu: "x", blocs: [paragraphe("<script>alert(1)</script>")], raison: "Message de test." });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;b&gt;Titre&lt;/b&gt;");
    expect(e.texte).toContain("<script>alert(1)</script>");
  });

  it("échappe aussi les apostrophes", () => {
    expect(echapper(`l'été "x"`)).toBe("l&#39;été &quot;x&quot;");
  });
});

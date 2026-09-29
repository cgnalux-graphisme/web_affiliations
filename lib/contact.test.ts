import { describe, expect, it } from "vitest";
import { nettoyerContact, validerContact } from "./contact";
import { htmlContact } from "./contact-email";

const ok = { nom: "Marie Dupont", email: "marie@exemple.be", sujet: "Mon affiliation", message: "Bonjour, j'ai une question." };

describe("formulaire de contact", () => {
  it("accepte un message complet", () => {
    expect(validerContact(nettoyerContact(ok))).toEqual({});
  });

  it("nettoie les espaces, garde les paragraphes du message", () => {
    const m = nettoyerContact({ ...ok, nom: "  Marie   Dupont ", email: " Marie@Exemple.BE ", message: "a\r\n\r\n\r\n\r\nb bien long" });
    expect(m.nom).toBe("Marie Dupont");
    expect(m.email).toBe("marie@exemple.be");
    expect(m.message).toBe("a\n\nb bien long");
  });

  it("refuse les champs vides ou invalides", () => {
    const e = validerContact(nettoyerContact({ nom: "", email: "pas-une-adresse", sujet: "", message: "court" }));
    expect(Object.keys(e).sort()).toEqual(["email", "message", "nom", "sujet"]);
  });

  it("refuse un retour à la ligne dans l'e-mail (injection d'en-tête)", () => {
    expect(validerContact({ ...ok, email: "a@b.be\nbcc:x@y.be" }).email).toBeDefined();
  });

  it("ignore les valeurs qui ne sont pas du texte", () => {
    expect(nettoyerContact({ nom: 42 as unknown as string }).nom).toBe("");
  });

  it("échappe le HTML du visiteur dans l'e-mail", () => {
    const html = htmlContact({ ...ok, message: "<script>x</script>\nligne 2" }, "29/09/2026 à 10:00");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;<br />ligne 2");
  });
});

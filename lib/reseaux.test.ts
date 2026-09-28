import { describe, expect, it } from "vitest";
import { compterCaracteres, compterHashtags, composerYoutube, estReseau, lireYoutube } from "./reseaux";
import { finaliser, htmlVersTexte, messageArticle, schemaReseau } from "./reseaux-ia";

const LIEN = "https://accg-nalux.com/blog/index-menace";

describe("reseaux", () => {
  it("reconnaît les 4 réseaux", () => {
    expect(estReseau("tiktok")).toBe(true);
    expect(estReseau("twitter")).toBe(false);
    expect(estReseau(undefined)).toBe(false);
  });

  it("compte un emoji comme un caractère", () => {
    expect(compterCaracteres("Grève 👉 ok")).toBe(10);
  });

  it("compte les hashtags", () => {
    expect(compterHashtags("Texte #FGTB #Index\n#salaires et C#")).toBe(3);
  });

  it("YouTube : titre et description aller-retour", () => {
    const c = composerYoutube("  Mon   titre ", "Ligne 1\n\nLigne 2\n");
    expect(c).toBe("Mon titre\n\nLigne 1\n\nLigne 2");
    expect(lireYoutube(c)).toEqual({ titre: "Mon titre", description: "Ligne 1\n\nLigne 2" });
    expect(lireYoutube("Seul titre")).toEqual({ titre: "Seul titre", description: "" });
    expect(lireYoutube(null)).toEqual({ titre: "", description: "" });
  });
});

describe("reseaux-ia", () => {
  it("convertit le HTML de l'article en texte lisible", () => {
    const t = htmlVersTexte("<h2>Ce qui change</h2><p>Un <strong>index</strong> &amp; plus.</p><ul><li>Un</li><li>Deux</li></ul>");
    expect(t).toBe("## Ce qui change\nUn index & plus.\n\n– Un\n– Deux");
  });

  it("met l'article et le lien dans le message", () => {
    const m = messageArticle({ titre: "T", chapo: null, points_cles: "A\nB", contenu: "<p>C</p>" }, LIEN, ["tiktok"]);
    expect(m).toContain("la version tiktok");
    expect(m).toContain("– A\n– B");
    expect(m).toContain(`<lien>${LIEN}</lien>`);
  });

  it("schéma d'une seule version", () => {
    expect(Object.keys(schemaReseau("youtube").shape)).toEqual(["youtube", "avertissement"]);
  });

  it("Facebook : ajoute le lien s'il manque et retire les autres liens", () => {
    const t = finaliser("facebook", { facebook: "Texte. Voir https://autre.be/x" }, LIEN);
    expect(t).not.toContain("autre.be");
    expect(t.endsWith(`👉 ${LIEN}`)).toBe(true);
    const deja = finaliser("facebook", { facebook: `Texte.\n${LIEN}` }, LIEN);
    expect(deja).toBe(`Texte.\n${LIEN}`);
  });

  it("Instagram : aucun lien, « lien en bio » garanti", () => {
    const t = finaliser("instagram", { instagram: `Accroche\n${LIEN}\n#FGTB` }, LIEN);
    expect(t).not.toContain("http");
    expect(t).toContain("Lien en bio");
    expect(finaliser("instagram", { instagram: "Accroche. Lien en bio !" }, LIEN)).toBe("Accroche. Lien en bio !");
  });

  it("TikTok : aucun lien", () => {
    expect(finaliser("tiktok", { tiktok: `Tu savais ? ${LIEN} #FGTB` }, LIEN)).toBe("Tu savais ? #FGTB");
  });

  it("YouTube : titre + description avec le lien", () => {
    const c = finaliser("youtube", { youtube: { titre: "Titre", description: "Résumé." } }, LIEN);
    expect(lireYoutube(c)).toEqual({ titre: "Titre", description: `Résumé.\n\nLire l'article complet : ${LIEN}` });
  });
});

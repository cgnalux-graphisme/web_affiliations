import { describe, expect, it } from "vitest";
import { imageAcceptee, nomDepuisUrl, urlImageDeposee } from "./image-deposee";

const depot = (donnees: Record<string, string>) => ({ getData: (t: string) => donnees[t] ?? "" });

describe("image glissée depuis le web", () => {
  it("prend la source de l'<img> du HTML en priorité", () => {
    const dt = depot({
      "text/html": '<a href="https://site.be/page"><img alt="x" src="https://cdn.site.be/a.jpg?w=800&amp;h=600"></a>',
      "text/uri-list": "https://site.be/page",
    });
    expect(urlImageDeposee(dt)).toBe("https://cdn.site.be/a.jpg?w=800&h=600");
  });

  it("sinon la liste d'adresses (commentaires ignorés), sinon le texte", () => {
    expect(urlImageDeposee(depot({ "text/uri-list": "# commentaire\nhttps://site.be/b.png" }))).toBe("https://site.be/b.png");
    expect(urlImageDeposee(depot({ "text/plain": " https://site.be/c.webp " }))).toBe("https://site.be/c.webp");
  });

  it("refuse ce qui n'est pas une adresse web ou une image intégrée", () => {
    expect(urlImageDeposee(depot({ "text/plain": "un simple texte" }))).toBeNull();
    expect(urlImageDeposee(depot({ "text/plain": "javascript:alert(1)" }))).toBeNull();
    expect(urlImageDeposee(depot({ "text/plain": "data:image/png;base64,AAAA" }))).toBe("data:image/png;base64,AAAA");
  });

  it("tire un nom de fichier de l'adresse", () => {
    expect(nomDepuisUrl("https://site.be/photos/gr%C3%A8ve.jpg?x=1")).toBe("grève.jpg");
    expect(nomDepuisUrl("https://site.be/")).toBe("image-web");
    expect(nomDepuisUrl("data:image/png;base64,AAAA")).toBe("image-web");
  });

  it("accepte les images courantes de 20 Mo maximum", () => {
    expect(imageAcceptee({ type: "image/jpeg", size: 1000 })).toBe(true);
    expect(imageAcceptee({ type: "image/avif", size: 1000 })).toBe(true);
    expect(imageAcceptee({ type: "image/svg+xml", size: 1000 })).toBe(false);
    expect(imageAcceptee({ type: "image/png", size: 21 * 1024 * 1024 })).toBe(false);
  });
});

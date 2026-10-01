import { describe, expect, it } from "vitest";
import { domaineDe, domaineValide, iconesDeclarees } from "./logo-media";

describe("logos des médias", () => {
  it("extrait le domaine d'un lien, sans www", () => {
    expect(domaineDe("https://www.rtbf.be/article/x")).toBe("rtbf.be");
    expect(domaineDe("javascript:alert(1)")).toBeNull();
    expect(domaineDe("pas un lien")).toBeNull();
  });

  it("n'accepte que de vrais noms de domaine", () => {
    expect(domaineValide("lavenir.net")).toBe(true);
    expect(domaineValide("trends.levif.be")).toBe(true);
    expect(domaineValide("localhost")).toBe(false);
    expect(domaineValide("127.0.0.1")).toBe(false);
    expect(domaineValide("a/b.be")).toBe(false);
  });

  it("classe les icônes déclarées et écarte les SVG", () => {
    const html = `<head>
      <link rel="icon" href="/favicon-16.png" sizes="16x16">
      <link rel="icon" type="image/svg+xml" href="/logo.svg">
      <link rel="shortcut icon" href="/fav.ico">
      <link rel="icon" href="https://cdn.ex.be/ic-192.png" sizes="192x192">
      <link rel="apple-touch-icon" href="/apple.png">
      <link rel="stylesheet" href="/style.css">
    </head>`;
    expect(iconesDeclarees(html, "https://www.ex.be/")).toEqual([
      "https://www.ex.be/apple.png",
      "https://cdn.ex.be/ic-192.png",
      "https://www.ex.be/favicon-16.png",
      "https://www.ex.be/fav.ico",
    ]);
  });
});

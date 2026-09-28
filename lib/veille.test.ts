import { describe, expect, it } from "vitest";
import { urlFluxValide } from "./veille";
import { decoderEntites, lireFlux, texteDepuisHtml } from "./veille-flux";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel><title>RTBF</title>
<item>
  <title><![CDATA[Grève : les syndicats mobilisent &amp; appellent au 14/10]]></title>
  <link>https://www.rtbf.be/article/greve-123</link>
  <description><![CDATA[<p>Les syndicats <strong>appellent</strong> à la grève.</p><img src="x.jpg">]]></description>
  <pubDate>Mon, 28 Sep 2026 07:30:00 +0200</pubDate>
</item>
<item>
  <title>Index des prix : l&#8217;inflation recule</title>
  <guid isPermaLink="true">https://www.lesoir.be/1/index</guid>
  <description>&lt;p&gt;Texte encodé deux fois&lt;/p&gt;</description>
</item>
<item><title>Sans lien</title></item>
<item><title>Doublon</title><link>https://www.rtbf.be/article/greve-123</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title type="html">Pensions : la réforme votée</title>
    <link rel="self" href="https://ex.be/self"/>
    <link rel="alternate" href="https://ex.be/pensions"/>
    <summary>Résumé Atom</summary>
    <published>2026-09-27T10:00:00Z</published>
  </entry>
</feed>`;

describe("lireFlux", () => {
  it("lit un flux RSS 2.0 (CDATA, HTML, guid, doublons, entrées sans lien)", () => {
    const items = lireFlux(RSS);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      titre: "Grève : les syndicats mobilisent & appellent au 14/10",
      resume: "Les syndicats appellent à la grève.",
      lien: "https://www.rtbf.be/article/greve-123",
      date_publication: "2026-09-28T05:30:00.000Z",
    });
    expect(items[1].titre).toBe("Index des prix : l’inflation recule");
    expect(items[1].lien).toBe("https://www.lesoir.be/1/index");
    expect(items[1].resume).toBe("Texte encodé deux fois");
    expect(items[1].date_publication).toBeNull();
  });

  it("lit un flux Atom (lien alternate)", () => {
    expect(lireFlux(ATOM)).toEqual([
      {
        titre: "Pensions : la réforme votée",
        resume: "Résumé Atom",
        lien: "https://ex.be/pensions",
        date_publication: "2026-09-27T10:00:00.000Z",
      },
    ]);
  });

  it("refuse un document qui n'est pas un flux", () => {
    expect(() => lireFlux("<html><body>Page</body></html>")).toThrow(/pas un flux/);
  });

  it("coupe les résumés trop longs", () => {
    const long = `<rss><channel><item><title>T</title><link>https://a.be/x</link><description>${"mot ".repeat(400)}</description></item></channel></rss>`;
    const [item] = lireFlux(long);
    expect(item.resume!.length).toBeLessThanOrEqual(601);
    expect(item.resume!.endsWith("…")).toBe(true);
  });
});

describe("utilitaires", () => {
  it("décode les entités", () => {
    expect(decoderEntites("&eacute;t&#233; &#xE9; &laquo;ok&raquo;")).toBe("été é «ok»");
    expect(texteDepuisHtml("<p>A&nbsp;<b>B</b></p><script>x()</script>")).toBe("A B");
  });
  it("valide une adresse de flux", () => {
    expect(urlFluxValide("https://www.rtbf.be/rss")).toBe(true);
    expect(urlFluxValide("ftp://x.be")).toBe(false);
    expect(urlFluxValide("rtbf.be/rss")).toBe(false);
  });
});

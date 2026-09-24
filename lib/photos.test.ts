import { describe, expect, it } from "vitest";
import { cheminDepuisUrl, cheminPhoto, rangDepuisChemin, trierPhotos } from "./photos";

describe("photos", () => {
  it("préfixe le chemin par le rang pour fixer l'ordre", () => {
    expect(cheminPhoto("act", 0, "abc")).toBe("act/00-abc.jpg");
    expect(cheminPhoto("act", 11, "xyz")).toBe("act/11-xyz.jpg");
  });

  it("trie les photos par rang, la principale en premier", () => {
    const base = "https://x.supabase.co/storage/v1/object/public/action-photos/";
    const photos = [
      { url: base + cheminPhoto("act", 10, "zz") },
      { url: base + cheminPhoto("act", 2, "aa") },
      { url: base + cheminPhoto("act", 0, "mm") },
    ];
    expect(trierPhotos(photos).map((p) => p.url.split("/").pop())).toEqual([
      "00-mm.jpg",
      "02-aa.jpg",
      "10-zz.jpg",
    ]);
  });

  it("retrouve le chemin du fichier depuis l'URL publique", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/action-photos/act-1/03-u%20v.jpg?t=1";
    expect(cheminDepuisUrl(url)).toBe("act-1/03-u v.jpg");
    expect(cheminDepuisUrl("https://ailleurs.be/photo.jpg")).toBeNull();
  });

  it("lit le rang dans le chemin", () => {
    expect(rangDepuisChemin("act-1/03-uuid.jpg")).toBe(3);
    expect(rangDepuisChemin("act-1/photo.jpg")).toBeNull();
  });
});

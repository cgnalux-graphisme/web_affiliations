import { describe, expect, it } from "vitest";
import { cheminPhoto, trierPhotos } from "./photos";

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
});

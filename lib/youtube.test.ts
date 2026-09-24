import { describe, expect, it } from "vitest";
import { idYoutube, lienCanonique } from "./youtube";

describe("idYoutube", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?feature=shared", "dQw4w9WgXcQ"],
    ["  youtu.be/dQw4w9WgXcQ  ", "dQw4w9WgXcQ"],
  ])("reconnaît %s", (lien, id) => {
    expect(idYoutube(lien)).toBe(id);
  });

  it.each([
    "https://vimeo.com/123456",
    "https://www.youtube.com/channel/UC123",
    "https://www.youtube.com/watch?v=trop-court",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "pas un lien",
  ])("refuse %s", (lien) => {
    expect(idYoutube(lien)).toBeNull();
  });

  it("normalise le lien enregistré", () => {
    expect(lienCanonique("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});

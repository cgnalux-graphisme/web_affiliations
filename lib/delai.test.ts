import { describe, expect, it } from "vitest";
import { avecDelai } from "./delai";

describe("avecDelai", () => {
  it("renvoie le résultat s'il arrive à temps", async () => {
    expect(await avecDelai(Promise.resolve(true), 50)).toBe(true);
    expect(await avecDelai(Promise.resolve(false), 50)).toBe(false);
  });
  it("renvoie null si la promesse ne répond pas", async () => {
    expect(await avecDelai(new Promise(() => {}), 20)).toBeNull();
  });
  it("propage une erreur", async () => {
    await expect(avecDelai(Promise.reject(new Error("x")), 50)).rejects.toThrow("x");
  });
});

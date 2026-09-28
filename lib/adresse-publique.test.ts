import { describe, expect, it } from "vitest";
import { ipPrivee, verifierAdressePublique } from "./adresse-publique";

describe("ipPrivee", () => {
  it("refuse les adresses internes et réservées", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.10", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "pas-une-ip"]) {
      expect(ipPrivee(ip), ip).toBe(true);
    }
  });
  it("accepte les adresses publiques", () => {
    for (const ip of ["8.8.8.8", "185.15.59.224", "172.32.0.1", "2a00:1450:4001::1"]) {
      expect(ipPrivee(ip), ip).toBe(false);
    }
  });
});

describe("verifierAdressePublique", () => {
  it("refuse une IP interne écrite dans l'adresse, un protocole non web ou des identifiants", async () => {
    await expect(verifierAdressePublique(new URL("http://127.0.0.1/image.jpg"))).rejects.toThrow(/interne/);
    await expect(verifierAdressePublique(new URL("http://[::1]/image.jpg"))).rejects.toThrow(/interne/);
    await expect(verifierAdressePublique(new URL("file:///etc/passwd"))).rejects.toThrow(/http/);
    await expect(verifierAdressePublique(new URL("https://a:b@exemple.be/x.jpg"))).rejects.toThrow(/identifiants/);
  });
  it("accepte une IP publique écrite dans l'adresse", async () => {
    await expect(verifierAdressePublique(new URL("https://8.8.8.8/x.jpg"))).resolves.toBeUndefined();
  });
});

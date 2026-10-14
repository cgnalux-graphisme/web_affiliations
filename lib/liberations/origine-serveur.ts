import { headers } from "next/headers";

/** Adresse publique du site (lien du QR code) : SITE_URL, sinon celle de la requête. SERVEUR UNIQUEMENT. */
export async function origineSite(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

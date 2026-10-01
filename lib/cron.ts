import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Appel du Vercel Cron : en-tête « Authorization: Bearer <CRON_SECRET> » (serveur uniquement). */
export function appelCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const recu = request.headers.get("authorization");
  if (!secret || !recu) return false;
  const attendu = Buffer.from(`Bearer ${secret}`);
  const donne = Buffer.from(recu);
  return attendu.length === donne.length && timingSafeEqual(attendu, donne);
}

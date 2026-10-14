import { contexteLiberations } from "../../../../../lib/liberations/donnees-serveur";
import { exporterDossier } from "../../../../../lib/liberations/dossier-pdf-serveur";

/**
 * PDF complet d'un dossier de libération (lot 4) : admins et permanent demandeur. Fabriqué à la demande, enregistré
 * dans le bucket privé, puis redirection vers un lien signé d'une heure.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await contexteLiberations();
  if (!c) return new Response("Accès refusé. Reconnectez-vous.", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Dossier introuvable.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const r = await exporterDossier(id, c);
  if (!r.ok) return new Response(r.erreur, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  return Response.redirect(r.url, 303);
}

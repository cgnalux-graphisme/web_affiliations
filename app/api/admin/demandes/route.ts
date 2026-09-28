import { NextResponse, type NextRequest } from "next/server";
import { dateFrToIso } from "../../../../lib/dates";
import { estTri, estTypeDemande } from "../../../../lib/demandes";
import { SANS_CACHE, accesDemandes, erreurJson, listerDemandes } from "../../../../lib/demandes-serveur";

export const dynamic = "force-dynamic";

/**
 * Liste des demandes d'un type (données personnelles : super admin uniquement, clé service_role côté serveur).
 * GET ?type=affiliation|sepa|changement|c1|c32&q=&du=jj/mm/aaaa&au=jj/mm/aaaa&tri=date_desc|date_asc|nom_asc|nom_desc&page=1
 * La liste ne renvoie que l'identité, l'e-mail, la date et le statut : le reste est dans la vue détail.
 */
export async function GET(request: NextRequest) {
  const acces = await accesDemandes();
  if ("refus" in acces) return acces.refus;

  const p = request.nextUrl.searchParams;
  const type = p.get("type") ?? "affiliation";
  if (!estTypeDemande(type)) return erreurJson("Type de demande inconnu.", 400);
  const tri = p.get("tri") ?? "date_desc";
  if (!estTri(tri)) return erreurJson("Tri inconnu.", 400);
  const du = p.get("du") ? dateFrToIso(p.get("du")!) : null;
  const au = p.get("au") ? dateFrToIso(p.get("au")!) : null;
  if ((p.get("du") && !du) || (p.get("au") && !au)) return erreurJson("Date invalide : utilisez le format jj/mm/aaaa.", 400);
  const page = Math.min(10_000, Math.max(1, Number.parseInt(p.get("page") ?? "1", 10) || 1));

  try {
    const reponse = await listerDemandes(acces.db, { type, q: p.get("q"), du, au, tri, page });
    return NextResponse.json(reponse, { headers: SANS_CACHE });
  } catch (err) {
    console.error("demandes (liste) :", err instanceof Error ? err.message : "erreur");
    return erreurJson("La liste des demandes ne peut pas être chargée. Réessayez ; si le problème persiste, prévenez l'administrateur.", 500);
  }
}

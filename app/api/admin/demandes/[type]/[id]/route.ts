import { NextResponse } from "next/server";
import { estTypeDemande } from "../../../../../../lib/demandes";
import { SANS_CACHE, UUID, accesDemandes, erreurJson, lireDemande } from "../../../../../../lib/demandes-serveur";

export const dynamic = "force-dynamic";

/** Une demande complète (toutes ses informations). Super admin uniquement, clé service_role côté serveur. */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const acces = await accesDemandes();
  if ("refus" in acces) return acces.refus;
  const { type, id } = await params;
  if (!estTypeDemande(type) || !UUID.test(id)) return erreurJson("Demande introuvable.", 404);

  try {
    const demande = await lireDemande(acces.db, type, id);
    if (!demande) return erreurJson("Cette demande n'existe pas (ou plus).", 404);
    return NextResponse.json({ demande }, { headers: SANS_CACHE });
  } catch (err) {
    console.error("demandes (détail) :", err instanceof Error ? err.message : "erreur");
    return erreurJson("La demande ne peut pas être chargée. Réessayez.", 500);
  }
}

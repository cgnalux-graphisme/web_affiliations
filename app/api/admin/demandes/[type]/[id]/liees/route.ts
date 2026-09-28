import { NextResponse } from "next/server";
import { estTypeDemande } from "../../../../../../../lib/demandes";
import { SANS_CACHE, UUID, accesDemandes, chercherDemandesLiees, erreurJson, lireDemande } from "../../../../../../../lib/demandes-serveur";

export const dynamic = "force-dynamic";

/** Autres demandes de la même personne (même NISS ou e-mail). Super admin uniquement, clé service_role. */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const acces = await accesDemandes();
  if ("refus" in acces) return acces.refus;
  const { type, id } = await params;
  if (!estTypeDemande(type) || !UUID.test(id)) return erreurJson("Demande introuvable.", 404);

  try {
    const demande = await lireDemande(acces.db, type, id);
    if (!demande) return erreurJson("Cette demande n'existe pas (ou plus).", 404);
    const liees = await chercherDemandesLiees(acces.db, type, demande);
    return NextResponse.json({ liees }, { headers: SANS_CACHE });
  } catch (err) {
    console.error("demandes (liées) :", err instanceof Error ? err.message : "erreur");
    return erreurJson("Les demandes liées ne peuvent pas être chargées.", 500);
  }
}

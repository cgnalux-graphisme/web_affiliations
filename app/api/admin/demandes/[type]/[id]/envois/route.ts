import { NextResponse } from "next/server";
import { estTypeDemande } from "../../../../../../../lib/demandes";
import { SANS_CACHE, UUID, accesDemandes, erreurJson, lireEnvois } from "../../../../../../../lib/demandes-serveur";

export const dynamic = "force-dynamic";

/** Historique des e-mails envoyés pour une demande. Super admin uniquement, clé service_role. */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const acces = await accesDemandes();
  if ("refus" in acces) return acces.refus;
  const { type, id } = await params;
  if (!estTypeDemande(type) || !UUID.test(id)) return erreurJson("Demande introuvable.", 404);

  try {
    return NextResponse.json(await lireEnvois(acces.db, type, id), { headers: SANS_CACHE });
  } catch (err) {
    console.error("demandes (envois) :", err instanceof Error ? err.message : "erreur");
    return erreurJson("L'historique des envois ne peut pas être chargé.", 500);
  }
}

import { DEMANDES, estTypeDemande, nomFichierPdf } from "../../../../../../../lib/demandes";
import { SANS_CACHE, UUID, accesDemandes, erreurJson, lireDemande } from "../../../../../../../lib/demandes-serveur";
// Les formulaires ONEM sont remplis par le code existant, tel quel (mise en page officielle inchangée).
import { POST as remplirC1 } from "../../../../../fill-c1/route";
import { POST as remplirC32 } from "../../../../../fill-c3-2/route";

export const dynamic = "force-dynamic";

/**
 * PDF d'une demande C1 ou C3.2 enregistrée, régénéré sur le serveur à partir du formulaire gardé
 * dans la colonne `data`. Les PDF d'affiliation et de mandat SEPA sont, eux, régénérés dans le
 * navigateur (même code que les formulaires). Super admin uniquement.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const acces = await accesDemandes();
  if ("refus" in acces) return acces.refus;
  const { type, id } = await params;
  if (!estTypeDemande(type) || !UUID.test(id)) return erreurJson("Demande introuvable.", 404);
  if (DEMANDES[type].pdf !== "serveur") return erreurJson("Ce PDF se régénère dans le navigateur.", 400);

  let demande: Record<string, unknown> | null;
  try {
    demande = await lireDemande(acces.db, type, id);
  } catch (err) {
    console.error("demandes (pdf) :", err instanceof Error ? err.message : "erreur");
    return erreurJson("La demande ne peut pas être chargée. Réessayez.", 500);
  }
  if (!demande) return erreurJson("Cette demande n'existe pas (ou plus).", 404);
  const formulaire = demande.data;
  if (!formulaire || typeof formulaire !== "object") {
    return erreurJson("Cette demande ne contient pas le formulaire complet : le PDF ne peut pas être reconstitué.", 422);
  }

  const remplir = type === "c1" ? remplirC1 : remplirC32;
  const reponse = await remplir(
    new Request("http://interne/fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formulaire),
    })
  );
  const { pdfBase64 } = (await reponse.json().catch(() => ({}))) as { pdfBase64?: string };
  if (!reponse.ok || !pdfBase64) {
    return erreurJson("Le PDF n'a pas pu être rempli à partir de cette demande. Réessayez.", 500);
  }

  const fichier = nomFichierPdf(type, demande.nom as string | null, demande.prenom as string | null, String(demande.created_at ?? ""));
  return new Response(Buffer.from(pdfBase64, "base64"), {
    headers: {
      ...SANS_CACHE,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fichier}"`,
    },
  });
}

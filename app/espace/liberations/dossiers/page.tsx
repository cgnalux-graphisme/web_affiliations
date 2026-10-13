import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { exigerLiberations, lignesDossiers, secteurs } from "../../../../lib/liberations/donnees-serveur";
import { Alerte, BTN_PRINCIPAL, EnteteEcran } from "../../_partage/ui";
import ListeDossiers from "./ListeDossiers";

export const metadata: Metadata = { title: "Libérations — Espace CG", robots: { index: false, follow: false } };

export default async function DossiersPage({ searchParams }: { searchParams: Promise<{ statut?: string; vue?: string }> }) {
  const c = await exigerLiberations();
  const [r, listeSecteurs, { statut, vue }] = await Promise.all([lignesDossiers(c), secteurs(), searchParams]);
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="calendar-check" titre="Dossiers de libération"
        description={c.admin
          ? "Toutes les demandes de libération, de la demande du permanent jusqu'à l'archive."
          : "Vos demandes de libération et leur avancement."}
        actions={<Link href="/espace/liberations/nouvelle" className={BTN_PRINCIPAL}><Plus size={18} aria-hidden /> Nouvelle demande</Link>} />
      {r.ok ? (
        <ListeDossiers lignes={r.lignes} secteurs={listeSecteurs} admin={c.admin} statutInitial={statut ?? ""} archives={vue === "archives"} />
      ) : (
        <Alerte ton="erreur" titre="Liste indisponible">
          {r.tablesAbsentes ? "Les tables des libérations ne sont pas encore créées (migration 20261013130000)." : "La base n'a pas répondu. Rechargez la page."}
        </Alerte>
      )}
    </div>
  );
}

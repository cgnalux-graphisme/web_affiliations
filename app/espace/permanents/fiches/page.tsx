import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { exigerApp } from "../../../../lib/espace/acces";
import { lignesFiches, secteursListe } from "../../../../lib/fiches-suivi/donnees-serveur";
import { Alerte, BTN_PRINCIPAL, EnteteEcran } from "../../_partage/ui";
import ListeFiches from "./ListeFiches";

export const metadata: Metadata = { title: "Fiches de suivi — Espace CG", robots: { index: false, follow: false } };

export default async function FichesPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const user = await exigerApp("permanents");
  const [r, secteurs, { vue }] = await Promise.all([lignesFiches(), secteursListe(), searchParams]);
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="clipboard" titre="Fiches de suivi"
        description="Un moment de l'action syndicale par fiche : l'historique des entreprises et la matière du rapport de congrès."
        actions={<Link href="/espace/permanents/fiches/nouvelle" className={BTN_PRINCIPAL}><Plus size={18} aria-hidden /> Nouvelle fiche</Link>} />
      {r.ok ? (
        <ListeFiches lignes={r.lignes} secteurs={secteurs} moi={user.id} mesParDefaut={vue === "mes"} />
      ) : (
        <Alerte ton="erreur" titre="Liste indisponible">
          {r.tablesAbsentes ? "Les tables des fiches ne sont pas encore créées (migration 20261013120000)." : "La base n'a pas répondu. Rechargez la page."}
        </Alerte>
      )}
    </div>
  );
}

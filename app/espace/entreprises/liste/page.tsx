import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { exigerApp } from "../../../../lib/espace/acces";
import { chargerListe } from "../../../../lib/entreprises/donnees-serveur";
import { Alerte, BTN, BTN_PRINCIPAL, EnteteEcran } from "../../_partage/ui";
import ListeEntreprises from "./ListeEntreprises";

export const metadata: Metadata = { title: "Entreprises — Espace CG", robots: { index: false, follow: false } };

export default async function ListePage() {
  await exigerApp("entreprises");
  const r = await chargerListe();

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="building"
        titre="Entreprises"
        description={r.ok ? `${r.lignes.length} entreprise${r.lignes.length > 1 ? "s" : ""}, dont ${r.lignes.filter((l) => l.horsCgLink).length} hors CG Link.` : undefined}
        actions={
          <>
            <Link href="/espace/entreprises/bce" className={BTN}>
              <Upload size={18} aria-hidden /> Import BCE
            </Link>
            <Link href="/espace/entreprises/nouvelle" className={BTN_PRINCIPAL}>
              <Plus size={18} aria-hidden /> Nouvelle entreprise
            </Link>
          </>
        }
      />
      {r.ok ? (
        <ListeEntreprises lignes={r.lignes} secteurs={r.secteurs} />
      ) : (
        <Alerte ton="erreur" titre="Liste indisponible">
          {r.tablesAbsentes
            ? "Les tables de l'app ne sont pas encore créées (migration 20261012120000)."
            : "La base n'a pas répondu. Rechargez la page dans un instant."}
        </Alerte>
      )}
    </div>
  );
}

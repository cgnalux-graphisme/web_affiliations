import type { Metadata } from "next";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { EnteteEcran, Panneau } from "../../_partage/ui";
import BoutonImport from "./BoutonImport";

/** L'import enchaîne quelques centaines d'écritures : marge de durée pour la fonction serveur. */
export const maxDuration = 120;

export const metadata: Metadata = { title: "Import CG Link — Espace CG", robots: { index: false, follow: false } };

export default async function ImportPage() {
  await exigerSuperAdmin();
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="upload" titre="Importer les délégués de CG Link"
        description="Reprend les délégués de CG Link et leurs mandats (début : 13/05/2024). Un délégué déjà importé n'est ni recréé ni modifié : l'import peut être relancé." />
      <Panneau>
        <BoutonImport />
      </Panneau>
    </div>
  );
}

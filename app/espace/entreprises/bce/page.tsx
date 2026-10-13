import type { Metadata } from "next";
import { exigerApp } from "../../../../lib/espace/acces";
import { chargerListe } from "../../../../lib/entreprises/donnees-serveur";
import { Alerte, EnteteEcran } from "../../_partage/ui";
import ImportGroupe from "./ImportGroupe";

/** La lecture de la BCE peut prendre jusqu'à 45 s (deux lectures pour un enregistrement). */
export const maxDuration = 120;

export const metadata: Metadata = { title: "Import BCE — Espace CG", robots: { index: false, follow: false } };

export default async function ImportBcePage() {
  await exigerApp("entreprises");
  const r = await chargerListe();
  const fiches = r.ok ? r.lignes.filter((l) => l.numeroBce).map((l) => ({ cle: l.cle, nom: l.nom })) : [];
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="upload" titre="Import BCE de toutes les fiches"
        description="Les fiches qui ont un n° d'entreprise sont comparées une à une avec la BCE (3 secondes entre deux ; si la BCE demande une vérification anti-robot, pause de 30 secondes puis nouvel essai). Rien n'est enregistré sans votre validation." />
      {r.ok ? <ImportGroupe fiches={fiches} sansNumero={r.lignes.length - fiches.length} /> : <Alerte ton="erreur">La liste n'a pas pu être lue. Rechargez la page.</Alerte>}
    </div>
  );
}

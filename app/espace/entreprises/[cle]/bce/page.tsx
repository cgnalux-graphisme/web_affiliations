import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigerApp } from "../../../../../lib/espace/acces";
import { lireCle } from "../../../../../lib/entreprises/regles";
import { EnteteEcran } from "../../../_partage/ui";
import ComparaisonBce from "./ComparaisonBce";

/** La lecture de la BCE peut prendre jusqu'à 45 s (deux lectures pour un enregistrement). */
export const maxDuration = 120;

export const metadata: Metadata = { title: "Import BCE — Espace CG", robots: { index: false, follow: false } };

export default async function BcePage({ params }: { params: Promise<{ cle: string }> }) {
  await exigerApp("entreprises");
  const { cle } = await params;
  if (!lireCle(cle)) notFound();
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="upload" titre="Importer depuis la BCE"
        description="Comparez les données de la BCE avec la fiche, puis cochez ce qu'il faut enregistrer. Rien n'est supprimé." />
      <ComparaisonBce cle={cle} />
    </div>
  );
}

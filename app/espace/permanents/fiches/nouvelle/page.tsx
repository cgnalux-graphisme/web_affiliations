import type { Metadata } from "next";
import { exigerApp } from "../../../../../lib/espace/acces";
import { entreprisesChoix } from "../../../../../lib/fiches-suivi/donnees-serveur";
import { EnteteEcran } from "../../../_partage/ui";
import ChoixType from "./ChoixType";

export const metadata: Metadata = { title: "Nouvelle fiche de suivi — Espace CG", robots: { index: false, follow: false } };

export default async function NouvellePage({ searchParams }: { searchParams: Promise<{ entreprise?: string }> }) {
  await exigerApp("permanents");
  const { entreprise } = await searchParams;
  const e = entreprise ? (await entreprisesChoix()).find((x) => x.id === entreprise) : undefined;
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="plus" titre="Nouvelle fiche de suivi"
        description={e ? `Pour ${e.nom}. Choisissez le type d'événement : la fiche est créée en brouillon, vous la complétez ensuite.`
          : "Choisissez le type d'événement : la fiche est créée en brouillon, vous la complétez ensuite."} />
      <ChoixType entrepriseId={e?.id} />
    </div>
  );
}

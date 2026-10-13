import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { exigerApp } from "../../../../../../lib/espace/acces";
import { chargerFicheSuivi, entreprisesChoix, secteursListe } from "../../../../../../lib/fiches-suivi/donnees-serveur";
import { monPerimetre } from "../../../../../../lib/permanents/perimetre-serveur";
import EditeurFiche from "./EditeurFiche";

export const metadata: Metadata = { title: "Modifier la fiche de suivi — Espace CG", robots: { index: false, follow: false } };

export default async function ModifierPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etape?: string }>;
}) {
  await exigerApp("permanents");
  const [{ id }, { etape }] = await Promise.all([params, searchParams]);
  const [lue, entreprises, secteurs, perimetre] = await Promise.all([chargerFicheSuivi(id), entreprisesChoix(), secteursListe(), monPerimetre()]);
  if (!lue) notFound();
  // Seuls l'auteur et un SUPER_ADMIN modifient : les autres lisent la fiche.
  if (!lue.modifiable) redirect(`/espace/permanents/fiches/${id}`);
  return (
    <EditeurFiche fiche={lue.fiche} entreprises={entreprises} secteurs={secteurs}
      mesEntreprises={[...perimetre.ficheIds]} etapeInitiale={Math.min(4, Math.max(0, Number(etape) || 0))} />
  );
}

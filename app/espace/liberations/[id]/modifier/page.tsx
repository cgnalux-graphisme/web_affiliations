import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  chargerDossier, deleguesChoix, entreprises, exigerLiberations, lieux, secteurs,
} from "../../../../../lib/liberations/donnees-serveur";
import EditeurDossier from "./EditeurDossier";

export const metadata: Metadata = { title: "Demande de libération — Espace CG", robots: { index: false, follow: false } };

export default async function ModifierPage({ params }: { params: Promise<{ id: string }> }) {
  const c = await exigerLiberations();
  const { id } = await params;
  const lu = await chargerDossier(id, c);
  if (!lu) notFound();
  if (!lu.droits.modifiable) redirect(`/espace/liberations/${id}`);
  const [listeLieux, listeSecteurs, listeEntreprises, delegues] = await Promise.all([lieux(), secteurs(), entreprises(), deleguesChoix(c)]);
  // Lieux proposés : les actifs, plus celui du dossier s'il a été désactivé depuis.
  const proposes = (listeLieux ?? []).filter((l) => l.actif || l.id === lu.dossier.lieu_id);
  return (
    <EditeurDossier dossier={lu.dossier} droits={lu.droits} lieux={proposes} secteurs={listeSecteurs}
      entreprises={listeEntreprises} delegues={delegues} admin={c.admin} />
  );
}

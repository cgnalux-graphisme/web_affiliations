import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { estTypeDemande } from "../../../../../lib/demandes";
import { getSuperAdmin } from "../../../../../lib/supabase-server";
import DetailDemande from "./DetailDemande";

export const metadata: Metadata = {
  title: "Demande — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Une demande : toutes ses informations et son PDF. Les données sont lues par /api/admin/demandes. */
export default async function DemandePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ retour?: string }>;
}) {
  const { type, id } = await params;
  const { retour } = await searchParams;
  if (!(await getSuperAdmin())) redirect(`/login?next=/suivi-actions/demandes/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
  if (!estTypeDemande(type) || !UUID.test(id)) notFound();

  // Retour à la liste avec les mêmes filtres (paramètres de liste uniquement).
  const filtres = new URLSearchParams(retour ?? "");
  const propres = new URLSearchParams();
  for (const cle of ["type", "q", "du", "au", "tri", "page"]) {
    const v = filtres.get(cle);
    if (v) propres.set(cle, v.slice(0, 100));
  }
  if (!propres.get("type")) propres.set("type", type);

  return <DetailDemande type={type} id={id} retour={`/suivi-actions/demandes?${propres.toString()}`} />;
}

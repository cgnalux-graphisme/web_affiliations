import type { Metadata } from "next";
import { estTri, estTypeDemande } from "../../../../lib/demandes";
import { exigerApp } from "../../../../lib/espace/acces";
import ListeDemandes from "./ListeDemandes";

export const metadata: Metadata = {
  title: "Demandes — Espace CG",
  robots: { index: false, follow: false },
};

type Params = { type?: string; q?: string; du?: string; au?: string; tri?: string; page?: string };

/** Historique des formulaires en ligne (données personnelles : lues par les routes /api/admin/demandes). */
export default async function DemandesPage({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerApp("demarches");
  const p = await searchParams;
  return (
    <ListeDemandes
      initial={{
        type: estTypeDemande(p.type) ? p.type : "affiliation",
        q: p.q ?? "",
        du: p.du ?? "",
        au: p.au ?? "",
        tri: estTri(p.tri) ? p.tri : "date_desc",
        page: Math.max(1, Number.parseInt(p.page ?? "1", 10) || 1),
      }}
    />
  );
}

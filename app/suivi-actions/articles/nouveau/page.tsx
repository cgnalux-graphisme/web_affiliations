import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";
import FormulaireArticle, { type PreRemplissage } from "../FormulaireArticle";

export const metadata: Metadata = {
  title: "Nouvel article — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nouvel article ; avec ?veille=<id>, pré-rempli depuis un item de la veille (titre + lien en source). */
export default async function NouvelArticlePage({ searchParams }: { searchParams: Promise<{ veille?: string }> }) {
  const { veille } = await searchParams;
  if (!(await getSuperAdmin())) {
    redirect(`/login?next=${encodeURIComponent(`/suivi-actions/articles/nouveau${veille ? `?veille=${veille}` : ""}`)}`);
  }

  let preRemplissage: PreRemplissage | undefined;
  if (veille && UUID.test(veille)) {
    const supabase = await getSupabaseServer();
    const { data } = await supabase.from("site_veille").select("titre, lien, source_nom").eq("id", veille).maybeSingle();
    if (data) {
      preRemplissage = {
        titre: data.titre,
        sources: data.source_nom ? `${data.source_nom} – ${data.lien}` : data.lien,
      };
    }
  }

  return <FormulaireArticle key={veille ?? "vide"} preRemplissage={preRemplissage} />;
}

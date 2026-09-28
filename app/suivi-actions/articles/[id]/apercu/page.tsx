import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { STATUT_PUBLIE } from "../../../../../lib/articles";
import { getSuperAdmin, getSupabaseServer } from "../../../../../lib/supabase-server";
import VueArticle, { type ArticleAffiche } from "../../../../blog/VueArticle";

export const metadata: Metadata = {
  title: "Aperçu d'un article — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** L'article tel qu'il apparaîtra sur le site, brouillon compris. */
export default async function ApercuArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSuperAdmin())) redirect(`/login?next=/suivi-actions/articles/${encodeURIComponent(id)}/apercu`);
  if (!UUID.test(id)) notFound();

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_articles")
    .select("titre, statut, chapo, points_cles, contenu, image_couverture, sources, date_publication")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Chargement de l'article impossible : ${error.message}`);
  if (!data) notFound();
  const article = data as ArticleAffiche & { statut: string };

  return (
    <div className="-mx-4 -my-8 sm:-mx-6 lg:-mx-10">
      <div className="flex flex-wrap items-center gap-3 border-b-4 border-militant-rouge px-4 py-3 sm:px-6 lg:px-10">
        <p className="flex items-center gap-2 font-bold">
          <Eye size={18} aria-hidden />
          Aperçu : {article.statut === STATUT_PUBLIE ? "article publié" : "brouillon, invisible sur le site"}
        </p>
        <Link
          href={`/suivi-actions/articles/${id}/modifier`}
          className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-militant-charbon px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          <Pencil size={14} aria-hidden /> Modifier
        </Link>
      </div>
      <VueArticle article={article} />
    </div>
  );
}

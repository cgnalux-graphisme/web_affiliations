import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Share2 } from "lucide-react";
import { STATUT_PUBLIE } from "../../../../../lib/articles";
import { getSuperAdmin, getSupabaseServer } from "../../../../../lib/supabase-server";
import { SuppressionArticle } from "../../BoutonsArticle";
import FormulaireArticle, { type ArticleEnregistre } from "../../FormulaireArticle";

export const metadata: Metadata = {
  title: "Modifier un article — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ModifierArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ image?: string }>;
}) {
  const { id } = await params;
  const { image } = await searchParams;
  if (!(await getSuperAdmin())) redirect(`/login?next=/suivi-actions/articles/${encodeURIComponent(id)}/modifier`);
  if (!UUID.test(id)) notFound();

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_articles")
    .select("id, titre, slug, chapo, points_cles, contenu, image_couverture, sources, statut, date_publication")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Chargement de l'article impossible : ${error.message}`);
  if (!data) notFound();
  const article = data as ArticleEnregistre;

  return (
    <>
      {image === "erreur" && (
        <div role="alert" className="mx-auto mb-6 flex max-w-3xl items-start gap-2.5 rounded-xl border-2 border-militant-bordeaux px-4 py-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
          <p>
            <span className="font-bold text-militant-bordeaux">L&apos;article est enregistré, mais pas l&apos;image de couverture.</span>{" "}
            Choisissez-la à nouveau puis enregistrez. Si le problème persiste, reconnectez-vous.
          </p>
        </div>
      )}
      {article.statut === STATUT_PUBLIE && (
        <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-militant-ardoise px-4 py-3">
          <p className="text-sm">Article publié : déclinez-le en posts Facebook, Instagram, TikTok et YouTube.</p>
          <Link
            href={`/suivi-actions/articles/${article.id}/reseaux`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-militant-bordeaux px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
          >
            <Share2 size={16} aria-hidden /> Décliner pour les réseaux
          </Link>
        </div>
      )}
      <FormulaireArticle key={article.id} article={article} />
      <div className="mt-12">
        <SuppressionArticle
          article={{
            id: article.id,
            titre: article.titre,
            slug: article.slug,
            statut: article.statut,
            image_couverture: article.image_couverture,
            date_publication: article.date_publication,
            aContenu: Boolean(article.contenu?.trim()),
          }}
        />
      </div>
    </>
  );
}

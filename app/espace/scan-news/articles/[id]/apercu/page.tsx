import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { Alerte, BTN, BTN_PETIT } from "../../../../_partage/ui";
import { STATUT_PUBLIE, categorieDe } from "../../../../../../lib/articles";
import { getSupabaseServer } from "../../../../../../lib/supabase-server";
import { exigerApp } from "../../../../../../lib/espace/acces";
import VueArticle, { type ArticleAffiche } from "../../../../../blog/VueArticle";

export const metadata: Metadata = {
  title: "Aperçu d'un article — Espace CG",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** L'article tel qu'il apparaîtra sur le site, brouillon compris. */
export default async function ApercuArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigerApp("scan-news");
  if (!UUID.test(id)) notFound();

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_articles")
    .select("titre, statut, chapo, points_cles, contenu, image_couverture, sources, date_publication, categorie")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Chargement de l'article impossible : ${error.message}`);
  if (!data) notFound();
  const article = data as ArticleAffiche & { statut: string; categorie: string | null };

  return (
    <div className="ecg-ecran">
      <Alerte ton={article.statut === STATUT_PUBLIE ? "info" : "attention"} icone={article.statut === STATUT_PUBLIE ? Eye : EyeOff} role={null}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <b className="mr-auto">
            Aperçu : {article.statut === STATUT_PUBLIE ? "article publié" : "brouillon, invisible sur le site"}
          </b>
          <Link href={`/espace/scan-news/articles/${id}/modifier`} className={`${BTN} ${BTN_PETIT}`}>
            <Pencil size={14} aria-hidden /> Modifier
          </Link>
        </div>
      </Alerte>
      {/* La page publique telle quelle, posée dans un cadre. */}
      <div className="ecg-panneau">
        <VueArticle article={article} categorie={categorieDe(article.categorie)} />
      </div>
    </div>
  );
}

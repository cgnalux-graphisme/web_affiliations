import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { Alerte } from "../../../../_partage/ui";
import { BUCKET_NOTES, STATUT_PUBLIE, categorieDe } from "../../../../../../lib/articles";
import { getSupabaseService } from "../../../../../../lib/supabase-service";
import { getSupabaseServer } from "../../../../../../lib/supabase-server";
import { exigerApp } from "../../../../../../lib/espace/acces";
import { SuppressionArticle } from "../../BoutonsArticle";
import FormulaireArticle, { type ArticleEnregistre } from "../../FormulaireArticle";

export const metadata: Metadata = {
  title: "Modifier un article — Espace CG",
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
  await exigerApp("scan-news");
  if (!UUID.test(id)) notFound();

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_articles")
    .select("id, titre, slug, chapo, points_cles, contenu, image_couverture, sources, statut, date_publication, categorie, document_source")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Chargement de l'article impossible : ${error.message}`);
  if (!data) notFound();
  const article = data as ArticleEnregistre;

  // Note FGTB d'origine (On vous explique) : bucket privé, lien temporaire créé côté serveur (1 h).
  let lienNote: string | null = null;
  if (article.document_source) {
    const { data: signe } = (await getSupabaseService()?.storage.from(BUCKET_NOTES).createSignedUrl(article.document_source, 3600, { download: true })) ?? {};
    lienNote = signe?.signedUrl ?? null;
  }

  return (
    <div className="ecg-pile ecg-ecran-etroit">
      {image === "erreur" && (
        <Alerte ton="attention" role="alert" titre="L'article est enregistré, mais pas l'image de couverture.">
          Choisissez-la à nouveau puis enregistrez. Si le problème persiste, reconnectez-vous.
        </Alerte>
      )}
      {article.statut === STATUT_PUBLIE && (
        <Alerte ton="info" icone={Share2} role={null}>
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>Article publié : déclinez-le en posts Facebook, Instagram, TikTok et YouTube.</span>
            <Link href={`/espace/scan-news/articles/${article.id}/reseaux`} className="ecg-btn ecg-btn-petit">
              <Share2 size={15} aria-hidden /> Décliner pour les réseaux
            </Link>
          </span>
        </Alerte>
      )}
      <FormulaireArticle key={article.id} article={article} lienNote={lienNote} />
      <div className="mt-2">
        <SuppressionArticle
          article={{
            id: article.id,
            titre: article.titre,
            slug: article.slug,
            statut: article.statut,
            image_couverture: article.image_couverture,
            date_publication: article.date_publication,
            aContenu: Boolean(article.contenu?.trim()),
            categorie: categorieDe(article.categorie),
          }}
        />
      </div>
    </div>
  );
}

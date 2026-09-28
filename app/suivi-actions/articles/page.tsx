import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, ExternalLink, Eye, FileText, Globe, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { STATUT_PUBLIE, dateArticle } from "../../../lib/articles";
import { getSuperAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import { BoutonPublication, SuppressionArticle } from "./BoutonsArticle";

export const metadata: Metadata = {
  title: "Articles — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

type LigneArticle = {
  id: string;
  titre: string;
  slug: string;
  statut: string;
  date_publication: string | null;
  image_couverture: string | null;
  contenu: string | null;
};

export default async function ListeArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; supprime?: string }>;
}) {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/articles");
  const { enregistre, supprime } = await searchParams;

  const supabase = await getSupabaseServer();
  // Brouillons sans date en tête (travail en cours), puis du plus récent au plus ancien.
  const { data, error } = await supabase
    .from("site_articles")
    .select("id, titre, slug, statut, date_publication, image_couverture, contenu")
    .order("date_publication", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  const articles = (data ?? []) as LigneArticle[];
  const publies = articles.filter((a) => a.statut === STATUT_PUBLIE).length;
  const articleEnregistre = enregistre ? articles.find((a) => a.id === enregistre) : undefined;
  const maintenant = Date.now();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-[6px] border-militant-charbon pb-5">
        <div>
          <h1 className="font-condensed text-5xl font-extrabold leading-none tracking-tight">Articles</h1>
          {!error && (
            <p className="mt-2 text-base">
              {articles.length} article{articles.length > 1 ? "s" : ""}, dont {publies} publié{publies > 1 ? "s" : ""} dans
              Actualités.
            </p>
          )}
        </div>
        <Link
          href="/suivi-actions/articles/nouveau"
          className="inline-flex items-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
        >
          <Plus size={18} aria-hidden /> Écrire un article
        </Link>
      </div>

      {articleEnregistre && (
        <div role="status" className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-militant-bordeaux px-4 py-3 text-white">
          <CheckCircle size={20} className="shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            Article enregistré : <span className="font-bold">{articleEnregistre.titre}</span>
          </p>
          {articleEnregistre.statut === STATUT_PUBLIE && (
            <Link
              href={`/blog/${articleEnregistre.slug}`}
              className="inline-flex items-center gap-1.5 font-bold underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Voir sur le site <ExternalLink size={15} aria-hidden />
            </Link>
          )}
        </div>
      )}

      {supprime && (
        <div role="status" className="mt-6 flex items-center gap-3 rounded-xl bg-militant-bordeaux px-4 py-3 text-white">
          <Trash2 size={20} className="shrink-0" aria-hidden />
          <p>
            Article supprimé : <span className="font-bold">{supprime}</span>
          </p>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          La liste des articles ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
      ) : articles.length === 0 ? (
        <div className="mt-10 border-l-[6px] border-militant-rouge py-2 pl-5">
          <p className="font-condensed text-3xl font-bold">Aucun article pour l&apos;instant.</p>
          <p className="mt-2 text-lg">Écrivez le premier : il restera en brouillon tant que vous ne le publiez pas.</p>
        </div>
      ) : (
        <>
          <div
            aria-hidden
            className="mt-6 hidden grid-cols-[7.5rem_minmax(0,1fr)_8rem_auto] gap-4 px-4 pb-2 text-sm font-bold md:grid"
          >
            <span>Date</span>
            <span>Article</span>
            <span>Statut</span>
            <span className="w-[22rem]">Gestion</span>
          </div>
          <ul className="mt-6 divide-y divide-militant-ardoise border-y border-militant-ardoise md:mt-0">
            {articles.map((a) => {
              const publie = a.statut === STATUT_PUBLIE;
              const programme =
                publie && a.date_publication !== null && new Date(a.date_publication).getTime() > maintenant;
              const cible = {
                id: a.id,
                titre: a.titre,
                slug: a.slug,
                statut: a.statut,
                image_couverture: a.image_couverture,
                date_publication: a.date_publication,
                aContenu: Boolean(a.contenu?.trim()),
              };
              return (
                <li
                  key={a.id}
                  className={`grid grid-cols-1 items-center gap-x-4 gap-y-3 px-4 py-4 md:grid-cols-[7.5rem_minmax(0,1fr)_8rem_auto] ${
                    a.id === articleEnregistre?.id ? "border-l-[6px] border-militant-rouge" : ""
                  }`}
                >
                  <p className="font-condensed text-xl font-bold tabular-nums">
                    {dateArticle(a.date_publication) || <span className="text-base font-semibold">Sans date</span>}
                  </p>
                  <div className="min-w-0">
                    <p className="break-words text-[17px] font-bold leading-snug">{a.titre}</p>
                    {publie ? (
                      <Link
                        href={`/blog/${a.slug}`}
                        className="mt-0.5 inline-flex max-w-full items-center gap-1 text-sm underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
                      >
                        <span className="truncate">/blog/{a.slug}</span>
                        <ExternalLink size={13} className="shrink-0" aria-hidden />
                      </Link>
                    ) : (
                      <Link
                        href={`/suivi-actions/articles/${a.id}/apercu`}
                        className="mt-0.5 inline-flex items-center gap-1 text-sm underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
                      >
                        <Eye size={13} aria-hidden /> Aperçu du brouillon
                      </Link>
                    )}
                  </div>
                  <p>
                    {publie ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-militant-bordeaux px-3 py-1 text-sm font-bold text-white">
                        <Globe size={14} aria-hidden /> {programme ? "Programmé" : "Publié"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-militant-ardoise px-3 py-0.5 text-sm font-bold">
                        <FileText size={14} aria-hidden /> Brouillon
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-start gap-2 md:w-[22rem] md:justify-end">
                    <Link
                      href={`/suivi-actions/articles/${a.id}/modifier`}
                      aria-label={`Modifier : ${a.titre}`}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-militant-charbon px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                    >
                      <Pencil size={14} aria-hidden /> Modifier
                    </Link>
                    {publie && (
                      <Link
                        href={`/suivi-actions/articles/${a.id}/reseaux`}
                        aria-label={`Décliner pour les réseaux : ${a.titre}`}
                        title="Décliner pour les réseaux"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-militant-charbon px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                      >
                        <Share2 size={14} aria-hidden /> Réseaux
                      </Link>
                    )}
                    <BoutonPublication article={cible} />
                    <SuppressionArticle article={cible} compact />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

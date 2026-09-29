import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import {
  CATEGORIE_EXPLICATION,
  RUBRIQUES,
  cheminActualites,
  dateArticle,
  lignes,
  lireReferences,
  lireSources,
  tempsLecture,
  type Categorie,
  type Reference,
} from "../../lib/articles";
import { nettoyerContenu } from "../../lib/articles-html";
import { Pastille } from "./CartesArticles";

export type ArticleAffiche = {
  titre: string;
  chapo: string | null;
  points_cles: string | null;
  contenu: string | null;
  image_couverture: string | null;
  sources: string | null;
  date_publication: string | null;
};

/** Page d'un article ou d'une explication (site public, et aperçu dans l'espace admin). */
export default function VueArticle({ article, categorie = "article" }: { article: ArticleAffiche; categorie?: Categorie }) {
  const rubrique = RUBRIQUES[categorie];
  const retour = rubrique.retour;
  const lienRetour = cheminActualites(categorie);
  const points = lignes(article.points_cles);
  // « On vous explique » : une source peut être une simple référence (« Note FGTB 26I107F »), sans lien.
  const sources: Reference[] = categorie === CATEGORIE_EXPLICATION ? lireReferences(article.sources) : lireSources(article.sources);
  const contenu = nettoyerContenu(article.contenu);
  const minutes = tempsLecture(article.chapo, article.points_cles, article.contenu);

  return (
    <main className="bg-white font-barlow text-militant-charbon">
      <article className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <Link
          href={lienRetour}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          <ArrowLeft size={16} aria-hidden /> {retour}
        </Link>

        <header className="mt-6">
          <Pastille categorie={categorie} className="mb-4" />
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-condensed text-2xl font-bold">
            {article.date_publication ? (
              <time dateTime={article.date_publication} className="tabular-nums text-militant-rouge">
                {dateArticle(article.date_publication)}
              </time>
            ) : (
              <span className="text-militant-rouge">Pas encore de date</span>
            )}
            <span className="h-5 w-[3px] bg-militant-rouge" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <Clock size={20} aria-hidden />
              {minutes} min de lecture
            </span>
          </p>
          <h1 className="mt-4 break-words font-condensed text-5xl font-extrabold leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
            {article.titre}
          </h1>
        </header>

        {points.length > 0 && <EnBref points={points} />}

        {article.chapo && (
          <p className="mt-10 max-w-3xl text-xl font-semibold leading-snug sm:text-2xl">{article.chapo}</p>
        )}

        {article.image_couverture && (
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl bg-militant-ardoise">
            <Image
              src={article.image_couverture}
              alt=""
              fill
              priority
              sizes="(min-width: 896px) 832px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        {contenu && (
          <div className="article-contenu mt-10 max-w-[68ch]" dangerouslySetInnerHTML={{ __html: contenu }} />
        )}

        {sources.length > 0 && (
          <section aria-labelledby="titre-sources" className="mt-16 max-w-3xl">
            <h2
              id="titre-sources"
              className="border-b-[6px] border-militant-charbon pb-2 font-condensed text-3xl font-extrabold uppercase leading-none"
            >
              Sources
            </h2>
            <ol className="mt-2 divide-y divide-militant-ardoise">
              {sources.map((s, i) => (
                <li key={`${s.url ?? s.libelle}-${i}`}>
                  {s.url === null ? (
                    // Référence sans lien (ex. « Note FGTB 26I107F »).
                    <p className="flex min-h-[44px] items-baseline gap-3 py-3">
                      <span className="w-6 shrink-0 font-condensed text-xl font-extrabold tabular-nums text-militant-rouge">
                        {i + 1}
                      </span>
                      <span className="min-w-0 break-words font-bold">{s.libelle}</span>
                    </p>
                  ) : (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[44px] items-baseline gap-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                  >
                    <span className="w-6 shrink-0 font-condensed text-xl font-extrabold tabular-nums text-militant-rouge">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 group-hover:text-militant-bordeaux">
                        {s.libelle}
                        <ExternalLink size={14} className="shrink-0" aria-hidden />
                        <span className="sr-only"> (nouvel onglet)</span>
                      </span>
                      <span className="mt-0.5 block break-all text-sm">{s.url}</span>
                    </span>
                  </a>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <aside className="mt-16 flex flex-col gap-5 rounded-2xl bg-militant-bordeaux p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p className="font-condensed text-3xl font-extrabold leading-none sm:text-4xl">
            Défendre vos droits, ça se fait ensemble.
          </p>
          <Link
            href="/affiliation"
            className="shrink-0 rounded-xl border-2 border-white bg-white px-6 py-3.5 text-center text-[17px] font-bold text-militant-bordeaux transition-colors hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-militant-bordeaux"
          >
            S&apos;affilier en ligne
          </Link>
        </aside>

        <Link
          href={lienRetour}
          className="mt-10 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          <ArrowLeft size={16} aria-hidden /> {retour}
        </Link>
      </article>
    </main>
  );
}

/** L'essentiel de l'article pour le lecteur pressé : la seule grande surface de couleur de la page. */
function EnBref({ points }: { points: string[] }) {
  return (
    <section
      aria-labelledby="titre-en-bref"
      className="mt-8 overflow-hidden rounded-2xl bg-militant-bordeaux text-white"
    >
      <div className="flex items-stretch">
        <div aria-hidden className="en-bref-filet w-3 shrink-0 bg-militant-rouge" />
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <h2 id="titre-en-bref" className="font-condensed text-4xl font-extrabold uppercase leading-none sm:text-5xl">
            En bref
          </h2>
          <ul className="mt-5 space-y-3">
            {points.map((p, i) => (
              <li key={i} className="flex gap-3.5 text-lg font-semibold leading-snug sm:text-xl">
                <span aria-hidden className="mt-[0.5em] h-2.5 w-2.5 shrink-0 bg-white" />
                <span className="min-w-0 break-words">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

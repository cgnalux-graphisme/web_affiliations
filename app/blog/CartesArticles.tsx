import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { RUBRIQUES, cheminPublic, dateArticle, tempsLecture, type Categorie } from "../../lib/articles";
import type { ArticlePublic } from "../../lib/articles-public";

/** La dernière publication, en grand. */
export function ArticleALaUne({ article: a, categorie = "article" }: { article: ArticlePublic; categorie?: Categorie }) {
  return (
    <article className="group relative grid gap-6 border-t-[6px] border-militant-charbon pt-6 lg:grid-cols-12 lg:gap-10">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-militant-ardoise lg:col-span-7">
        {a.image_couverture && (
          <Image
            src={a.image_couverture}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-col justify-center lg:col-span-5">
        <Meta article={a} grand />
        <h2 className="mt-3 break-words font-condensed text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-5xl">
          <Link
            href={cheminPublic(categorie, a.slug)}
            className="decoration-militant-rouge decoration-4 underline-offset-[6px] after:absolute after:inset-0 after:rounded-2xl group-hover:underline focus:outline-none focus-visible:after:ring-4 focus-visible:after:ring-militant-rouge"
          >
            {a.titre}
          </Link>
        </h2>
        {a.chapo && <p className="mt-4 text-lg leading-relaxed sm:text-xl">{a.chapo}</p>}
        <p aria-hidden className="mt-6 font-bold underline decoration-militant-rouge decoration-2 underline-offset-4">
          {RUBRIQUES[categorie].lire}
        </p>
      </div>
    </article>
  );
}

export function CarteArticle({ article: a, categorie = "article" }: { article: ArticlePublic; categorie?: Categorie }) {
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-militant-ardoise bg-white transition-colors hover:border-militant-bordeaux">
      <div className="relative aspect-[16/9] bg-militant-ardoise">
        {a.image_couverture && (
          <Image
            src={a.image_couverture}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col border-t-[6px] border-militant-rouge px-5 pb-6 pt-4">
        <Meta article={a} />
        <h3 className="mt-2 break-words font-condensed text-[28px] font-extrabold leading-none">
          <Link
            href={cheminPublic(categorie, a.slug)}
            className="decoration-militant-rouge decoration-[3px] underline-offset-4 after:absolute after:inset-0 after:rounded-2xl group-hover:underline focus:outline-none focus-visible:after:ring-4 focus-visible:after:ring-militant-rouge"
          >
            {a.titre}
          </Link>
        </h3>
        {a.chapo && <p className="mt-3 line-clamp-3 text-[16px] leading-relaxed">{a.chapo}</p>}
      </div>
    </article>
  );
}

/** Date de publication et temps de lecture. */
function Meta({ article: a, grand }: { article: ArticlePublic; grand?: boolean }) {
  const minutes = tempsLecture(a.chapo, a.points_cles, a.contenu);
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-condensed font-bold ${grand ? "text-2xl" : "text-xl"}`}>
      <time dateTime={a.date_publication} className="tabular-nums text-militant-rouge">
        {dateArticle(a.date_publication)}
      </time>
      <span className="h-4 w-[3px] bg-militant-rouge" aria-hidden />
      <span className="inline-flex items-center gap-1.5">
        <Clock size={grand ? 18 : 16} aria-hidden />
        {minutes} min de lecture
      </span>
    </p>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { chargerArticles } from "../../lib/articles-public";
import { CarteArticle } from "../blog/CartesArticles";

export const metadata: Metadata = {
  title: "On vous explique — Centrale Générale FGTB Namur – Luxembourg",
  description:
    "Les notes techniques de la FGTB expliquées simplement : de quoi il s'agit, ce qui change, la position de la FGTB et ce que ça change pour vous.",
};

// Une explication publiée depuis l'espace admin apparaît ici en moins d'une minute.
export const revalidate = 60;

/** « On vous explique » : uniquement les publications categorie = explication (vue site_articles_public). */
export default async function OnVousExpliquePage() {
  const { articles, erreur } = await chargerArticles("explication");

  return (
    <main className="bg-white font-barlow text-militant-charbon">
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <h1 className="font-condensed text-6xl font-extrabold uppercase leading-[0.85] tracking-tight sm:text-8xl">
          On vous explique
        </h1>
        <div className="mt-6 h-2 w-24 bg-militant-rouge" aria-hidden />
        <p className="mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
          Les notes techniques de la FGTB, traduites en langage clair : de quoi il s&apos;agit, ce qui change, la position de
          la FGTB et ce que ça change concrètement pour vous.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {erreur ? (
          <Encart titre="Les explications ne peuvent pas être affichées pour le moment.">Réessayez dans quelques minutes.</Encart>
        ) : articles.length === 0 ? (
          <Encart titre="Aucune explication publiée pour l'instant.">
            Les prochaines apparaîtront ici. En attendant,{" "}
            <Link
              href="/blog"
              className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
            >
              lisez nos actualités
            </Link>
            .
          </Encart>
        ) : (
          <ul className="grid gap-6 border-t-[6px] border-militant-charbon pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.id} className="flex">
                <CarteArticle article={a} categorie="explication" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Encart({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mt-4 border-l-[6px] border-militant-rouge py-2 pl-5">
      <p className="font-condensed text-3xl font-bold leading-tight">{titre}</p>
      <p className="mt-2 text-lg">{children}</p>
    </div>
  );
}

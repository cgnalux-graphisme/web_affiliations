import type { Metadata } from "next";
import Link from "next/link";
import { chargerArticles } from "../../lib/articles-public";
import { ArticleALaUne, CarteArticle } from "./CartesArticles";

export const metadata: Metadata = {
  title: "Actualités — Centrale Générale FGTB Namur – Luxembourg",
  description:
    "Analyses et informations de la Centrale Générale FGTB Namur – Luxembourg : emploi, salaires, droits des travailleurs.",
};

// Un article publié depuis l'espace admin apparaît ici en moins d'une minute.
export const revalidate = 60;

export default async function BlogPage() {
  const { articles, erreur } = await chargerArticles();
  const [une, ...autres] = articles;

  return (
    <main className="bg-white font-barlow text-militant-charbon">
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <h1 className="font-condensed text-6xl font-extrabold uppercase leading-[0.85] tracking-tight sm:text-8xl">
          Actualités
        </h1>
        <div className="mt-6 h-2 w-24 bg-militant-rouge" aria-hidden />
        <p className="mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
          Ce qui change pour les travailleurs, expliqué clairement. L&apos;essentiel en tête de chaque article, les
          sources en bas.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {erreur ? (
          <Encart titre="Les articles ne peuvent pas être affichés pour le moment.">Réessayez dans quelques minutes.</Encart>
        ) : !une ? (
          <Encart titre="Aucun article publié pour l'instant.">
            Les prochaines analyses apparaîtront ici. En attendant,{" "}
            <Link
              href="/actions"
              className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
            >
              découvrez nos actions
            </Link>
            .
          </Encart>
        ) : (
          <>
            <ArticleALaUne article={une} />
            {autres.length > 0 && (
              <section aria-labelledby="titre-precedents" className="mt-16 sm:mt-20">
                <h2
                  id="titre-precedents"
                  className="border-b-[6px] border-militant-charbon pb-2.5 font-condensed text-4xl font-extrabold uppercase leading-none sm:text-5xl"
                >
                  Articles précédents
                </h2>
                <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {autres.map((a) => (
                    <li key={a.id} className="flex">
                      <CarteArticle article={a} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
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

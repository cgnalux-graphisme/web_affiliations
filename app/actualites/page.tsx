import type { Metadata } from "next";
import { Suspense } from "react";
import { tempsLecture } from "../../lib/articles";
import { chargerPublications } from "../../lib/articles-public";
import { ListeActualites, ListeActualitesDepuisUrl } from "./ListeActualites";

export const metadata: Metadata = {
  title: "Actualités — Centrale Générale FGTB Namur – Luxembourg",
  description:
    "Analyses, informations et notes de la FGTB expliquées simplement par la Centrale Générale FGTB Namur – Luxembourg : emploi, salaires, droits des travailleurs.",
};

// Une publication depuis l'espace admin apparaît ici en moins d'une minute.
export const revalidate = 60;

/**
 * Page publique unifiée : les actualités (blog) et « On vous explique », mélangées de la plus récente
 * à la plus ancienne, filtrables dans le navigateur. Lecture via la vue site_articles_public uniquement.
 */
export default async function ActualitesPage() {
  const { articles: publications, erreur } = await chargerPublications();
  // Les cartes n'ont besoin ni du contenu ni des sources : liste allégée pour le navigateur.
  const articles = publications.map((a) => ({
    ...a,
    minutes: tempsLecture(a.chapo, a.points_cles, a.contenu),
    contenu: null,
    sources: null,
  }));

  return (
    <main className="bg-white font-barlow text-militant-charbon">
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <h1 className="font-condensed text-6xl font-extrabold uppercase leading-[0.85] tracking-tight sm:text-8xl">
          Actualités
        </h1>
        <div className="mt-6 h-2 w-24 bg-militant-rouge" aria-hidden />
        <p className="mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
          Ce qui change pour les travailleurs, expliqué clairement : nos analyses de l&apos;actualité et les notes
          techniques de la FGTB traduites en langage clair.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {erreur ? (
          <div role="status" className="mt-4 border-l-[6px] border-militant-rouge py-2 pl-5">
            <p className="font-condensed text-3xl font-bold leading-tight">
              Les publications ne peuvent pas être affichées pour le moment.
            </p>
            <p className="mt-2 text-lg">Réessayez dans quelques minutes.</p>
          </div>
        ) : (
          // Le filtre de l'adresse (?rubrique=) n'est connu que dans le navigateur : la page reste en cache,
          // la version « Tout » sert de rendu initial.
          <Suspense fallback={<ListeActualites articles={articles} />}>
            <ListeActualitesDepuisUrl articles={articles} />
          </Suspense>
        )}
      </div>
    </main>
  );
}

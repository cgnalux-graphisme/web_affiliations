"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FILTRES_PUBLICATIONS,
  categorieDe,
  cheminActualites,
  filtreDepuisParam,
  type FiltrePublications,
} from "../../lib/articles";
import type { ArticlePublic } from "../../lib/articles-public";
import { ArticleALaUne, CarteArticle } from "../blog/CartesArticles";

type Props = { articles: ArticlePublic[] };

/** Filtre pré-appliqué par `?rubrique=` (anciennes adresses /blog et /on-vous-explique, liens de retour). */
export function ListeActualitesDepuisUrl({ articles }: Props) {
  const filtre = filtreDepuisParam(useSearchParams().get("rubrique"));
  return <ListeActualites articles={articles} filtreInitial={filtre} />;
}

/** Les publications des deux rubriques, filtrées dans le navigateur (aucun rechargement). */
export function ListeActualites({ articles, filtreInitial = "tout" }: Props & { filtreInitial?: FiltrePublications }) {
  const [filtre, setFiltre] = useState<FiltrePublications>(filtreInitial);
  // Fondu seulement quand le lecteur change d'onglet (pas au chargement : la liste ne clignote pas).
  const [aChoisi, setAChoisi] = useState(false);
  const visibles = filtre === "tout" ? articles : articles.filter((a) => categorieDe(a.categorie) === filtre);
  const [une, ...autres] = visibles;

  function choisir(valeur: FiltrePublications) {
    setFiltre(valeur);
    setAChoisi(true);
    // L'adresse suit le filtre (partageable, retour arrière) sans recharger la page.
    window.history.replaceState(null, "", cheminActualites(valeur));
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SelecteurRubrique valeur={filtre} onChange={choisir} />
        <p aria-live="polite" className="text-[15px] font-semibold sm:text-right">
          {visibles.length} publication{visibles.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* La clé relance le léger fondu à chaque changement de filtre. */}
      <div key={filtre} className={`mt-8 ${aChoisi ? "liste-fondu" : ""}`}>
        {!une ? (
          <Vide filtre={filtre} onToutVoir={() => choisir("tout")} />
        ) : (
          <>
            <ArticleALaUne article={une} />
            {autres.length > 0 && (
              <section aria-labelledby="titre-precedents" className="mt-16 sm:mt-20">
                <h2
                  id="titre-precedents"
                  className="border-b-[6px] border-militant-charbon pb-2.5 font-condensed text-4xl font-extrabold uppercase leading-none sm:text-5xl"
                >
                  Publications précédentes
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
    </>
  );
}

/**
 * Sélecteur à segments : l'aplat rouge glisse sous l'onglet choisi. Sa position et sa largeur sont
 * mesurées sur le bouton actif (libellés de longueurs différentes), et recalculées si la taille change.
 */
function SelecteurRubrique({ valeur, onChange }: { valeur: FiltrePublications; onChange: (v: FiltrePublications) => void }) {
  const boutons = useRef<Map<FiltrePublications, HTMLButtonElement>>(new Map());
  const piste = useRef<HTMLDivElement>(null);
  const [indicateur, setIndicateur] = useState<{ x: number; largeur: number } | null>(null);

  useLayoutEffect(() => {
    const mesurer = () => {
      const b = boutons.current.get(valeur);
      if (b) setIndicateur({ x: b.offsetLeft, largeur: b.offsetWidth });
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    if (piste.current) observateur.observe(piste.current);
    return () => observateur.disconnect();
  }, [valeur]);

  // Le glissement ne s'active qu'après la première mesure : au chargement, l'aplat est déjà en place.
  const [anime, setAnime] = useState(false);
  useEffect(() => {
    if (!indicateur || anime) return;
    const id = requestAnimationFrame(() => setAnime(true));
    return () => cancelAnimationFrame(id);
  }, [indicateur, anime]);

  return (
    <div
      ref={piste}
      role="group"
      aria-label="Afficher les publications"
      className="relative flex w-full rounded-full border border-militant-ardoise bg-white p-1 sm:inline-flex sm:w-auto"
    >
      <span
        aria-hidden
        className={`${anime ? "segment-indicateur" : ""} absolute bottom-1 top-1 left-0 rounded-full bg-militant-rouge shadow-[0_2px_8px_rgba(227,33,25,0.35)] ${
          indicateur ? "opacity-100" : "opacity-0"
        }`}
        style={indicateur ? { width: indicateur.largeur, transform: `translateX(${indicateur.x}px)` } : undefined}
      />
      {FILTRES_PUBLICATIONS.map((f) => {
        const actif = f.valeur === valeur;
        return (
          <button
            key={f.valeur}
            ref={(el) => {
              if (el) boutons.current.set(f.valeur, el);
              else boutons.current.delete(f.valeur);
            }}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(f.valeur)}
            className={`relative z-10 min-h-[44px] flex-auto whitespace-nowrap rounded-full px-3 text-[15px] font-bold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-charbon focus-visible:ring-offset-2 sm:flex-none sm:px-6 sm:text-[16px] ${
              actif ? "text-white" : "text-militant-charbon hover:text-militant-bordeaux"
            } ${
              // Avant la première mesure, l'onglet actif porte lui-même l'aplat (pas de saut au chargement).
              actif && !indicateur ? "bg-militant-rouge" : ""
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function Vide({ filtre, onToutVoir }: { filtre: FiltrePublications; onToutVoir: () => void }) {
  const titre =
    filtre === "explication"
      ? "Aucune explication publiée pour l'instant."
      : filtre === "article"
        ? "Aucune actualité publiée pour l'instant."
        : "Aucune publication pour l'instant.";
  return (
    <div role="status" className="border-l-[6px] border-militant-rouge py-2 pl-5">
      <p className="font-condensed text-3xl font-bold leading-tight">{titre}</p>
      <p className="mt-2 text-lg">
        {filtre === "tout" ? (
          <>
            Les prochaines apparaîtront ici. En attendant,{" "}
            <Link
              href="/actions"
              className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
            >
              découvrez nos actions
            </Link>
            .
          </>
        ) : (
          <button
            type="button"
            onClick={onToutVoir}
            className="min-h-[44px] font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
          >
            Voir toutes les publications
          </button>
        )}
      </p>
    </div>
  );
}

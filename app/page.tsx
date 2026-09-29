import Image from "next/image";
import Link from "next/link";
import { ancreUne, titreAction } from "../lib/actions";
import { tempsLecture } from "../lib/articles";
import { chargerPublications } from "../lib/articles-public";
import { isoToDateFr } from "../lib/dates";
import { chargerMobilisationActive } from "../lib/mobilisations-public";
import { trierPhotos } from "../lib/photos";
import { getSupabase } from "../lib/supabase";
import { CarteArticle } from "./blog/CartesArticles";
import HeroMobilisation from "./HeroMobilisation";
import TuilesDemarches from "./TuilesDemarches";

// Une publication, une action ou un changement de mobilisation apparaît ici en moins d'une minute.
export const revalidate = 60;

type Action = {
  id: string;
  nom: string | null;
  date_action: string;
  ville: string | null;
  type_action: string;
  type_action_autre: string | null;
  participants_total: number | null;
  info_web: string | null;
  photo: string | null;
};

const NB_ACTIONS = 3;
const NB_ACTUS = 4;

/** Date du jour à Bruxelles (aaaa-mm-jj). */
function aujourdhuiIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
}

/** Dernières actions passées publiées (vues publiques uniquement) et leur photo principale. */
async function chargerDernieresActions(): Promise<Action[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_actions_public")
    .select("id, nom, date_action, ville, type_action, type_action_autre, participants_total, info_web")
    .lte("date_action", aujourdhuiIso())
    .order("date_action", { ascending: false })
    .limit(NB_ACTIONS);
  if (error || !data?.length) return [];
  const { data: photos } = await supabase
    .from("site_photos_public")
    .select("action_id, url")
    .in("action_id", data.map((a) => a.id));
  return data.map((a) => ({
    ...a,
    photo: trierPhotos((photos ?? []).filter((p) => p.action_id === a.id))[0]?.url ?? null,
  }));
}

const nombre = new Intl.NumberFormat("fr-BE");

export default async function Accueil() {
  const [mobilisation, actions, { articles }] = await Promise.all([
    chargerMobilisationActive(),
    chargerDernieresActions(),
    chargerPublications(NB_ACTUS),
  ]);
  // Les cartes n'ont besoin ni du contenu ni des sources.
  const actus = articles.map((a) => ({ ...a, minutes: tempsLecture(a.chapo, a.points_cles, a.contenu), contenu: null, sources: null }));
  const derniere = actions[0];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      {/* ── 1. Ouverture : la mobilisation mise en avant, sinon l'ouverture habituelle ── */}
      {mobilisation ? <HeroMobilisation m={mobilisation} /> : <OuvertureParDefaut action={derniere} />}

      {/* ── 2. Dernières actus ── */}
      {actus.length > 0 && (
        <section aria-labelledby="titre-actus" className="pt-8">
          <EnTeteSection id="titre-actus" titre="Actualités" lien="/actualites" libelleLien="Toutes les actualités" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {actus.map((a) => (
              <li key={a.id} className="flex">
                <CarteArticle article={a} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 3. Démarches ── */}
      <section aria-labelledby="titre-demarches" className="pt-16">
        <EnTeteSection id="titre-demarches" titre="Démarches en ligne" lien="/demarches" libelleLien="Toutes les démarches" />
        <TuilesDemarches />
      </section>

      {/* ── 4. Nos actions ── */}
      {actions.length > 0 && (
        <section aria-labelledby="titre-actions" className="pt-16">
          <EnTeteSection id="titre-actions" titre="Nos actions" lien="/actions" libelleLien="Toutes les actions" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((a, i) => (
              <li key={a.id} className={`flex ${i === 2 ? "sm:hidden lg:flex" : ""}`}>
                <CarteAction action={a} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function EnTeteSection({ id, titre, lien, libelleLien }: { id: string; titre: string; lien: string; libelleLien: string }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b-[6px] border-militant-charbon pb-2.5">
      <h2 id={id} className="font-condensed text-4xl font-extrabold uppercase leading-none sm:text-6xl">
        {titre}
      </h2>
      <Link href={lien} className="text-[17px] font-bold hover:text-militant-bordeaux">
        {libelleLien}
      </Link>
    </div>
  );
}

function CarteAction({ action: a }: { action: Action }) {
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-militant-ardoise bg-white transition-colors hover:border-militant-bordeaux">
      <div className="relative aspect-[3/2] bg-militant-ardoise">
        {a.photo && (
          <Image
            src={a.photo}
            alt=""
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col border-t-[6px] border-militant-rouge px-5 pb-6 pt-4">
        <p className="font-condensed text-xl font-bold text-militant-bordeaux">
          <span className="tabular-nums">{isoToDateFr(a.date_action)}</span>
          {a.ville && <span className="text-militant-charbon"> {a.ville}</span>}
        </p>
        <h3 className="mt-1.5 break-words font-condensed text-[28px] font-extrabold leading-none">
          <Link
            href={`/actions#${ancreUne(a.id)}`}
            className="decoration-militant-rouge decoration-[3px] underline-offset-4 after:absolute after:inset-0 after:rounded-2xl group-hover:underline focus:outline-none focus-visible:after:ring-4 focus-visible:after:ring-militant-rouge"
          >
            {titreAction(a)}
          </Link>
        </h3>
        {a.participants_total != null && a.participants_total > 0 && (
          <p className="mt-auto pt-4 font-condensed text-3xl font-extrabold">
            {nombre.format(a.participants_total).replace(/ /g, " ")}{" "}
            <span className="font-barlow text-base font-semibold">participants</span>
          </p>
        )}
      </div>
    </article>
  );
}

/** Ouverture habituelle de l'accueil (aucune mobilisation affichée). */
function OuvertureParDefaut({ action }: { action?: Action }) {
  return (
    <section className="grid gap-8 py-12 lg:grid-cols-12 lg:gap-6 lg:py-16">
      <div className="flex flex-col justify-center lg:col-span-8">
        <h1 className="font-condensed text-6xl font-extrabold uppercase leading-[0.86] tracking-tight sm:text-8xl lg:text-[112px]">
          Sur le terrain,
          <br />
          avec vous.
        </h1>
        <div className="my-7 h-2 w-24 bg-militant-rouge" aria-hidden />
        <p className="max-w-2xl text-lg leading-relaxed sm:text-xl">
          Construction, bois, verre, chimie, nettoyage… Nous défendons les travailleurs de nos secteurs, dans
          l&apos;entreprise et dans la rue. Et vos démarches se font en ligne, en quelques minutes.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/affiliation"
            className="rounded-xl bg-militant-bordeaux px-6 py-4 text-center text-[17px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
          >
            S&apos;affilier en ligne
          </Link>
          <Link
            href="/actions"
            className="rounded-xl border-2 border-militant-charbon px-6 py-3.5 text-center text-[17px] font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
          >
            Voir nos actions
          </Link>
        </div>
      </div>

      {action && (
        <Link
          href={`/actions#${ancreUne(action.id)}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-militant-ardoise bg-white transition-shadow hover:border-militant-bordeaux hover:shadow-[inset_0_0_0_1px_#931510] focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge lg:col-span-4"
        >
          <div className="relative aspect-[3/2] bg-militant-ardoise">
            {action.photo && (
              <Image src={action.photo} alt="" fill priority sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
            )}
          </div>
          <div className="flex flex-col gap-2 border-t-[6px] border-militant-rouge px-6 pb-7 pt-5">
            <p className="text-[15px] font-semibold">Dernière action</p>
            <p className="font-condensed text-2xl font-bold text-militant-bordeaux">
              {isoToDateFr(action.date_action)} {action.ville && <span className="text-militant-charbon">{action.ville}</span>}
            </p>
            <p className="font-condensed text-3xl font-extrabold leading-none">{titreAction(action)}</p>
            <p className="mt-2 font-bold underline decoration-militant-rouge decoration-2 underline-offset-4">Lire la une</p>
          </div>
        </Link>
      )}
    </section>
  );
}

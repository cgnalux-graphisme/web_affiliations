import Image from "next/image";
import Link from "next/link";
import { ancreUne, titreAction } from "../lib/actions";
import { isoToDateFr } from "../lib/dates";
import { trierPhotos } from "../lib/photos";
import { getSupabase } from "../lib/supabase";
import TuilesDemarches from "./TuilesDemarches";

// La dernière action publiée apparaît ici en moins d'une minute.
export const revalidate = 60;

type DerniereAction = {
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

/** Dernière action publiée (vue publique uniquement) et sa photo principale. */
async function chargerDerniereAction(): Promise<DerniereAction | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_actions_public")
    .select("id, nom, date_action, ville, type_action, type_action_autre, participants_total, info_web")
    .order("date_action", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const { data: photos } = await supabase.from("site_photos_public").select("url").eq("action_id", data.id);
  return { ...data, photo: trierPhotos(photos ?? [])[0]?.url ?? null };
}

const nombre = new Intl.NumberFormat("fr-BE");

export default async function Accueil() {
  const action = await chargerDerniereAction();
  const lienUne = action ? `/actions#${ancreUne(action.id)}` : "/actions";
  const chapo = action?.info_web?.split(/\r?\n/).map((l) => l.trim()).find(Boolean);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      {/* ── Ouverture ── */}
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
            href={lienUne}
            className="group flex flex-col overflow-hidden rounded-2xl border border-militant-ardoise bg-white transition-shadow hover:border-militant-bordeaux hover:shadow-[inset_0_0_0_1px_#AA0F33] focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge lg:col-span-4"
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

      {/* ── Démarches ── */}
      <section aria-labelledby="titre-demarches" className="pt-4">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b-[6px] border-militant-charbon pb-2.5">
          <h2 id="titre-demarches" className="font-condensed text-4xl font-extrabold uppercase leading-none sm:text-6xl">
            Démarches en ligne
          </h2>
          <Link href="/demarches" className="text-[17px] font-bold hover:text-militant-bordeaux">
            Toutes les démarches
          </Link>
        </div>
        <TuilesDemarches />
      </section>

      {/* ── Nos actions ── */}
      {action && (
        <section aria-labelledby="titre-actions" className="pt-16">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b-[6px] border-militant-charbon pb-2.5">
            <h2 id="titre-actions" className="font-condensed text-4xl font-extrabold uppercase leading-none sm:text-6xl">
              Nos actions
            </h2>
            <Link href="/actions" className="text-[17px] font-bold hover:text-militant-bordeaux">
              Toutes les actions
            </Link>
          </div>
          <article className="grid gap-8 lg:grid-cols-12">
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-militant-ardoise lg:col-span-7">
              {action.photo && (
                <Image src={action.photo} alt="" fill sizes="(min-width: 1024px) 700px, 100vw" className="object-cover" />
              )}
            </div>
            <div className="flex flex-col gap-3 lg:col-span-5">
              <p className="font-condensed text-2xl font-bold text-militant-bordeaux">
                {isoToDateFr(action.date_action)} {action.ville && <span className="text-militant-charbon">{action.ville}</span>}
              </p>
              <h3 className="font-condensed text-5xl font-extrabold leading-[0.95]">{titreAction(action)}</h3>
              {chapo && <p className="mt-1 text-xl font-semibold leading-snug">{chapo}</p>}
              <Link
                href={lienUne}
                className="mt-2 self-start font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
              >
                Lire la une
              </Link>
              {action.participants_total != null && action.participants_total > 0 && (
                <p className="mt-auto border-t-2 border-militant-charbon pt-4 font-condensed text-4xl font-extrabold">
                  {nombre.format(action.participants_total).replace(/ /g, " ")}{" "}
                  <span className="font-barlow text-lg font-semibold">participants</span>
                </p>
              )}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}

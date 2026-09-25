import type { Metadata } from "next";
import Link from "next/link";
import { isoToDateFr } from "../../lib/dates";
import { trierPhotos } from "../../lib/photos";
import { getSupabase } from "../../lib/supabase";
import { idYoutube } from "../../lib/youtube";
import { ancreUne } from "../../lib/actions";
import FriseActions from "./FriseActions";
import LecteurYoutube from "./LecteurYoutube";
import PhotosUne, { type Photo } from "./PhotosUne";

export const metadata: Metadata = {
  title: "Nos actions — Centrale Générale FGTB Namur – Luxembourg",
  description:
    "Grèves, manifestations et piquets menés par la Centrale Générale FGTB Namur – Luxembourg.",
};

// Une action publiée depuis l'espace admin apparaît ici en moins d'une minute.
export const revalidate = 60;

// Colonnes exposées par les vues publiques (jamais les tables site_actions / site_photos / site_videos).
type ActionPublique = {
  id: string;
  nom: string | null;
  date_action: string;
  ville: string | null;
  type_action: string;
  type_action_autre: string | null;
  entreprise: string | null;
  front_commun: boolean;
  front_commun_csc: boolean;
  front_commun_synova: boolean;
  participants_total: number | null;
  info_web: string | null;
};

type PhotoPublique = Photo & { action_id: string };
type Video = { id: string; url: string; titre: string | null };
type VideoPublique = Video & { action_id: string };

const COLONNES =
  "id, nom, date_action, ville, type_action, type_action_autre, entreprise, front_commun, front_commun_csc, front_commun_synova, participants_total, info_web";

const nombre = new Intl.NumberFormat("fr-BE");

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Le vrai type de l'action ; pour "autre", le détail saisi. */
function typeAction(a: ActionPublique): string {
  if (a.type_action === "autre") {
    return a.type_action_autre?.trim() ? capitalize(a.type_action_autre.trim()) : "Autre action";
  }
  return capitalize(a.type_action);
}

function libelleFrontCommun(a: ActionPublique): string | null {
  if (!a.front_commun) return null;
  const allies = [a.front_commun_csc && "la CSC", a.front_commun_synova && "Synova"].filter(Boolean);
  return allies.length ? `Avec ${allies.join(" et ")}` : "Oui";
}

/** Chaque ligne non vide de l'info web devient un paragraphe (les sauts de ligne sont respectés). */
function paragraphes(texte: string | null): string[] {
  return (texte ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

async function chargerDonnees() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_actions_public")
    .select(COLONNES)
    .order("date_action", { ascending: false });
  if (error) {
    console.error("site_actions_public:", error.message);
    return {
      actions: [] as ActionPublique[],
      photos: new Map<string, Photo[]>(),
      videos: new Map<string, Video[]>(),
      erreur: true,
    };
  }
  const actions = (data ?? []) as ActionPublique[];

  const photos = new Map<string, Photo[]>();
  const videos = new Map<string, Video[]>();
  if (actions.length) {
    const ids = actions.map((a) => a.id);
    const [resPhotos, resVideos] = await Promise.all([
      supabase.from("site_photos_public").select("id, action_id, url, legende").in("action_id", ids),
      supabase.from("site_videos_public").select("id, action_id, url, titre").in("action_id", ids),
    ]);
    // Sans photos ni vidéos, la page reste lisible : on n'affiche pas d'erreur pour ça.
    if (resPhotos.error) console.error("site_photos_public:", resPhotos.error.message);
    if (resVideos.error) console.error("site_videos_public:", resVideos.error.message);
    for (const p of trierPhotos((resPhotos.data ?? []) as PhotoPublique[])) {
      photos.set(p.action_id, [...(photos.get(p.action_id) ?? []), p]);
    }
    for (const v of (resVideos.data ?? []) as VideoPublique[]) {
      videos.set(v.action_id, [...(videos.get(v.action_id) ?? []), v]);
    }
  }
  return { actions, photos, videos, erreur: false };
}

export default async function ActionsPage() {
  const { actions, photos, videos, erreur } = await chargerDonnees();

  // Regroupement par année (l'ordre décroissant de la requête est conservé).
  const parAnnee = new Map<string, ActionPublique[]>();
  for (const a of actions) {
    const annee = a.date_action.slice(0, 4);
    parAnnee.set(annee, [...(parAnnee.get(annee) ?? []), a]);
  }

  return (
    <main className="min-h-screen bg-white font-barlow text-militant-charbon">
      <header className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <h1 className="font-condensed text-6xl font-extrabold uppercase leading-[0.85] tracking-tight sm:text-8xl">
            Nos actions
          </h1>
          <div className="mt-6 h-2 w-24 bg-militant-rouge" aria-hidden />
          <p className="mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
            Grèves, manifestations, piquets : la Centrale Générale FGTB Namur – Luxembourg sur le
            terrain, aux côtés des travailleurs.
          </p>
        </div>
      </header>

      {!erreur && actions.length > 0 && (
        <FriseActions
          jalons={actions.map((a) => ({
            id: a.id,
            date: a.date_action,
            titre: a.nom?.trim() || typeAction(a),
            type: typeAction(a),
          }))}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {erreur ? (
          <Encart titre="Les actions ne peuvent pas être affichées pour le moment.">
            Réessayez dans quelques minutes.
          </Encart>
        ) : actions.length === 0 ? (
          <Encart titre="Aucune action publiée pour l'instant.">
            Les prochaines mobilisations apparaîtront ici.{" "}
            <Link
              href="/"
              className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
            >
              Retour à l&apos;accueil
            </Link>
          </Encart>
        ) : (
          [...parAnnee].map(([annee, liste], iAnnee) => (
            <section key={annee} aria-labelledby={`annee-${annee}`} className="mt-14 sm:mt-20">
              <div className="flex items-center gap-4">
                <h2
                  id={`annee-${annee}`}
                  className="font-condensed text-5xl font-extrabold leading-none text-militant-rouge sm:text-6xl"
                >
                  {annee}
                </h2>
                <div className="h-[3px] flex-1 bg-militant-charbon" aria-hidden />
                <p className="font-condensed text-xl font-semibold">
                  {liste.length} action{liste.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="mt-10 space-y-20">
                {liste.map((a, i) => (
                  <Une
                    key={a.id}
                    action={a}
                    photos={photos.get(a.id) ?? []}
                    videos={videos.get(a.id) ?? []}
                    prioritaire={iAnnee === 0 && i === 0}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

function Une({
  action: a,
  photos,
  videos,
  prioritaire,
}: {
  action: ActionPublique;
  photos: Photo[];
  videos: Video[];
  prioritaire: boolean;
}) {
  const type = typeAction(a);
  const nom = a.nom?.trim() || null;
  // Le nom est le titre de la une ; sans nom, le type prend sa place.
  const titre = nom ?? type;
  const textes = paragraphes(a.info_web);
  const frontCommun = libelleFrontCommun(a);
  const participants = a.participants_total != null && a.participants_total > 0 ? a.participants_total : null;
  const aDesFaits = Boolean(participants || a.ville || a.entreprise || frontCommun);

  return (
    <article
      id={ancreUne(a.id)}
      className="scroll-mt-6 border-t-[6px] border-militant-charbon pt-6 first:border-t-0 first:pt-0"
    >
      <p className="flex flex-wrap items-center gap-x-3 font-condensed text-2xl font-bold">
        <time dateTime={a.date_action} className="tabular-nums text-militant-rouge">
          {isoToDateFr(a.date_action)}
        </time>
        {a.ville && (
          <>
            <span className="h-5 w-[3px] bg-militant-rouge" aria-hidden />
            <span>{a.ville}</span>
          </>
        )}
      </p>
      {nom && (
        <p className="mt-4 inline-block rounded-full border-2 border-militant-charbon px-3 py-0.5 font-condensed text-lg font-bold leading-snug">
          {type}
        </p>
      )}
      <h3
        className={`max-w-4xl break-words font-condensed font-extrabold leading-[0.95] tracking-tight ${
          nom ? "mt-3 text-4xl sm:text-5xl lg:text-6xl" : "mt-2 text-5xl sm:text-6xl lg:text-7xl"
        }`}
      >
        {titre}
      </h3>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-8 lg:col-span-8">
          {photos.length > 0 && <PhotosUne photos={photos} titre={titre} prioritaire={prioritaire} />}

          {videos.map((v, i) => {
            const id = idYoutube(v.url);
            if (!id) return null;
            const titreVideo =
              v.titre?.trim() || (videos.length > 1 ? `Vidéo ${i + 1} : ${titre}` : `Vidéo : ${titre}`);
            return <LecteurYoutube key={v.id} id={id} titre={titreVideo} />;
          })}

          {textes.length > 0 && (
            <div className="max-w-[68ch] space-y-5 text-[17px] leading-[1.75] sm:text-lg">
              {textes.map((t, i) =>
                i === 0 ? (
                  <p key={i} className="text-xl font-semibold leading-snug sm:text-2xl">
                    {t}
                  </p>
                ) : (
                  <p key={i}>{t}</p>
                )
              )}
            </div>
          )}
        </div>

        {aDesFaits && (
          <aside className="order-first self-start rounded-2xl border border-t-[6px] border-militant-ardoise border-t-militant-rouge bg-white p-6 lg:order-none lg:sticky lg:top-6 lg:col-span-4">
            <dl className="space-y-5">
              {participants && (
                <div className="flex flex-col-reverse">
                  <dt className="mt-1 font-condensed text-xl font-semibold">
                    participant{participants > 1 ? "s" : ""}
                  </dt>
                  <dd className="font-condensed text-6xl font-extrabold leading-none tabular-nums text-militant-rouge">
                    {nombre.format(participants)}
                  </dd>
                </div>
              )}
              {a.ville && <Fait label="Lieu" valeur={a.ville} />}
              {a.entreprise && <Fait label="Entreprise" valeur={a.entreprise} />}
              {frontCommun && <Fait label="Front commun" valeur={frontCommun} />}
            </dl>
          </aside>
        )}
      </div>
    </article>
  );
}

function Fait({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="border-t border-militant-ardoise pt-4">
      <dt className="text-[15px] font-semibold">{label}</dt>
      <dd className="mt-0.5 break-words font-condensed text-2xl font-bold leading-tight">{valeur}</dd>
    </div>
  );
}

function Encart({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mt-14 border-l-[6px] border-militant-rouge py-2 pl-5">
      <p className="font-condensed text-3xl font-bold leading-tight">{titre}</p>
      <p className="mt-2 text-lg">{children}</p>
    </div>
  );
}

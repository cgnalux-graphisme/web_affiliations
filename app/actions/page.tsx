import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Building2, Handshake, MapPin, Megaphone, Users } from "lucide-react";
import { getSupabase } from "../../lib/supabase";

export const metadata: Metadata = {
  title: "Nos actions — Centrale Générale FGTB Namur – Luxembourg",
  description:
    "Grèves, manifestations et piquets menés par la Centrale Générale FGTB Namur – Luxembourg.",
};

// Une action publiée depuis l'espace admin apparaît ici en moins d'une minute.
export const revalidate = 60;

// Colonnes exposées par la vue publique (jamais la table site_actions).
type ActionPublique = {
  id: string;
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

const COLONNES =
  "id, date_action, ville, type_action, type_action_autre, entreprise, front_commun, front_commun_csc, front_commun_synova, participants_total, info_web";

const nombre = new Intl.NumberFormat("fr-BE");
const moisCourt = new Intl.DateTimeFormat("fr-BE", { month: "short" });
const dateLongue = new Intl.DateTimeFormat("fr-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "aaaa-mm-jj" → Date locale (évite le décalage de fuseau d'un parse UTC). */
function parseDate(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function libelleType(a: ActionPublique): string {
  if (a.type_action === "autre") {
    return a.type_action_autre?.trim() ? capitalize(a.type_action_autre.trim()) : "Autre action";
  }
  return capitalize(a.type_action);
}

function libelleFrontCommun(a: ActionPublique): string | null {
  if (!a.front_commun) return null;
  const allies = [a.front_commun_csc && "la CSC", a.front_commun_synova && "Synova"].filter(Boolean);
  return allies.length ? `En front commun avec ${allies.join(" et ")}` : "En front commun";
}

async function chargerActions() {
  const { data, error } = await getSupabase()
    .from("site_actions_public")
    .select(COLONNES)
    .order("date_action", { ascending: false });
  if (error) {
    console.error("site_actions_public:", error.message);
    return { actions: [] as ActionPublique[], erreur: true };
  }
  return { actions: (data ?? []) as ActionPublique[], erreur: false };
}

export default async function ActionsPage() {
  const { actions, erreur } = await chargerActions();

  // Regroupement par année (l'ordre décroissant de la requête est conservé).
  const parAnnee = new Map<string, ActionPublique[]>();
  for (const a of actions) {
    const annee = a.date_action.slice(0, 4);
    parAnnee.set(annee, [...(parAnnee.get(annee) ?? []), a]);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-3xl bg-red-700 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Nos actions</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-red-50 sm:text-lg">
            Grèves, manifestations et piquets : la Centrale Générale FGTB Namur – Luxembourg
            sur le terrain, aux côtés des travailleurs.
          </p>
        </header>

        {erreur ? (
          <div
            role="alert"
            className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm text-red-800"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>Les actions ne peuvent pas être affichées pour le moment. Réessayez dans quelques minutes.</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-red-700" />
            <p className="mt-4 font-semibold text-gray-900">Aucune action publiée pour l&apos;instant.</p>
            <p className="mt-1 text-sm text-gray-500">Les prochaines mobilisations apparaîtront ici.</p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          [...parAnnee].map(([annee, liste]) => (
            <section key={annee} aria-labelledby={`annee-${annee}`} className="mt-10">
              <div className="mb-4 flex items-baseline gap-3 border-b-2 border-red-700 pb-2">
                <h2 id={`annee-${annee}`} className="text-2xl font-bold tracking-tight text-gray-900">
                  {annee}
                </h2>
                <p className="text-sm text-gray-500">
                  {liste.length} action{liste.length > 1 ? "s" : ""}
                </p>
              </div>
              <ol className="space-y-4">
                {liste.map((a) => (
                  <li key={a.id}>
                    <CarteAction action={a} />
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

function CarteAction({ action: a }: { action: ActionPublique }) {
  const date = parseDate(a.date_action);
  const frontCommun = libelleFrontCommun(a);

  return (
    <article className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:gap-5 sm:p-5">
      {/* Tampon de date */}
      <time
        dateTime={a.date_action}
        title={capitalize(dateLongue.format(date))}
        className="flex h-[4.5rem] w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-red-700 text-white sm:h-20 sm:w-[4.5rem]"
      >
        <span className="text-2xl font-extrabold leading-none tabular-nums sm:text-3xl">
          {date.getDate()}
        </span>
        <span className="mt-1 text-xs font-semibold text-red-100">
          {moisCourt.format(date).replace(".", "")}
        </span>
      </time>

      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold leading-snug text-gray-900">{libelleType(a)}</h3>

        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-600">
          {a.ville && (
            <Info icon={<MapPin size={15} />} label="Lieu">
              {a.ville}
            </Info>
          )}
          {a.entreprise && (
            <Info icon={<Building2 size={15} />} label="Entreprise">
              {a.entreprise}
            </Info>
          )}
          {a.participants_total != null && a.participants_total > 0 && (
            <Info icon={<Users size={15} />} label="Participants">
              {nombre.format(a.participants_total)} participant{a.participants_total > 1 ? "s" : ""}
            </Info>
          )}
          {frontCommun && (
            <Info icon={<Handshake size={15} />} label="Front commun">
              {frontCommun}
            </Info>
          )}
        </ul>

        {a.info_web?.trim() && (
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-gray-700">
            {a.info_web.trim()}
          </p>
        )}
      </div>
    </article>
  );
}

function Info({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="inline-flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-red-700" aria-hidden>
        {icon}
      </span>
      <span className="sr-only">{label} : </span>
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

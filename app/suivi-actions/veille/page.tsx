import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { dateArticle } from "../../../lib/articles";
import { getSuperAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import { LIBELLES_STATUT, STATUTS_VEILLE, VEILLE_NOUVEAU, type StatutVeille } from "../../../lib/veille";
import { ActionsItem, BoutonRamassage, FiltresVeille } from "./ControlesVeille";

export const metadata: Metadata = {
  title: "Veille — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

type Item = {
  id: string;
  source_id: string | null;
  source_nom: string | null;
  titre: string;
  resume: string | null;
  lien: string;
  date_publication: string | null;
  statut: string;
  created_at: string;
};

const COLONNES = "id, source_id, source_nom, titre, resume, lien, date_publication, statut, created_at";
const LIMITE = 300;

export default async function VeillePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; statut?: string }>;
}) {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/veille");
  const params = await searchParams;
  const statut = (STATUTS_VEILLE as readonly string[]).includes(params.statut ?? "")
    ? (params.statut as StatutVeille)
    : null;
  const sourceId = params.source && /^[0-9a-f-]{36}$/i.test(params.source) ? params.source : null;

  const supabase = await getSupabaseServer();
  const requete = (s: StatutVeille | null, exclureNouveaux = false, limite = LIMITE) => {
    let q = supabase
      .from("site_veille")
      .select(COLONNES)
      .order("date_publication", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limite);
    if (s) q = q.eq("statut", s);
    if (exclureNouveaux) q = q.neq("statut", VEILLE_NOUVEAU);
    if (sourceId) q = q.eq("source_id", sourceId);
    return q;
  };
  const compte = (s: StatutVeille) => {
    let q = supabase.from("site_veille").select("id", { count: "exact", head: true }).eq("statut", s);
    if (sourceId) q = q.eq("source_id", sourceId);
    return q;
  };

  // Sans filtre de statut : les nouveaux d'abord, puis le reste, chacun du plus récent au plus ancien.
  const [resItems, resAutres, resSources, ...comptes] = await Promise.all([
    statut ? requete(statut) : requete(VEILLE_NOUVEAU),
    statut ? Promise.resolve({ data: [], error: null }) : requete(null, true, 150),
    supabase.from("site_sources").select("id, nom").order("nom"),
    ...STATUTS_VEILLE.map(compte),
  ]);
  const erreur = resItems.error || resAutres.error;
  const items = [...((resItems.data ?? []) as Item[]), ...((resAutres.data ?? []) as Item[])];
  const nombres = Object.fromEntries(STATUTS_VEILLE.map((s, i) => [s, comptes[i].count ?? 0])) as Record<StatutVeille, number>;
  const serviceConfigure = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-[6px] border-militant-charbon pb-5">
        <div>
          <h1 className="font-condensed text-5xl font-extrabold leading-none tracking-tight">Veille</h1>
          <p className="mt-2 text-base">
            {nombres[VEILLE_NOUVEAU]} nouveau{nombres[VEILLE_NOUVEAU] > 1 ? "x" : ""} à trier. Articles ramassés
            chaque matin dans les{" "}
            <Link
              href="/suivi-actions/sources"
              className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
            >
              sources actives
            </Link>
            .
          </p>
        </div>
        <BoutonRamassage />
      </div>

      {!serviceConfigure && (
        <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border-2 border-militant-bordeaux px-4 py-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
          <p>
            <span className="font-bold text-militant-bordeaux">Ramassage non configuré.</span> La variable
            SUPABASE_SERVICE_ROLE_KEY manque sur ce serveur : ni le cron ni « Rafraîchir maintenant » ne peuvent
            enregistrer d&apos;articles.
          </p>
        </div>
      )}

      <FiltresVeille
        sources={(resSources.data ?? []) as { id: string; nom: string }[]}
        source={sourceId ?? ""}
        statut={statut ?? ""}
        nombres={nombres}
      />

      {erreur ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          La veille ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
      ) : items.length === 0 ? (
        <div className="mt-10 border-l-[6px] border-militant-rouge py-2 pl-5">
          <p className="font-condensed text-3xl font-bold">Rien à afficher.</p>
          <p className="mt-2 text-lg">
            {statut || sourceId
              ? "Aucun article ne correspond à ces filtres."
              : "Ajoutez des sources puis cliquez sur « Rafraîchir maintenant »."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-militant-ardoise border-y border-militant-ardoise">
          {items.map((it) => {
            const s = it.statut as StatutVeille;
            const traite = s !== VEILLE_NOUVEAU;
            return (
              <li key={it.id} className={`py-5 ${s === VEILLE_NOUVEAU ? "border-l-[6px] border-militant-rouge pl-4" : "pl-[22px]"}`}>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
                  <span className="font-condensed text-lg font-bold tabular-nums text-militant-bordeaux">
                    {dateArticle(it.date_publication ?? it.created_at)}
                  </span>
                  <span className="h-4 w-[3px] bg-militant-rouge" aria-hidden />
                  <span>{it.source_nom ?? "Source supprimée"}</span>
                  {traite && (
                    <span className="rounded-full border-2 border-militant-ardoise px-2.5 text-xs font-bold">
                      {LIBELLES_STATUT[s] ?? it.statut}
                    </span>
                  )}
                </p>
                <h2 className={`mt-1.5 max-w-3xl break-words text-[19px] leading-snug ${traite ? "font-semibold" : "font-bold"}`}>
                  <a
                    href={it.lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="decoration-militant-rouge decoration-2 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                  >
                    {it.titre}
                    <ExternalLink size={15} className="ml-1.5 inline-block align-baseline" aria-hidden />
                    <span className="sr-only"> (article d&apos;origine, nouvel onglet)</span>
                  </a>
                </h2>
                {it.resume && <p className="mt-1.5 line-clamp-3 max-w-3xl text-[15px] leading-relaxed">{it.resume}</p>}
                <ActionsItem id={it.id} titre={it.titre} statut={s} />
              </li>
            );
          })}
        </ul>
      )}
      {items.length >= LIMITE && (
        <p className="mt-4 text-sm">Seuls les {LIMITE} articles les plus récents sont affichés. Filtrez par source pour voir les autres.</p>
      )}
    </div>
  );
}

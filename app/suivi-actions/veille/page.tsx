import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ExternalLink, Tag } from "lucide-react";
import { dateArticle } from "../../../lib/articles";
import { getSuperAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import { LIBELLES_STATUT, STATUTS_VEILLE, VEILLE_NOUVEAU, type StatutVeille } from "../../../lib/veille";
import { motsClesTrouves, preparerCorrespondance } from "../../../lib/themes";
import { idsDuSujet, ramassageRecent, type AnalyseEnregistree } from "../../../lib/veille-tri";
import { CLE_DERNIER_RAMASSAGE } from "../../../lib/veille-ramassage";
import { ActionsItem, BoutonCheckIA, BoutonRamassage, FiltresVeille } from "./ControlesVeille";
import ConferenceRedaction from "./ConferenceRedaction";
import LogoMedia from "./LogoMedia";
import RepereSection from "../RepereSection";

export const metadata: Metadata = {
  title: "Le fil — Scan News — Espace admin ACCG Nalux",
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
// Chargement large (le filtre de pertinence se fait à l'affichage), affichage limité.
const LIMITE_NOUVEAUX = 1000;
const LIMITE_AUTRES = 500;
const AFFICHAGE_MAX = 200;

export default async function VeillePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; statut?: string; pertinence?: string; vue?: string }>;
}) {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/veille");
  const params = await searchParams;
  const statut = (STATUTS_VEILLE as readonly string[]).includes(params.statut ?? "")
    ? (params.statut as StatutVeille)
    : null;
  // Par défaut, seuls les articles pertinents (au moins un mot-clé actif) sont affichés.
  const tous = params.pertinence === "tous";
  const sourceId = params.source && /^[0-9a-f-]{36}$/i.test(params.source) ? params.source : null;

  const supabase = await getSupabaseServer();
  const requete = (s: StatutVeille | null, exclureNouveaux = false, limite = LIMITE_NOUVEAUX) => {
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
  const [resItems, resAutres, resSources, resThemes, resAnalyse, resRamassage, ...comptes] = await Promise.all([
    statut ? requete(statut) : requete(VEILLE_NOUVEAU),
    statut ? Promise.resolve({ data: [], error: null }) : requete(null, true, LIMITE_AUTRES),
    supabase.from("site_sources").select("id, nom").order("nom"),
    supabase.from("site_themes").select("mot_cle").eq("actif", true),
    // Dernier « Check IA » (absent si la table n'existe pas encore : le fil s'affiche quand même).
    supabase
      .from("site_veille_analyses")
      .select("id, created_at, origine, nb_articles, resultat")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("site_parametres").select("valeur").eq("cle", CLE_DERNIER_RAMASSAGE).maybeSingle(),
    ...STATUTS_VEILLE.map(compte),
  ]);
  const erreur = resItems.error || resAutres.error || resThemes.error;
  const charges = [...((resItems.data ?? []) as Item[]), ...((resAutres.data ?? []) as Item[])];
  const tronque = (resItems.data?.length ?? 0) >= LIMITE_NOUVEAUX || (resAutres.data?.length ?? 0) >= LIMITE_AUTRES;

  // Pertinence : calculée à l'affichage, rien n'est effacé en base (changer les mots-clés re-filtre tout de suite).
  const motsClesActifs = ((resThemes.data ?? []) as { mot_cle: string }[]).map((t) => t.mot_cle);
  const correspondance = preparerCorrespondance(motsClesActifs);
  const avecMotsCles = charges.map((it) => ({ ...it, motsCles: motsClesTrouves(it, correspondance) }));
  const nbPertinents = avecMotsCles.filter((it) => it.motsCles.length > 0).length;
  const filtres = tous ? avecMotsCles : avecMotsCles.filter((it) => it.motsCles.length > 0);
  const items = filtres.slice(0, AFFICHAGE_MAX);
  const nombres = Object.fromEntries(STATUTS_VEILLE.map((s, i) => [s, comptes[i].count ?? 0])) as Record<StatutVeille, number>;
  const serviceConfigure = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Statut actuel des articles du classement (un article absent a été effacé du fil après 3 jours).
  const analyse = resAnalyse.error ? null : ((resAnalyse.data as AnalyseEnregistree | null) ?? null);
  const idsAnalyse = [...new Set((analyse?.resultat?.sujets ?? []).flatMap(idsDuSujet))];
  const statutsAnalyse: Record<string, string> = {};
  if (idsAnalyse.length) {
    const { data } = await supabase.from("site_veille").select("id, statut").in("id", idsAnalyse);
    for (const l of (data ?? []) as { id: string; statut: string }[]) statutsAnalyse[l.id] = l.statut;
  }
  const dernierRamassage = (resRamassage.data?.valeur as string | undefined) ?? null;
  const filFrais = ramassageRecent(dernierRamassage);
  const nbSujets = (analyse?.resultat?.sujets ?? []).filter((s) => s.rang === "S" || s.rang === "A" || s.rang === "B").length;

  // Deux vues : « Check IA » (par défaut s'il existe un classement) et « Le fil » (articles, filtres).
  const filtresActifs = Boolean(statut || sourceId || tous);
  const vue: "check" | "fil" =
    params.vue === "fil" || params.vue === "check" ? params.vue : analyse && !filtresActifs ? "check" : "fil";
  const lienFil = (() => {
    const q = new URLSearchParams({ vue: "fil" });
    if (sourceId) q.set("source", sourceId);
    if (statut) q.set("statut", statut);
    if (tous) q.set("pertinence", "tous");
    return `/suivi-actions/veille?${q}`;
  })();
  const checkIAPossible = serviceConfigure && Boolean(process.env.ANTHROPIC_API_KEY) && filFrais;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b-[6px] border-militant-charbon pb-5">
        <div>
          <RepereSection />
          <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">Le fil</h1>
          {/* Barre d'état : le fil et le classement sont-ils à jour ? */}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${filFrais ? "bg-militant-bordeaux" : "border-2 border-militant-ardoise"}`} />
              {dernierRamassage ? `Fil rafraîchi ${quand(dernierRamassage)}` : "Fil jamais rafraîchi"}
              {!filFrais && dernierRamassage && <span className="font-normal"> · à rafraîchir</span>}
            </span>
            {analyse && (
              <span>
                Check IA {quand(analyse.created_at)} · {analyse.nb_articles} articles
              </span>
            )}
            <Link
              href="/suivi-actions/sources"
              className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
            >
              Sources
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <BoutonRamassage />
          <BoutonCheckIA actif={checkIAPossible} />
        </div>
      </div>

      <nav aria-label="Vues de Scan News" className="flex gap-1 border-b border-militant-ardoise">
        {[
          { cle: "check", libelle: "Check IA", n: nbSujets, href: "/suivi-actions/veille?vue=check" },
          { cle: "fil", libelle: "Le fil", n: nombres[VEILLE_NOUVEAU], href: lienFil, suffixe: " nouveaux" },
        ].map((o) => (
          <Link
            key={o.cle}
            href={o.href}
            aria-current={vue === o.cle ? "page" : undefined}
            className={`-mb-px inline-flex min-h-[48px] items-center gap-1.5 border-b-4 px-3 pt-1 text-[15px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
              vue === o.cle ? "border-militant-rouge" : "border-transparent hover:border-militant-ardoise"
            }`}
          >
            {o.libelle}
            <span className="font-semibold tabular-nums">
              {o.n}
              {o.suffixe && <span className="sr-only">{o.suffixe}</span>}
            </span>
          </Link>
        ))}
      </nav>

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

      {vue === "check" &&
        (analyse ? (
          <ConferenceRedaction key={analyse.id} analyse={analyse} statutsInitiaux={statutsAnalyse} />
        ) : (
          <div className="mt-10 border-l-[6px] border-militant-rouge py-2 pl-5">
            <p className="font-condensed text-3xl font-bold">Pas encore de classement.</p>
            <p className="mt-2 text-lg">
              Rafraîchissez le fil, puis cliquez sur « Check IA » : l&apos;IA classe les sujets des 48 dernières heures.
              Le classement se fait aussi tout seul chaque matin vers 8 h.
            </p>
          </div>
        ))}

      {vue === "fil" && (
      <>
      <FiltresVeille
        sources={(resSources.data ?? []) as { id: string; nom: string }[]}
        source={sourceId ?? ""}
        statut={statut ?? ""}
        nombres={nombres}
        tous={tous}
        nbPertinents={nbPertinents}
        nbTotal={charges.length}
      />

      {!erreur && correspondance.motsCles.length === 0 && (
        <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border-2 border-militant-bordeaux px-4 py-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
          <p>
            <span className="font-bold text-militant-bordeaux">Aucun mot-clé actif :</span> aucun article ne peut être
            jugé pertinent.{" "}
            <Link href="/suivi-actions/themes" className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4">
              Gérer les thématiques
            </Link>
          </p>
        </div>
      )}

      {erreur ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          Le fil ne peut pas être chargé. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
      ) : items.length === 0 ? (
        <div className="mt-10 border-l-[6px] border-militant-rouge py-2 pl-5">
          <p className="font-condensed text-3xl font-bold">Rien à afficher.</p>
          <p className="mt-2 text-lg">
            {!tous && charges.length > 0 ? (
              <>
                Aucun article pertinent parmi les {charges.length} ramassés. Affichez « Tous » ou{" "}
                <Link href="/suivi-actions/themes" className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4">
                  ajustez les mots-clés
                </Link>
                .
              </>
            ) : statut || sourceId ? (
              "Aucun article ne correspond à ces filtres."
            ) : (
              "Ajoutez des sources puis cliquez sur « Rafraîchir maintenant »."
            )}
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
                  <span className="inline-flex items-center gap-2">
                    <LogoMedia lien={it.lien} nom={it.source_nom} taille={22} />
                    {it.source_nom ?? "Source supprimée"}
                  </span>
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
                {/* Résumé en entier, tel que fourni par le flux RSS (sa longueur dépend du média). */}
                {it.resume && <p className="mt-1.5 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed">{it.resume}</p>}
                {it.motsCles.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <Tag size={13} className="text-militant-rouge" aria-hidden />
                    <span className="sr-only">Retenu pour les mots-clés :</span>
                    {it.motsCles.map((m) => (
                      <span key={m} className="rounded-full border border-militant-ardoise px-2 py-0.5 font-semibold">
                        {m}
                      </span>
                    ))}
                  </p>
                )}
                <ActionsItem id={it.id} titre={it.titre} statut={s} />
              </li>
            );
          })}
        </ul>
      )}
      {(filtres.length > AFFICHAGE_MAX || tronque) && (
        <p className="mt-4 text-sm">
          {filtres.length > AFFICHAGE_MAX
            ? `Seuls les ${AFFICHAGE_MAX} premiers articles sont affichés. `
            : "Les articles les plus anciens ne sont pas chargés. "}
          Filtrez par statut ou par source pour voir les autres.
        </p>
      )}
      </>
      )}
    </div>
  );
}

/** « à 08:02 » aujourd'hui, sinon « le 30/09/2026 à 08:02 » (heure de Bruxelles). */
function quand(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(d);
  return dateArticle(iso) === dateArticle(new Date().toISOString()) ? `à ${h}` : `le ${dateArticle(iso)} à ${h}`;
}

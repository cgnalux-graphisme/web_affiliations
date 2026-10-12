import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Clock, ExternalLink, Sparkles, Tag } from "lucide-react";
import { dateArticle } from "../../../../lib/articles";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { exigerApp } from "../../../../lib/espace/acces";
import { LIBELLES_STATUT, STATUTS_VEILLE, VEILLE_NOUVEAU, type StatutVeille } from "../../../../lib/veille";
import { motsClesTrouves, preparerCorrespondance } from "../../../../lib/themes";
import { idsDuSujet, ramassageRecent, type AnalyseEnregistree } from "../../../../lib/veille-tri";
import { CLE_DERNIER_RAMASSAGE } from "../../../../lib/veille-ramassage";
import { ActionsItem, BoutonCheckIA, BoutonRamassage, FiltresVeille } from "./ControlesVeille";
import ConferenceRedaction from "./ConferenceRedaction";
import { articlesLiesAuxSujets, type ArticleLie } from "../../../../lib/veille-articles-lies";
import LogoMedia from "./LogoMedia";

import { Alerte, EnteteEcran, LIEN, Panneau, Statut, Vide } from "../../_partage/ui";
export const metadata: Metadata = {
  title: "Le fil — Scan News — Espace CG",
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
  await exigerApp("scan-news");
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
  const liensDuFil: Record<string, string> = {};
  let articlesLies: Record<number, ArticleLie> = {};
  if (idsAnalyse.length) {
    const [{ data }, { data: articles }] = await Promise.all([
      supabase.from("site_veille").select("id, statut, lien").in("id", idsAnalyse),
      // Articles récents (brouillons et publiés) : un sujet est « en rédaction » si l'un d'eux cite ses liens.
      supabase.from("site_articles").select("id, titre, statut, sources").order("updated_at", { ascending: false }).limit(150),
    ]);
    for (const l of (data ?? []) as { id: string; statut: string; lien: string }[]) {
      statutsAnalyse[l.id] = l.statut;
      liensDuFil[l.id] = l.lien;
    }
    articlesLies = articlesLiesAuxSujets(
      analyse?.resultat?.sujets ?? [],
      (articles ?? []) as { id: string; titre: string; statut: string; sources: string | null }[],
      liensDuFil
    );
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
    return `/espace/scan-news/fil?${q}`;
  })();
  const checkIAPossible = serviceConfigure && Boolean(process.env.ANTHROPIC_API_KEY) && filFrais;

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="rss"
        titre="Le fil"
        description="Les articles ramassés dans les sources suivies, et leur classement par l'IA."
        actions={
          <>
            <BoutonRamassage />
            <BoutonCheckIA actif={checkIAPossible} />
          </>
        }
      />

      {/* Barre d'état : le fil et le classement sont-ils à jour ? */}
      <div className="flex flex-wrap items-center gap-2">
        {filFrais ? (
          <Statut ton="ok" icone={CircleCheck}>
            Fil rafraîchi {quand(dernierRamassage!)}
          </Statut>
        ) : (
          <Statut ton="attente" icone={Clock}>
            {dernierRamassage ? `Fil rafraîchi ${quand(dernierRamassage)}, à rafraîchir` : "Fil jamais rafraîchi"}
          </Statut>
        )}
        {analyse && (
          <Statut icone={Sparkles}>
            Check IA {quand(analyse.created_at)}, {analyse.nb_articles} articles
          </Statut>
        )}
        <Link href="/espace/scan-news/sources" className={`${LIEN} ml-1 text-sm`}>
          Sources
        </Link>
      </div>

      <nav aria-label="Vues de Scan News">
        <ul className="ecg-onglets">
          {[
            { cle: "check", libelle: "Check IA", n: nbSujets, href: "/espace/scan-news/fil?vue=check" },
            { cle: "fil", libelle: "Le fil", n: nombres[VEILLE_NOUVEAU], href: lienFil, suffixe: " nouveaux" },
          ].map((o) => (
            <li key={o.cle}>
              <Link href={o.href} aria-current={vue === o.cle ? "page" : undefined} className="ecg-onglet">
                {o.libelle}
                <span className="ecg-compte">
                  {o.n}
                  {o.suffixe && <span className="sr-only">{o.suffixe}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!serviceConfigure && (
        <Alerte ton="erreur" titre="Ramassage non configuré.">
          La variable SUPABASE_SERVICE_ROLE_KEY manque sur ce serveur : ni le cron ni « Rafraîchir maintenant » ne
          peuvent enregistrer d&apos;articles.
        </Alerte>
      )}

      {vue === "check" &&
        (analyse ? (
          <ConferenceRedaction key={analyse.id} analyse={analyse} statutsInitiaux={statutsAnalyse} articlesLies={articlesLies} />
        ) : (
          <Panneau>
            <Vide icone="radar" titre="Pas encore de classement">
              Rafraîchissez le fil, puis cliquez sur « Check IA » : l&apos;IA classe les sujets des 48 dernières heures.
              Le classement se fait aussi tout seul chaque matin vers 8 h.
            </Vide>
          </Panneau>
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
        <Alerte ton="attention" role="alert" titre="Aucun mot-clé actif : aucun article ne peut être jugé pertinent.">
          <Link href="/espace/scan-news/themes" className={LIEN}>
            Gérer les thématiques
          </Link>
        </Alerte>
      )}

      {erreur ? (
        <Alerte ton="erreur">Le fil ne peut pas être chargé. Rechargez la page ; si le problème persiste, reconnectez-vous.</Alerte>
      ) : items.length === 0 ? (
        <Panneau>
          <Vide icone="rss" titre="Rien à afficher">
            {!tous && charges.length > 0 ? (
              <>
                Aucun article pertinent parmi les {charges.length} ramassés. Affichez « Tous » ou{" "}
                <Link href="/espace/scan-news/themes" className={LIEN}>
                  ajustez les mots-clés
                </Link>
                .
              </>
            ) : statut || sourceId ? (
              "Aucun article ne correspond à ces filtres."
            ) : (
              "Ajoutez des sources puis cliquez sur « Rafraîchir maintenant »."
            )}
          </Vide>
        </Panneau>
      ) : (
        <ul className="ecg-panneau ecg-lignes">
          {items.map((it) => {
            const s = it.statut as StatutVeille;
            const traite = s !== VEILLE_NOUVEAU;
            return (
              <li key={it.id} className={`py-4 ${s === VEILLE_NOUVEAU ? "ecg-ligne-active" : ""}`}>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
                  <span className="ecg-chiffre">{dateArticle(it.date_publication ?? it.created_at)}</span>
                  <span className="ecg-texte-doux inline-flex items-center gap-2 font-medium">
                    <LogoMedia lien={it.lien} nom={it.source_nom} taille={22} />
                    {it.source_nom ?? "Source supprimée"}
                  </span>
                  {traite ? (
                    <Statut icone={CircleCheck}>{LIBELLES_STATUT[s] ?? it.statut}</Statut>
                  ) : (
                    <Statut ton="info" icone={Sparkles}>
                      Nouveau
                    </Statut>
                  )}
                </p>
                <h2 className={`mt-1.5 max-w-3xl break-words text-[18px] leading-snug ${traite ? "font-medium" : "font-semibold"}`}>
                  <a
                    href={it.lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="decoration-[var(--app)] decoration-2 underline-offset-4 hover:underline"
                  >
                    {it.titre}
                    <ExternalLink size={15} className="ml-1.5 inline-block align-baseline" aria-hidden />
                    <span className="sr-only"> (article d&apos;origine, nouvel onglet)</span>
                  </a>
                </h2>
                {/* Résumé en entier, tel que fourni par le flux RSS (sa longueur dépend du média). */}
                {it.resume && <p className="ecg-texte-doux mt-1.5 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed">{it.resume}</p>}
                {it.motsCles.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <Tag size={13} aria-hidden />
                    <span className="sr-only">Retenu pour les mots-clés :</span>
                    {it.motsCles.map((m) => (
                      <span key={m} className="rounded-full border border-[#dde2e7] bg-[#fafbfc] px-2 py-0.5 font-semibold">
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
        <p className="ecg-aide">
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

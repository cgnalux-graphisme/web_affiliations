import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, Megaphone, Newspaper, Plus, Radar, type LucideIcon } from "lucide-react";
import { titreAction } from "../../lib/actions";
import { STATUT_BROUILLON, STATUT_PUBLIE, dateArticle } from "../../lib/articles";
import { isoToDateFr } from "../../lib/dates";
import { DEMANDES, TYPES_DEMANDE, dateHeureBruxelles } from "../../lib/demandes";
import { resumerDemandes, type ResumeDemandes } from "../../lib/demandes-serveur";
import { motsClesTrouves, preparerCorrespondance } from "../../lib/themes";
import { VEILLE_NOUVEAU } from "../../lib/veille";
import { getSuperAdmin, getSupabaseServer } from "../../lib/supabase-server";
import { getSupabaseService } from "../../lib/supabase-service";

export const metadata: Metadata = {
  title: "Tableau de bord — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Nouveaux articles de Scan News lus pour le calcul de pertinence (comme l'écran « Le fil »). */
const LIMITE_NOUVEAUX = 1000;

function pluriel(n: number, un: string, plusieurs: string) {
  return `${n} ${n > 1 ? plusieurs : un}`;
}

/** Tableau de bord : une tuile par domaine, les chiffres qui disent quoi faire en premier. */
export default async function TableauDeBordPage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions");
  const supabase = await getSupabaseServer();

  const [actionsTotal, actionsPubliees, derniereAction, brouillons, publies, nouveaux, themes, dernierRamassage] =
    await Promise.all([
      supabase.from("site_actions").select("id", { count: "exact", head: true }),
      supabase.from("site_actions").select("id", { count: "exact", head: true }).eq("visible_public", true),
      supabase
        .from("site_actions")
        .select("nom, date_action, type_action, type_action_autre")
        .order("date_action", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("site_articles").select("id", { count: "exact", head: true }).eq("statut", STATUT_BROUILLON),
      supabase.from("site_articles").select("id", { count: "exact", head: true }).eq("statut", STATUT_PUBLIE),
      supabase.from("site_veille").select("titre, resume").eq("statut", VEILLE_NOUVEAU).limit(LIMITE_NOUVEAUX),
      supabase.from("site_themes").select("mot_cle").eq("actif", true),
      supabase.from("site_veille").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

  // Pertinence calculée comme dans « Le fil » : au moins un mot-clé actif dans le titre ou le résumé.
  const correspondance = preparerCorrespondance(((themes.data ?? []) as { mot_cle: string }[]).map((t) => t.mot_cle));
  const itemsNouveaux = (nouveaux.data ?? []) as { titre: string; resume: string | null }[];
  const pertinents = itemsNouveaux.filter((it) => motsClesTrouves(it, correspondance).length > 0).length;
  const scanErreur = Boolean(nouveaux.error || themes.error);

  // Demandes : données sensibles, lues côté serveur avec la clé service_role (super admin vérifié plus haut).
  let demandes: ResumeDemandes | null = null;
  const db = getSupabaseService();
  if (db) {
    try {
      demandes = await resumerDemandes(db);
    } catch (err) {
      console.error("tableau de bord (demandes) :", err instanceof Error ? err.message : "erreur");
    }
  }
  const demandesSemaine = demandes ? TYPES_DEMANDE.reduce((n, t) => n + demandes![t].semaine, 0) : 0;

  const action = derniereAction.data as
    | { nom: string | null; date_action: string; type_action: string; type_action_autre: string | null }
    | null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b-[6px] border-militant-charbon pb-5">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">Tableau de bord</h1>
        <p className="mt-2 text-base">Ce qui attend, domaine par domaine. Chaque tuile ouvre sa section.</p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {/* ── Scan News : la tuile passe en bordeaux quand il y a des articles à trier ── */}
        <Tuile
          titre="Scan News"
          Icon={Radar}
          href="/suivi-actions/veille"
          libelleLien="Ouvrir le fil"
          enAvant={pertinents > 0}
          liens={[
            { href: "/suivi-actions/sources", label: "Sources" },
            { href: "/suivi-actions/themes", label: "Thématiques" },
          ]}
        >
          {scanErreur ? (
            <Indisponible />
          ) : (
            <>
              <Chiffre valeur={pertinents} enAvant={pertinents > 0}>
                {pertinents > 1 ? "articles pertinents à trier" : "article pertinent à trier"}
              </Chiffre>
              <p className="mt-2 text-[15px]">
                {pluriel(itemsNouveaux.length, "nouvel article", "nouveaux articles")} au total
                {itemsNouveaux.length >= LIMITE_NOUVEAUX ? " (ou plus)" : ""}.
                {dernierRamassage.data?.created_at
                  ? ` Dernier ramassage le ${dateHeureBruxelles(dernierRamassage.data.created_at as string)}.`
                  : ""}
              </p>
            </>
          )}
        </Tuile>

        {/* ── Démarches affiliés ── */}
        <Tuile titre="Démarches affiliés" Icon={FolderOpen} href="/suivi-actions/demandes" libelleLien="Voir les demandes">
          {!demandes ? (
            <Indisponible />
          ) : (
            <>
              <Chiffre valeur={demandesSemaine}>
                {demandesSemaine > 1 ? "demandes reçues ces 7 derniers jours" : "demande reçue ces 7 derniers jours"}
              </Chiffre>
              <table className="mt-3 w-full text-left text-[15px]">
                <caption className="sr-only">Demandes par type</caption>
                <thead>
                  <tr className="border-b-2 border-militant-charbon text-sm">
                    <th scope="col" className="py-1.5 pr-2 font-bold">Type</th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-bold">7 jours</th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-bold">Total</th>
                    <th scope="col" className="hidden py-1.5 text-right font-bold sm:table-cell">Dernière</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-militant-ardoise">
                  {TYPES_DEMANDE.map((t) => (
                    <tr key={t}>
                      <th scope="row" className="py-1.5 pr-2 font-semibold">
                        <Link
                          href={`/suivi-actions/demandes?type=${t}`}
                          className="relative z-10 underline-offset-4 hover:text-militant-bordeaux hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                        >
                          {DEMANDES[t].libelle}
                        </Link>
                      </th>
                      <td className={`py-1.5 pr-2 text-right tabular-nums ${demandes![t].semaine ? "font-bold" : ""}`}>
                        {demandes![t].semaine}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{demandes![t].total}</td>
                      <td className="hidden py-1.5 text-right tabular-nums sm:table-cell">
                        {demandes![t].derniere ? dateHeureBruxelles(demandes![t].derniere).slice(0, 10) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Tuile>

        {/* ── Actions syndicales ── */}
        <Tuile
          titre="Actions syndicales"
          Icon={Megaphone}
          href="/suivi-actions/actions"
          libelleLien="Toutes les actions"
          liens={[
            { href: "/suivi-actions/nouvelle", label: "Nouvelle action", Icon: Plus },
            { href: "/suivi-actions/rapport", label: "Rapport d'activité" },
          ]}
        >
          {actionsTotal.error ? (
            <Indisponible />
          ) : (
            <>
              <div className="flex flex-wrap gap-x-10 gap-y-3">
                <Chiffre valeur={actionsTotal.count ?? 0}>{(actionsTotal.count ?? 0) > 1 ? "actions encodées" : "action encodée"}</Chiffre>
                <Chiffre valeur={actionsPubliees.count ?? 0}>
                  {(actionsPubliees.count ?? 0) > 1 ? "publiées sur le site" : "publiée sur le site"}
                </Chiffre>
              </div>
              {action && (
                <p className="mt-2 text-[15px]">
                  Dernière : <span className="font-bold">{titreAction(action)}</span>, le {isoToDateFr(action.date_action)}.
                </p>
              )}
            </>
          )}
        </Tuile>

        {/* ── Publications ── */}
        <Tuile
          titre="Publications"
          Icon={Newspaper}
          href="/suivi-actions/articles"
          libelleLien="Tous les articles"
          liens={[{ href: "/suivi-actions/articles/nouveau", label: "Écrire un article", Icon: Plus }]}
        >
          {brouillons.error || publies.error ? (
            <Indisponible />
          ) : (
            <div className="flex flex-wrap gap-x-10 gap-y-3">
              <Chiffre valeur={brouillons.count ?? 0}>{(brouillons.count ?? 0) > 1 ? "brouillons" : "brouillon"}</Chiffre>
              <Chiffre valeur={publies.count ?? 0}>{(publies.count ?? 0) > 1 ? "articles publiés" : "article publié"}</Chiffre>
            </div>
          )}
        </Tuile>
      </div>

      <p className="mt-6 text-sm">Chiffres du {dateArticle(new Date().toISOString())}, mis à jour à chaque visite.</p>
    </div>
  );
}

type LienTuile = { href: string; label: string; Icon?: LucideIcon };

/**
 * Tuile d'un domaine. Toute la surface ouvre la section (lien étiré sur le titre) ;
 * les raccourcis restent cliquables au-dessus.
 */
function Tuile({
  titre,
  Icon,
  href,
  libelleLien,
  liens = [],
  enAvant = false,
  children,
}: {
  titre: string;
  Icon: LucideIcon;
  href: string;
  libelleLien: string;
  liens?: LienTuile[];
  enAvant?: boolean;
  children: React.ReactNode;
}) {
  const raccourci = enAvant
    ? "border-white text-white hover:bg-white hover:text-militant-bordeaux"
    : "border-militant-charbon hover:bg-militant-charbon hover:text-white";
  return (
    <section
      className={`group relative flex flex-col rounded-2xl p-6 transition-colors focus-within:ring-2 focus-within:ring-militant-rouge focus-within:ring-offset-2 ${
        enAvant
          ? "bg-militant-bordeaux text-white"
          : "border border-militant-ardoise bg-white hover:border-militant-charbon"
      }`}
    >
      <h2 className="flex items-center gap-2.5 font-condensed text-3xl font-extrabold leading-none">
        <Icon size={24} className={`shrink-0 ${enAvant ? "text-white" : "text-militant-rouge"}`} aria-hidden />
        <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none" aria-label={`${titre} : ${libelleLien}`}>
          {titre}
        </Link>
      </h2>
      <div className={`mt-4 flex-1 border-t-2 pt-4 ${enAvant ? "border-white" : "border-militant-charbon"}`}>{children}</div>
      <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2">
        <span
          aria-hidden
          className={`inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-bold ${
            enAvant ? "bg-white text-militant-bordeaux" : "bg-militant-bordeaux text-white group-hover:bg-militant-charbon"
          } pointer-events-none`}
        >
          {libelleLien}
        </span>
        {liens.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 px-3.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${raccourci}`}
          >
            {l.Icon && <l.Icon size={15} aria-hidden />}
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Un chiffre clé : grand nombre condensé, libellé à sa suite. */
function Chiffre({ valeur, enAvant = false, children }: { valeur: number; enAvant?: boolean; children: React.ReactNode }) {
  return (
    <p className="flex items-baseline gap-2.5">
      <span
        className={`font-condensed text-6xl font-extrabold leading-none tabular-nums ${enAvant ? "text-white" : "text-militant-rouge"}`}
      >
        {valeur}
      </span>
      <span className="max-w-[14rem] text-base font-semibold leading-tight">{children}</span>
    </p>
  );
}

function Indisponible() {
  return <p className="text-[15px]">Chiffres indisponibles pour l&apos;instant : ouvrez la section ou rechargez la page.</p>;
}

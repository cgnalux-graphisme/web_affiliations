import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { STATUT_PUBLIE, categorieDe, cheminPublic } from "../../../../../lib/articles";
import { estReseau, type Reseau, type VersionEnregistree } from "../../../../../lib/reseaux";
import { origineSite } from "../../../../../lib/reseaux-ia";
import { getSuperAdmin, getSupabaseServer } from "../../../../../lib/supabase-server";
import DeclinaisonsReseaux from "./DeclinaisonsReseaux";

export const metadata: Metadata = {
  title: "Réseaux sociaux — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Déclinaison d'un article publié en posts Facebook, Instagram, TikTok et YouTube. */
export default async function ReseauxArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSuperAdmin())) redirect(`/login?next=/suivi-actions/articles/${encodeURIComponent(id)}/reseaux`);
  if (!UUID.test(id)) notFound();

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_articles")
    .select("id, titre, slug, statut, categorie")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Chargement de l'article impossible : ${error.message}`);
  if (!data) notFound();
  const article = data as { id: string; titre: string; slug: string; statut: string; categorie: string | null };

  // Plus récente d'abord : si plusieurs lignes existent pour un réseau, la première gagne.
  const { data: lignes, error: errVersions } = await supabase
    .from("site_publications_reseaux")
    .select("id, reseau, contenu")
    .eq("article_id", id)
    .order("updated_at", { ascending: false });
  const versions: Partial<Record<Reseau, VersionEnregistree>> = {};
  for (const l of (lignes ?? []) as { id: string; reseau: string; contenu: string | null }[]) {
    if (estReseau(l.reseau) && !versions[l.reseau]) versions[l.reseau] = { id: l.id, contenu: l.contenu ?? "" };
  }

  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  const lien = `${origineSite(`${proto}://${hote}`)}${cheminPublic(categorieDe(article.categorie), article.slug)}`;
  const publie = article.statut === STATUT_PUBLIE;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/suivi-actions/articles"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
      >
        <ArrowLeft size={16} aria-hidden /> Articles
      </Link>
      <div className="mt-2 border-b-[6px] border-militant-charbon pb-5">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">Réseaux sociaux</h1>
        <p className="mt-3 text-lg font-bold leading-snug">{article.titre}</p>
        {publie && (
          <a
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 text-sm underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
          >
            <span className="truncate">{lien}</span>
            <ExternalLink size={13} className="shrink-0" aria-hidden />
          </a>
        )}
      </div>

      {errVersions && (
        <p role="alert" className="mt-6 border-l-[6px] border-militant-bordeaux py-2 pl-4">
          Les versions déjà enregistrées ne peuvent pas être chargées. Rechargez la page ; si le problème persiste,
          reconnectez-vous.
        </p>
      )}

      {!publie && (
        <div className="mt-8 flex items-start gap-3 border-l-[6px] border-militant-rouge py-2 pl-5">
          <AlertTriangle size={22} className="mt-1 shrink-0 text-militant-bordeaux" aria-hidden />
          <div>
            <p className="font-condensed text-2xl font-bold">Cet article n&apos;est pas publié.</p>
            <p className="mt-1 text-lg">
              Les posts renvoient vers l&apos;article : relisez-le et publiez-le d&apos;abord, puis revenez ici.
            </p>
            <Link
              href={`/suivi-actions/articles/${article.id}/modifier`}
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-militant-charbon px-4 py-2 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
            >
              Modifier l&apos;article
            </Link>
          </div>
        </div>
      )}

      <DeclinaisonsReseaux articleId={article.id} versionsInitiales={versions} peutGenerer={publie} />
    </div>
  );
}

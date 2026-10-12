import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { STATUT_PUBLIE, categorieDe, cheminPublic } from "../../../../../../lib/articles";
import { estReseau, type Reseau, type VersionEnregistree } from "../../../../../../lib/reseaux";
import { origineSite } from "../../../../../../lib/reseaux-ia";
import { getSupabaseServer } from "../../../../../../lib/supabase-server";
import { exigerApp } from "../../../../../../lib/espace/acces";
import DeclinaisonsReseaux from "./DeclinaisonsReseaux";

import { Alerte, EnteteEcran } from "../../../../_partage/ui";
export const metadata: Metadata = {
  title: "Réseaux sociaux — Espace CG",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Déclinaison d'un article publié en posts Facebook, Instagram, TikTok et YouTube. */
export default async function ReseauxArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigerApp("scan-news");
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
    <div className="ecg-ecran">
      <EnteteEcran
        icone="share"
        titre="Réseaux sociaux"
        description={
          <>
            <span className="font-semibold text-[#222]">{article.titre}</span>
            {publie && (
              <a href={lien} target="_blank" rel="noopener noreferrer" className="ecg-lien mt-1 flex max-w-full items-center gap-1 text-sm">
                <span className="truncate">{lien}</span>
                <ExternalLink size={13} className="shrink-0" aria-hidden />
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            )}
          </>
        }
        actions={
          <Link href="/espace/scan-news/articles" className="ecg-btn">
            <ArrowLeft size={16} aria-hidden /> Articles
          </Link>
        }
      />

      {errVersions && (
        <Alerte ton="erreur">Les versions déjà enregistrées ne peuvent pas être chargées. Rechargez la page ; si le problème persiste,
          reconnectez-vous.</Alerte>
      )}

      {!publie && (
        <Alerte ton="attention" role={null} titre="Cet article n'est pas publié.">
          Les posts renvoient vers l&apos;article : relisez-le et publiez-le d&apos;abord, puis revenez ici.
          <div className="mt-3">
            <Link href={`/espace/scan-news/articles/${article.id}/modifier`} className="ecg-btn ecg-btn-petit">
              Modifier l&apos;article
            </Link>
          </div>
        </Alerte>
      )}

      <DeclinaisonsReseaux articleId={article.id} versionsInitiales={versions} peutGenerer={publie} />
    </div>
  );
}

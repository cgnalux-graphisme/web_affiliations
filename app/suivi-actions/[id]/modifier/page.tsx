import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import FormulaireAction, { type ActionEnregistree } from "../../../../FormulaireAction";
import SuppressionAction from "../../../../SuppressionAction";
import { titreAction } from "../../../../lib/actions";
import { trierPhotos } from "../../../../lib/photos";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const metadata: Metadata = {
  title: "Modifier une action — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

const COLONNES =
  "id, nom, date_action, ville, type_action, type_action_autre, secteur_id, front_commun, front_commun_csc, front_commun_synova, entreprise, deplacement_bus, deplacement_train, description, participants_total, participants_centrale, info_web, visible_public, photos:site_photos(id, url, legende), videos:site_videos(id, url, titre, created_at)";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ModifierActionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSuperAdmin())) redirect(`/login?next=/suivi-actions/${encodeURIComponent(id)}/modifier`);
  if (!UUID.test(id)) notFound();

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("site_actions").select(COLONNES).eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de l'action impossible : ${error.message}`);
  if (!data) notFound();

  const action = data as unknown as ActionEnregistree;
  // Vidéos dans l'ordre d'ajout ; photos dans l'ordre porté par leur nom de fichier (rang 00 = principale).
  const videos = [...((action.videos ?? []) as (ActionEnregistree["videos"][number] & { created_at: string })[])].sort(
    (a, b) => a.created_at.localeCompare(b.created_at)
  );
  return (
    <>
      <FormulaireAction
        key={action.id}
        action={{ ...action, photos: trierPhotos(action.photos ?? []), videos }}
      />
      <div className="mt-12">
        <SuppressionAction
          actionId={action.id}
          titre={titreAction(action)}
          urlsPhotos={(action.photos ?? []).map((p) => p.url)}
          nbVideos={videos.length}
        />
      </div>
    </>
  );
}

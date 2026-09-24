import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Globe, ImageIcon, Lock, Pencil, Plus } from "lucide-react";
import { titreAction } from "../../lib/actions";
import { isoToDateFr } from "../../lib/dates";
import { getSuperAdmin, getSupabaseServer } from "../../lib/supabase-server";

type LigneAction = {
  id: string;
  nom: string | null;
  date_action: string;
  ville: string | null;
  type_action: string;
  type_action_autre: string | null;
  visible_public: boolean;
  photos: { count: number }[];
};

function libelleType(a: LigneAction): string {
  return titreAction({ nom: null, type_action: a.type_action, type_action_autre: a.type_action_autre });
}

export default async function ListeActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ modifiee?: string }>;
}) {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions");
  const { modifiee } = await searchParams;

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_actions")
    .select("id, nom, date_action, ville, type_action, type_action_autre, visible_public, photos:site_photos(count)")
    .order("date_action", { ascending: false })
    .order("created_at", { ascending: false });

  const actions = (data ?? []) as unknown as LigneAction[];
  const publiees = actions.filter((a) => a.visible_public).length;
  const actionModifiee = modifiee ? actions.find((a) => a.id === modifiee) : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-[6px] border-militant-charbon pb-5">
        <div>
          <h1 className="font-condensed text-5xl font-extrabold leading-none tracking-tight">Actions</h1>
          {!error && (
            <p className="mt-2 text-base">
              {actions.length} action{actions.length > 1 ? "s" : ""} encodée{actions.length > 1 ? "s" : ""}, dont{" "}
              {publiees} publiée{publiees > 1 ? "s" : ""} sur le site.
            </p>
          )}
        </div>
        <Link
          href="/suivi-actions/nouvelle"
          className="inline-flex items-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
        >
          <Plus size={18} aria-hidden /> Encoder une nouvelle action
        </Link>
      </div>

      {actionModifiee && (
        <div role="status" className="mt-6 flex items-center gap-3 rounded-xl bg-militant-charbon px-4 py-3 text-white">
          <CheckCircle size={20} className="shrink-0 text-militant-rouge" aria-hidden />
          <p>
            Modifications enregistrées : <span className="font-bold">{titreAction(actionModifiee)}</span>
          </p>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          La liste des actions ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
      ) : actions.length === 0 ? (
        <div className="mt-10 border-l-[6px] border-militant-rouge py-2 pl-5">
          <p className="font-condensed text-3xl font-bold">Aucune action encodée pour l&apos;instant.</p>
          <p className="mt-2 text-lg">Commencez par encoder la première action.</p>
        </div>
      ) : (
        <>
          <div
            aria-hidden
            className="mt-6 hidden grid-cols-[7.5rem_minmax(0,1fr)_10rem_4.5rem_8.5rem_7.5rem] gap-4 px-4 pb-2 text-sm font-bold md:grid"
          >
            <span>Date</span>
            <span>Action</span>
            <span>Ville</span>
            <span>Photos</span>
            <span>Site public</span>
            <span className="sr-only">Modifier</span>
          </div>
          <ul className="divide-y divide-militant-ardoise border-y border-militant-ardoise md:mt-0 mt-6">
            {actions.map((a) => {
              const nbPhotos = a.photos?.[0]?.count ?? 0;
              const enAvant = a.id === actionModifiee?.id;
              return (
                <li
                  key={a.id}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-4 md:grid-cols-[7.5rem_minmax(0,1fr)_10rem_4.5rem_8.5rem_7.5rem] ${
                    enAvant ? "border-l-[6px] border-militant-rouge" : ""
                  }`}
                >
                  <p className="col-span-2 font-condensed text-xl font-bold tabular-nums md:col-span-1">
                    {isoToDateFr(a.date_action)}
                  </p>
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <p className="break-words text-[17px] font-bold leading-snug">{titreAction(a)}</p>
                    {a.nom?.trim() && <p className="mt-0.5 text-sm">{libelleType(a)}</p>}
                  </div>
                  <p className="min-w-0 break-words text-[15px]">
                    <span className="md:hidden">Ville : </span>
                    {a.ville || <span aria-label="Pas de ville">—</span>}
                  </p>
                  <p className="flex items-center gap-1.5 text-[15px] tabular-nums" title={`${nbPhotos} photo${nbPhotos > 1 ? "s" : ""}`}>
                    <ImageIcon size={16} aria-hidden />
                    {nbPhotos}
                    <span className="sr-only"> photo{nbPhotos > 1 ? "s" : ""}</span>
                  </p>
                  <p>
                    {a.visible_public ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-militant-charbon px-3 py-1 text-sm font-bold text-white">
                        <Globe size={14} className="text-militant-rouge" aria-hidden /> Publiée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-militant-ardoise px-3 py-0.5 text-sm font-bold">
                        <Lock size={14} aria-hidden /> Non publiée
                      </span>
                    )}
                  </p>
                  <p className="md:text-right">
                    <Link
                      href={`/suivi-actions/${a.id}/modifier`}
                      aria-label={`Modifier : ${titreAction(a)} (${isoToDateFr(a.date_action)})`}
                      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-militant-charbon px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                    >
                      <Pencil size={14} aria-hidden /> Modifier
                    </Link>
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

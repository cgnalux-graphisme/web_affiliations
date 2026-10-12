import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Globe, ImageIcon, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { titreAction } from "../../../../lib/actions";
import { isoToDateFr } from "../../../../lib/dates";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { exigerApp } from "../../../../lib/espace/acces";
import { Alerte, BTN, BTN_PETIT, BTN_PRINCIPAL, EnteteEcran, Panneau, Statut, Vide } from "../../_partage/ui";

export const metadata: Metadata = {
  title: "Actions — Espace CG",
  robots: { index: false, follow: false },
};

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
  searchParams: Promise<{ modifiee?: string; supprimee?: string }>;
}) {
  await exigerApp("actions");
  const { modifiee, supprimee } = await searchParams;

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
    <div className="ecg-ecran">
      <EnteteEcran
        icone="list"
        titre="Toutes les actions"
        description={
          !error &&
          `${actions.length} action${actions.length > 1 ? "s" : ""} encodée${actions.length > 1 ? "s" : ""}, dont ${publiees} publiée${publiees > 1 ? "s" : ""} sur le site.`
        }
        actions={
          <>
            <Link href="/espace/actions/rapport" className={BTN}>
              <FileText size={18} aria-hidden /> Rapport de congrès
            </Link>
            <Link href="/espace/actions/nouvelle" className={BTN_PRINCIPAL}>
              <Plus size={18} aria-hidden /> Encoder une action
            </Link>
          </>
        }
      />

      {actionModifiee && (
        <Alerte ton="succes">
          Modifications enregistrées : <b>{titreAction(actionModifiee)}</b>
        </Alerte>
      )}
      {supprimee && (
        <Alerte ton="succes" icone={Trash2}>
          Action supprimée : <b>{supprimee}</b>
        </Alerte>
      )}

      {error ? (
        <Alerte ton="erreur">
          La liste des actions ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </Alerte>
      ) : actions.length === 0 ? (
        <Panneau>
          <Vide
            icone="megaphone"
            titre="Aucune action encodée pour l'instant"
            action={
              <Link href="/espace/actions/nouvelle" className={BTN_PRINCIPAL}>
                <Plus size={18} aria-hidden /> Encoder la première action
              </Link>
            }
          />
        </Panneau>
      ) : (
        <Panneau titre="Actions" sousTitre="De la plus récente à la plus ancienne" id="liste-actions" corps={false}>
          <div className="ecg-tableau-cadre">
            <table className="ecg-tableau">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Action</th>
                  <th scope="col">Ville</th>
                  <th scope="col">Photos</th>
                  <th scope="col">Site public</th>
                  <th scope="col">
                    <span className="sr-only">Modifier</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => {
                  const nbPhotos = a.photos?.[0]?.count ?? 0;
                  const enAvant = a.id === actionModifiee?.id;
                  return (
                    <tr key={a.id} className={enAvant ? "bg-[var(--app-pale)]" : undefined}>
                      <td className="ecg-chiffre whitespace-nowrap font-semibold">{isoToDateFr(a.date_action)}</td>
                      <td className="min-w-[220px]">
                        <p className="break-words font-semibold leading-snug">{titreAction(a)}</p>
                        {a.nom?.trim() && <p className="ecg-texte-doux text-[13px]">{libelleType(a)}</p>}
                      </td>
                      <td className="min-w-[110px] break-words">{a.ville || <span className="ecg-texte-doux">Non précisée</span>}</td>
                      <td className="ecg-chiffre whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <ImageIcon size={16} aria-hidden />
                          {nbPhotos}
                          <span className="sr-only"> photo{nbPhotos > 1 ? "s" : ""}</span>
                        </span>
                      </td>
                      <td>
                        {a.visible_public ? (
                          <Statut ton="ok" icone={Globe}>
                            Publiée
                          </Statut>
                        ) : (
                          <Statut icone={Lock}>Non publiée</Statut>
                        )}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/espace/actions/${a.id}/modifier`}
                          aria-label={`Modifier : ${titreAction(a)} (${isoToDateFr(a.date_action)})`}
                          className={`${BTN} ${BTN_PETIT}`}
                        >
                          <Pencil size={14} aria-hidden /> Modifier
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panneau>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CircleCheck, CircleOff, Clock, Eye, MapPin, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { IconeChargement } from "../../../Chargement";
import Interrupteur from "../../_partage/Interrupteur";
import { BUCKET_BLOG, cheminImageDepuisUrl } from "../../../../lib/articles";
import {
  dateMobilisation,
  finMiseEnAvant,
  lienValide,
  miseEnAvantTerminee,
  type Mobilisation,
} from "../../../../lib/mobilisations";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { rafraichirMobilisation } from "./revalidation";

import { Alerte, Panneau, Statut, Vide } from "../../_partage/ui";
const BOUTON = "ecg-btn ecg-btn-petit";

/**
 * Liste des mobilisations. Une seule peut être mise en avant : en activer une désactive les autres.
 * Écritures dans le navigateur avec la session (RLS super admin).
 */
export default function ListeMobilisations({
  initiales,
  accueilOn,
  enregistre,
}: {
  initiales: Mobilisation[];
  accueilOn: boolean;
  enregistre?: string;
}) {
  const router = useRouter();
  const [liste, setListe] = useState(initiales);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  async function basculer(m: Mobilisation, actif: boolean) {
    setEnCours(m.id);
    setErreur("");
    const supabase = getSupabaseAuth();
    if (actif) {
      // Une seule mise en avant : on éteint d'abord les autres.
      const { error } = await supabase.from("site_mobilisations").update({ actif: false }).eq("actif", true).neq("id", m.id);
      if (error) {
        console.error(error);
        setEnCours(null);
        setErreur("La mise en avant n'a pas pu être changée. Reconnectez-vous puis réessayez.");
        return;
      }
    }
    const { data, error } = await supabase.from("site_mobilisations").update({ actif }).eq("id", m.id).select("id");
    if (error || !data?.length) {
      console.error(error);
      setEnCours(null);
      setErreur("La mise en avant n'a pas pu être changée. Reconnectez-vous puis réessayez.");
      router.refresh();
      return;
    }
    setListe((l) => l.map((x) => (x.id === m.id ? { ...x, actif } : actif ? { ...x, actif: false } : x)));
    await rafraichirMobilisation();
    setEnCours(null);
    router.refresh();
  }

  async function supprimer(m: Mobilisation) {
    setEnCours(m.id);
    setErreur("");
    const supabase = getSupabaseAuth();
    // Image d'abord (pas de fichier orphelin en ligne), puis la ligne.
    const chemin = cheminImageDepuisUrl(m.image_hero);
    if (chemin) {
      const { error } = await supabase.storage.from(BUCKET_BLOG).remove([chemin]);
      if (error) {
        console.error(error);
        setEnCours(null);
        setConfirmer(null);
        setErreur("L'image n'a pas pu être effacée : la mobilisation est conservée. Réessayez.");
        return;
      }
    }
    const { data, error } = await supabase.from("site_mobilisations").delete().eq("id", m.id).select("id");
    if (error || !data?.length) {
      console.error(error);
      setEnCours(null);
      setErreur("La mobilisation n'a pas pu être supprimée. Reconnectez-vous puis réessayez.");
      return;
    }
    setListe((l) => l.filter((x) => x.id !== m.id));
    setConfirmer(null);
    await rafraichirMobilisation();
    setEnCours(null);
    router.refresh();
  }

  if (liste.length === 0) {
    return (
      <Panneau>
        <Vide icone="flag" titre="Aucune mobilisation pour l'instant">
          Créez la prochaine manifestation ou grève : titre, date, lieu, pourquoi on se mobilise et lien d&apos;inscription.
        </Vide>
      </Panneau>
    );
  }

  return (
    <>
      {erreur && (
        <Alerte ton="erreur">{erreur}</Alerte>
      )}
      <ul className="ecg-pile">
        {liste.map((m) => {
          const incomplet = !m.pourquoi?.trim() || !lienValide(m.lien_inscription) || !m.date_evenement;
          return (
            <li
              key={m.id}
              className={`ecg-panneau grid gap-4 p-4 sm:grid-cols-[168px_1fr] sm:p-5 ${
                m.actif ? "ecg-media-principale" : ""
              } ${enregistre === m.id ? "une-en-avant" : ""}`}
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#e3e7eb]">
                {m.image_hero && <Image src={m.image_hero} alt="" fill sizes="160px" className="object-cover" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-condensed text-[22px] font-bold leading-tight">{m.titre}</p>
                    <p className="ecg-texte-doux mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={15} aria-hidden /> {dateMobilisation(m.date_evenement) || "Date à préciser"}
                      </span>
                      {m.lieu && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={15} aria-hidden /> {m.lieu}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[12.5px] font-semibold text-[#56646f]">Mise en avant</span>
                    <Interrupteur
                      actif={m.actif}
                      onChange={(v) => basculer(m, v)}
                      label={`Mettre en avant : ${m.titre}`}
                      etatOn="Active"
                      etatOff="Inactive"
                      enCours={enCours === m.id}
                      disabled={enCours !== null}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {m.actif && !miseEnAvantTerminee(m.date_evenement, Date.now()) && accueilOn && (
                    <Statut ton="ok" icone={CircleCheck}>
                      En ligne
                    </Statut>
                  )}
                  {m.actif && miseEnAvantTerminee(m.date_evenement, Date.now()) && (
                    <Statut icone={Clock}>
                      Terminée : plus affichée depuis{" "}
                      {dateMobilisation(new Date(finMiseEnAvant(m.date_evenement)!).toISOString())}
                    </Statut>
                  )}
                  {m.actif && !accueilOn && (
                    <Statut ton="attente" icone={CircleOff}>
                      Active mais invisible : affichage coupé
                    </Statut>
                  )}
                  {incomplet && (
                    <Statut ton="attente" icone={TriangleAlert}>
                      À compléter :{" "}
                      {[
                        !m.date_evenement && "date",
                        !m.pourquoi?.trim() && "pourquoi on se mobilise",
                        !lienValide(m.lien_inscription) && "lien d'inscription",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Statut>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/espace/actions/mobilisations/${m.id}/modifier`}
                    className={`${BOUTON}`}
                  >
                    <Pencil size={14} aria-hidden /> Modifier
                  </Link>
                  <Link
                    href={`/espace/actions/mobilisations/${m.id}/apercu`}
                    className={`${BOUTON}`}
                  >
                    <Eye size={14} aria-hidden /> Aperçu
                  </Link>
                  {confirmer === m.id ? (
                    <span className="inline-flex flex-wrap items-center gap-2 text-sm font-semibold">
                      Supprimer définitivement ?
                      <button
                        type="button"
                        onClick={() => supprimer(m)}
                        disabled={enCours !== null}
                        autoFocus
                        className={`${BOUTON} ecg-btn-principal`}
                      >
                        {enCours === m.id && <IconeChargement size={14} />} Oui, supprimer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmer(null)}
                        className={`${BOUTON}`}
                      >
                        Non
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmer(m.id)}
                      disabled={enCours !== null}
                      aria-label={`Supprimer : ${m.titre}`}
                      className={`${BOUTON} ecg-btn-fantome ecg-btn-fantome-danger`}
                    >
                      <Trash2 size={14} aria-hidden /> Supprimer
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

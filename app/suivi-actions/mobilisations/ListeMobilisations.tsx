"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, Eye, MapPin, Pencil, Trash2 } from "lucide-react";
import { IconeChargement } from "../../Chargement";
import Interrupteur from "../Interrupteur";
import { BUCKET_BLOG, cheminImageDepuisUrl } from "../../../lib/articles";
import {
  dateMobilisation,
  finMiseEnAvant,
  lienValide,
  miseEnAvantTerminee,
  type Mobilisation,
} from "../../../lib/mobilisations";
import { getSupabaseAuth } from "../../../lib/supabase";
import { rafraichirMobilisation } from "./revalidation";

const BOUTON =
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border-2 px-3.5 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50";

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
      <div className="mt-8 border-l-[6px] border-militant-rouge py-2 pl-5">
        <p className="font-condensed text-3xl font-bold leading-tight">Aucune mobilisation pour l&apos;instant.</p>
        <p className="mt-2 text-lg">
          Créez la prochaine manifestation ou grève : titre, date, lieu, pourquoi on se mobilise et lien d&apos;inscription.
        </p>
      </div>
    );
  }

  return (
    <>
      {erreur && (
        <p role="alert" className="mt-6 border-l-[6px] border-militant-bordeaux py-2 pl-4 font-semibold">
          {erreur}
        </p>
      )}
      <ul className="mt-6 space-y-4">
        {liste.map((m) => {
          const incomplet = !m.pourquoi?.trim() || !lienValide(m.lien_inscription) || !m.date_evenement;
          return (
            <li
              key={m.id}
              className={`grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-[160px_1fr] sm:p-5 ${
                m.actif ? "border-militant-bordeaux ring-1 ring-militant-bordeaux" : "border-militant-ardoise"
              } ${enregistre === m.id ? "une-en-avant" : ""}`}
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-militant-ardoise">
                {m.image_hero && <Image src={m.image_hero} alt="" fill sizes="160px" className="object-cover" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-condensed text-2xl font-extrabold leading-tight">{m.titre}</p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
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
                    <span className="text-xs font-semibold">Mise en avant</span>
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

                {m.actif && miseEnAvantTerminee(m.date_evenement, Date.now()) && (
                  <p className="mt-2 text-sm font-semibold text-militant-bordeaux">
                    Terminée : plus affichée sur le site depuis{" "}
                    {dateMobilisation(new Date(finMiseEnAvant(m.date_evenement)!).toISOString())} (1 h après
                    l&apos;événement).
                  </p>
                )}
                {m.actif && !accueilOn && (
                  <p className="mt-2 text-sm font-semibold text-militant-bordeaux">
                    Active, mais invisible : l&apos;affichage sur le site est coupé dans les paramètres.
                  </p>
                )}
                {incomplet && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-militant-rouge" aria-hidden />
                    À compléter :{" "}
                    {[
                      !m.date_evenement && "date",
                      !m.pourquoi?.trim() && "pourquoi on se mobilise",
                      !lienValide(m.lien_inscription) && "lien d'inscription",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    .
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/suivi-actions/mobilisations/${m.id}/modifier`}
                    className={`${BOUTON} border-militant-charbon hover:bg-militant-charbon hover:text-white`}
                  >
                    <Pencil size={14} aria-hidden /> Modifier
                  </Link>
                  <Link
                    href={`/suivi-actions/mobilisations/${m.id}/apercu`}
                    className={`${BOUTON} border-militant-charbon hover:bg-militant-charbon hover:text-white`}
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
                        className={`${BOUTON} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon`}
                      >
                        {enCours === m.id && <IconeChargement size={14} />} Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmer(null)}
                        className={`${BOUTON} border-militant-charbon hover:bg-militant-charbon hover:text-white`}
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
                      className={`${BOUTON} border-transparent text-militant-bordeaux hover:border-militant-bordeaux`}
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

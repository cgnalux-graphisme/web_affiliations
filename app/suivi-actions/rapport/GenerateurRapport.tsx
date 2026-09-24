"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle, Download, FileText, Loader2 } from "lucide-react";
import { dateFrToIso, formatDateFr, isoToDateFr } from "../../../lib/dates";
import { trierPhotos } from "../../../lib/photos";
import { calculerBilan, type ActionRapport } from "../../../lib/rapport/bilan";
import { getSupabaseAuth } from "../../../lib/supabase";

const COLONNES =
  "id, nom, date_action, ville, type_action, type_action_autre, entreprise, front_commun, front_commun_csc, front_commun_synova, participants_total, participants_centrale, description, secteur:site_secteurs(nom), photos:site_photos(url)";

type Ligne = Omit<ActionRapport, "secteur" | "photo"> & {
  secteur: { nom: string } | null;
  photos: { url: string }[];
};

/** Réduit une photo pour le PDF (900 px de côté max, JPEG) : fichier final plus léger. */
async function photoPourPdf(url: string): Promise<string | null> {
  try {
    const reponse = await fetch(url);
    if (!reponse.ok) return null;
    const bitmap = await createImageBitmap(await reponse.blob());
    const echelle = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * echelle);
    canvas.height = Math.round(bitmap.height * echelle);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch (err) {
    console.error("photo", url, err);
    return null;
  }
}

function telecharger(blob: Blob, nomFichier: string) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function GenerateurRapport() {
  const annee = new Date().getFullYear();
  const [debut, setDebut] = useState(`01/01/${annee - 4}`);
  const [fin, setFin] = useState(`31/12/${annee}`);
  const [erreurs, setErreurs] = useState<{ debut?: string; fin?: string; general?: string }>({});
  const [progression, setProgression] = useState("");
  const [resultat, setResultat] = useState<{ blob: Blob; nom: string; actions: number; photosManquantes: number } | null>(null);

  async function generer(e: React.FormEvent) {
    e.preventDefault();
    if (progression) return;
    const isoDebut = dateFrToIso(debut);
    const isoFin = dateFrToIso(fin);
    const err: typeof erreurs = {};
    if (!isoDebut) err.debut = "Date invalide (format jj/mm/aaaa)";
    if (!isoFin) err.fin = "Date invalide (format jj/mm/aaaa)";
    if (isoDebut && isoFin && isoDebut > isoFin) err.fin = "La date de fin doit suivre la date de début";
    setErreurs(err);
    if (Object.keys(err).length || !isoDebut || !isoFin) return;

    setResultat(null);
    try {
      // 1) Toutes les actions de la période, publiées ou non (lecture réservée aux super admins).
      setProgression("Chargement des actions…");
      const { data, error } = await getSupabaseAuth()
        .from("site_actions")
        .select(COLONNES)
        .gte("date_action", isoDebut)
        .lte("date_action", isoFin)
        .order("date_action", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      const lignes = (data ?? []) as unknown as Ligne[];
      if (lignes.length === 0) {
        setErreurs({ general: `Aucune action encodée ${`du ${debut} au ${fin}`}. Élargissez la période.` });
        return;
      }

      // 2) Photo principale de chaque action, réduite pour le PDF (4 à la fois).
      const actions: ActionRapport[] = lignes.map(({ secteur, photos, ...a }) => ({
        ...a,
        secteur: secteur?.nom ?? null,
        photo: trierPhotos(photos ?? [])[0]?.url ?? null,
      }));
      const avecPhoto = actions.filter((a) => a.photo);
      let faites = 0;
      let manquantes = 0;
      for (let i = 0; i < avecPhoto.length; i += 4) {
        await Promise.all(
          avecPhoto.slice(i, i + 4).map(async (a) => {
            a.photo = await photoPourPdf(a.photo!);
            if (!a.photo) manquantes++;
            faites++;
            setProgression(`Préparation des photos ${faites}/${avecPhoto.length}…`);
          })
        );
      }

      // 3) Mise en page (chargée à la demande : la librairie PDF est lourde).
      setProgression("Mise en page du PDF…");
      const [{ pdf }, { default: RapportPDF, enregistrerPolices }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../../../lib/rapport/RapportPDF"),
      ]);
      enregistrerPolices(window.location.origin);
      const bilan = calculerBilan(actions, +isoDebut.slice(0, 4), +isoFin.slice(0, 4));
      const blob = await pdf(
        <RapportPDF
          actions={actions}
          bilan={bilan}
          p={{ debut: isoDebut, fin: isoFin, genereLe: isoToDateFr(new Date().toISOString().slice(0, 10)), origine: window.location.origin }}
        />
      ).toBlob();

      const nom = `rapport-activite-${isoDebut.slice(0, 4)}-${isoFin.slice(0, 4)}.pdf`;
      telecharger(blob, nom);
      setResultat({ blob, nom, actions: actions.length, photosManquantes: manquantes });
    } catch (err) {
      console.error(err);
      setErreurs({
        general:
          "Le rapport n'a pas pu être généré. Vérifiez votre connexion ; si votre session a expiré, reconnectez-vous puis réessayez.",
      });
    } finally {
      setProgression("");
    }
  }

  const champ = (erreur?: string) =>
    `w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] tabular-nums text-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge ${
      erreur ? "border-2 border-militant-bordeaux" : "border-militant-ardoise focus:border-militant-charbon"
    }`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="border-b-[6px] border-militant-charbon pb-5">
        <h1 className="font-condensed text-5xl font-extrabold leading-none tracking-tight">Rapport d&apos;activité</h1>
        <p className="mt-2 text-base">
          Le rapport de congrès en PDF : bilan en chiffres, graphiques et chronologie détaillée de toutes les actions
          de la période, publiées ou non.
        </p>
      </div>

      <form onSubmit={generer} noValidate className="mt-8 rounded-2xl border border-militant-ardoise p-6">
        <fieldset disabled={Boolean(progression)}>
          <legend className="font-condensed text-2xl font-bold">Période</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["debut", "Du", debut, setDebut],
                ["fin", "Au", fin, setFin],
              ] as const
            ).map(([cle, libelle, valeur, setValeur]) => (
              <div key={cle}>
                <label htmlFor={`rapport-${cle}`} className="mb-1.5 block text-sm font-bold">
                  {libelle}
                </label>
                <input
                  id={`rapport-${cle}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="jj/mm/aaaa"
                  maxLength={10}
                  value={valeur}
                  onChange={(e) => {
                    setValeur(formatDateFr(e.target.value));
                    setErreurs((x) => ({ ...x, [cle]: undefined, general: undefined }));
                  }}
                  aria-invalid={Boolean(erreurs[cle])}
                  className={champ(erreurs[cle])}
                />
                {erreurs[cle] && <p className="mt-1 text-xs font-semibold text-militant-bordeaux">{erreurs[cle]}</p>}
              </div>
            ))}
          </div>
        </fieldset>

        {erreurs.general && (
          <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border-2 border-militant-bordeaux px-4 py-3 text-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-militant-bordeaux" />
            <p>{erreurs.general}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={Boolean(progression)}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {progression ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} aria-hidden />}
          {progression || "Générer le rapport PDF"}
        </button>
        <p className="mt-2 text-center text-xs">
          La génération peut prendre quelques secondes selon le nombre de photos.
        </p>
      </form>

      {resultat && (
        <div role="status" className="mt-6 rounded-2xl bg-militant-charbon p-5 text-white">
          <p className="flex items-center gap-2 font-bold">
            <CheckCircle size={20} className="text-militant-rouge" aria-hidden />
            Rapport généré : {resultat.actions} action{resultat.actions > 1 ? "s" : ""}.
          </p>
          <p className="mt-1 text-sm">
            Le téléchargement a démarré ({resultat.nom}).
            {resultat.photosManquantes > 0 &&
              ` ${resultat.photosManquantes} photo${resultat.photosManquantes > 1 ? "s n'ont" : " n'a"} pas pu être chargée${resultat.photosManquantes > 1 ? "s" : ""} : les actions concernées apparaissent sans photo.`}
          </p>
          <button
            type="button"
            onClick={() => telecharger(resultat.blob, resultat.nom)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-white px-4 py-2 text-sm font-bold hover:bg-white hover:text-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
          >
            <Download size={16} aria-hidden /> Télécharger à nouveau
          </button>
        </div>
      )}
    </div>
  );
}

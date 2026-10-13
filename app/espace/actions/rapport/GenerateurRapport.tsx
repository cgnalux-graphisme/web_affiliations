"use client";

import React, { useMemo, useState } from "react";
import { ClipboardList, Download, FileText, ListChecks, Megaphone } from "lucide-react";
import { Alerte, BTN, BTN_PETIT, BTN_PRINCIPAL, CHAMP, EnteteEcran, LIBELLE, Panneau } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import { dateFrToIso, formatDateFr, isoToDateFr } from "../../../../lib/dates";
import { trierPhotos } from "../../../../lib/photos";
import { calculerBilan, type ActionRapport } from "../../../../lib/rapport/bilan";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { photoPourPdf, telecharger } from "../../../../lib/pdf/photo-pdf";
import { libelleDate } from "../../../../lib/fiches-suivi/regles";
import { aujourdhuiFr, versFichePdf } from "../../../../lib/fiches-suivi/pdf-donnees";
import type { FicheAffichee } from "../../../../lib/fiches-suivi/types";
import { chargerFichesRapport } from "./actions";

const COLONNES =
  "id, nom, date_action, ville, type_action, type_action_autre, entreprise, front_commun, front_commun_csc, front_commun_synova, participants_total, participants_centrale, description, secteur_id, secteur:site_secteurs(nom), photos:site_photos(url)";

type Ligne = Omit<ActionRapport, "secteur" | "photo"> & {
  secteur_id: string | null;
  secteur: { nom: string } | null;
  photos: { url: string }[];
};
type Choix = { id: string; nom: string };

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const titreAction = (a: ActionRapport) =>
  a.nom?.trim() || (a.type_action === "autre" ? a.type_action_autre?.trim() || "Autre action" : a.type_action.charAt(0).toUpperCase() + a.type_action.slice(1));

/**
 * Rapport de congrès en deux temps : composer (période, entreprise, secteur, permanent, actions et / ou fiches de
 * suivi), cocher les éléments retenus, puis générer le PDF dans le navigateur.
 */
export default function GenerateurRapport({ entreprises, secteurs, permanents }: { entreprises: Choix[]; secteurs: Choix[]; permanents: Choix[] }) {
  const annee = new Date().getFullYear();
  const [debut, setDebut] = useState(`01/01/${annee - 4}`);
  const [fin, setFin] = useState(`31/12/${annee}`);
  const [entrepriseId, setEntrepriseId] = useState("");
  const [secteurId, setSecteurId] = useState("");
  const [auteurId, setAuteurId] = useState("");
  const [avecActions, setAvecActions] = useState(true);
  const [avecFiches, setAvecFiches] = useState(true);
  const [brouillons, setBrouillons] = useState(false);
  const [erreurs, setErreurs] = useState<{ debut?: string; fin?: string; general?: string }>({});
  const [progression, setProgression] = useState("");
  const [elements, setElements] = useState<{ actions: ActionRapport[]; fiches: FicheAffichee[]; debut: string; fin: string } | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [resultat, setResultat] = useState<{ blob: Blob; nom: string; actions: number; fiches: number; photosManquantes: number } | null>(null);

  function reinitialiser() {
    setElements(null);
    setResultat(null);
    setErreurs((x) => ({ ...x, general: undefined }));
  }

  async function afficher(e: React.FormEvent) {
    e.preventDefault();
    if (progression) return;
    const isoDebut = dateFrToIso(debut);
    const isoFin = dateFrToIso(fin);
    const err: typeof erreurs = {};
    if (!isoDebut) err.debut = "Date invalide (format jj/mm/aaaa)";
    if (!isoFin) err.fin = "Date invalide (format jj/mm/aaaa)";
    if (isoDebut && isoFin && isoDebut > isoFin) err.fin = "La date de fin doit suivre la date de début";
    if (!avecActions && !avecFiches) err.general = "Cochez au moins les actions ou les fiches de suivi.";
    setErreurs(err);
    if (Object.keys(err).length || !isoDebut || !isoFin) return;
    setResultat(null);
    setElements(null);
    try {
      setProgression("Recherche des éléments…");
      let actions: ActionRapport[] = [];
      if (avecActions) {
        // Les actions n'ont pas d'auteur : le filtre « permanent » ne s'applique qu'aux fiches.
        let q = getSupabaseAuth().from("site_actions").select(COLONNES).gte("date_action", isoDebut).lte("date_action", isoFin)
          .order("date_action", { ascending: true }).order("created_at", { ascending: true });
        if (secteurId) q = q.eq("secteur_id", secteurId);
        const { data, error } = await q;
        if (error) throw error;
        // L'entreprise d'une action est un texte libre : rapprochement par le nom.
        const nomEntreprise = sansAccents(entreprises.find((x) => x.id === entrepriseId)?.nom ?? "");
        actions = ((data ?? []) as unknown as Ligne[])
          .filter((a) => !nomEntreprise || (a.entreprise && (sansAccents(a.entreprise).includes(nomEntreprise) || nomEntreprise.includes(sansAccents(a.entreprise)))))
          .map(({ secteur, photos, secteur_id: _s, ...a }) => ({ ...a, secteur: secteur?.nom ?? null, photo: trierPhotos(photos ?? [])[0]?.url ?? null }));
      }
      let fiches: FicheAffichee[] = [];
      if (avecFiches) {
        const r = await chargerFichesRapport({ debut: isoDebut, fin: isoFin, brouillons, entrepriseId, secteurId, auteurId });
        if (!r.ok) throw new Error(r.erreur);
        fiches = r.fiches;
      }
      if (actions.length + fiches.length === 0) {
        setErreurs({ general: `Aucun élément du ${debut} au ${fin} avec ces filtres. Élargissez la période ou retirez un filtre.` });
        return;
      }
      setElements({ actions, fiches, debut: isoDebut, fin: isoFin });
      setCoches(new Set([...actions.map((a) => `a-${a.id}`), ...fiches.map((f) => `f-${f.id}`)]));
    } catch (err) {
      console.error(err);
      setErreurs({ general: err instanceof Error && err.message.startsWith("Les fiches") ? err.message
        : "Les éléments n'ont pas pu être chargés. Vérifiez votre connexion ; si votre session a expiré, reconnectez-vous." });
    } finally {
      setProgression("");
    }
  }

  async function generer() {
    if (!elements || progression) return;
    const actions = elements.actions.filter((a) => coches.has(`a-${a.id}`)).map((a) => ({ ...a }));
    const fiches = elements.fiches.filter((f) => coches.has(`f-${f.id}`));
    if (actions.length + fiches.length === 0) return setErreurs({ general: "Cochez au moins un élément." });
    setErreurs({});
    setResultat(null);
    try {
      // Photos : principale de chaque action, première photo de chaque fiche (4 à la fois).
      const taches: (() => Promise<boolean>)[] = [
        ...actions.filter((a) => a.photo).map((a) => async () => Boolean((a.photo = await photoPourPdf(a.photo!)))),
      ];
      const photosFiches = new Map<string, string | null>();
      for (const f of fiches) {
        const p = f.photos[0];
        if (p?.url) taches.push(async () => Boolean(photosFiches.set(f.id, await photoPourPdf(p.url!)).get(f.id)));
      }
      let faites = 0;
      let manquantes = 0;
      for (let i = 0; i < taches.length; i += 4) {
        await Promise.all(taches.slice(i, i + 4).map(async (t) => {
          if (!(await t())) manquantes++;
          faites++;
          setProgression(`Préparation des photos ${faites}/${taches.length}…`);
        }));
      }

      setProgression("Mise en page du PDF…");
      const [{ pdf }, { default: RapportPDF, enregistrerPolices }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../../../../lib/rapport/RapportPDF"),
      ]);
      enregistrerPolices(window.location.origin);
      const bilan = calculerBilan(actions, +elements.debut.slice(0, 4), +elements.fin.slice(0, 4));
      // Fiches : texte et photo principale seulement (la fiche complète a son propre PDF).
      const fichesPdf = fiches.map((f) => versFichePdf({ ...f, photos: f.photos.slice(0, 1) }, [photosFiches.get(f.id) ?? null]));
      const blob = await pdf(
        <RapportPDF actions={actions} bilan={bilan} fiches={fichesPdf}
          p={{ debut: elements.debut, fin: elements.fin, genereLe: aujourdhuiFr(), origine: window.location.origin }} />
      ).toBlob();
      const nom = `rapport-activite-${elements.debut.slice(0, 4)}-${elements.fin.slice(0, 4)}.pdf`;
      telecharger(blob, nom);
      setResultat({ blob, nom, actions: actions.length, fiches: fiches.length, photosManquantes: manquantes });
    } catch (err) {
      console.error(err);
      setErreurs({ general: "Le rapport n'a pas pu être généré. Vérifiez votre connexion ; si votre session a expiré, reconnectez-vous puis réessayez." });
    } finally {
      setProgression("");
    }
  }

  function basculer(cle: string) {
    setCoches((c) => {
      const n = new Set(c);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });
  }
  function toutGroupe(cles: string[], cocher: boolean) {
    setCoches((c) => {
      const n = new Set(c);
      for (const k of cles) if (cocher) n.add(k);
      else n.delete(k);
      return n;
    });
  }

  const groupes = useMemo(() => {
    if (!elements) return [];
    return [
      { cle: "actions", titre: "Actions", icone: Megaphone, lignes: elements.actions.map((a) => ({
        cle: `a-${a.id}`, date: isoToDateFr(a.date_action), titre: titreAction(a), detail: [a.entreprise, a.ville, a.secteur].filter(Boolean).join(" · ") })) },
      { cle: "fiches", titre: "Fiches de suivi", icone: ClipboardList, lignes: elements.fiches.map((f) => ({
        cle: `f-${f.id}`, date: libelleDate(f.date_debut, f.date_fin), titre: f.titre?.trim() || "Fiche sans titre",
        detail: [f.type === "usine" ? f.entreprise : f.secteur, f.auteur, f.statut === "brouillon" ? "brouillon" : null].filter(Boolean).join(" · ") })) },
    ].filter((g) => g.lignes.length);
  }, [elements]);

  const champ = (erreur?: string) => `ecg-champ ecg-chiffre${erreur ? " ecg-champ-erreur" : ""}`;
  const nbCoches = coches.size;

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="file-text" titre="Rapport de congrès"
        description="Composez le rapport : choisissez la période et les filtres, cochez les actions et les fiches de suivi retenues, puis générez le PDF." />

      <form onSubmit={afficher} noValidate>
        <Panneau titre="1. Composer" sousTitre="Les fiches de suivi viennent de l'app Accès permanents (terminées seulement, sauf si vous cochez les brouillons)."
          pied={
            <button type="submit" className={elements ? BTN : BTN_PRINCIPAL} disabled={Boolean(progression)}>
              {progression && !elements ? <IconeChargement size={18} /> : <ListChecks size={18} aria-hidden />}
              {progression && !elements ? progression : elements ? "Mettre à jour la liste" : "Afficher les éléments"}
            </button>
          }>
          <fieldset disabled={Boolean(progression)} className="grid gap-4">
            <legend className="sr-only">Filtres du rapport</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {([["debut", "Du", debut, setDebut], ["fin", "Au", fin, setFin]] as const).map(([cle, libelle, valeur, setValeur]) => (
                <div key={cle}>
                  <label htmlFor={`rapport-${cle}`} className="ecg-libelle">{libelle}</label>
                  <input id={`rapport-${cle}`} name={`rapport-${cle}`} type="text" inputMode="numeric" autoComplete="off" placeholder="jj/mm/aaaa"
                    maxLength={10} value={valeur} aria-invalid={Boolean(erreurs[cle])} className={champ(erreurs[cle])}
                    onChange={(e) => { setValeur(formatDateFr(e.target.value)); setErreurs((x) => ({ ...x, [cle]: undefined, general: undefined })); reinitialiser(); }} />
                  {erreurs[cle] && <p className="ecg-erreur">{erreurs[cle]}</p>}
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="rapport-entreprise" className={LIBELLE}>Entreprise</label>
                <select id="rapport-entreprise" className={CHAMP} value={entrepriseId} onChange={(e) => { setEntrepriseId(e.target.value); reinitialiser(); }}>
                  <option value="">Toutes</option>
                  {entreprises.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="rapport-secteur" className={LIBELLE}>Secteur</label>
                <select id="rapport-secteur" className={CHAMP} value={secteurId} onChange={(e) => { setSecteurId(e.target.value); reinitialiser(); }}>
                  <option value="">Tous</option>
                  {secteurs.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="rapport-permanent" className={LIBELLE}>Permanent (fiches)</label>
                <select id="rapport-permanent" className={CHAMP} value={auteurId} onChange={(e) => { setAuteurId(e.target.value); reinitialiser(); }}>
                  <option value="">Tous</option>
                  {permanents.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {([["Inclure les actions", avecActions, setAvecActions], ["Inclure les fiches de suivi", avecFiches, setAvecFiches]] as const).map(([libelle, valeur, setValeur]) => (
                <label key={libelle} className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" checked={valeur} onChange={(e) => { setValeur(e.target.checked); reinitialiser(); }} /> {libelle}
                </label>
              ))}
              {avecFiches && (
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" checked={brouillons} onChange={(e) => { setBrouillons(e.target.checked); reinitialiser(); }} />
                  Fiches en brouillon comprises
                </label>
              )}
            </div>
          </fieldset>
          {erreurs.general && !elements && <Alerte ton="erreur" className="mt-5">{erreurs.general}</Alerte>}
        </Panneau>
      </form>

      {elements && (
        <Panneau titre="2. Choisir les éléments" sousTitre={`${nbCoches} élément${nbCoches > 1 ? "s" : ""} coché${nbCoches > 1 ? "s" : ""} sur ${elements.actions.length + elements.fiches.length}.`}
          corps={false}
          pied={
            <button type="button" onClick={generer} className={BTN_PRINCIPAL} disabled={Boolean(progression) || nbCoches === 0}>
              {progression ? <IconeChargement size={18} /> : <FileText size={18} aria-hidden />} {progression || "Générer le rapport PDF"}
            </button>
          }>
          {groupes.map((g) => {
            const cles = g.lignes.map((l) => l.cle);
            const tous = cles.every((k) => coches.has(k));
            return (
              <fieldset key={g.cle} className="border-t border-[var(--ecg-trait)] px-5 py-3 first:border-t-0">
                <legend className="sr-only">{g.titre}</legend>
                <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                  <b className="inline-flex items-center gap-2"><g.icone size={17} aria-hidden /> {g.titre} ({cles.filter((k) => coches.has(k)).length}/{cles.length})</b>
                  <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => toutGroupe(cles, !tous)}>{tous ? "Tout décocher" : "Tout cocher"}</button>
                </div>
                <ul className="grid">
                  {g.lignes.map((l) => (
                    <li key={l.cle}>
                      <label className="flex min-h-11 items-start gap-3 py-2">
                        <input type="checkbox" className="mt-0.5 h-5 w-5 flex-none" checked={coches.has(l.cle)} onChange={() => basculer(l.cle)} />
                        <span className="grid min-w-0">
                          <span><span className="tabular-nums ecg-texte-doux">{l.date}</span> · <b>{l.titre}</b></span>
                          {l.detail && <span className="ecg-texte-doux text-sm">{l.detail}</span>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            );
          })}
          {erreurs.general && <div className="px-5 pb-4"><Alerte ton="erreur">{erreurs.general}</Alerte></div>}
        </Panneau>
      )}

      {resultat && (
        <Alerte ton="succes" titre={`Rapport généré : ${resultat.actions} action${resultat.actions > 1 ? "s" : ""}, ${resultat.fiches} fiche${resultat.fiches > 1 ? "s" : ""} de suivi.`}>
          <p>
            Le téléchargement a démarré ({resultat.nom}).
            {resultat.photosManquantes > 0 &&
              ` ${resultat.photosManquantes} photo${resultat.photosManquantes > 1 ? "s n'ont" : " n'a"} pas pu être chargée${resultat.photosManquantes > 1 ? "s" : ""} : les éléments concernés apparaissent sans photo.`}
          </p>
          <button type="button" onClick={() => telecharger(resultat.blob, resultat.nom)} className={`${BTN} ${BTN_PETIT} mt-3`}>
            <Download size={16} aria-hidden /> Télécharger à nouveau
          </button>
        </Alerte>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Hash, IdCard, MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { blocAdresse, initiales } from "../../../../lib/entreprises/regles";
import type { Site } from "../../../../lib/entreprises/types";
import { libelleMandat } from "../../../../lib/delegues/mandats";
import { ajouterSite, enregistrerSite, supprimerSite } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import { BTN, BTN_PETIT, CHAMP, LIBELLE, Panneau } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import { ApercuBloc } from "./PanneauCourrier";

function CarteSite({ fiche, site, superAdmin }: { fiche: Fiche; site: Site; superAdmin: boolean }) {
  const router = useRouter();
  const [edition, setEdition] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const unites = fiche.unites.filter((u) => u.site_id === site.id && u.statut === "actif" && u.suivie);
  const onss = fiche.onss.filter((o) => o.site_id === site.id);
  const delegues = fiche.delegues
    .map((d) => ({ ...d, mandats: d.mandats.filter((m) => m.site_id === site.id) }))
    .filter((d) => d.mandats.length);
  const bloc = fiche.fiche ? blocAdresse(fiche.fiche, fiche.company?.name ?? null, site, fiche.unites) : null;
  const postale = site.unite_postale_id ? fiche.unites.find((u) => u.id === site.unite_postale_id) : undefined;

  async function supprimer() {
    setEnCours(true);
    const r = await supprimerSite(site.id);
    setEnCours(false);
    setConfirmer(false);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  return (
    <article className={`ecg-carte-site ${site.principal ? "ecg-carte-principale" : ""}`} aria-labelledby={`site-${site.id}`}>
      <header className="flex flex-wrap items-center gap-2">
        <MapPin size={18} aria-hidden />
        <h3 id={`site-${site.id}`} className="text-lg font-bold">{site.nom}</h3>
        {site.principal && <span className="ecg-puce"><Star size={13} aria-hidden /> Site principal</span>}
        <span className="ml-auto flex gap-1">
          <button type="button" className={`${BTN} ${BTN_PETIT}`} aria-expanded={edition} onClick={() => setEdition(!edition)}
            aria-label={edition ? `Fermer la modification du site ${site.nom}` : `Modifier le site ${site.nom}`}>
            {edition ? <X size={15} aria-hidden /> : <Pencil size={15} aria-hidden />} {edition ? "Fermer" : "Modifier"}
          </button>
        </span>
      </header>
      <div className="ecg-puces mt-2">
        <span className="ecg-puce"><Building2 size={13} aria-hidden /> {unites.length} unité{unites.length > 1 ? "s" : ""} suivie{unites.length > 1 ? "s" : ""}</span>
        <span className="ecg-puce"><Hash size={13} aria-hidden /> {onss.length} ONSS</span>
        <span className="ecg-puce"><IdCard size={13} aria-hidden /> {delegues.length} délégué{delegues.length > 1 ? "s" : ""}</span>
      </div>

      {edition ? (
        <div className="mt-4 grid gap-4">
          <ChampsEdition
            id={`site-${site.id}`}
            valeurs={site}
            champs={[
              { nom: "nom", libelle: "Nom du site (UTE)", largeur: "demi" },
              {
                nom: "unite_postale_id", libelle: "Adresse postale", type: "choix", largeur: "demi",
                options: [{ valeur: "", libelle: "Siège social" }, ...fiche.unites.filter((u) => u.statut === "actif" && u.suivie).map((u) => ({
                  valeur: u.id, libelle: [u.rue, u.numero, u.localite].filter(Boolean).join(" "),
                }))],
              },
              { nom: "ref_nom", libelle: "Personne de référence du site", aide: "Vide : celle de l'entreprise.", largeur: "demi" },
              { nom: "ref_fonction", libelle: "Fonction", largeur: "demi" },
              { nom: "ref_email", libelle: "E-mail", type: "email", largeur: "demi" },
              { nom: "ref_telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
            ]}
            enregistrer={(v) => enregistrerSite(site.id, v)}
            onSucces={() => setEdition(false)}
          />
          {!site.principal && (
            <div className="border-t pt-3">
              {confirmer ? (
                <span role="alertdialog" aria-label={`Supprimer le site ${site.nom} ?`} className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">Supprimer ce site ? Ses unités, ONSS et mandats reviennent au site principal.</b>
                  <button type="button" autoFocus onClick={supprimer} disabled={enCours} className={`${BTN} ${BTN_PETIT} ecg-btn-danger`}>
                    {enCours && <IconeChargement size={14} />} Oui
                  </button>
                  <button type="button" onClick={() => setConfirmer(false)} className={`${BTN} ${BTN_PETIT}`}>Non</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmer(true)} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`}>
                  <Trash2 size={15} aria-hidden /> Supprimer le site
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid content-start gap-4">
            <dl className="ecg-recap">
              <div>
                <dt>Adresse postale</dt>
                <dd>{postale ? [postale.rue, postale.numero, postale.localite].filter(Boolean).join(" ") : <span className="ecg-texte-doux font-normal">Siège social</span>}</dd>
              </div>
              <div>
                <dt>Personne de référence</dt>
                <dd>{site.ref_nom ? <>{site.ref_nom}{site.ref_fonction && <span className="ecg-texte-doux font-normal"> · {site.ref_fonction}</span>}</> : <span className="ecg-texte-doux font-normal">Celle de l'entreprise</span>}</dd>
              </div>
            </dl>
            <div>
              <p className="ecg-libelle">Délégués et mandats en cours</p>
              {delegues.length === 0 ? (
                <p className="ecg-texte-doux text-sm">Aucun délégué rattaché à ce site.</p>
              ) : (
                <ul className="grid gap-2">
                  {delegues.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-2">
                      <span className="ecg-avatar" aria-hidden>{initiales(d.prenom, d.nom)}</span>
                      <b>{[d.prenom, d.nom].filter(Boolean).join(" ")}</b>
                      <span className="ecg-puces">{d.mandats.map((m, i) => <span key={i} className="ecg-puce">{libelleMandat(m)}</span>)}</span>
                      {superAdmin && <a href={`/espace/delegues/${d.id}`} className="ecg-lien text-sm">Gérer</a>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {bloc && !site.principal && <ApercuBloc {...bloc} titre="Bloc adresse du site" />}
        </div>
      )}
      {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
    </article>
  );
}

export default function PanneauSites({ fiche, superAdmin }: { fiche: Fiche; superAdmin: boolean }) {
  const router = useRouter();
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function ajouter() {
    setEnCours(true);
    setErreur("");
    const r = await ajouterSite(fiche.cle, nom);
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    setNom("");
    setAjout(false);
    if (r.donnees?.cle && r.donnees.cle !== fiche.cle) router.replace(`/espace/entreprises/${r.donnees.cle}`);
    else router.refresh();
  }

  return (
    <Panneau
      id="sites"
      className="ecg-section"
      titre="Sites d'exploitation (UTE)"
      sousTitre="Unités, ONSS et mandats se rattachent à un site."
      actions={
        <button type="button" className={`${BTN} ${BTN_PETIT}`} aria-expanded={ajout} onClick={() => setAjout(!ajout)}>
          <Plus size={15} aria-hidden /> Ajouter un site
        </button>
      }
    >
      <div className="grid gap-4">
        {ajout && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-[var(--ecg-fond)] p-3">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="nouveau-site" className={LIBELLE}>Nom du nouveau site</label>
              <input id="nouveau-site" value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP} placeholder="Usine de Marche…" autoComplete="off" autoFocus />
            </div>
            <button type="button" onClick={ajouter} disabled={!nom.trim() || enCours} className="ecg-btn ecg-btn-principal">
              {enCours ? <IconeChargement size={15} /> : <Plus size={15} aria-hidden />} Ajouter
            </button>
          </div>
        )}
        {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
        {fiche.sites.length === 0 && <p className="ecg-texte-doux">Le site principal sera créé à la première modification.</p>}
        {fiche.sites.map((s) => <CarteSite key={s.id} fiche={fiche} site={s} superAdmin={superAdmin} />)}
        {fiche.delegues.some((d) => d.mandats.some((m) => !m.site_id)) && (
          <p className="ecg-texte-doux text-sm">Certains mandats ne sont rattachés à aucun site.</p>
        )}
      </div>
    </Panneau>
  );
}

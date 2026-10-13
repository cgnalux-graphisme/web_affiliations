"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Trash2 } from "lucide-react";
import type { CarteDelegue } from "../../../../lib/delegues/donnees-serveur";
import { changerEntreprise, enregistrerDelegue, supprimerDelegue } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import { BTN, BTN_PETIT, CHAMP, LIBELLE, Panneau } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";

export default function PanneauIdentite({ carte }: { carte: CarteDelegue }) {
  const router = useRouter();
  const d = carte.delegue;
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const [cible, setCible] = useState("");
  const [confirmerChangement, setConfirmerChangement] = useState(false);
  const [changement, setChangement] = useState<{ enCours: boolean; texte: string; ton: "ok" | "erreur" } | null>(null);

  async function changer() {
    setConfirmerChangement(false);
    setChangement({ enCours: true, texte: "", ton: "ok" });
    const r = await changerEntreprise(d.id, cible);
    setChangement({ enCours: false, texte: r.ok ? r.message ?? "Entreprise changée." : r.erreur, ton: r.ok ? "ok" : "erreur" });
    if (r.ok) {
      setCible("");
      router.refresh();
    }
  }

  async function supprimer() {
    const r = await supprimerDelegue(d.id);
    if (!r.ok) return setErreur(r.erreur);
    router.push("/espace/delegues/liste");
  }

  return (
    <Panneau titre="Carte d'identité"
      sousTitre={carte.unites.length ? "L'unité de rattachement donne le site par défaut des nouveaux mandats." : "Aucune unité suivie sur la fiche de l'entreprise : cochez « Suivie » dans l'app Entreprises."}>
      <ChampsEdition
        id="identite"
        valeurs={{ ...d, adresse_pays: d.adresse_pays ?? "Belgique" }}
        champs={[
          { nom: "prenom", libelle: "Prénom", largeur: "demi" },
          { nom: "nom", libelle: "Nom", largeur: "demi" },
          // Compte CG Link : l'e-mail est l'adresse de connexion, il ne se change pas ici (affiché plus haut).
          ...(d.cglink_user_id ? [] : [{ nom: "email", libelle: "E-mail", type: "email" as const, largeur: "demi" as const }]),
          { nom: "telephone", libelle: "Téléphone", type: "tel", exemple: "+32 (0) 470 12 34 56", largeur: "demi" },
          { nom: "genre", libelle: "Genre (accord des courriers)", type: "choix", largeur: "demi",
            options: [{ valeur: "", libelle: "Non précisé" }, { valeur: "M", libelle: "Délégué" }, { valeur: "F", libelle: "Déléguée" }] },
          { nom: "registre_national", libelle: "N° de registre national", type: "registre", exemple: "85.07.30-033.28", largeur: "demi",
            aide: "Au dos de la carte d'identité. Sert aux courriers de libération et à la signature des présences." },
          { nom: "adresse_rue", libelle: "Rue", type: "rue", largeur: "demi",
            aide: "Tapez 3 lettres : choisissez l'adresse proposée, le reste se remplit.",
            cibles: { numero: "adresse_numero", code_postal: "adresse_code_postal", localite: "adresse_localite", pays: "adresse_pays" } },
          { nom: "adresse_numero", libelle: "Numéro", largeur: "tiers" },
          { nom: "adresse_boite", libelle: "Boîte", largeur: "tiers" },
          { nom: "adresse_code_postal", libelle: "Code postal", largeur: "tiers" },
          { nom: "adresse_localite", libelle: "Localité", largeur: "demi" },
          { nom: "adresse_pays", libelle: "Pays", largeur: "tiers" },
          { nom: "unite_id", libelle: "Unité d'établissement de rattachement", type: "choix",
            options: [{ valeur: "", libelle: "Non précisée" }, ...carte.unites.map((u) => ({ valeur: u.id, libelle: u.libelle }))] },
          { nom: "notes", libelle: "Notes internes", type: "zone" },
        ]}
        enregistrer={(v) => enregistrerDelegue(d.id, v)}
      />
      {d.cglink_user_id && <p className="ecg-texte-doux mt-3 text-sm">L'e-mail est l'adresse de connexion CG Link : il ne se change que dans CG Link.</p>}
      <div className="mt-4 grid gap-2 border-t pt-4">
        <label htmlFor="changer-entreprise" className={LIBELLE}>Changer d'entreprise</label>
        <div className="flex flex-wrap gap-2">
          <select id="changer-entreprise" value={cible} onChange={(e) => setCible(e.target.value)} className={`${CHAMP} w-auto flex-1`}>
            <option value="">Choisir une entreprise…</option>
            {carte.entreprises.filter((e) => e.id !== d.entreprise_id).map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
          <button type="button" className={BTN} disabled={!cible || changement?.enCours} onClick={() => setConfirmerChangement(true)}>
            {changement?.enCours ? <IconeChargement size={15} /> : <ArrowRightLeft size={15} aria-hidden />} Changer
          </button>
        </div>
        {confirmerChangement && (
          <div role="alertdialog" aria-labelledby="confirmer-entreprise" className="grid gap-2 rounded-xl bg-[var(--ecg-fond)] p-3">
            <b id="confirmer-entreprise">
              Changer d'entreprise ? Les mandats en cours passent au site principal de la nouvelle entreprise (à vérifier)
              {d.cglink_user_id ? " et le compte CG Link est déplacé." : "."}
            </b>
            <div className="flex flex-wrap gap-2">
              <button type="button" autoFocus onClick={changer} className="ecg-btn ecg-btn-principal">Confirmer</button>
              <button type="button" onClick={() => setConfirmerChangement(false)} className={BTN}>Annuler</button>
            </div>
          </div>
        )}
        {changement && !changement.enCours && changement.texte && (
          <p role={changement.ton === "erreur" ? "alert" : "status"} className={changement.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{changement.texte}</p>
        )}
      </div>
      {!d.cglink_user_id && (
        <div className="mt-4 border-t pt-4">
          {confirmer ? (
            <span role="alertdialog" aria-label="Supprimer ce délégué ?" className="flex flex-wrap items-center gap-2">
              <b>Supprimer ce délégué et ses mandats ?</b>
              <button type="button" autoFocus onClick={supprimer} className={`${BTN} ${BTN_PETIT} ecg-btn-danger`}>Oui</button>
              <button type="button" onClick={() => setConfirmer(false)} className={`${BTN} ${BTN_PETIT}`}>Non</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmer(true)} className={`${BTN} ecg-btn-fantome ecg-btn-fantome-danger`}>
              <Trash2 size={16} aria-hidden /> Supprimer le délégué
            </button>
          )}
          {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
        </div>
      )}
    </Panneau>
  );
}

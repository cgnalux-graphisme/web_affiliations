"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CarteDelegue } from "../../../../lib/delegues/donnees-serveur";
import { enregistrerDelegue, supprimerDelegue } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import { BTN, BTN_PETIT, Panneau } from "../../_partage/ui";

export default function PanneauIdentite({ carte }: { carte: CarteDelegue }) {
  const router = useRouter();
  const d = carte.delegue;
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");

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
          { nom: "email", libelle: "E-mail", type: "email", largeur: "demi" },
          { nom: "telephone", libelle: "Téléphone", type: "tel", exemple: "+32 (0) 470 12 34 56", largeur: "demi" },
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

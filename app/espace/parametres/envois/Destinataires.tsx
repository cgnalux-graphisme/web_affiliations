"use client";

import { useState, type FormEvent } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import Interrupteur from "../../_partage/Interrupteur";
import { Alerte } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { ENVOIS, INFOS_ENVOIS, emailValide, type Envoi } from "../../../../lib/envois";

export type Destinataire = { id: string; envoi: Envoi; email: string; actif: boolean };

const BOUTON = "ecg-btn ecg-btn-petit";
const CODE_DOUBLON = "23505";
const CODE_CONTROLE = "23514";
const CODE_DROITS = "42501";

/** Message d'échec d'un ajout selon le code Postgres : chaque cause a sa consigne. */
function messageAjout(code: string | undefined): string {
  if (code === CODE_DOUBLON) return "Cette adresse reçoit déjà cet envoi. Rechargez la page.";
  if (code === CODE_CONTROLE) return "La base n'accepte pas encore cet envoi : une migration n'a pas été exécutée dans Supabase.";
  if (code === CODE_DROITS) return "Ajout refusé par la base : seul un super admin peut modifier ces adresses. Reconnectez-vous si c'est votre cas.";
  return `Ajout impossible${code ? ` (code ${code})` : ""}. Rechargez la page puis réessayez.`;
}

export default function Destinataires({ initiaux }: { initiaux: Destinataire[] }) {
  const [liste, setListe] = useState<Destinataire[]>(initiaux);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {ENVOIS.map((envoi) => (
        <CarteEnvoi
          key={envoi}
          envoi={envoi}
          adresses={liste.filter((d) => d.envoi === envoi)}
          onAjout={(d) => setListe((l) => [...l, d])}
          onMaj={(d) => setListe((l) => l.map((x) => (x.id === d.id ? d : x)))}
          onSuppression={(id) => setListe((l) => l.filter((x) => x.id !== id))}
        />
      ))}
    </div>
  );
}

function CarteEnvoi({
  envoi,
  adresses,
  onAjout,
  onMaj,
  onSuppression,
}: {
  envoi: Envoi;
  adresses: Destinataire[];
  onAjout: (d: Destinataire) => void;
  onMaj: (d: Destinataire) => void;
  onSuppression: (id: string) => void;
}) {
  const info = INFOS_ENVOIS[envoi];
  const [nouvelle, setNouvelle] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const actives = adresses.filter((a) => a.actif).length;
  const idChamp = `ajout-${envoi}`;

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    const email = nouvelle.trim().toLowerCase();
    if (!emailValide(email)) {
      setErreur("Adresse e-mail invalide. Exemple : prenom.nom@accg.be");
      return;
    }
    if (adresses.some((a) => a.email === email)) {
      setErreur("Cette adresse reçoit déjà cet envoi.");
      return;
    }
    setEnCours("ajout");
    setErreur("");
    const { data, error } = await getSupabaseAuth()
      .from("site_destinataires")
      .insert({ envoi, email })
      .select("id, envoi, email, actif")
      .single();
    setEnCours(null);
    if (error || !data) {
      setErreur(messageAjout(error?.code));
      return;
    }
    onAjout(data as Destinataire);
    setNouvelle("");
  }

  async function basculer(d: Destinataire) {
    setEnCours(d.id);
    setErreur("");
    const { data, error } = await getSupabaseAuth()
      .from("site_destinataires")
      .update({ actif: !d.actif })
      .eq("id", d.id)
      .select("id");
    setEnCours(null);
    if (error || !data?.length) {
      setErreur("Modification impossible. Reconnectez-vous puis réessayez.");
      return;
    }
    onMaj({ ...d, actif: !d.actif });
  }

  async function supprimer(d: Destinataire) {
    setEnCours(d.id);
    setErreur("");
    const { data, error } = await getSupabaseAuth().from("site_destinataires").delete().eq("id", d.id).select("id");
    setEnCours(null);
    setConfirmer(null);
    if (error || !data?.length) {
      setErreur("Suppression impossible. Reconnectez-vous puis réessayez.");
      return;
    }
    onSuppression(d.id);
  }

  return (
    <section aria-labelledby={`titre-${envoi}`} className="flex flex-col ecg-panneau">
      <div className="ecg-panneau-tete">
        <span className="ecg-entete-ico h-10 w-10 rounded-xl" aria-hidden>
          <Mail size={20} />
        </span>
        <div>
          <h2 id={`titre-${envoi}`}>{info.titre}</h2>
          <p>{info.quand}</p>
        </div>
      </div>

      {actives === 0 && (
        <div className="px-5 pt-4">
          <Alerte ton="attention" role={null}>
            Aucune adresse active : seul le demandeur reçoit ce formulaire.
          </Alerte>
        </div>
      )}

      {adresses.length > 0 && (
        <ul className="ecg-lignes">
          {adresses.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className={`min-w-0 flex-1 break-all text-[15px] ${d.actif ? "font-semibold" : "ecg-texte-doux line-through"}`}>{d.email}</span>
                {confirmer === d.id ? (
                  <span role="alertdialog" aria-label={`Supprimer ${d.email} ?`} className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">Supprimer ?</span>
                    <button
                      type="button"
                      onClick={() => supprimer(d)}
                      disabled={enCours !== null}
                      autoFocus
                      className={`${BOUTON} ecg-btn-danger`}
                    >
                      {enCours === d.id ? <IconeChargement size={14} /> : null} Oui
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
                  <>
                    <Interrupteur
                      actif={d.actif}
                      onChange={() => basculer(d)}
                      label={`${d.email} reçoit l'envoi « ${info.titre} »`}
                      etatOn="Active"
                      etatOff="Désactivée"
                      enCours={enCours === d.id}
                      disabled={enCours !== null}
                    />
                    <button
                      type="button"
                      onClick={() => setConfirmer(d.id)}
                      disabled={enCours !== null}
                      aria-label={`Supprimer ${d.email}`}
                      title="Supprimer"
                      className={`${BOUTON} ecg-btn-fantome ecg-btn-fantome-danger`}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </>
                )}
              </li>
            ))}
        </ul>
      )}

      <div className="ecg-panneau-pied mt-auto block">
        <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={idChamp} className="ecg-libelle">
              Ajouter une adresse
            </label>
            <input
              id={idChamp}
              name={idChamp}
              type="email"
              spellCheck={false}
              inputMode="email"
              autoComplete="off"
              value={nouvelle}
              onChange={(e) => setNouvelle(e.target.value)}
              placeholder="prenom.nom@accg.be…"
              className="ecg-champ"
            />
          </div>
          <button
            type="submit"
            disabled={enCours !== null || !nouvelle.trim()}
            className="ecg-btn ecg-btn-principal"
          >
            {enCours === "ajout" ? <IconeChargement size={15} /> : <Plus size={15} aria-hidden />}
            Ajouter
          </button>
        </form>

        {erreur && (
          <p role="alert" className="ecg-erreur">
            {erreur}
          </p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { getSupabaseAuth } from "../../../lib/supabase";
import { ENVOIS, INFOS_ENVOIS, emailValide, type Envoi } from "../../../lib/envois";

export type Destinataire = { id: string; envoi: Envoi; email: string; actif: boolean };

const BOUTON =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 px-3.5 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50";
const CODE_DOUBLON = "23505";

export default function Destinataires({ initiaux }: { initiaux: Destinataire[] }) {
  const [liste, setListe] = useState<Destinataire[]>(initiaux);

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
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
      setErreur(
        error?.code === CODE_DOUBLON
          ? "Cette adresse reçoit déjà cet envoi. Rechargez la page."
          : "Ajout impossible. Votre session a peut-être expiré : reconnectez-vous puis réessayez."
      );
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
    <section aria-labelledby={`titre-${envoi}`} className="flex flex-col rounded-2xl border border-militant-ardoise bg-white">
      <header className="border-b-2 border-militant-charbon px-5 pb-3 pt-4">
        <h2 id={`titre-${envoi}`} className="flex items-center gap-2 font-condensed text-2xl font-extrabold uppercase leading-tight">
          <Mail size={20} className="shrink-0" aria-hidden /> {info.titre}
        </h2>
        <p className="mt-1 text-sm">{info.quand}</p>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        {actives === 0 && (
          <p className="flex items-start gap-2 rounded-xl border-2 border-militant-bordeaux px-3 py-2 text-sm font-semibold">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
            Aucune adresse active : seul le demandeur reçoit ce formulaire.
          </p>
        )}

        {adresses.length > 0 && (
          <ul className="divide-y divide-militant-ardoise">
            {adresses.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className={`min-w-0 flex-1 break-all text-[15px] ${d.actif ? "font-bold" : "line-through"}`}>{d.email}</span>
                {confirmer === d.id ? (
                  <span role="alertdialog" aria-label={`Supprimer ${d.email} ?`} className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">Supprimer ?</span>
                    <button
                      type="button"
                      onClick={() => supprimer(d)}
                      disabled={enCours !== null}
                      autoFocus
                      className={`${BOUTON} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon`}
                    >
                      {enCours === d.id ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null} Oui
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
                  <>
                    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={d.actif}
                        onChange={() => basculer(d)}
                        disabled={enCours !== null}
                        className="h-5 w-5 accent-militant-bordeaux"
                      />
                      {d.actif ? "Active" : "Désactivée"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfirmer(d.id)}
                      disabled={enCours !== null}
                      aria-label={`Supprimer ${d.email}`}
                      title="Supprimer"
                      className={`${BOUTON} border-transparent px-2.5 text-militant-bordeaux hover:border-militant-bordeaux`}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={ajouter} className="mt-auto flex flex-wrap items-end gap-2 pt-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={idChamp} className="mb-1 block text-sm font-bold">
              Ajouter une adresse
            </label>
            <input
              id={idChamp}
              type="email"
              inputMode="email"
              autoComplete="off"
              value={nouvelle}
              onChange={(e) => setNouvelle(e.target.value)}
              placeholder="prenom.nom@accg.be"
              className="min-h-[44px] w-full rounded-xl border border-militant-ardoise bg-white px-3 py-2 text-[15px] focus:border-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge"
            />
          </div>
          <button
            type="submit"
            disabled={enCours !== null || !nouvelle.trim()}
            className={`${BOUTON} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon`}
          >
            {enCours === "ajout" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Plus size={15} aria-hidden />}
            Ajouter
          </button>
        </form>

        {erreur && (
          <p role="alert" className="text-sm font-semibold text-militant-bordeaux">
            {erreur}
          </p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useRef, useState } from "react";
import { CircleAlert, CircleCheck, Eye, EyeOff } from "lucide-react";
import { IconeChargement } from "../../Chargement";
import { getSupabaseAuth } from "../../../lib/supabase";

const LONGUEUR_MIN = 8;

const CHAMP =
  "w-full min-h-[44px] rounded-[10px] border border-[#7c90a0] bg-white px-3 text-base text-[#222] focus:border-[#222] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0072b2]";

/** Changement de mot de passe (Supabase Auth, session du navigateur). Le même mot de passe sert dans CG Link. */
export default function FormulaireMotDePasse() {
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [ok, setOk] = useState(false);
  const champMdp = useRef<HTMLInputElement>(null);
  const champConfirmation = useRef<HTMLInputElement>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    setOk(false);
    if (mdp.length < LONGUEUR_MIN) {
      setErreur(`Le mot de passe doit compter au moins ${LONGUEUR_MIN} caractères.`);
      return champMdp.current?.focus();
    }
    if (mdp !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques. Retapez la confirmation.");
      return champConfirmation.current?.focus();
    }
    setErreur("");
    setEnvoi(true);
    const { error } = await getSupabaseAuth().auth.updateUser({ password: mdp });
    setEnvoi(false);
    if (error) {
      setErreur(
        error.code === "same_password"
          ? "Ce mot de passe est déjà le vôtre. Choisissez-en un autre."
          : error.code === "weak_password"
            ? "Ce mot de passe est trop faible. Allongez-le ou mélangez lettres, chiffres et symboles."
            : error.code === "reauthentication_needed"
              ? "Pour des raisons de sécurité, déconnectez-vous puis reconnectez-vous avant de changer le mot de passe."
              : "Le mot de passe n'a pas pu être changé. Réessayez dans un instant."
      );
      return;
    }
    setMdp("");
    setConfirmation("");
    setOk(true);
  }

  return (
    <form onSubmit={envoyer} noValidate className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="nouveau-mdp" className="text-sm font-semibold">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <input
            ref={champMdp}
            id="nouveau-mdp"
            name="nouveau-mot-de-passe"
            type={voir ? "text" : "password"}
            autoComplete="new-password"
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
            aria-describedby="aide-mdp erreur-mdp"
            aria-invalid={Boolean(erreur) || undefined}
            className={`${CHAMP} pr-12`}
          />
          <button
            type="button"
            onClick={() => setVoir((v) => !v)}
            aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={voir}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[10px] hover:bg-[#f1f3f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0072b2]"
          >
            {voir ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
        <p id="aide-mdp" className="text-sm text-[#56646f]">
          Au moins {LONGUEUR_MIN} caractères. Il remplace aussi votre mot de passe CG Link.
        </p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="confirmation-mdp" className="text-sm font-semibold">
          Confirmer le mot de passe
        </label>
        <input
          ref={champConfirmation}
          id="confirmation-mdp"
          name="confirmation-mot-de-passe"
          type={voir ? "text" : "password"}
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          aria-invalid={Boolean(erreur) || undefined}
          className={CHAMP}
        />
      </div>
      <div id="erreur-mdp" aria-live="polite">
        {erreur && (
          <p className="flex items-start gap-2 text-sm font-semibold text-militant-bordeaux">
            <CircleAlert size={18} className="shrink-0" aria-hidden /> {erreur}
          </p>
        )}
        {ok && (
          <p className="flex items-start gap-2 text-sm font-semibold">
            <CircleCheck size={18} className="shrink-0" aria-hidden /> Mot de passe changé.
          </p>
        )}
      </div>
      <div>
        <button type="submit" className="ecg-btn ecg-btn-principal">
          {envoi && <IconeChargement size={16} />}
          {envoi ? "Enregistrement…" : "Changer le mot de passe"}
        </button>
      </div>
    </form>
  );
}

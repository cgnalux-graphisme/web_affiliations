"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { IconeChargement } from "../../Chargement";
import { getSupabaseAuth } from "../../../lib/supabase";

const LONGUEUR_MIN = 8;
const LIEN_PERIME =
  "Ce lien a expiré ou a déjà servi. Demandez un nouveau lien à un super admin (Espace CG, Comptes & accès).";

type Etat = "verification" | "pret" | "perime";

/**
 * Lit la session apportée par le lien de l'e-mail, sous l'une des trois formes possibles :
 * jetons dans l'ancre (#access_token=…), code PKCE (?code=…) ou jeton à vérifier (?token_hash=…&type=…).
 */
async function ouvrirSession(): Promise<boolean> {
  const supabase = getSupabaseAuth();
  const ancre = new URLSearchParams(window.location.hash.slice(1));
  const requete = new URLSearchParams(window.location.search);
  // Les jetons ne restent pas dans l'adresse (historique, partage d'écran).
  const nettoyer = () => window.history.replaceState(null, "", window.location.pathname);
  // Le client Supabase a peut-être déjà ouvert la session tout seul en lisant l'adresse : on vérifie.
  const connecte = async () => Boolean((await supabase.auth.getUser()).data.user);

  if (ancre.get("error") || requete.get("error")) {
    nettoyer();
    return false;
  }
  const access_token = ancre.get("access_token");
  const refresh_token = ancre.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    nettoyer();
    return !error || connecte();
  }
  const code = requete.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    nettoyer();
    return !error || connecte();
  }
  const token_hash = requete.get("token_hash");
  const type = requete.get("type");
  if (token_hash && (type === "invite" || type === "recovery")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    nettoyer();
    return !error || connecte();
  }
  // Déjà connecté (lien ouvert une seconde fois dans la même session) : on peut quand même changer.
  return connecte();
}

export default function ChoixMotDePasse() {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>("verification");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const champ = useRef<HTMLInputElement>(null);
  const champConfirmation = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let annule = false;
    ouvrirSession().then(async (ok) => {
      if (annule) return;
      if (!ok) return setEtat("perime");
      const { data } = await getSupabaseAuth().auth.getUser();
      setEmail(data.user?.email ?? "");
      setEtat("pret");
    });
    return () => {
      annule = true;
    };
  }, []);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    if (mdp.length < LONGUEUR_MIN) {
      setErreur(`Le mot de passe doit compter au moins ${LONGUEUR_MIN} caractères.`);
      return champ.current?.focus();
    }
    if (mdp !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques. Retapez la confirmation.");
      return champConfirmation.current?.focus();
    }
    setErreur("");
    setEnvoi(true);
    // Comme CG Link : le mot de passe est choisi, plus besoin de le changer à la prochaine connexion.
    const { error } = await getSupabaseAuth().auth.updateUser({
      password: mdp,
      data: { must_change_password: false, mustChangePassword: false },
    });
    if (error) {
      setEnvoi(false);
      setErreur(
        error.code === "same_password"
          ? "Ce mot de passe est déjà le vôtre. Choisissez-en un autre."
          : error.code === "weak_password"
            ? "Ce mot de passe est trop faible. Allongez-le ou mélangez lettres, chiffres et symboles."
            : error.code === "session_expired" || error.status === 401
              ? LIEN_PERIME
              : "Le mot de passe n'a pas pu être enregistré. Réessayez dans un instant."
      );
      return;
    }
    router.replace("/espace");
    router.refresh();
  }

  if (etat === "verification") {
    return (
      <p role="status" className="flex items-center gap-2 text-[15px] font-semibold">
        <IconeChargement size={18} className="text-militant-rouge" /> Vérification du lien…
      </p>
    );
  }

  if (etat === "perime") {
    return (
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold tracking-tight">Lien expiré</h2>
        <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-militant-bordeaux px-4 py-3 text-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
          <p>{LIEN_PERIME}</p>
        </div>
        <Link href="/login" className="mt-6 inline-flex font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4">
          Aller à la connexion
        </Link>
      </div>
    );
  }

  const classeChamp =
    "w-full rounded-xl border border-militant-ardoise bg-white px-3 py-2.5 text-base focus:border-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge";

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold tracking-tight">Choisir mon mot de passe</h2>
      {email && <p className="mt-1.5 break-all text-sm">Compte : {email}</p>}

      <form onSubmit={enregistrer} noValidate className="mt-6 space-y-4">
        {/* Aide aux gestionnaires de mots de passe. */}
        <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
        <div>
          <label htmlFor="nouveau-mdp" className="mb-1.5 block text-sm font-semibold">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              ref={champ}
              id="nouveau-mdp"
              name="nouveau-mot-de-passe"
              type={voir ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              aria-describedby="aide-nouveau-mdp"
              className={`${classeChamp} pr-11`}
            />
            <button
              type="button"
              onClick={() => setVoir((v) => !v)}
              aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={voir}
              className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
            >
              {voir ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>
          <p id="aide-nouveau-mdp" className="mt-1.5 text-sm">
            Au moins {LONGUEUR_MIN} caractères.
          </p>
        </div>
        <div>
          <label htmlFor="confirmation-nouveau-mdp" className="mb-1.5 block text-sm font-semibold">
            Confirmer le mot de passe
          </label>
          <input
            ref={champConfirmation}
            id="confirmation-nouveau-mdp"
            name="confirmation-mot-de-passe"
            type={voir ? "text" : "password"}
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className={classeChamp}
          />
        </div>
        <div aria-live="polite">
          {erreur && (
            <p className="flex items-start gap-2 text-sm font-semibold text-militant-bordeaux">
              <AlertCircle size={18} className="shrink-0" aria-hidden /> {erreur}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-militant-bordeaux py-3 text-sm font-semibold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
        >
          {envoi ? <IconeChargement size={16} /> : <KeyRound size={16} aria-hidden />}
          {envoi ? "Enregistrement…" : "Enregistrer et entrer"}
        </button>
      </form>
    </div>
  );
}

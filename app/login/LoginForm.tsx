"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { isSuperAdmin } from "../../lib/admin";
import { getSupabaseAuth } from "../../lib/supabase";

const MESSAGE_ACCES =
  "Ce compte n'a pas accès à l'espace admin. Connectez-vous avec un compte super administrateur.";

export default function LoginForm({
  next,
  notice,
}: {
  next: string;
  notice?: "acces" | "deconnecte";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(notice === "acces" ? MESSAGE_ACCES : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError("Indiquez votre adresse e-mail et votre mot de passe.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = getSupabaseAuth();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.user) {
      setLoading(false);
      setError(
        authError?.code === "invalid_credentials"
          ? "Adresse e-mail ou mot de passe incorrect."
          : authError?.code === "email_not_confirmed"
            ? "Cette adresse e-mail n'a pas encore été confirmée."
            : "La connexion a échoué. Vérifiez votre connexion internet et réessayez."
      );
      return;
    }

    if (!(await isSuperAdmin(supabase, data.user.id))) {
      await supabase.auth.signOut();
      setLoading(false);
      setPassword("");
      setError(MESSAGE_ACCES);
      return;
    }

    // Le serveur relit la session depuis les cookies : on navigue puis on rafraîchit.
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Connexion</h2>
      <p className="mt-1.5 text-sm text-gray-500">
        Utilisez vos identifiants CG Link.
      </p>

      {notice === "deconnecte" && !error && (
        <div
          role="status"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
        >
          <CheckCircle size={18} className="shrink-0 mt-0.5 text-green-600" />
          <p>Vous êtes déconnecté.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl pl-3 pr-11 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:text-red-700 rounded-r-xl"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white font-semibold py-3 rounded-xl text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

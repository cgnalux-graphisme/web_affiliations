"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aApp, monProfil, type Profil } from "../../../../lib/espace/acces";
import {
  appsDuRole,
  bascule,
  exceptionsInutiles,
  refusChangementRole,
  refusGestion,
  refusSuspension,
  ROLE_TOUTES_APPS,
  type ActionJournal,
  type DetailsJournal,
  type Exception,
} from "../../../../lib/espace/gestion-acces";
import { estSuspendu, tousLesComptes } from "../../../../lib/espace/equipe-serveur";
import { ROLES, ROLES_EQUIPE } from "../../../../lib/espace/roles";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { getSupabaseService } from "../../../../lib/supabase-service";

/**
 * « Comptes & accès » : chaque action revérifie le droit sur l'app « parametres », puis écrit avec la clé
 * service_role (tables d'accès, API admin Auth). Le rôle (profiles.role, table partagée avec CG Link) est
 * changé avec la session du super admin, comme le veut le trigger site_protect_profiles_role.
 * Chaque modification écrit une ligne dans site_journal_acces.
 */

export type Resultat = { ok: true; message?: string } | { ok: false; erreur: string };

const REFUS = "Accès refusé. Reconnectez-vous.";
const CHEMINS = ["/espace/parametres/comptes", "/espace/parametres/journal", "/espace/parametres/roles"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Contexte = { acteur: Profil; db: SupabaseClient };

async function contexte(): Promise<Contexte | null> {
  if (!(await aApp("parametres"))) return null;
  const acteur = await monProfil();
  const db = getSupabaseService();
  return acteur && db ? { acteur, db } : null;
}

function rafraichir() {
  for (const c of CHEMINS) revalidatePath(c);
}

async function journaliser(ctx: Contexte, cible: string | null, action: ActionJournal, details: DetailsJournal) {
  const { error } = await ctx.db.from("site_journal_acces").insert({ auteur_id: ctx.acteur.id, cible_id: cible, action, details });
  // Le journal ne fait jamais échouer l'action, mais l'échec se voit dans les journaux du serveur.
  if (error) console.error("[journal accès]", error.code);
}

/** Profil cible (id, rôle, e-mail, nom) et ses exceptions. */
async function cible(ctx: Contexte, id: string) {
  const [{ data: p }, { data: ex }] = await Promise.all([
    ctx.db.from("profiles").select("id, role, email, name").eq("id", id).maybeSingle(),
    ctx.db.from("site_app_acces").select("id, app_code, type").eq("user_id", id),
  ]);
  if (!p) return null;
  return { profil: p as { id: string; role: string; email: string | null; name: string | null }, exceptions: (ex ?? []) as Exception[] };
}

async function equipe(ctx: Contexte) {
  const [{ data }, comptes] = await Promise.all([
    ctx.db.from("profiles").select("id, role").in("role", [...ROLES_EQUIPE]),
    tousLesComptes(ctx.db),
  ]);
  const parId = new Map(comptes.map((u) => [u.id, u]));
  return ((data ?? []) as { id: string; role: string }[]).map((p) => ({ ...p, suspendu: estSuspendu(parId.get(p.id)) }));
}

async function adresseDuSite(): Promise<string> {
  const site = process.env.SITE_URL?.replace(/\/+$/, "");
  if (site) return site;
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  return `${proto}://${hote}`;
}

// ── Apps d'une personne ─────────────────────────────────────────────────────

export async function basculerApp(userId: string, code: string, actif: boolean): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, erreur: REFUS };
  const c = await cible(ctx, userId);
  if (!c) return { ok: false, erreur: "Personne introuvable. Rechargez la page." };
  const refus = refusGestion(ctx.acteur, c.profil);
  if (refus) return { ok: false, erreur: refus };
  if (c.profil.role === ROLE_TOUTES_APPS) return { ok: false, erreur: "Un super admin a toujours toutes les apps." };

  const [{ data: lignes }, { data: app }] = await Promise.all([
    ctx.db.from("site_app_roles").select("app_code, role"),
    ctx.db.from("site_apps").select("code").eq("code", code).maybeSingle(),
  ]);
  if (!app) return { ok: false, erreur: "App inconnue." };
  const base = appsDuRole(c.profil.role, (lignes ?? []) as { app_code: string; role: string }[], []);
  const effet = bascule(code, actif, base, c.exceptions);

  if (effet.faire === "creer") {
    const { error } = await ctx.db
      .from("site_app_acces")
      .insert({ user_id: userId, app_code: code, type: effet.type, accorde_par: ctx.acteur.id });
    if (error) return { ok: false, erreur: "L'accès n'a pas pu être enregistré. Réessayez." };
    await journaliser(ctx, userId, effet.type === "ajout" ? "app_ajout" : "app_retrait", { app: code });
  } else if (effet.faire === "supprimer") {
    const ex = c.exceptions.find((e) => e.id === effet.id);
    const { error } = await ctx.db.from("site_app_acces").delete().eq("id", effet.id);
    if (error) return { ok: false, erreur: "L'accès n'a pas pu être enregistré. Réessayez." };
    await journaliser(ctx, userId, "app_exception_supprimee", { app: code, exception: ex?.type });
  }
  rafraichir();
  return { ok: true };
}

// ── Rôle (partagé avec CG Link) ─────────────────────────────────────────────

export async function changerRole(userId: string, nouveau: string): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, erreur: REFUS };
  if (!(ROLES_EQUIPE as readonly string[]).includes(nouveau)) return { ok: false, erreur: "Rôle inconnu." };
  const c = await cible(ctx, userId);
  if (!c) return { ok: false, erreur: "Personne introuvable. Rechargez la page." };
  const refus = refusChangementRole(ctx.acteur, c.profil, nouveau, await equipe(ctx));
  if (refus) return { ok: false, erreur: refus };

  // Avec la session du super admin : le trigger site_protect_profiles_role l'exige.
  const session = await getSupabaseServer();
  const { data, error } = await session.from("profiles").update({ role: nouveau }).eq("id", userId).select("id");
  if (error || !data?.length) {
    console.error("[rôle]", error?.code ?? "aucune ligne");
    return { ok: false, erreur: "Le rôle n'a pas pu être changé. Reconnectez-vous puis réessayez." };
  }
  // Métadonnées du compte, comme les pose CG Link (ne fait pas échouer le changement).
  const { data: u } = await ctx.db.auth.admin.getUserById(userId);
  if (u?.user) {
    await ctx.db.auth.admin.updateUserById(userId, { user_metadata: { ...u.user.user_metadata, role: nouveau } });
  }
  // Exceptions devenues inutiles avec le nouveau rôle.
  const { data: lignes } = await ctx.db.from("site_app_roles").select("app_code, role");
  const base = appsDuRole(nouveau, (lignes ?? []) as { app_code: string; role: string }[], []);
  const inutiles = exceptionsInutiles(base, c.exceptions, nouveau);
  if (inutiles.length) await ctx.db.from("site_app_acces").delete().in("id", inutiles.map((e) => e.id));

  await journaliser(ctx, userId, "role", { avant: c.profil.role, apres: nouveau });
  rafraichir();
  return { ok: true, message: "Rôle changé, ici et dans CG Link." };
}

// ── Mot de passe, suspension ────────────────────────────────────────────────

export async function envoyerReinitialisation(userId: string): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, erreur: REFUS };
  const c = await cible(ctx, userId);
  if (!c?.profil.email) return { ok: false, erreur: "Cette personne n'a pas d'adresse e-mail." };
  const refus = refusGestion(ctx.acteur, c.profil);
  if (refus) return { ok: false, erreur: refus };
  const { error } = await ctx.db.auth.resetPasswordForEmail(c.profil.email, {
    redirectTo: `${await adresseDuSite()}/login/nouveau-mot-de-passe`,
  });
  if (error) {
    console.error("[réinitialisation]", error.code ?? error.status);
    return {
      ok: false,
      erreur:
        error.status === 429
          ? "Trop d'envois rapprochés. Patientez une minute puis réessayez."
          : "Le lien n'a pas pu être envoyé. Réessayez dans un instant.",
    };
  }
  await journaliser(ctx, userId, "reinitialisation", { email: c.profil.email });
  rafraichir();
  return { ok: true, message: `Lien envoyé à ${c.profil.email}.` };
}

export async function suspendre(userId: string): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, erreur: REFUS };
  const c = await cible(ctx, userId);
  if (!c) return { ok: false, erreur: "Personne introuvable. Rechargez la page." };
  const refus = refusSuspension(ctx.acteur, { ...c.profil }, await equipe(ctx));
  if (refus) return { ok: false, erreur: refus };
  // Blocage du compte Supabase : plus de connexion, ni ici ni dans CG Link (réversible).
  const { error } = await ctx.db.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  if (error) return { ok: false, erreur: "La suspension n'a pas pu être enregistrée. Réessayez." };
  await journaliser(ctx, userId, "suspension", {});
  rafraichir();
  return { ok: true, message: "Accès suspendu." };
}

export async function reactiver(userId: string): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, erreur: REFUS };
  const c = await cible(ctx, userId);
  if (!c) return { ok: false, erreur: "Personne introuvable. Rechargez la page." };
  const refus = refusGestion(ctx.acteur, c.profil);
  if (refus) return { ok: false, erreur: refus };
  const { error } = await ctx.db.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (error) return { ok: false, erreur: "La réactivation n'a pas pu être enregistrée. Réessayez." };
  await journaliser(ctx, userId, "reactivation", {});
  rafraichir();
  return { ok: true, message: "Accès réactivé." };
}

// ── Invitation ──────────────────────────────────────────────────────────────

export async function inviter(saisie: { email: string; nom: string; role: string }): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, erreur: REFUS };
  const email = saisie.email.trim().toLowerCase();
  const nom = saisie.nom.trim().replace(/\s+/g, " ");
  const role = saisie.role;
  if (!EMAIL.test(email)) return { ok: false, erreur: "Adresse e-mail invalide. Exemple : prenom.nom@accg.be" };
  if (nom.length < 2) return { ok: false, erreur: "Indiquez le nom et le prénom de la personne." };
  if (!(ROLES_EQUIPE as readonly string[]).includes(role)) return { ok: false, erreur: "Rôle inconnu." };
  if (role === ROLE_TOUTES_APPS && ctx.acteur.role !== ROLE_TOUTES_APPS)
    return { ok: false, erreur: "Seul un super admin peut inviter un super admin." };

  const { data: existant } = await ctx.db.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (existant) return { ok: false, erreur: "Un compte existe déjà avec cette adresse (peut-être dans CG Link)." };

  const { data, error } = await ctx.db.auth.admin.inviteUserByEmail(email, {
    // Mêmes métadonnées que les invitations de CG Link.
    data: { name: nom, role, invited: true, must_change_password: true, mustChangePassword: true },
    redirectTo: `${await adresseDuSite()}/login/nouveau-mot-de-passe`,
  });
  if (error || !data.user) {
    console.error("[invitation]", error?.code ?? error?.status);
    return {
      ok: false,
      erreur:
        error?.code === "email_exists" || error?.status === 422
          ? "Un compte existe déjà avec cette adresse (peut-être dans CG Link)."
          : error?.status === 429
            ? "Trop d'invitations rapprochées. Patientez une minute puis réessayez."
            : "L'invitation n'a pas pu être envoyée. Réessayez dans un instant.",
    };
  }

  // La ligne profiles : UNIQUEMENT id, email, name, role (table partagée avec CG Link).
  const ligne = { id: data.user.id, email, name: nom, role };
  const session = await getSupabaseServer();
  let { error: errProfil } = await session.from("profiles").insert(ligne);
  if (errProfil) ({ error: errProfil } = await ctx.db.from("profiles").insert(ligne));
  if (errProfil) {
    console.error("[invitation profil]", errProfil.code);
    // Pas de compte sans profil : on annule l'invitation.
    await ctx.db.auth.admin.deleteUser(data.user.id);
    return { ok: false, erreur: "Le profil n'a pas pu être créé : l'invitation est annulée. Réessayez." };
  }
  await journaliser(ctx, data.user.id, "invitation", { email, nom, role });
  rafraichir();
  return { ok: true, message: `Invitation envoyée à ${email}.` };
}

// ── Apps par défaut des rôles ───────────────────────────────────────────────

export async function basculerRoleApp(role: string, code: string, actif: boolean): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, erreur: REFUS };
  if (ctx.acteur.role !== ROLE_TOUTES_APPS) return { ok: false, erreur: "Seul un super admin peut changer les apps d'un rôle." };
  if (role === ROLE_TOUTES_APPS || !(ROLES as readonly string[]).includes(role)) return { ok: false, erreur: "Rôle non modifiable." };
  const { data: app } = await ctx.db.from("site_apps").select("code").eq("code", code).maybeSingle();
  if (!app) return { ok: false, erreur: "App inconnue." };
  const { data: deja } = await ctx.db.from("site_app_roles").select("app_code").eq("app_code", code).eq("role", role);
  if (actif === Boolean(deja?.length)) return { ok: true };
  const { error } = actif
    ? await ctx.db.from("site_app_roles").insert({ app_code: code, role })
    : await ctx.db.from("site_app_roles").delete().eq("app_code", code).eq("role", role);
  if (error) {
    console.error("[rôles par défaut]", error.code);
    return { ok: false, erreur: "Le changement n'a pas pu être enregistré. Réessayez." };
  }
  await journaliser(ctx, null, actif ? "role_app_ajout" : "role_app_retrait", { app: code, role });
  rafraichir();
  return { ok: true };
}

/**
 * Règles de gestion des accès de l'Espace CG (fonctions pures, testées) :
 * apps effectives d'une personne, effet d'un interrupteur, phrases du journal.
 * Les droits eux-mêmes restent calculés par la base (site_mes_apps, site_a_app) : ces règles servent à
 * l'affichage et à décider quelle exception créer ou supprimer.
 */

export type TypeException = "ajout" | "retrait";
export type Exception = { id: string; app_code: string; type: TypeException };

/** Le SUPER_ADMIN a toujours toutes les apps (site_mes_apps), sans exception possible. */
export const ROLE_TOUTES_APPS = "SUPER_ADMIN";

/** Apps par défaut d'un rôle, depuis les lignes de site_app_roles. */
export function appsDuRole(role: string, lignes: { app_code: string; role: string }[], toutes: string[]): string[] {
  if (role === ROLE_TOUTES_APPS) return [...toutes];
  return lignes.filter((l) => l.role === role).map((l) => l.app_code);
}

export type AppPersonne = { code: string; origine: "role" | "exception" };

/** Apps effectives : celles du rôle, moins les retraits, plus les ajouts (dans l'ordre du catalogue). */
export function appsEffectives(role: string, base: string[], exceptions: Exception[], ordre: string[]): AppPersonne[] {
  if (role === ROLE_TOUTES_APPS) return ordre.map((code) => ({ code, origine: "role" }));
  const retraits = new Set(exceptions.filter((e) => e.type === "retrait").map((e) => e.app_code));
  const ajouts = new Set(exceptions.filter((e) => e.type === "ajout").map((e) => e.app_code));
  return ordre.flatMap((code): AppPersonne[] => {
    if (base.includes(code)) return retraits.has(code) ? [] : [{ code, origine: "role" }];
    return ajouts.has(code) ? [{ code, origine: "exception" }] : [];
  });
}

export type EtatApp = "role" | "retiree" | "ajoutee" | "aucun";

/** État d'une app pour une personne : incluse par le rôle, retirée par exception, ajoutée par exception, ou rien. */
export function etatApp(code: string, base: string[], exceptions: Exception[]): EtatApp {
  const ex = exceptions.find((e) => e.app_code === code);
  if (base.includes(code)) return ex?.type === "retrait" ? "retiree" : "role";
  return ex?.type === "ajout" ? "ajoutee" : "aucun";
}

export type Bascule =
  | { faire: "creer"; type: TypeException }
  | { faire: "supprimer"; id: string }
  | { faire: "rien" };

/**
 * Effet d'un interrupteur d'app :
 * - app du rôle : l'éteindre crée un « retrait », la rallumer supprime ce retrait ;
 * - app hors rôle : l'allumer crée un « ajout », l'éteindre supprime cet ajout.
 * Une exception devenue inutile (ex. ajout d'une app entrée depuis dans le rôle) est supprimée au passage.
 */
export function bascule(code: string, actif: boolean, base: string[], exceptions: Exception[]): Bascule {
  const ex = exceptions.find((e) => e.app_code === code);
  const duRole = base.includes(code);
  if (duRole) {
    if (actif) return ex ? { faire: "supprimer", id: ex.id } : { faire: "rien" };
    if (ex?.type === "retrait") return { faire: "rien" };
    return ex ? { faire: "supprimer", id: ex.id } : { faire: "creer", type: "retrait" };
  }
  if (!actif) return ex ? { faire: "supprimer", id: ex.id } : { faire: "rien" };
  if (ex?.type === "ajout") return { faire: "rien" };
  return ex ? { faire: "supprimer", id: ex.id } : { faire: "creer", type: "ajout" };
}

/** Exceptions devenues inutiles avec un nouveau rôle (ajout d'une app du rôle, retrait d'une app hors rôle). */
export function exceptionsInutiles(base: string[], exceptions: Exception[], role: string): Exception[] {
  if (role === ROLE_TOUTES_APPS) return [...exceptions];
  return exceptions.filter((e) => (e.type === "ajout" ? base.includes(e.app_code) : !base.includes(e.app_code)));
}

// ── Garde-fous ──────────────────────────────────────────────────────────────

export type Personne = { id: string; role: string; suspendu?: boolean };

/** Refus (message) ou null si le changement de rôle est permis. */
export function refusChangementRole(acteur: Personne, cible: Personne, nouveau: string, equipe: Personne[]): string | null {
  if (acteur.role !== ROLE_TOUTES_APPS) return "Seul un super admin peut changer un rôle.";
  if (nouveau === cible.role) return "La personne a déjà ce rôle.";
  if (cible.role === ROLE_TOUTES_APPS) {
    if (cible.id === acteur.id) return "Vous ne pouvez pas retirer votre propre rôle de super admin.";
    if (equipe.filter((p) => p.role === ROLE_TOUTES_APPS).length <= 1) return "Il doit toujours rester au moins un super admin.";
  }
  return null;
}

/** Refus (message) ou null si la suspension est permise. */
export function refusSuspension(acteur: Personne, cible: Personne, equipe: Personne[]): string | null {
  if (cible.id === acteur.id) return "Vous ne pouvez pas suspendre votre propre accès.";
  if (cible.role === ROLE_TOUTES_APPS) {
    if (acteur.role !== ROLE_TOUTES_APPS) return "Seul un super admin peut suspendre un super admin.";
    if (equipe.filter((p) => p.role === ROLE_TOUTES_APPS && !p.suspendu).length <= 1)
      return "Il doit toujours rester au moins un super admin actif.";
  }
  return null;
}

/** Un non-super-admin ne gère pas les comptes super admin (sinon il pourrait s'élever ou bloquer la direction). */
export function refusGestion(acteur: Personne, cible: Personne): string | null {
  if (cible.role === ROLE_TOUTES_APPS && acteur.role !== ROLE_TOUTES_APPS)
    return "Seul un super admin peut gérer le compte d'un super admin.";
  return null;
}

// ── Journal ─────────────────────────────────────────────────────────────────

export const ACTIONS_JOURNAL = [
  "app_ajout",
  "app_retrait",
  "app_exception_supprimee",
  "role",
  "invitation",
  "reinitialisation",
  "suspension",
  "reactivation",
  "role_app_ajout",
  "role_app_retrait",
] as const;
export type ActionJournal = (typeof ACTIONS_JOURNAL)[number];

export type DetailsJournal = {
  app?: string;
  avant?: string;
  apres?: string;
  role?: string;
  email?: string;
  nom?: string;
  exception?: TypeException;
};

type Contexte = {
  auteur: string;
  cible: string;
  nomApp: (code?: string) => string;
  nomRole: (role?: string) => string;
};

/** Phrase lisible d'une ligne du journal, sans la date (« Fred a donné l'accès à Actions syndicales à Marie Dupont »). */
export function phraseJournal(action: string, d: DetailsJournal, c: Contexte): string {
  const app = c.nomApp(d.app);
  switch (action) {
    case "app_ajout":
      return `${c.auteur} a donné l'accès à ${app} à ${c.cible}`;
    case "app_retrait":
      return `${c.auteur} a retiré l'accès à ${app} à ${c.cible}`;
    case "app_exception_supprimee":
      return d.exception === "retrait"
        ? `${c.auteur} a rendu l'accès à ${app} à ${c.cible} (retour au rôle)`
        : `${c.auteur} a retiré l'accès exceptionnel à ${app} de ${c.cible} (retour au rôle)`;
    case "role":
      return `${c.auteur} a changé le rôle de ${c.cible} : ${c.nomRole(d.avant)} → ${c.nomRole(d.apres)}`;
    case "invitation":
      return `${c.auteur} a invité ${d.nom || d.email || c.cible} comme ${c.nomRole(d.role)}`;
    case "reinitialisation":
      return `${c.auteur} a envoyé un lien de réinitialisation du mot de passe à ${c.cible}`;
    case "suspension":
      return `${c.auteur} a suspendu l'accès de ${c.cible}`;
    case "reactivation":
      return `${c.auteur} a réactivé l'accès de ${c.cible}`;
    case "role_app_ajout":
      return `${c.auteur} a ajouté ${app} aux apps par défaut du rôle ${c.nomRole(d.role)}`;
    case "role_app_retrait":
      return `${c.auteur} a retiré ${app} des apps par défaut du rôle ${c.nomRole(d.role)}`;
    default:
      return `${c.auteur} : ${action}`;
  }
}

/** « le 08/10/2026 à 14:32 », à l'heure de Bruxelles. */
export function quandJournal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", ...o }).format(d);
  return `le ${f({ day: "2-digit", month: "2-digit", year: "numeric" })} à ${f({ hour: "2-digit", minute: "2-digit" })}`;
}

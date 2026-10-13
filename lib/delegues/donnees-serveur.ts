import { getSupabaseService } from "../supabase-service";
import { tousLesComptes } from "../espace/equipe-serveur";
import { nomAffiche } from "../entreprises/regles";
import { etatCompte, phraseJournal } from "./delegue";
import { libelleMandat, mandatEnCours } from "./mandats";
import { calculerEcarts, type Ecart } from "./ecarts";
import { COLONNES_DELEGUE, COLONNES_MANDAT, type Delegue, type DelegueCgLink, type EtatCompte, type Mandat, type Organe } from "./types";

/** Lectures de l'app Gestion délégués CG Link. SERVEUR UNIQUEMENT, service_role, après exigerSuperAdmin(). */

export type LigneDelegue = { id: string; prenom: string | null; nom: string; entrepriseId: string; entrepriseNom: string;
  mandats: string[]; organes: Organe[]; compte: EtatCompte; aVerifier: boolean; ecarts: number };
export type EntrepriseChoix = { id: string; nom: string };

const aujourdhui = () => new Date().toISOString().slice(0, 10);

async function nomsEntreprises() {
  const db = getSupabaseService()!;
  const [{ data: fiches }, { data: companies }] = await Promise.all([
    db.from("site_entreprises").select("id, nom, company_id"),
    db.from("companies").select("id, name, delegates"),
  ]);
  const cos = (companies ?? []) as { id: string; name: string; delegates: DelegueCgLink[] | null }[];
  const noms = new Map(((fiches ?? []) as { id: string; nom: string | null; company_id: string | null }[]).map((f) => [
    f.id, nomAffiche({ nom: f.nom }, cos.find((c) => c.id === f.company_id) ?? null),
  ]));
  const entrees = new Map<string, DelegueCgLink>();
  for (const c of cos) for (const d of c.delegates ?? []) if (d?.id && !entrees.has(d.id)) entrees.set(d.id, d);
  const liees = new Set(((fiches ?? []) as { id: string; company_id: string | null }[]).filter((f) => f.company_id).map((f) => f.id));
  return { noms, entrees, liees };
}

/** Valeurs CG Link ignorées par délégué (écarts). */
async function ignoresParDelegue(ids?: string[]): Promise<Map<string, { champ: string; valeur: string }[]>> {
  const db = getSupabaseService()!;
  let q = db.from("site_ecarts_ignores").select("cible_id, champ, valeur").eq("cible", "delegue");
  if (ids) q = q.in("cible_id", ids);
  const { data } = await q;
  const m = new Map<string, { champ: string; valeur: string }[]>();
  for (const r of (data ?? []) as { cible_id: string; champ: string; valeur: string }[]) m.set(r.cible_id, [...(m.get(r.cible_id) ?? []), r]);
  return m;
}

async function connexions(): Promise<Map<string, string | null>> {
  const db = getSupabaseService()!;
  try {
    return new Map((await tousLesComptes(db)).map((u) => [u.id, u.last_sign_in_at ?? null]));
  } catch (err) {
    console.error("[delegues] comptes :", err instanceof Error ? err.message : "erreur");
    return new Map();
  }
}

export async function chargerListeDelegues() {
  const db = getSupabaseService();
  if (!db) return { ok: false as const, erreur: "Configuration serveur incomplète." };
  const [{ data: delegues, error }, { data: mandats }, { noms, entrees }, cnx, ignores] = await Promise.all([
    db.from("site_delegues").select(COLONNES_DELEGUE).order("nom"),
    db.from("site_delegue_mandats").select(COLONNES_MANDAT),
    nomsEntreprises(),
    connexions(),
    ignoresParDelegue(),
  ]);
  if (error) {
    console.error("[delegues] liste :", error.code);
    return { ok: false as const, erreur: "La base n'a pas répondu. Rechargez la page." };
  }
  const jour = aujourdhui();
  const parDelegue = new Map<string, Mandat[]>();
  for (const m of (mandats ?? []) as Mandat[]) parDelegue.set(m.delegue_id, [...(parDelegue.get(m.delegue_id) ?? []), m]);
  const lignes: LigneDelegue[] = ((delegues ?? []) as Delegue[]).map((d) => {
    const ms = (parDelegue.get(d.id) ?? []).filter((m) => mandatEnCours(m, jour));
    return {
      id: d.id, prenom: d.prenom, nom: d.nom, entrepriseId: d.entreprise_id, entrepriseNom: noms.get(d.entreprise_id) ?? "",
      mandats: ms.map(libelleMandat), organes: [...new Set(ms.map((m) => m.organe))],
      compte: etatCompte(d.cglink_user_id, d.cglink_user_id ? entrees.get(d.cglink_user_id) : undefined, d.cglink_user_id ? cnx.get(d.cglink_user_id) : null),
      aVerifier: Boolean(d.a_verifier) || (parDelegue.get(d.id) ?? []).some((m) => m.a_verifier),
      ecarts: d.cglink_user_id && entrees.get(d.cglink_user_id)
        ? calculerEcarts(d, parDelegue.get(d.id) ?? [], entrees.get(d.cglink_user_id)!, ignores.get(d.id) ?? [], jour).length
        : 0,
    };
  });
  const entreprises = [...noms].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return { ok: true as const, lignes, entreprises };
}

export type CarteDelegue = {
  delegue: Delegue; entrepriseNom: string; mandats: Mandat[];
  sites: { id: string; nom: string; principal: boolean }[];
  unites: { id: string; site_id: string | null; libelle: string }[];
  compte: { etat: EtatCompte; invitedAt: number | null; derniereConnexion: string | null };
  journal: { id: string; created_at: string; phrase: string }[];
  /** Écarts avec CG Link (délégué avec compte), entreprises au choix, fiche reliée à CG Link. */
  ecarts: Ecart[];
  entreprises: EntrepriseChoix[];
  ficheLiee: boolean;
};

export async function chargerCarte(id: string): Promise<CarteDelegue | null> {
  const db = getSupabaseService();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: d } = await db.from("site_delegues").select(COLONNES_DELEGUE).eq("id", id).maybeSingle();
  if (!d) return null;
  const delegue = d as Delegue;
  const [{ data: mandats }, { data: sites }, { data: unites }, { data: journal }, { noms, entrees, liees }, cnx, ignores] = await Promise.all([
    db.from("site_delegue_mandats").select(COLONNES_MANDAT).eq("delegue_id", id).order("fin", { nullsFirst: true }).order("organe"),
    db.from("site_entreprise_sites").select("id, nom, principal").eq("entreprise_id", delegue.entreprise_id).order("principal", { ascending: false }).order("nom"),
    db.from("site_entreprise_unites").select("id, site_id, rue, numero, localite").eq("entreprise_id", delegue.entreprise_id).eq("statut", "actif").eq("suivie", true).order("localite"),
    db.from("site_journal_delegues").select("id, created_at, action, details").eq("delegue_id", id).order("created_at", { ascending: false }).limit(20),
    nomsEntreprises(),
    delegue.cglink_user_id ? connexions() : Promise.resolve(new Map<string, string | null>()),
    ignoresParDelegue([id]),
  ]);
  const entree = delegue.cglink_user_id ? entrees.get(delegue.cglink_user_id) : undefined;
  type LigneUnite = { id: string; site_id: string | null; rue: string | null; numero: string | null; localite: string | null };
  const libelleUnite = (u: LigneUnite) => [u.rue, u.numero, u.localite && `— ${u.localite}`].filter(Boolean).join(" ");
  const choix = ((unites ?? []) as LigneUnite[]).map((u) => ({ id: u.id, site_id: u.site_id, libelle: libelleUnite(u) }));
  // Unité actuelle plus suivie ou arrêtée : gardée dans la liste, signalée, pour ne pas bloquer la carte.
  if (delegue.unite_id && !choix.some((u) => u.id === delegue.unite_id)) {
    const { data: actuelle } = await db.from("site_entreprise_unites").select("id, site_id, rue, numero, localite").eq("id", delegue.unite_id).maybeSingle();
    if (actuelle) {
      const u = actuelle as LigneUnite;
      choix.push({ id: u.id, site_id: u.site_id, libelle: `${libelleUnite(u)} (plus suivie)` });
    }
  }
  const derniereConnexion = delegue.cglink_user_id ? cnx.get(delegue.cglink_user_id) ?? null : null;
  return {
    delegue,
    entrepriseNom: noms.get(delegue.entreprise_id) ?? "",
    mandats: (mandats ?? []) as Mandat[],
    sites: (sites ?? []) as CarteDelegue["sites"],
    unites: choix,
    compte: { etat: etatCompte(delegue.cglink_user_id, entree, derniereConnexion), invitedAt: entree?.invitedAt ?? null, derniereConnexion },
    journal: ((journal ?? []) as { id: string; created_at: string; action: string; details: Record<string, unknown> }[])
      .map((j) => ({ id: j.id, created_at: j.created_at, phrase: phraseJournal(j.action, j.details ?? {}) })),
    ecarts: entree ? calculerEcarts(delegue, (mandats ?? []) as Mandat[], entree, ignores.get(id) ?? [], aujourdhui()) : [],
    entreprises: [...noms].map(([eid, nom]) => ({ id: eid, nom })).sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    ficheLiee: liees.has(delegue.entreprise_id),
  };
}

export async function chargerAVerifier() {
  const db = getSupabaseService()!;
  const [{ data: ds }, { data: ms }, { noms }] = await Promise.all([
    db.from("site_delegues").select("id, prenom, nom, entreprise_id, a_verifier").not("a_verifier", "is", null).order("nom"),
    db.from("site_delegue_mandats").select(`${COLONNES_MANDAT}, delegue:site_delegues(prenom, nom)`).not("a_verifier", "is", null),
    nomsEntreprises(),
  ]);
  const nomDe = (x: { prenom: string | null; nom: string } | null) => (x ? [x.prenom, x.nom].filter(Boolean).join(" ") : "");
  return {
    delegues: ((ds ?? []) as (Pick<Delegue, "id" | "prenom" | "nom" | "entreprise_id" | "a_verifier">)[])
      .map((d) => ({ id: d.id, nom: nomDe(d), entreprise: noms.get(d.entreprise_id) ?? "", raison: d.a_verifier ?? "" })),
    mandats: ((ms ?? []) as unknown as (Mandat & { delegue: { prenom: string | null; nom: string } | null })[])
      .map((m) => ({ id: m.id, delegueId: m.delegue_id, delegue: nomDe(m.delegue), mandat: libelleMandat(m), raison: m.a_verifier ?? "" })),
  };
}

export async function chargerJournal(page: number) {
  const db = getSupabaseService()!;
  const parPage = 50;
  const { data, count } = await db.from("site_journal_delegues")
    .select("id, created_at, action, details, auteur_id, delegue_id", { count: "exact" })
    .order("created_at", { ascending: false }).range(page * parPage, page * parPage + parPage - 1);
  const lignes = (data ?? []) as { id: string; created_at: string; action: string; details: Record<string, unknown>; auteur_id: string | null; delegue_id: string | null }[];
  const auteurs = [...new Set(lignes.map((l) => l.auteur_id).filter((x): x is string => Boolean(x)))];
  const ids = [...new Set(lignes.map((l) => l.delegue_id).filter((x): x is string => Boolean(x)))];
  // Le journal n'a pas de clé étrangère vers site_delegues (il survit aux suppressions) : seconde requête.
  const [{ data: profils }, { data: dels }] = await Promise.all([
    auteurs.length ? db.from("profiles").select("id, name").in("id", auteurs) : Promise.resolve({ data: [] }),
    ids.length ? db.from("site_delegues").select("id, prenom, nom").in("id", ids) : Promise.resolve({ data: [] }),
  ]);
  const nomDelegue = new Map(((dels ?? []) as { id: string; prenom: string | null; nom: string }[]).map((d) => [d.id, [d.prenom, d.nom].filter(Boolean).join(" ")]));
  const nomAuteur = new Map(((profils ?? []) as { id: string; name: string | null }[]).map((p) => [p.id, p.name]));
  return {
    total: count ?? 0,
    lignes: lignes.map((l) => ({
      id: l.id, created_at: l.created_at, phrase: phraseJournal(l.action, l.details ?? {}),
      delegue: l.delegue_id ? nomDelegue.get(l.delegue_id) ?? (typeof l.details?.nom === "string" ? (l.details.nom as string) : null) : null,
      auteur: l.auteur_id ? nomAuteur.get(l.auteur_id) ?? null : null,
    })),
  };
}

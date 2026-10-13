# Gestion délégués CG Link (plan 2b : comptes CG Link, synchronisation, écarts) : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** depuis la carte d'un délégué, inviter / renvoyer / annuler l'invitation CG Link, bloquer / débloquer,
changer d'entreprise, envoyer la carte vers CG Link (synchronisation automatique après chaque modification),
et voir / traiter les écarts avec CG Link (« Reprendre », « Envoyer », « Ignorer »).

**Architecture :** règles pures dans `lib/delegues/cglink.ts` (conversion Espace → CG Link, fusion et
déplacement d'une entrée `companies.delegates`) et `lib/delegues/ecarts.ts` (écarts, plan de reprise), testées.
Accès CG Link dans `lib/delegues/cglink-serveur.ts` : écriture concurrente sûre de `companies.delegates`
(relecture + `updated_at`, 3 essais), appel des fonctions CG Link `invite-user` / `cancel-invite` avec la
session du super admin. Actions serveur ajoutées à `app/espace/delegues/actions.ts`, panneaux « Compte CG Link »
et « Écarts » sur la carte.

**Tech Stack :** Next.js 16 (actions serveur), Supabase (service_role, Edge Functions de CG Link), Vitest.

**Spec :** [docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md](../specs/2026-10-12-entreprises-delegues-design.md),
sections 7.3 et 7.4, avec les décisions ci-dessous.

## Décisions (relevées dans le code de CG Link le 13/10/2026)

- **L'e-mail n'est jamais écrit vers CG Link** : à la connexion, CG Link retrouve le délégué par
  `companies.delegates[].email` (`services/DataContext.tsx`, login). Changer cet e-mail empêcherait la
  connexion. Pour un délégué qui a un compte, l'e-mail est en lecture seule dans l'Espace ; un écart d'e-mail
  se « Reprend » (CG Link → Espace) ou s'« Ignore », jamais « Envoyer ».
- **Blocage** : `isActive` de l'entrée, contrôlé par CG Link à chaque connexion (une session ouverte expire
  avec son jeton, ~1 h).
- **Téléphone** : CG Link ne fait que l'afficher → format `+32 (0) …` envoyé tel quel.
- **Entreprise CG Link d'un délégué qui a un compte** : celle dont `delegates` contient son identifiant (et non
  forcément `company_id` de sa fiche : XLG HOME regroupée dans TRIXXO). Pour une **invitation**, c'est
  `company_id` de la fiche (obligatoire : sinon « Reliez d'abord l'entreprise à CG Link »).
- **Changer d'entreprise** : entrée ajoutée à la nouvelle entreprise CG Link, puis retirée de l'ancienne, puis
  `profiles.company_id` ; dans l'Espace, `entreprise_id` changé, `unite_id` vidé, mandats en cours déplacés au
  site principal de la nouvelle fiche et marqués « à vérifier » (rien n'est terminé ni supprimé).
- **Synchronisation automatique** après toute modification d'identité ou de mandat d'un délégué qui a un
  compte ; échec de synchronisation = l'enregistrement dans l'Espace est gardé, message « CG Link n'a pas pu
  être mis à jour : utilisez « Envoyer à CG Link » ».

## Global Constraints

- SUPER_ADMIN uniquement (rôle revérifié par `ctx()` de `actions.ts`), service_role ensuite ; chaque action
  écrit une ligne de `site_journal_delegues`.
- Écritures dans `companies.delegates` : **uniquement l'entrée du délégué**, tous les autres champs de
  l'entrée et les autres délégués conservés ; jamais `email`.
- Aucune donnée personnelle dans les journaux serveur (codes d'erreur seulement).
- Français, dates `jj/mm/aaaa`, icônes `lucide-react`, cibles ≥ 44 px (`BTN`, pas `BTN_PETIT`), confirmation
  avant toute action irréversible (annuler l'invitation, bloquer, changer d'entreprise).
- Branche `suivi-actions`, rien n'est poussé.

## Review Focus

1. **CG Link modifie `companies.delegates` en même temps** (un délégué remplit son profil) : aucune donnée
   perdue. Tests de `fusionnerEntree` (champs conservés) ; écriture avec `.eq("updated_at", lu)` + 3 essais.
2. **Délégué introuvable dans `companies.delegates`** (supprimé dans CG Link) : état « introuvable », pas
   d'écriture, bouton « Retirer le lien ». Test « renvoie null si l'entrée n'existe pas ».
3. **Invitation refusée par CG Link** (e-mail déjà utilisé, session expirée) : message de CG Link affiché,
   rien n'est modifié dans l'Espace. Test de `lireReponseFonction`.
4. **Écart « Pas de mandat » dans CG Link alors qu'un mandat est en cours ici** : « Reprendre » termine le
   mandat (fin = aujourd'hui), ne le supprime pas. Test de `planReprise`.
5. **Mandats terminés** : jamais envoyés à CG Link comme mandats en cours. Test de `versCgLink`.

---

### Task 1 : Conversion vers CG Link et fusion d'entrée (pur)

**Files :** Create `lib/delegues/cglink.ts`, Test `lib/delegues/cglink.test.ts`

**Interfaces :** Produces
`type ChampsCgLink = { name: string; phone: string; mandateDs: string; mandateCe: string; mandateCppt: string; mandateOther: string }` ;
`versCgLink(d: Pick<Delegue, "prenom"|"nom"|"telephone">, mandats: Pick<Mandat, "organe"|"qualite"|"libelle"|"fonction"|"fin">[], aujourdhui: string): ChampsCgLink` ;
`fusionnerEntree(delegues: DelegueCgLink[], id: string, maj: Partial<DelegueCgLink>): DelegueCgLink[] | null` ;
`deplacerEntree(source: DelegueCgLink[], cible: DelegueCgLink[], id: string): { source: DelegueCgLink[]; cible: DelegueCgLink[] } | null` ;
`lireReponseFonction(statut: number, corps: unknown): { ok: true; userId: string | null } | { ok: false; erreur: string }`.

- [ ] **Step 1 : tests**

```ts
import { describe, expect, it } from "vitest";
import { deplacerEntree, fusionnerEntree, lireReponseFonction, versCgLink } from "./cglink";

const J = "2026-10-13";
const m = (organe: string, qualite: string | null, extra: Record<string, unknown> = {}) =>
  ({ organe, qualite, libelle: null, fonction: null, fin: null, ...extra }) as Parameters<typeof versCgLink>[1][number];

describe("versCgLink", () => {
  it("donne Effectif / Suppléant / Pas de mandat par organe, effectif prioritaire", () => {
    const r = versCgLink({ prenom: "Jean", nom: "Dupont", telephone: "+32 (0) 470 12 34 56" },
      [m("ds", "suppleant"), m("ds", "effectif"), m("cppt", "suppleant")], J);
    expect(r).toEqual({ name: "Jean Dupont", phone: "+32 (0) 470 12 34 56", mandateDs: "Effectif", mandateCe: "Pas de mandat", mandateCppt: "Suppléant", mandateOther: "" });
  });
  it("ignore les mandats terminés", () => {
    expect(versCgLink({ prenom: null, nom: "D", telephone: null }, [m("ce", "effectif", { fin: "2026-10-12" })], J).mandateCe).toBe("Pas de mandat");
  });
  it("écrit les autres mandats et les fonctions dans mandateOther", () => {
    const r = versCgLink({ prenom: null, nom: "D", telephone: null }, [
      m("cee", "effectif"), m("instances_cg", null, { libelle: "Comité exécutif" }), m("autre", null, { libelle: "SIPP" }),
      m("ce", "effectif", { fonction: "Secrétaire" }),
    ], J);
    expect(r.mandateOther).toBe("CEE effectif ; Instances CG : Comité exécutif ; SIPP ; Secrétaire (CE)");
    expect(r.mandateCe).toBe("Effectif");
  });
});

describe("fusionnerEntree", () => {
  const ds = [
    { id: "a", name: "A", email: "a@x.be", isActive: true, mustChangePassword: false, acceptedRgpd: true, invitedAt: 1 },
    { id: "b", name: "B", email: "b@x.be" },
  ];
  it("ne modifie que l'entrée visée et conserve ses autres champs", () => {
    const r = fusionnerEntree(ds, "a", { name: "A2", phone: "+32" })!;
    expect(r[0]).toEqual({ id: "a", name: "A2", email: "a@x.be", isActive: true, mustChangePassword: false, acceptedRgpd: true, invitedAt: 1, phone: "+32" });
    expect(r[1]).toBe(ds[1]);
  });
  it("n'écrit jamais l'e-mail", () => {
    expect(fusionnerEntree(ds, "a", { email: "autre@x.be" })![0].email).toBe("a@x.be");
  });
  it("renvoie null si l'entrée n'existe pas", () => {
    expect(fusionnerEntree(ds, "z", { name: "Z" })).toBeNull();
  });
});

describe("deplacerEntree", () => {
  it("retire de la source, ajoute (ou remplace) dans la cible", () => {
    const r = deplacerEntree([{ id: "a", name: "A" }, { id: "b" }], [{ id: "c" }], "a")!;
    expect(r.source.map((d) => d.id)).toEqual(["b"]);
    expect(r.cible.map((d) => d.id)).toEqual(["c", "a"]);
    expect(deplacerEntree([{ id: "b" }], [{ id: "a", name: "ancien" }], "z")).toBeNull();
  });
});

describe("lireReponseFonction", () => {
  it("lit le succès et l'identifiant", () => {
    expect(lireReponseFonction(200, { success: true, userId: "u1" })).toEqual({ ok: true, userId: "u1" });
  });
  it("rend le message de CG Link, sinon un message générique", () => {
    expect(lireReponseFonction(400, { error: "User already registered" })).toEqual({ ok: false, erreur: "CG Link a refusé : User already registered" });
    expect(lireReponseFonction(500, null)).toEqual({ ok: false, erreur: "CG Link n'a pas répondu correctement. Réessayez dans un instant." });
    expect(lireReponseFonction(401, {})).toEqual({ ok: false, erreur: "Votre session a expiré. Reconnectez-vous puis réessayez." });
  });
});
```

- [ ] **Step 2 : lancer** — `npx vitest run lib/delegues/cglink.test.ts` — Expected : FAIL (module absent).

- [ ] **Step 3 : implémenter**

```ts
import { LIBELLES_ORGANES, mandatEnCours } from "./mandats";
import type { Delegue, DelegueCgLink, Mandat } from "./types";

/**
 * Passage Espace CG → CG Link (`companies.delegates`, jsonb). Pur.
 * Jamais d'e-mail écrit : CG Link retrouve le délégué par cet e-mail à la connexion.
 */

export type ChampsCgLink = { name: string; phone: string; mandateDs: string; mandateCe: string; mandateCppt: string; mandateOther: string };

const ORGANES_CGLINK = ["ds", "ce", "cppt"] as const;

export function versCgLink(
  d: Pick<Delegue, "prenom" | "nom" | "telephone">,
  mandats: Pick<Mandat, "organe" | "qualite" | "libelle" | "fonction" | "fin">[],
  aujourdhui: string
): ChampsCgLink {
  const enCours = mandats.filter((m) => mandatEnCours(m, aujourdhui));
  const qualite = (o: string) => {
    const ms = enCours.filter((m) => m.organe === o);
    if (ms.some((m) => m.qualite === "effectif")) return "Effectif";
    if (ms.some((m) => m.qualite === "suppleant")) return "Suppléant";
    return "Pas de mandat";
  };
  const autres = enCours.flatMap((m) => {
    if ((ORGANES_CGLINK as readonly string[]).includes(m.organe)) return m.fonction ? [`${m.fonction} (${LIBELLES_ORGANES[m.organe]})`] : [];
    const q = m.qualite === "effectif" ? " effectif" : m.qualite === "suppleant" ? " suppléant" : "";
    const base = m.organe === "cee" ? `CEE${q}` : m.organe === "instances_cg" ? `Instances CG : ${m.libelle ?? ""}` : m.libelle ?? "Autre";
    return [m.fonction ? `${base} (${m.fonction})` : base];
  });
  // Les fonctions DS / CE / CPPT après les autres mandats.
  autres.sort((a, b) => Number(/\((DS|CE|CPPT)\)$/.test(a)) - Number(/\((DS|CE|CPPT)\)$/.test(b)));
  return {
    name: [d.prenom, d.nom].filter(Boolean).join(" "),
    phone: d.telephone ?? "",
    mandateDs: qualite("ds"),
    mandateCe: qualite("ce"),
    mandateCppt: qualite("cppt"),
    mandateOther: autres.join(" ; "),
  };
}

export function fusionnerEntree(delegues: DelegueCgLink[], id: string, maj: Partial<DelegueCgLink>): DelegueCgLink[] | null {
  if (!delegues.some((d) => d.id === id)) return null;
  const { email: _jamais, id: _id, ...sansEmail } = maj;
  return delegues.map((d) => (d.id === id ? { ...d, ...sansEmail } : d));
}

export function deplacerEntree(source: DelegueCgLink[], cible: DelegueCgLink[], id: string) {
  const entree = source.find((d) => d.id === id);
  if (!entree) return null;
  return { source: source.filter((d) => d.id !== id), cible: [...cible.filter((d) => d.id !== id), entree] };
}

export function lireReponseFonction(statut: number, corps: unknown): { ok: true; userId: string | null } | { ok: false; erreur: string } {
  const c = (corps ?? {}) as { success?: boolean; userId?: string; error?: string };
  if (statut >= 200 && statut < 300 && !c.error) return { ok: true, userId: c.userId ?? null };
  if (statut === 401) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous puis réessayez." };
  if (typeof c.error === "string" && c.error) return { ok: false, erreur: `CG Link a refusé : ${c.error}` };
  return { ok: false, erreur: "CG Link n'a pas répondu correctement. Réessayez dans un instant." };
}
```

Le test « fonctions après les autres mandats » attend `... ; SIPP ; Secrétaire (CE)` : le tri stable met les
fonctions DS / CE / CPPT en dernier.

- [ ] **Step 4 : relancer** — Expected : PASS.

- [ ] **Step 5 : commit** — `git add lib/delegues/cglink.* && git commit -m "feat(delegues): CG Link conversion and safe entry merge"`

---

### Task 2 : Écarts et plan de reprise (pur)

**Files :** Create `lib/delegues/ecarts.ts`, Test `lib/delegues/ecarts.test.ts`

**Interfaces :**
- Consumes : `versCgLink` (tâche 1), `decouperNom`, `classerAutre`, `formaterTelephone`, `siteParDefaut`.
- Produces :

```ts
export type ChampEcart = "nom" | "email" | "telephone" | "ds" | "ce" | "cppt" | "autre";
export type Ecart = { champ: ChampEcart; libelle: string; ici: string; cglink: string; envoyable: boolean };
export function calculerEcarts(d: Delegue, mandats: Mandat[], entree: DelegueCgLink, ignores: { champ: string; valeur: string }[], aujourdhui: string): Ecart[];
export type OperationReprise =
  | { type: "maj_delegue"; valeurs: Partial<Delegue> }
  | { type: "terminer"; ids: string[]; fin: string }
  | { type: "qualite"; id: string; qualite: Qualite }
  | { type: "ajouter"; mandat: { organe: Organe; qualite: Qualite | null; libelle: string | null; fonction: string | null; debut: string; a_verifier: string } }
  | { type: "erreur"; erreur: string };
export function planReprise(champ: ChampEcart, d: Delegue, mandats: Mandat[], entree: DelegueCgLink, aujourdhui: string): OperationReprise[];
```

- [ ] **Step 1 : tests**

```ts
import { describe, expect, it } from "vitest";
import { calculerEcarts, planReprise } from "./ecarts";
import type { Delegue, Mandat } from "./types";

const J = "2026-10-13";
const D: Delegue = { id: "d", entreprise_id: "e", cglink_user_id: "u", unite_id: null, prenom: "Jean", nom: "Dupont",
  email: "j@x.be", telephone: "+32 (0) 470 12 34 56", notes: null, a_verifier: null,
  adresse_rue: null, adresse_numero: null, adresse_boite: null, adresse_code_postal: null, adresse_localite: null, adresse_pays: null };
const M = (id: string, organe: Mandat["organe"], qualite: Mandat["qualite"], extra: Partial<Mandat> = {}): Mandat =>
  ({ id, delegue_id: "d", site_id: "s", organe, qualite, libelle: null, fonction: null, debut: "2024-05-13", fin: null, a_verifier: null, ...extra });
const E = { id: "u", name: "Jean Dupont", email: "j@x.be", phone: "0470123456", mandateDs: "Effectif", mandateCe: "Pas de mandat", mandateCppt: "", mandateOther: "" };

describe("calculerEcarts", () => {
  it("rien quand tout concorde (téléphone et casse normalisés)", () => {
    expect(calculerEcarts(D, [M("1", "ds", "effectif")], { ...E, email: "J@X.BE" }, [], J)).toEqual([]);
  });
  it("signale nom, e-mail (non envoyable) et mandat différents", () => {
    const r = calculerEcarts(D, [M("1", "ds", "suppleant")], { ...E, name: "Jean Dupond", email: "autre@x.be" }, [], J);
    expect(r.map((e) => `${e.champ}:${e.ici}->${e.cglink}:${e.envoyable}`)).toEqual([
      "nom:Jean Dupont->Jean Dupond:true", "email:j@x.be->autre@x.be:false", "ds:Suppléant->Effectif:true",
    ]);
  });
  it("ignore un écart dont la valeur CG Link a été ignorée, le remontre si elle change", () => {
    const e = { ...E, name: "Jean Dupond" };
    expect(calculerEcarts(D, [M("1", "ds", "effectif")], e, [{ champ: "nom", valeur: "Jean Dupond" }], J)).toEqual([]);
    expect(calculerEcarts(D, [M("1", "ds", "effectif")], { ...e, name: "J. Dupond" }, [{ champ: "nom", valeur: "Jean Dupond" }], J)).toHaveLength(1);
  });
});

describe("planReprise", () => {
  it("nom et téléphone : mise à jour du délégué", () => {
    expect(planReprise("nom", D, [], { ...E, name: "DUPOND Jean" }, J)).toEqual([{ type: "maj_delegue", valeurs: { prenom: "Jean", nom: "DUPOND" } }]);
    expect(planReprise("telephone", D, [], { ...E, phone: "081649963" }, J)).toEqual([{ type: "maj_delegue", valeurs: { telephone: "+32 (0) 81 64 99 63" } }]);
  });
  it("« Pas de mandat » dans CG Link : termine les mandats en cours (jamais supprimés)", () => {
    expect(planReprise("ds", D, [M("1", "ds", "effectif"), M("2", "ds", "suppleant", { fin: "2025-01-01" })], { ...E, mandateDs: "Pas de mandat" }, J))
      .toEqual([{ type: "terminer", ids: ["1"], fin: J }]);
  });
  it("autre qualité : modifie le mandat en cours, ou en ajoute un", () => {
    expect(planReprise("ds", D, [M("1", "ds", "suppleant")], E, J)).toEqual([{ type: "qualite", id: "1", qualite: "effectif" }]);
    expect(planReprise("ce", D, [], { ...E, mandateCe: "Suppléant" }, J)).toEqual([{ type: "ajouter", mandat: {
      organe: "ce", qualite: "suppleant", libelle: null, fonction: null, debut: J, a_verifier: "Repris de CG Link le 13/10/2026" } }]);
  });
  it("autre : classe le texte, refuse ce qui n'est pas un mandat", () => {
    expect(planReprise("autre", D, [], { ...E, mandateOther: "Comité exécutif" }, J)[0]).toMatchObject({ type: "ajouter", mandat: { organe: "instances_cg", libelle: "Comité exécutif" } });
    expect(planReprise("autre", D, [], { ...E, mandateOther: "O" }, J)).toEqual([{ type: "erreur", erreur: "Le texte de CG Link n'est pas reconnu comme un mandat : ajoutez-le à la main." }]);
  });
});
```

- [ ] **Step 2 : lancer** — Expected : FAIL.

- [ ] **Step 3 : implémenter**

```ts
import { isoToDateFr } from "../dates";
import { formaterTelephone } from "../telephone";
import { versCgLink } from "./cglink";
import { classerAutre, mandatEnCours } from "./mandats";
import { decouperNom } from "./noms";
import type { Delegue, DelegueCgLink, Mandat, Organe, Qualite } from "./types";

/** Écarts entre la carte (Espace CG) et l'entrée CG Link, et ce que « Reprendre » (CG Link → Espace) fait. Pur. */

export type ChampEcart = "nom" | "email" | "telephone" | "ds" | "ce" | "cppt" | "autre";
export type Ecart = { champ: ChampEcart; libelle: string; ici: string; cglink: string; envoyable: boolean };

const LIBELLES: Record<ChampEcart, string> = {
  nom: "Nom", email: "E-mail (adresse de connexion)", telephone: "Téléphone", ds: "Mandat DS", ce: "Mandat CE", cppt: "Mandat CPPT", autre: "Autres mandats",
};
const espaces = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const qualiteCg = (s: string | null | undefined) => {
  const t = espaces(s).toLowerCase();
  return t === "effectif" ? "Effectif" : t.startsWith("suppl") ? "Suppléant" : "Pas de mandat";
};

export function calculerEcarts(d: Delegue, mandats: Mandat[], entree: DelegueCgLink, ignores: { champ: string; valeur: string }[], aujourdhui: string): Ecart[] {
  const ici = versCgLink(d, mandats, aujourdhui);
  const comparaisons: [ChampEcart, string, string, boolean, (a: string, b: string) => boolean][] = [
    ["nom", ici.name, espaces(entree.name), true, (a, b) => a.toLowerCase() === b.toLowerCase()],
    ["email", espaces(d.email), espaces(entree.email), false, (a, b) => a.toLowerCase() === b.toLowerCase()],
    ["telephone", ici.phone, espaces(entree.phone), true, (a, b) => formaterTelephone(a).replace(/\D/g, "") === formaterTelephone(b).replace(/\D/g, "")],
    ["ds", ici.mandateDs, qualiteCg(entree.mandateDs), true, (a, b) => a === b],
    ["ce", ici.mandateCe, qualiteCg(entree.mandateCe), true, (a, b) => a === b],
    ["cppt", ici.mandateCppt, qualiteCg(entree.mandateCppt), true, (a, b) => a === b],
    ["autre", ici.mandateOther, espaces(entree.mandateOther), true, (a, b) => a === b],
  ];
  return comparaisons
    .filter(([champ, a, b, , egal]) => !egal(a, b) && !ignores.some((i) => i.champ === champ && i.valeur === b))
    .map(([champ, a, b, envoyable]) => ({ champ, libelle: LIBELLES[champ], ici: a || "vide", cglink: b || "vide", envoyable }));
}

export type OperationReprise =
  | { type: "maj_delegue"; valeurs: Partial<Delegue> }
  | { type: "terminer"; ids: string[]; fin: string }
  | { type: "qualite"; id: string; qualite: Qualite }
  | { type: "ajouter"; mandat: { organe: Organe; qualite: Qualite | null; libelle: string | null; fonction: string | null; debut: string; a_verifier: string } }
  | { type: "erreur"; erreur: string };

export function planReprise(champ: ChampEcart, d: Delegue, mandats: Mandat[], entree: DelegueCgLink, aujourdhui: string): OperationReprise[] {
  const note = `Repris de CG Link le ${isoToDateFr(aujourdhui)}`;
  if (champ === "nom") {
    const n = decouperNom(entree.name);
    return [{ type: "maj_delegue", valeurs: { prenom: n.prenom, nom: n.nom } }];
  }
  if (champ === "email") return [{ type: "maj_delegue", valeurs: { email: espaces(entree.email).toLowerCase() || null } }];
  if (champ === "telephone") return [{ type: "maj_delegue", valeurs: { telephone: formaterTelephone(entree.phone) || null } }];
  if (champ === "autre") {
    const c = classerAutre(espaces(entree.mandateOther));
    if (c.rejete) return [{ type: "erreur", erreur: "Le texte de CG Link n'est pas reconnu comme un mandat : ajoutez-le à la main." }];
    return [{ type: "ajouter", mandat: { organe: c.mandat.organe, qualite: c.mandat.qualite, libelle: c.mandat.libelle, fonction: c.mandat.fonction, debut: aujourdhui, a_verifier: note } }];
  }
  const enCours = mandats.filter((m) => m.organe === champ && mandatEnCours(m, aujourdhui));
  const cible = qualiteCg(champ === "ds" ? entree.mandateDs : champ === "ce" ? entree.mandateCe : entree.mandateCppt);
  if (cible === "Pas de mandat") return enCours.length ? [{ type: "terminer", ids: enCours.map((m) => m.id), fin: aujourdhui }] : [];
  const qualite: Qualite = cible === "Effectif" ? "effectif" : "suppleant";
  if (enCours.length) return [{ type: "qualite", id: enCours[0].id, qualite }];
  return [{ type: "ajouter", mandat: { organe: champ, qualite, libelle: null, fonction: null, debut: aujourdhui, a_verifier: note } }];
}
```

- [ ] **Step 4 : relancer** — Expected : PASS.

- [ ] **Step 5 : commit** — `git add lib/delegues/ecarts.* && git commit -m "feat(delegues): CG Link gaps and take-back plan"`

---

### Task 3 : Accès CG Link côté serveur

**Files :** Create `lib/delegues/cglink-serveur.ts`

**Interfaces :** Produces
`modifierDelegues(db, companyId, transformer: (ds: DelegueCgLink[]) => DelegueCgLink[] | null): Promise<"ok" | "introuvable" | "conflit" | "erreur">` ;
`companyDuDelegue(db, cglinkId: string): Promise<{ id: string; entree: DelegueCgLink } | null>` ;
`appelerFonctionCgLink(nom: "invite-user" | "cancel-invite", corps: Record<string, unknown>): Promise<{ ok: true; userId: string | null } | { ok: false; erreur: string }>` ;
`synchroniser(db, d: Delegue, mandats: Mandat[]): Promise<{ ok: true } | { ok: false; erreur: string }>`.

- [ ] **Step 1 : implémenter**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "../supabase-server";
import { fusionnerEntree, lireReponseFonction, versCgLink } from "./cglink";
import type { Delegue, DelegueCgLink, Mandat } from "./types";

/**
 * Accès à CG Link. SERVEUR UNIQUEMENT, après vérification du rôle SUPER_ADMIN.
 * `companies.delegates` est un seul champ par entreprise, modifiable en même temps par CG Link : on relit,
 * on modifie seulement l'entrée du délégué, on écrit si `updated_at` n'a pas bougé (3 essais).
 */

export const ERREUR_SYNCHRO = "Enregistré dans l'Espace, mais CG Link n'a pas pu être mis à jour : utilisez « Envoyer à CG Link ».";

export async function modifierDelegues(
  db: SupabaseClient,
  companyId: string,
  transformer: (ds: DelegueCgLink[]) => DelegueCgLink[] | null
): Promise<"ok" | "introuvable" | "conflit" | "erreur"> {
  for (let essai = 0; essai < 3; essai++) {
    const { data, error } = await db.from("companies").select("delegates, updated_at").eq("id", companyId).maybeSingle();
    if (error || !data) return "erreur";
    const suivant = transformer(((data.delegates ?? []) as DelegueCgLink[]));
    if (!suivant) return "introuvable";
    const r = await db.from("companies").update({ delegates: suivant }).eq("id", companyId).eq("updated_at", data.updated_at).select("id");
    if (r.error) {
      console.error("[delegues] écriture CG Link :", r.error.code);
      return "erreur";
    }
    if (r.data?.length) return "ok";
  }
  return "conflit";
}

export async function companyDuDelegue(db: SupabaseClient, cglinkId: string) {
  const { data } = await db.from("companies").select("id, delegates");
  for (const c of (data ?? []) as { id: string; delegates: DelegueCgLink[] | null }[]) {
    const entree = (c.delegates ?? []).find((d) => d.id === cglinkId);
    if (entree) return { id: c.id, entree };
  }
  return null;
}

/** Appel d'une fonction de CG Link avec la session du super admin (CG Link revérifie ses droits). */
export async function appelerFonctionCgLink(nom: "invite-user" | "cancel-invite", corps: Record<string, unknown>) {
  const supabase = await getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false as const, erreur: "Votre session a expiré. Reconnectez-vous puis réessayez." };
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${nom}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const json = await r.json().catch(() => null);
    return lireReponseFonction(r.status, json);
  } catch {
    return { ok: false as const, erreur: "CG Link n'a pas répondu. Réessayez dans un instant." };
  }
}

/** Envoie la carte (nom, téléphone, mandats ; jamais l'e-mail) dans l'entrée CG Link du délégué, + profiles.name. */
export async function synchroniser(db: SupabaseClient, d: Delegue, mandats: Mandat[]) {
  if (!d.cglink_user_id) return { ok: true as const };
  const lieu = await companyDuDelegue(db, d.cglink_user_id);
  if (!lieu) return { ok: false as const, erreur: "Compte CG Link introuvable : retirez le lien ou relancez l'import." };
  const champs = versCgLink(d, mandats, new Date().toISOString().slice(0, 10));
  const r = await modifierDelegues(db, lieu.id, (ds) => fusionnerEntree(ds, d.cglink_user_id!, champs));
  if (r !== "ok") return { ok: false as const, erreur: r === "conflit" ? "CG Link a été modifié en même temps. Réessayez." : ERREUR_SYNCHRO };
  const p = await db.from("profiles").update({ name: champs.name }).eq("id", d.cglink_user_id);
  if (p.error) console.error("[delegues] profil CG Link :", p.error.code);
  return { ok: true as const };
}
```

- [ ] **Step 2 : vérifier** — `npx tsc --noEmit` (hors `.next/`) — 0 erreur.

- [ ] **Step 3 : commit** — `git add lib/delegues/cglink-serveur.ts && git commit -m "feat(delegues): CG Link server access (safe concurrent writes, edge functions)"`

---

### Task 4 : Actions serveur (comptes, entreprise, écarts, synchronisation automatique)

**Files :** Modify `app/espace/delegues/actions.ts` ; Modify `lib/delegues/donnees-serveur.ts` (carte : entrée
CG Link, écarts, ignorés, entreprises au choix ; liste : nombre d'écarts).

**Interfaces :** Produces actions `inviterDelegue(id)`, `renvoyerInvitation(id)`, `annulerInvitation(id)`,
`changerAcces(id, actif: boolean)`, `retirerLienCgLink(id)`, `envoyerVersCgLink(id)`,
`changerEntreprise(id, entrepriseId)`, `reprendreEcart(id, champ: ChampEcart)`, `ignorerEcart(id, champ, valeur)` ;
`CarteDelegue` gagne `ecarts: Ecart[]`, `entreprises: EntrepriseChoix[]`, `ficheLiee: boolean` ;
`LigneDelegue` gagne `ecarts: number`.

- [ ] **Step 1 : synchronisation automatique.** Dans `enregistrerDelegue`, `ajouterMandat`, `enregistrerMandat`,
  `terminerMandat`, `supprimerMandat` : après l'écriture réussie, si `d.cglink_user_id`, relire délégué + mandats
  et appeler `synchroniser` ; si échec, renvoyer `{ ok: true, message: <erreur de synchro> }` (l'Espace est à jour).
  Dans `enregistrerDelegue`, si `d.cglink_user_id` et `"email" in v.valeurs` et différent : refuser
  « L'e-mail est l'adresse de connexion CG Link : il ne se change pas ici. ».

```ts
async function apresModification(c: Ctx, delegueId: string, message: string): Promise<Resultat> {
  const d = await lireDelegue(c, delegueId);
  if (!d?.cglink_user_id) return { ok: true, message };
  const { data: ms } = await c.db.from("site_delegue_mandats").select(COLONNES_MANDAT).eq("delegue_id", delegueId);
  const s = await synchroniser(c.db, d, (ms ?? []) as Mandat[]);
  return s.ok ? { ok: true, message: `${message} CG Link mis à jour.` } : { ok: true, message: s.erreur };
}
```

Remplacer le `return { ok: true, message: "…" }` final de chacune des 5 actions par
`return apresModification(c, <id du délégué>, "…")`.

- [ ] **Step 2 : actions de compte**

```ts
const REDIRECTION_CGLINK = "https://cglink-app.vercel.app/";

export async function inviterDelegue(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  if (d.cglink_user_id) return { ok: false, erreur: "Ce délégué a déjà un compte CG Link." };
  if (!d.email) return { ok: false, erreur: "Indiquez d'abord l'e-mail du délégué." };
  const { data: fiche } = await c.db.from("site_entreprises").select("company_id").eq("id", d.entreprise_id).maybeSingle();
  if (!fiche?.company_id) return { ok: false, erreur: "Reliez d'abord l'entreprise à CG Link (app Entreprises)." };
  const r = await appelerFonctionCgLink("invite-user", {
    email: d.email, name: [d.prenom, d.nom].filter(Boolean).join(" "), role: "DELEGATE", companyId: fiche.company_id, redirectTo: REDIRECTION_CGLINK,
  });
  if (!r.ok) return r;
  if (!r.userId) return { ok: false, erreur: "CG Link n'a pas renvoyé l'identifiant du compte. Vérifiez dans CG Link avant de réessayer." };
  const { error } = await c.db.from("site_delegues").update({ cglink_user_id: r.userId }).eq("id", id);
  if (error) return { ok: false, erreur: "Invitation envoyée, mais le lien n'a pas pu être enregistré ici. Relancez l'import CG Link." };
  await journal(c, "invitation", d);
  return apresModification(c, id, "Invitation envoyée.");
}

export async function renvoyerInvitation(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id || !d.email) return { ok: false, erreur: ECHEC };
  const lieu = await companyDuDelegue(c.db, d.cglink_user_id);
  if (!lieu) return { ok: false, erreur: "Compte CG Link introuvable." };
  const r = await appelerFonctionCgLink("invite-user", {
    email: lieu.entree.email ?? d.email, name: [d.prenom, d.nom].filter(Boolean).join(" "), role: "DELEGATE", companyId: lieu.id, redirectTo: REDIRECTION_CGLINK,
  });
  if (!r.ok) return r;
  await journal(c, "invitation_renvoyee", d);
  return apresModification(c, id, "Invitation renvoyée.");
}

export async function annulerInvitation(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  const lieu = await companyDuDelegue(c.db, d.cglink_user_id);
  if (!lieu) return { ok: false, erreur: "Compte CG Link introuvable." };
  const r = await appelerFonctionCgLink("cancel-invite", { companyId: lieu.id, delegateId: d.cglink_user_id });
  if (!r.ok) return r;
  await c.db.from("site_delegues").update({ cglink_user_id: null }).eq("id", id);
  await journal(c, "invitation_annulee", d);
  rafraichir(id);
  return { ok: true, message: "Invitation annulée : le compte CG Link est supprimé, le délégué reste dans l'Espace." };
}

export async function changerAcces(id: string, actif: boolean): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  const lieu = await companyDuDelegue(c.db, d.cglink_user_id);
  if (!lieu) return { ok: false, erreur: "Compte CG Link introuvable." };
  const r = await modifierDelegues(c.db, lieu.id, (ds) => fusionnerEntree(ds, d.cglink_user_id!, { isActive: actif }));
  if (r !== "ok") return { ok: false, erreur: r === "conflit" ? "CG Link a été modifié en même temps. Réessayez." : ECHEC };
  await journal(c, actif ? "deblocage" : "blocage", d);
  rafraichir(id);
  return { ok: true, message: actif ? "Accès à CG Link rétabli." : "Accès à CG Link bloqué (une session ouverte expire dans l'heure)." };
}

export async function retirerLienCgLink(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  if (await companyDuDelegue(c.db, d.cglink_user_id)) return { ok: false, erreur: "Le compte existe encore dans CG Link : utilisez « Bloquer »." };
  await c.db.from("site_delegues").update({ cglink_user_id: null }).eq("id", id);
  await journal(c, "lien_retire", d);
  rafraichir(id);
  return { ok: true, message: "Lien retiré." };
}

export async function envoyerVersCgLink(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  await journal(c, "envoi_cglink", d);
  rafraichir(id);
  return apresModification(c, id, "Carte envoyée.");
}
```

- [ ] **Step 3 : changer d'entreprise**

```ts
export async function changerEntreprise(id: string, entrepriseId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d || d.entreprise_id === entrepriseId) return { ok: false, erreur: ECHEC };
  const { data: fiche } = await c.db.from("site_entreprises").select("id, company_id").eq("id", entrepriseId).maybeSingle();
  if (!fiche) return { ok: false, erreur: "Choisissez une entreprise." };
  if (d.cglink_user_id) {
    if (!fiche.company_id) return { ok: false, erreur: "Cette entreprise n'est pas reliée à CG Link : le compte du délégué ne peut pas y être déplacé." };
    const lieu = await companyDuDelegue(c.db, d.cglink_user_id);
    if (!lieu) return { ok: false, erreur: "Compte CG Link introuvable." };
    if (lieu.id !== fiche.company_id) {
      // Ajout dans la nouvelle entreprise d'abord, retrait ensuite : en cas d'échec, jamais de compte sans entreprise.
      const ajout = await modifierDelegues(c.db, fiche.company_id, (ds) => [...ds.filter((x) => x.id !== d.cglink_user_id), lieu.entree]);
      if (ajout !== "ok") return { ok: false, erreur: "CG Link n'a pas pu être mis à jour. Rien n'a changé." };
      const retrait = await modifierDelegues(c.db, lieu.id, (ds) => ds.filter((x) => x.id !== d.cglink_user_id));
      const profil = await c.db.from("profiles").update({ company_id: fiche.company_id }).eq("id", d.cglink_user_id);
      if (retrait !== "ok" || profil.error) console.error("[delegues] déplacement CG Link :", retrait, profil.error?.code);
    }
  }
  const { data: principal } = await c.db.from("site_entreprise_sites").select("id").eq("entreprise_id", entrepriseId).eq("principal", true).maybeSingle();
  const jour = new Date().toISOString().slice(0, 10);
  await c.db.from("site_delegue_mandats").update({ site_id: principal?.id ?? null, a_verifier: "Entreprise changée : vérifiez le site du mandat" })
    .eq("delegue_id", id).or(`fin.is.null,fin.gte.${jour}`);
  const { error } = await c.db.from("site_delegues").update({ entreprise_id: entrepriseId, unite_id: null }).eq("id", id);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "changement_entreprise", { id, entreprise_id: entrepriseId }, { avant: d.entreprise_id });
  rafraichir(id);
  return { ok: true, message: "Entreprise changée. Vérifiez le site des mandats en cours." };
}
```

- [ ] **Step 4 : écarts**

```ts
export async function reprendreEcart(id: string, champ: ChampEcart): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  const lieu = await companyDuDelegue(c.db, d.cglink_user_id);
  if (!lieu) return { ok: false, erreur: "Compte CG Link introuvable." };
  const [{ data: ms }, unites, { data: sites }] = await Promise.all([
    c.db.from("site_delegue_mandats").select(COLONNES_MANDAT).eq("delegue_id", id),
    unitesDe(c, d.entreprise_id),
    c.db.from("site_entreprise_sites").select("id, principal").eq("entreprise_id", d.entreprise_id),
  ]);
  const jour = new Date().toISOString().slice(0, 10);
  const ops = planReprise(champ, d, (ms ?? []) as Mandat[], lieu.entree, jour);
  for (const op of ops) {
    if (op.type === "erreur") return { ok: false, erreur: op.erreur };
    const r =
      op.type === "maj_delegue" ? await c.db.from("site_delegues").update(op.valeurs).eq("id", id)
      : op.type === "terminer" ? await c.db.from("site_delegue_mandats").update({ fin: op.fin }).in("id", op.ids)
      : op.type === "qualite" ? await c.db.from("site_delegue_mandats").update({ qualite: op.qualite }).eq("id", op.id)
      : await c.db.from("site_delegue_mandats").insert({ ...op.mandat, delegue_id: id,
          site_id: siteParDefaut(d.unite_id, unites, (sites ?? []) as { id: string; principal: boolean }[]) });
    if (r.error) return { ok: false, erreur: ECHEC };
  }
  await journal(c, "ecart_repris", d, { champ });
  rafraichir(id);
  return { ok: true, message: "Valeur de CG Link reprise." };
}

export async function ignorerEcart(id: string, champ: string, valeur: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  const { error } = await c.db.from("site_ecarts_ignores").upsert(
    { cible: "delegue", cible_id: id, champ, valeur, ignore_par: c.auteur },
    { onConflict: "cible,cible_id,champ,valeur", ignoreDuplicates: true });
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "ecart_ignore", d, { champ });
  rafraichir(id);
  return { ok: true };
}
```

Imports à ajouter : `siteParDefaut` (mandats), `planReprise`, `type ChampEcart` (ecarts), `appelerFonctionCgLink`,
`companyDuDelegue`, `modifierDelegues`, `synchroniser` (cglink-serveur), `fusionnerEntree` (cglink).
`phraseJournal` : ajouter `invitation`, `invitation_renvoyee`, `invitation_annulee`, `blocage`, `deblocage`,
`lien_retire`, `envoi_cglink`, `changement_entreprise`, `ecart_repris`, `ecart_ignore` (avec un test par phrase
dans `delegue.test.ts`).

- [ ] **Step 5 : lectures** — dans `chargerCarte` : `entreeCgLink` (déjà lue via `nomsEntreprises().entrees`),
  `ignores` (`site_ecarts_ignores` cible `delegue`), `ecarts = entree ? calculerEcarts(...) : []`,
  `entreprises` (liste des fiches), `ficheLiee` (`company_id` de la fiche non nul). Dans
  `chargerListeDelegues` : `ecarts` par délégué (même calcul, ignorés lus en une requête).

- [ ] **Step 6 : vérifier** — `npx tsc --noEmit` ; `npx vitest run`.

- [ ] **Step 7 : commit** — `git commit -am "feat(delegues): CG Link account actions, company change, gaps, auto sync"`

---

### Task 5 : Écrans (compte, écarts, entreprise, liste)

**Files :** Create `app/espace/delegues/[id]/PanneauCompte.tsx`, `[id]/PanneauEcarts.tsx` ;
Modify `[id]/page.tsx`, `[id]/PanneauIdentite.tsx`, `liste/ListeDelegues.tsx`.

- [ ] **Step 1 : `PanneauCompte.tsx`** — remplace le panneau en lecture seule : état (puce icône + texte),
  invité le, dernière connexion, et boutons selon l'état :
  sans compte → « Inviter dans CG Link » (désactivé avec raison si pas d'e-mail ou fiche non reliée) ;
  invité → « Renvoyer l'invitation », « Annuler l'invitation » (confirmation : « supprime le compte CG Link ») ;
  actif → « Bloquer l'accès » (confirmation) ; bloqué → « Rétablir l'accès » ;
  introuvable → « Retirer le lien » ; avec compte → « Envoyer à CG Link ».
  Chaque bouton : `BTN` (44 px), `IconeChargement` pendant l'action, message de retour (`role="status"` /
  `role="alert"`), `router.refresh()`.

- [ ] **Step 2 : `PanneauEcarts.tsx`** — affiché seulement s'il y a des écarts : une ligne par écart
  (libellé, « Ici : … », « CG Link : … »), boutons « Reprendre » (CG Link → ici), « Ignorer », et en tête
  « Envoyer ma carte à CG Link » si au moins un écart est `envoyable`. Note sous l'e-mail : « adresse de
  connexion : ne se change que dans CG Link ».

- [ ] **Step 3 : identité** — e-mail en lecture seule (champ retiré du formulaire, affiché avec la note) quand
  le délégué a un compte ; bloc « Changer d'entreprise » (liste des fiches + confirmation « les mandats en
  cours passent au site principal de la nouvelle entreprise, à vérifier »).

- [ ] **Step 4 : liste** — filtre « Écarts avec CG Link » (case), pastille « N écart(s) » sur la ligne.

- [ ] **Step 5 : vérifier** — `npx tsc --noEmit` ; `npm run build`.

- [ ] **Step 6 : commit** — `git add app/espace/delegues && git commit -m "feat(delegues): CG Link account panel, gaps panel, company change"`

---

### Task 6 : Documentation et contrôles

- [ ] `docs/contexte/delegues.md` : section « Écritures vers CG Link (plan 2b) » (décisions ci-dessus, actions,
  écarts, synchronisation automatique) ; `CLAUDE.md` état actuel ; `docs/contexte/journal.md`.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] Liste de vérification pour Fred, **avec un délégué de test sur une adresse secondaire** : inviter (e-mail
  CG Link reçu, code), se connecter à CG Link, modifier son téléphone et un mandat dans l'Espace → visibles dans
  CG Link ; bloquer → connexion refusée ; rétablir ; annuler une invitation non acceptée ; modifier le
  téléphone dans CG Link → écart dans l'Espace → « Reprendre » ; changer d'entreprise (compte déplacé) ;
  vérifier qu'un délégué ne peut pas changer son propre `company_id` (correctif Cursor).

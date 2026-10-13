# App « Gestion délégués CG Link » (plan 2a : import, cartes, mandats) : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** livrer l'app `delegues` de l'Espace CG, réservée aux SUPER_ADMIN : import des 176 délégués de
CG Link et de leurs mandats, liste, carte d'identité (avec unité d'établissement de rattachement), mandats,
écran « À vérifier », journal. Aucune écriture vers CG Link (plan 2b).

**Architecture :** règles pures dans `lib/delegues/` (découpage des noms, classement des mandats, plan
d'import, état du compte, validation, phrases du journal), testées avec Vitest. Lectures et écritures
côté serveur en **service_role** (les tables délégués n'ont aucune politique d'écriture), toujours après
`exigerSuperAdmin()` / `estSuperAdmin()`. Écrans dans `app/espace/delegues/`, styles et briques de l'Espace.

**Tech Stack :** Next.js 16 (App Router, actions serveur), Supabase (`@supabase/supabase-js`, API admin
Auth), Tailwind 3 + styles `ecg-…`, `lucide-react`, Vitest.

**Spec :** [docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md](../specs/2026-10-12-entreprises-delegues-design.md),
sections 5, 7.1, **7.1 bis** (ajouts du 13/10/2026), 7.2, 9, 10.

## Global Constraints

- **Accès : SUPER_ADMIN uniquement, vérifié par le rôle** (`profiles.role`), en plus de `site_a_app('delegues')`.
- Écritures dans `site_delegues`, `site_delegue_mandats`, `site_journal_delegues` : **service_role seulement**,
  après vérification du rôle. Chaque modification écrit une ligne de journal.
- **Rien n'est écrit dans CG Link** (`companies`, `profiles`, Auth) dans ce plan : lecture seule.
- Dates affichées `jj/mm/aaaa`, saisies en champ texte (`formatDateFr` / `dateFrToIso`), jamais
  `<input type="date">` ; début des mandats importés : **13/05/2024** (`2024-05-13`).
- Unité de rattachement : choisie parmi les unités **suivies** et **actives** de la fiche du délégué.
- Données personnelles : aucun nom, e-mail ou téléphone de délégué dans les tests ni dans les journaux
  serveur (`console.error` : codes d'erreur seulement).
- Français, phrases courtes ; erreurs : ce qui s'est passé + quoi faire ; icônes `lucide-react`, jamais la
  couleur seule ; cibles ≥ 44 px ; `IconeChargement` pour toute attente.
- Composants client : n'importent de `lib/` que des fichiers purs (`import type` permis).
- Code de l'app : `delegues` ; couleur `#CC79A7` ; icône `id-card`.
- Branche `suivi-actions` ; commits fréquents ; rien n'est poussé sans l'accord de Fred.

## Review Focus

1. **Relancer l'import** après des corrections faites à la main : on attend qu'aucun délégué déjà importé
   ne soit recréé ni écrasé. Test « ne recrée pas un délégué déjà importé » de `planImport` (tâche 4) ;
   insertion avec `cglink_user_id` unique et `ignoreDuplicates` (tâche 6).
2. **Délégué présent dans deux entreprises CG Link** (MARLUX + REMACLE) : on attend un seul délégué, dans
   l'entreprise de son profil, marqué « à vérifier » avec l'autre nom. Test dédié (tâche 4).
3. **Délégué d'une entreprise regroupée** (XLG HOME → TRIXXO) : on attend qu'il soit importé dans la fiche
   TRIXXO. Test dédié (tâche 4).
4. **Mandat DS / CE / CPPT sans qualité, ou « Autre » sans libellé, ou fin avant début** : on attend un
   message clair et rien d'enregistré (la base refuserait aussi). Tests de `validerMandat` (tâche 3).
5. **Unité de rattachement d'une autre entreprise ou non suivie** (requête forgée) : on attend un refus.
   Test de `uniteAutorisee` (tâche 3) et contrôle dans l'action (tâche 8).

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261013100000_site_delegues_unite.sql` | `site_delegues.unite_id`, app `delegues` activée |
| `lib/delegues/noms.ts` (+ test) | `decouperNom()` |
| `lib/delegues/mandats.ts` (+ test) | Organes, libellés, `classerAutre()`, `importerMandats()`, `validerMandat()`, `siteParDefaut()`, `mandatEnCours()`, `libelleMandat()` |
| `lib/delegues/delegue.ts` (+ test) | `validerDelegue()`, `uniteAutorisee()`, `etatCompte()`, `phraseJournal()` |
| `lib/delegues/import.ts` (+ test) | `planImport()` (pur) |
| `lib/delegues/types.ts` | Types partagés (aucune dépendance) |
| `lib/delegues/donnees-serveur.ts` | Lectures (liste, carte, à vérifier, journal) |
| `lib/delegues/import-serveur.ts` | Exécution de l'import |
| `lib/espace/acces.ts` | + `estSuperAdmin()`, `exigerSuperAdmin()` |
| `app/espace/_partage/ChampsEdition.tsx` | Déplacé depuis `entreprises/[cle]/` (réutilisé par les deux apps) |
| `app/espace/delegues/manifeste.ts`, `layout.tsx`, `page.tsx`, `CLAUDE.md` | Squelette |
| `app/espace/delegues/actions.ts` | Actions serveur |
| `app/espace/delegues/liste/…`, `nouveau/…`, `[id]/…`, `a-verifier/…`, `import/…`, `journal/…` | Écrans |
| `lib/entreprises/regles.ts`, `app/espace/entreprises/[cle]/PanneauSites.tsx` | `libelleMandat` déplacé dans `lib/delegues/mandats.ts` |
| `docs/contexte/delegues.md`, `CLAUDE.md`, `app/espace/CLAUDE.md`, `docs/contexte/base-de-donnees.md` | Documentation |

---

### Task 1 : Migration (unité de rattachement, activation de l'app)

**Files :** Create `supabase/migrations/20261013100000_site_delegues_unite.sql`

- [ ] **Step 1 : écrire la migration**

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- Gestion délégués CG Link (plan 2a) : unité d'établissement de rattachement, activation de l'app.
-- Demande de Fred du 13/10/2026. Idempotente : peut être rejouée.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.site_delegues
  add column if not exists unite_id uuid references public.site_entreprise_unites(id) on delete set null;
comment on column public.site_delegues.unite_id is
  'Unité d''établissement de rattachement (une unité suivie et active de la fiche du délégué).';
create index if not exists site_delegues_unite_idx on public.site_delegues (unite_id);

-- L'app apparaît dès que son dossier existe ; réservée aux SUPER_ADMIN par le code (aucun rôle par défaut).
update public.site_apps set actif = true where code = 'delegues' and not actif;
```

- [ ] **Step 2 : faire exécuter** — Fred colle le fichier dans Supabase › SQL Editor (l'outil MCP n'est pas
  disponible). Vérifier ensuite en lecture (service_role) :
  `GET /rest/v1/site_delegues?select=unite_id&limit=0` → 200 ; `site_apps?code=eq.delegues` → `actif: true`.

- [ ] **Step 3 : commit**

```bash
git add supabase/migrations/20261013100000_site_delegues_unite.sql
git commit -m "feat(db): delegate establishment unit and delegates app activation"
```

---

### Task 2 : Découpage des noms

**Files :** Create `lib/delegues/noms.ts`, Test `lib/delegues/noms.test.ts`

**Interfaces :** Produces `export type NomDecoupe = { prenom: string | null; nom: string; aVerifier: string | null }` ;
`export function decouperNom(brut: string | null | undefined): NomDecoupe` ; `export const A_VERIFIER_NOM: string`.

- [ ] **Step 1 : tests**

```ts
import { describe, expect, it } from "vitest";
import { A_VERIFIER_NOM, decouperNom } from "./noms";

describe("decouperNom", () => {
  it("« Prénom Nom » : rien à vérifier (167 cas sur 176)", () => {
    expect(decouperNom("Jean Dupont")).toEqual({ prenom: "Jean", nom: "Dupont", aVerifier: null });
  });
  it("le mot en majuscules est le nom, quelle que soit sa place", () => {
    expect(decouperNom("DUPONT Jean")).toEqual({ prenom: "Jean", nom: "DUPONT", aVerifier: null });
    expect(decouperNom("Jean DUPONT")).toEqual({ prenom: "Jean", nom: "DUPONT", aVerifier: null });
  });
  it("3 mots ou plus : premier mot = prénom, à vérifier", () => {
    expect(decouperNom("Marie Claire Van Damme")).toEqual({ prenom: "Marie", nom: "Claire Van Damme", aVerifier: A_VERIFIER_NOM });
    expect(decouperNom("Jean VAN DAMME")).toEqual({ prenom: "Jean", nom: "VAN DAMME", aVerifier: A_VERIFIER_NOM });
  });
  it("un seul mot ou rien", () => {
    expect(decouperNom("Dupont")).toEqual({ prenom: null, nom: "Dupont", aVerifier: A_VERIFIER_NOM });
    expect(decouperNom("   ")).toEqual({ prenom: null, nom: "Sans nom", aVerifier: "Nom absent dans CG Link" });
    expect(decouperNom(null).nom).toBe("Sans nom");
  });
  it("ignore les espaces en trop", () => {
    expect(decouperNom("  Jean   Dupont ")).toEqual({ prenom: "Jean", nom: "Dupont", aVerifier: null });
  });
});
```

- [ ] **Step 2 : lancer** — `npx vitest run lib/delegues/noms.test.ts` — Expected : FAIL (module absent).

- [ ] **Step 3 : implémenter**

```ts
/** Découpage du nom unique de CG Link (« Prénom Nom ») en prénom et nom. Pur. */

export type NomDecoupe = { prenom: string | null; nom: string; aVerifier: string | null };
export const A_VERIFIER_NOM = "Découpage prénom / nom à confirmer";

const MAJUSCULES = /^[A-ZÀ-ÖØ-Ý'’-]{2,}$/;

export function decouperNom(brut: string | null | undefined): NomDecoupe {
  const mots = (brut ?? "").trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return { prenom: null, nom: "Sans nom", aVerifier: "Nom absent dans CG Link" };
  if (mots.length === 1) return { prenom: null, nom: mots[0], aVerifier: A_VERIFIER_NOM };
  const aVerifier = mots.length === 2 ? null : A_VERIFIER_NOM;
  const enMajuscules = mots.filter((m) => MAJUSCULES.test(m));
  if (enMajuscules.length > 0 && enMajuscules.length < mots.length) {
    return { prenom: mots.filter((m) => !MAJUSCULES.test(m)).join(" "), nom: enMajuscules.join(" "), aVerifier };
  }
  return { prenom: mots[0], nom: mots.slice(1).join(" "), aVerifier };
}
```

- [ ] **Step 4 : relancer** — Expected : PASS.

- [ ] **Step 5 : commit** — `git add lib/delegues/noms.* && git commit -m "feat(delegues): split CG Link names into first and last name"`

---

### Task 3 : Mandats et délégué (règles pures)

**Files :** Create `lib/delegues/types.ts`, `lib/delegues/mandats.ts`, `lib/delegues/delegue.ts` ;
Test `lib/delegues/mandats.test.ts`, `lib/delegues/delegue.test.ts`

**Interfaces :** Produces (`lib/delegues/types.ts`) :

```ts
export const ORGANES = ["ds", "ce", "cppt", "cee", "instances_cg", "autre"] as const;
export type Organe = (typeof ORGANES)[number];
export type Qualite = "effectif" | "suppleant";
export type Mandat = { id: string; delegue_id: string; site_id: string | null; organe: Organe; qualite: Qualite | null;
  libelle: string | null; fonction: string | null; debut: string | null; fin: string | null; a_verifier: string | null };
export type Delegue = { id: string; entreprise_id: string; cglink_user_id: string | null; unite_id: string | null;
  prenom: string | null; nom: string; email: string | null; telephone: string | null; notes: string | null; a_verifier: string | null };
export type DelegueCgLink = { id: string; name?: string | null; email?: string | null; phone?: string | null;
  isActive?: boolean; invitedAt?: number; mandateDs?: string | null; mandateCe?: string | null; mandateCppt?: string | null; mandateOther?: string | null };
export type EtatCompte = "actif" | "invite" | "bloque" | "sans_compte" | "introuvable";
export const COLONNES_DELEGUE = "id, entreprise_id, cglink_user_id, unite_id, prenom, nom, email, telephone, notes, a_verifier";
export const COLONNES_MANDAT = "id, delegue_id, site_id, organe, qualite, libelle, fonction, debut, fin, a_verifier";
```

Produces (`lib/delegues/mandats.ts`) :
`LIBELLES_ORGANES: Record<Organe, string>` ; `type MandatImport = { organe; qualite; libelle; fonction; a_verifier }` ;
`classerAutre(texte: string): { rejete: true } | { rejete: false; mandat: MandatImport }` ;
`importerMandats(d: DelegueCgLink): { mandats: MandatImport[]; rejetes: string[] }` ;
`libelleMandat(m: Pick<Mandat, "organe" | "qualite" | "libelle" | "fonction">): string` ;
`mandatEnCours(m: Pick<Mandat, "fin">, aujourdhui: string): boolean` ;
`validerMandat(champs: Record<string, string>): { ok: true; valeurs: Omit<Mandat, "id" | "delegue_id" | "a_verifier"> } | { ok: false; erreur: string }` ;
`siteParDefaut(uniteId: string | null, unites: { id: string; site_id: string | null }[], sites: { id: string; principal: boolean }[]): string | null`.

Produces (`lib/delegues/delegue.ts`) :
`validerDelegue(champs: Record<string, string>): { ok: true; valeurs: Partial<Pick<Delegue, "prenom"|"nom"|"email"|"telephone"|"notes"|"unite_id">> } | { ok: false; erreur: string }` ;
`uniteAutorisee(uniteId: string | null, entrepriseId: string, unites: { id: string; entreprise_id: string; statut: string; suivie: boolean }[]): boolean` ;
`etatCompte(cglinkId: string | null, entree: DelegueCgLink | undefined, derniereConnexion: string | null | undefined): EtatCompte` ;
`LIBELLES_COMPTE: Record<EtatCompte, string>` ; `phraseJournal(action: string, details: Record<string, unknown>): string`.

- [ ] **Step 1 : écrire `lib/delegues/types.ts`** (bloc ci-dessus, en-tête « Types de l'app Gestion
  délégués CG Link. Aucune dépendance. »).

- [ ] **Step 2 : tests des mandats** (`lib/delegues/mandats.test.ts`). Les textes « Autre » reprennent les
  20 valeurs réelles relevées le 12/10/2026, **sauf** le numéro de téléphone et le prénom, remplacés par des
  équivalents fictifs.

```ts
import { describe, expect, it } from "vitest";
import { classerAutre, importerMandats, libelleMandat, mandatEnCours, siteParDefaut, validerMandat } from "./mandats";

const organe = (t: string) => {
  const c = classerAutre(t);
  return c.rejete ? "rejete" : `${c.mandat.organe}${c.mandat.qualite ? ":" + c.mandat.qualite : ""}${c.mandat.fonction ? ":" + c.mandat.fonction : ""}`;
};

describe("classerAutre (textes réels de CG Link)", () => {
  it.each([
    ["CE Européen", "cee"],
    ["CE EUROPE", "cee"],
    ["Européen", "cee"],
    ["Effectif Cee", "cee:effectif"],
    ["CE europeen suppleant", "cee:suppleant"],
    ["Suppléant europe", "cee:suppleant"],
    ["Tresorier CEE Eiffage", "cee:Trésorier"],
    ["Comitè  exècutif", "instances_cg"],
    ["Comité Ecécutif CGNalux", "instances_cg"],
    ["Comité exécutif CG", "instances_cg"],
    ["Comité Exécutif, Comité Régional", "instances_cg"],
    ["Vérificateur aux comptes C.G Namur lux", "instances_cg"],
    ["Vice secrétaire bureau des femmes du Luxembourg/ membre du comité exécutif Namur-Luxembourg", "instances_cg"],
    ["Délégué CE", "ce:effectif"],
    ["Secrétaire CE", "ce:effectif:Secrétaire"],
    ["Délégué Permanent Wust", "autre"],
    ["O", "rejete"],
    ["32470000000", "rejete"],
    ["marc andre", "rejete"],
  ])("%s → %s", (texte, attendu) => {
    expect(organe(texte)).toBe(attendu);
  });
  it("garde le texte d'origine en libellé (Instances, Autre) et dans la note à vérifier", () => {
    const c = classerAutre("Délégué Permanent Wust");
    expect(c.rejete).toBe(false);
    if (!c.rejete) {
      expect(c.mandat.libelle).toBe("Délégué Permanent Wust");
      expect(c.mandat.a_verifier).toBe('Repris de « Autre » dans CG Link : "Délégué Permanent Wust"');
    }
  });
});

describe("importerMandats", () => {
  it("range DS, CE, CPPT directement et ignore « Pas de mandat »", () => {
    const r = importerMandats({ id: "u", mandateDs: "Effectif", mandateCe: "Suppléant", mandateCppt: "Pas de mandat", mandateOther: "" });
    expect(r.mandats.map((m) => `${m.organe}:${m.qualite}`)).toEqual(["ds:effectif", "ce:suppleant"]);
    expect(r.mandats.every((m) => m.a_verifier === null)).toBe(true);
    expect(r.rejetes).toEqual([]);
  });
  it("fusionne « Secrétaire CE » dans le mandat CE existant", () => {
    const r = importerMandats({ id: "u", mandateCe: "Effectif", mandateOther: "Secrétaire CE" });
    expect(r.mandats).toHaveLength(1);
    expect(r.mandats[0]).toMatchObject({ organe: "ce", qualite: "effectif", fonction: "Secrétaire" });
    expect(r.mandats[0].a_verifier).toContain("Secrétaire CE");
  });
  it("liste les textes non importés", () => {
    expect(importerMandats({ id: "u", mandateOther: "O" }).rejetes).toEqual(["O"]);
  });
  it("sans aucun champ : aucun mandat", () => {
    expect(importerMandats({ id: "u" })).toEqual({ mandats: [], rejetes: [] });
  });
});

describe("libelleMandat et mandatEnCours", () => {
  it("compose un libellé court", () => {
    expect(libelleMandat({ organe: "ds", qualite: "effectif", libelle: null, fonction: null })).toBe("DS eff.");
    expect(libelleMandat({ organe: "cppt", qualite: "suppleant", libelle: null, fonction: "Secrétaire" })).toBe("CPPT supp. (Secrétaire)");
    expect(libelleMandat({ organe: "instances_cg", qualite: null, libelle: "Comité exécutif", fonction: null })).toBe("Comité exécutif");
    expect(libelleMandat({ organe: "cee", qualite: null, libelle: null, fonction: null })).toBe("CEE");
  });
  it("un mandat sans fin ou finissant aujourd'hui ou plus tard est en cours", () => {
    expect(mandatEnCours({ fin: null }, "2026-10-13")).toBe(true);
    expect(mandatEnCours({ fin: "2026-10-13" }, "2026-10-13")).toBe(true);
    expect(mandatEnCours({ fin: "2026-10-12" }, "2026-10-13")).toBe(false);
  });
});

describe("validerMandat", () => {
  const base = { organe: "ds", qualite: "effectif", libelle: "", fonction: "", site_id: "s1", debut: "13/05/2024", fin: "" };
  it("accepte un mandat complet et convertit les dates", () => {
    expect(validerMandat(base)).toEqual({ ok: true, valeurs: { organe: "ds", qualite: "effectif", libelle: null, fonction: null, site_id: "s1", debut: "2024-05-13", fin: null } });
  });
  it("exige la qualité pour DS, CE, CPPT", () => {
    expect(validerMandat({ ...base, qualite: "" })).toEqual({ ok: false, erreur: "Choisissez effectif ou suppléant." });
  });
  it("exige un libellé pour Autre et Instances CG", () => {
    expect(validerMandat({ ...base, organe: "autre", qualite: "" })).toEqual({ ok: false, erreur: "Précisez le mandat (libellé)." });
  });
  it("refuse un organe inconnu, une date invalide, une fin avant le début", () => {
    expect(validerMandat({ ...base, organe: "xx" }).ok).toBe(false);
    expect(validerMandat({ ...base, debut: "31/02/2024" })).toEqual({ ok: false, erreur: "Date invalide. Format attendu : jj/mm/aaaa" });
    expect(validerMandat({ ...base, fin: "01/01/2024" })).toEqual({ ok: false, erreur: "La fin du mandat ne peut pas précéder son début." });
  });
});

describe("siteParDefaut", () => {
  const sites = [{ id: "p", principal: true }, { id: "s2", principal: false }];
  it("prend le site de l'unité de rattachement", () => {
    expect(siteParDefaut("u1", [{ id: "u1", site_id: "s2" }], sites)).toBe("s2");
  });
  it("sinon le site principal", () => {
    expect(siteParDefaut(null, [], sites)).toBe("p");
    expect(siteParDefaut("u1", [{ id: "u1", site_id: null }], sites)).toBe("p");
    expect(siteParDefaut(null, [], [])).toBeNull();
  });
});
```

- [ ] **Step 3 : tests du délégué** (`lib/delegues/delegue.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { etatCompte, phraseJournal, uniteAutorisee, validerDelegue } from "./delegue";

describe("validerDelegue", () => {
  it("exige le nom", () => {
    expect(validerDelegue({ nom: "  " })).toEqual({ ok: false, erreur: "Indiquez le nom du délégué." });
  });
  it("vérifie l'e-mail et vide les champs blancs", () => {
    expect(validerDelegue({ nom: "Dupont", email: "pas-un-mail" })).toEqual({ ok: false, erreur: "Adresse e-mail invalide. Exemple : prenom.nom@exemple.be" });
    expect(validerDelegue({ nom: "Dupont", prenom: " ", email: "A@B.BE", unite_id: "" })).toEqual({
      ok: true, valeurs: { nom: "Dupont", prenom: null, email: "a@b.be", unite_id: null },
    });
  });
});

describe("uniteAutorisee", () => {
  const unites = [
    { id: "u1", entreprise_id: "e1", statut: "actif", suivie: true },
    { id: "u2", entreprise_id: "e1", statut: "actif", suivie: false },
    { id: "u3", entreprise_id: "e2", statut: "actif", suivie: true },
    { id: "u4", entreprise_id: "e1", statut: "arrete", suivie: true },
  ];
  it("accepte une unité suivie et active de la même entreprise, ou aucune", () => {
    expect(uniteAutorisee("u1", "e1", unites)).toBe(true);
    expect(uniteAutorisee(null, "e1", unites)).toBe(true);
  });
  it("refuse une unité non suivie, arrêtée, d'une autre entreprise ou inconnue", () => {
    expect(uniteAutorisee("u2", "e1", unites)).toBe(false);
    expect(uniteAutorisee("u4", "e1", unites)).toBe(false);
    expect(uniteAutorisee("u3", "e1", unites)).toBe(false);
    expect(uniteAutorisee("zz", "e1", unites)).toBe(false);
  });
});

describe("etatCompte", () => {
  it("distingue les états", () => {
    expect(etatCompte(null, undefined, null)).toBe("sans_compte");
    expect(etatCompte("u", undefined, null)).toBe("introuvable");
    expect(etatCompte("u", { id: "u", isActive: false }, "2026-01-01")).toBe("bloque");
    expect(etatCompte("u", { id: "u", isActive: true }, null)).toBe("invite");
    expect(etatCompte("u", { id: "u" }, "2026-01-01T10:00:00Z")).toBe("actif");
  });
});

describe("phraseJournal", () => {
  it("écrit une phrase lisible", () => {
    expect(phraseJournal("import", { crees: 3, mandats: 5, rejetes: 1 })).toBe("Import depuis CG Link : 3 délégués, 5 mandats, 1 texte non importé.");
    expect(phraseJournal("mandat_ajout", { mandat: "DS eff." })).toBe("Mandat ajouté : DS eff.");
    expect(phraseJournal("inconnue", {})).toBe("inconnue");
  });
});
```

- [ ] **Step 4 : lancer** — `npx vitest run lib/delegues` — Expected : FAIL (modules absents).

- [ ] **Step 5 : implémenter `lib/delegues/mandats.ts`**

```ts
import { dateFrToIso } from "../dates";
import { ORGANES, type DelegueCgLink, type Mandat, type Organe, type Qualite } from "./types";

/** Règles des mandats (pures). */

export const LIBELLES_ORGANES: Record<Organe, string> = {
  ds: "DS", ce: "CE", cppt: "CPPT", cee: "CEE", instances_cg: "Instances CG", autre: "Autre",
};

export type MandatImport = { organe: Organe; qualite: Qualite | null; libelle: string | null; fonction: string | null; a_verifier: string | null };

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const FONCTIONS: [RegExp, string][] = [
  [/tresorier/, "Trésorier"], [/vice[- ]secretaire/, "Vice-secrétaire"], [/secretaire/, "Secrétaire"],
  [/vice[- ]president/, "Vice-président"], [/president/, "Président"],
];
const MOTS_SYNDICAUX = /delegu|mandat|sipp|conseill|cppt|\bds\b|\bce\b|europ|cee|comit|executif|verificat|bureau|regional|permanent|secretaire|tresorier|president/;

function fonctionDe(t: string): string | null {
  return FONCTIONS.find(([re]) => re.test(t))?.[1] ?? null;
}
function qualiteDe(t: string): Qualite | null {
  if (/suppl/.test(t)) return "suppleant";
  if (/effectif/.test(t)) return "effectif";
  return null;
}

/** Texte libre « Autre » de CG Link → mandat structuré, ou rejeté (numéro, prénom, lettre isolée). */
export function classerAutre(texte: string): { rejete: true } | { rejete: false; mandat: MandatImport } {
  const brut = texte.replace(/\s+/g, " ").trim();
  const t = sansAccents(brut.toLowerCase());
  const note = `Repris de « Autre » dans CG Link : "${brut}"`;
  if ((t.match(/[a-z]/g) ?? []).length < 3) return { rejete: true };
  if (/europ|\bcee\b/.test(t)) {
    return { rejete: false, mandat: { organe: "cee", qualite: qualiteDe(t), libelle: null, fonction: fonctionDe(t), a_verifier: note } };
  }
  if (/comit|ex[eé]cutif|ececutif|verificat|bureau des femmes|regional/.test(t)) {
    return { rejete: false, mandat: { organe: "instances_cg", qualite: null, libelle: brut, fonction: null, a_verifier: note } };
  }
  if (/\bce\b/.test(t)) {
    return { rejete: false, mandat: { organe: "ce", qualite: qualiteDe(t) ?? "effectif", libelle: null, fonction: fonctionDe(t), a_verifier: note } };
  }
  if (!MOTS_SYNDICAUX.test(t) && brut === brut.toLowerCase()) return { rejete: true };
  return { rejete: false, mandat: { organe: "autre", qualite: null, libelle: brut, fonction: null, a_verifier: note } };
}

function qualiteCgLink(v: string | null | undefined): Qualite | null {
  const t = sansAccents((v ?? "").trim().toLowerCase());
  if (t === "effectif") return "effectif";
  if (t.startsWith("suppl")) return "suppleant";
  return null;
}

export function importerMandats(d: DelegueCgLink): { mandats: MandatImport[]; rejetes: string[] } {
  const mandats: MandatImport[] = [];
  for (const [organe, valeur] of [["ds", d.mandateDs], ["ce", d.mandateCe], ["cppt", d.mandateCppt]] as const) {
    const qualite = qualiteCgLink(valeur);
    if (qualite) mandats.push({ organe, qualite, libelle: null, fonction: null, a_verifier: null });
  }
  const rejetes: string[] = [];
  const autre = (d.mandateOther ?? "").trim();
  if (autre) {
    const c = classerAutre(autre);
    if (c.rejete) rejetes.push(autre);
    else {
      const ce = c.mandat.organe === "ce" ? mandats.find((m) => m.organe === "ce") : undefined;
      if (ce) {
        ce.fonction = c.mandat.fonction;
        ce.a_verifier = c.mandat.a_verifier;
      } else mandats.push(c.mandat);
    }
  }
  return { mandats, rejetes };
}

export function libelleMandat(m: Pick<Mandat, "organe" | "qualite" | "libelle" | "fonction">): string {
  const q = m.qualite === "effectif" ? " eff." : m.qualite === "suppleant" ? " supp." : "";
  const base = (m.organe === "autre" || m.organe === "instances_cg") && m.libelle ? m.libelle : `${LIBELLES_ORGANES[m.organe]}${q}`;
  return m.fonction ? `${base} (${m.fonction})` : base;
}

export function mandatEnCours(m: Pick<Mandat, "fin">, aujourdhui: string): boolean {
  return !m.fin || m.fin >= aujourdhui;
}

const texte = (v: string | undefined) => (v ?? "").trim() || null;

export function validerMandat(champs: Record<string, string>):
  | { ok: true; valeurs: Omit<Mandat, "id" | "delegue_id" | "a_verifier"> }
  | { ok: false; erreur: string } {
  const organe = champs.organe as Organe;
  if (!(ORGANES as readonly string[]).includes(organe)) return { ok: false, erreur: "Choisissez un organe." };
  const qualite = texte(champs.qualite);
  if (qualite !== null && qualite !== "effectif" && qualite !== "suppleant") return { ok: false, erreur: "Qualité inconnue." };
  if (["ds", "ce", "cppt"].includes(organe) && !qualite) return { ok: false, erreur: "Choisissez effectif ou suppléant." };
  const libelle = texte(champs.libelle);
  if ((organe === "autre" || organe === "instances_cg") && !libelle) return { ok: false, erreur: "Précisez le mandat (libellé)." };
  const dates: Record<"debut" | "fin", string | null> = { debut: null, fin: null };
  for (const k of ["debut", "fin"] as const) {
    const v = texte(champs[k]);
    if (!v) continue;
    const iso = dateFrToIso(v);
    if (!iso) return { ok: false, erreur: "Date invalide. Format attendu : jj/mm/aaaa" };
    dates[k] = iso;
  }
  if (dates.debut && dates.fin && dates.fin < dates.debut) return { ok: false, erreur: "La fin du mandat ne peut pas précéder son début." };
  return {
    ok: true,
    valeurs: { organe, qualite: qualite as Qualite | null, libelle, fonction: texte(champs.fonction), site_id: texte(champs.site_id), debut: dates.debut, fin: dates.fin },
  };
}

export function siteParDefaut(
  uniteId: string | null,
  unites: { id: string; site_id: string | null }[],
  sites: { id: string; principal: boolean }[]
): string | null {
  const siteUnite = uniteId ? unites.find((u) => u.id === uniteId)?.site_id : null;
  if (siteUnite && sites.some((s) => s.id === siteUnite)) return siteUnite;
  return sites.find((s) => s.principal)?.id ?? null;
}
```

- [ ] **Step 6 : implémenter `lib/delegues/delegue.ts`**

```ts
import type { Delegue, DelegueCgLink, EtatCompte } from "./types";

/** Règles du délégué : validation, unité de rattachement, état du compte CG Link, phrases du journal. Pur. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHAMPS = ["prenom", "nom", "email", "telephone", "notes", "unite_id"] as const;

export function validerDelegue(champs: Record<string, string>):
  | { ok: true; valeurs: Partial<Pick<Delegue, (typeof CHAMPS)[number]>> }
  | { ok: false; erreur: string } {
  const valeurs: Record<string, string | null> = {};
  for (const k of CHAMPS) {
    if (!(k in champs)) continue;
    let v: string | null = (champs[k] ?? "").trim() || null;
    if (k === "email" && v) {
      v = v.toLowerCase();
      if (!EMAIL.test(v)) return { ok: false, erreur: "Adresse e-mail invalide. Exemple : prenom.nom@exemple.be" };
    }
    valeurs[k] = v;
  }
  if ("nom" in valeurs && !valeurs.nom) return { ok: false, erreur: "Indiquez le nom du délégué." };
  return { ok: true, valeurs };
}

export function uniteAutorisee(
  uniteId: string | null,
  entrepriseId: string,
  unites: { id: string; entreprise_id: string; statut: string; suivie: boolean }[]
): boolean {
  if (!uniteId) return true;
  const u = unites.find((x) => x.id === uniteId);
  return Boolean(u && u.entreprise_id === entrepriseId && u.statut === "actif" && u.suivie);
}

export const LIBELLES_COMPTE: Record<EtatCompte, string> = {
  actif: "Compte actif", invite: "Invité, jamais connecté", bloque: "Accès bloqué", sans_compte: "Sans compte CG Link",
  introuvable: "Compte CG Link introuvable",
};

export function etatCompte(cglinkId: string | null, entree: DelegueCgLink | undefined, derniereConnexion: string | null | undefined): EtatCompte {
  if (!cglinkId) return "sans_compte";
  if (!entree) return "introuvable";
  if (entree.isActive === false) return "bloque";
  return derniereConnexion ? "actif" : "invite";
}

const pluriel = (n: number, s: string, p = `${s}s`) => `${n} ${n > 1 ? p : s}`;

export function phraseJournal(action: string, d: Record<string, unknown>): string {
  const n = (k: string) => Number(d[k] ?? 0);
  switch (action) {
    case "import":
      return `Import depuis CG Link : ${pluriel(n("crees"), "délégué")}, ${pluriel(n("mandats"), "mandat")}, ${pluriel(n("rejetes"), "texte non importé", "textes non importés")}.`;
    case "creation": return "Délégué créé.";
    case "modification": return "Identité modifiée.";
    case "suppression": return "Délégué supprimé.";
    case "verification": return "Vérification confirmée.";
    case "mandat_ajout": return `Mandat ajouté : ${d.mandat ?? ""}`;
    case "mandat_modification": return `Mandat modifié : ${d.mandat ?? ""}`;
    case "mandat_fin": return `Mandat terminé : ${d.mandat ?? ""}`;
    case "mandat_suppression": return `Mandat supprimé : ${d.mandat ?? ""}`;
    default: return action;
  }
}
```

- [ ] **Step 7 : relancer** — `npx vitest run lib/delegues` — Expected : PASS. Si un texte réel est mal classé,
  corriger l'expression régulière (pas le test).

- [ ] **Step 8 : commit** — `git add lib/delegues && git commit -m "feat(delegues): mandate rules, validation, account state, journal phrases"`

---

### Task 4 : Plan d'import (pur)

**Files :** Create `lib/delegues/import.ts`, Test `lib/delegues/import.test.ts`

**Interfaces :**
- Consumes : `decouperNom` (tâche 2), `importerMandats` (tâche 3), types (tâche 3).
- Produces :

```ts
export const DEBUT_MANDATS_IMPORTES = "2024-05-13";
export type CompanyImport = { id: string; name: string; delegates: DelegueCgLink[] };
export type FicheImport = { id: string; company_id: string | null; autres_company_ids: string[]; site_principal_id: string | null };
export type DelegueACreer = { entreprise_id: string; cglink_user_id: string; prenom: string | null; nom: string; email: string | null;
  telephone: string | null; a_verifier: string | null; mandats: (MandatImport & { site_id: string | null; debut: string })[] };
export type PlanImport = { delegues: DelegueACreer[]; dejaPresents: number; rejetes: { entreprise: string; texte: string }[]; sansFiche: string[] };
export function planImport(e: { companies: CompanyImport[]; fiches: FicheImport[]; dejaImportes: Set<string>; companyDuProfil: Map<string, string> }): PlanImport;
```

- [ ] **Step 1 : tests**

```ts
import { describe, expect, it } from "vitest";
import { DEBUT_MANDATS_IMPORTES, planImport, type CompanyImport, type FicheImport } from "./import";

const d = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: "Jean Dupont", email: `${id}@exemple.be`, phone: "", ...extra });
const fiches: FicheImport[] = [
  { id: "fA", company_id: "A", autres_company_ids: ["X"], site_principal_id: "sA" },
  { id: "fB", company_id: "B", autres_company_ids: [], site_principal_id: "sB" },
];

describe("planImport", () => {
  it("crée les délégués avec leurs mandats au site principal, début 13/05/2024", () => {
    const companies: CompanyImport[] = [{ id: "A", name: "ACME", delegates: [d("u1", { mandateDs: "Effectif", phone: "0470 00 00 00" })] }];
    const p = planImport({ companies, fiches, dejaImportes: new Set(), companyDuProfil: new Map() });
    expect(p.delegues).toHaveLength(1);
    expect(p.delegues[0]).toMatchObject({ entreprise_id: "fA", cglink_user_id: "u1", prenom: "Jean", nom: "Dupont", telephone: "0470 00 00 00", a_verifier: null });
    expect(p.delegues[0].mandats).toEqual([
      { organe: "ds", qualite: "effectif", libelle: null, fonction: null, a_verifier: null, site_id: "sA", debut: DEBUT_MANDATS_IMPORTES },
    ]);
  });
  it("importe le délégué d'une entreprise regroupée dans la fiche qui la regroupe (XLG HOME → TRIXXO)", () => {
    const p = planImport({ companies: [{ id: "X", name: "XLG", delegates: [d("u2")] }], fiches, dejaImportes: new Set(), companyDuProfil: new Map() });
    expect(p.delegues[0].entreprise_id).toBe("fA");
  });
  it("ne recrée pas un délégué déjà importé", () => {
    const p = planImport({ companies: [{ id: "A", name: "ACME", delegates: [d("u1")] }], fiches, dejaImportes: new Set(["u1"]), companyDuProfil: new Map() });
    expect(p.delegues).toEqual([]);
    expect(p.dejaPresents).toBe(1);
  });
  it("délégué dans deux entreprises : celle du profil, marqué à vérifier avec l'autre nom", () => {
    const companies: CompanyImport[] = [
      { id: "A", name: "MARLUX", delegates: [d("u3")] },
      { id: "B", name: "REMACLE", delegates: [d("u3")] },
    ];
    const p = planImport({ companies, fiches, dejaImportes: new Set(), companyDuProfil: new Map([["u3", "B"]]) });
    expect(p.delegues).toHaveLength(1);
    expect(p.delegues[0].entreprise_id).toBe("fB");
    expect(p.delegues[0].a_verifier).toBe("Aussi listé chez MARLUX dans CG Link");
  });
  it("cumule la note du nom et celle des deux entreprises", () => {
    const companies: CompanyImport[] = [
      { id: "A", name: "MARLUX", delegates: [d("u4", { name: "Marie Claire Van Damme" })] },
      { id: "B", name: "REMACLE", delegates: [d("u4", { name: "Marie Claire Van Damme" })] },
    ];
    const p = planImport({ companies, fiches, dejaImportes: new Set(), companyDuProfil: new Map() });
    expect(p.delegues[0].entreprise_id).toBe("fA");
    expect(p.delegues[0].a_verifier).toBe("Découpage prénom / nom à confirmer ; Aussi listé chez REMACLE dans CG Link");
  });
  it("signale les entreprises sans fiche et les textes non importés", () => {
    const p = planImport({
      companies: [{ id: "Z", name: "INCONNUE", delegates: [d("u5")] }, { id: "B", name: "REMACLE", delegates: [d("u6", { mandateOther: "O" })] }],
      fiches, dejaImportes: new Set(), companyDuProfil: new Map(),
    });
    expect(p.sansFiche).toEqual(["INCONNUE"]);
    expect(p.rejetes).toEqual([{ entreprise: "REMACLE", texte: "O" }]);
    expect(p.delegues.map((x) => x.cglink_user_id)).toEqual(["u6"]);
  });
});
```

- [ ] **Step 2 : lancer** — Expected : FAIL.

- [ ] **Step 3 : implémenter**

```ts
import { decouperNom } from "./noms";
import { importerMandats, type MandatImport } from "./mandats";
import type { DelegueCgLink } from "./types";

/** Plan d'import des délégués de CG Link (pur) : qui créer, dans quelle fiche, avec quels mandats. */

export const DEBUT_MANDATS_IMPORTES = "2024-05-13"; // premier jour des élections sociales 2024

export type CompanyImport = { id: string; name: string; delegates: DelegueCgLink[] };
export type FicheImport = { id: string; company_id: string | null; autres_company_ids: string[]; site_principal_id: string | null };
export type DelegueACreer = {
  entreprise_id: string; cglink_user_id: string; prenom: string | null; nom: string; email: string | null;
  telephone: string | null; a_verifier: string | null; mandats: (MandatImport & { site_id: string | null; debut: string })[];
};
export type PlanImport = { delegues: DelegueACreer[]; dejaPresents: number; rejetes: { entreprise: string; texte: string }[]; sansFiche: string[] };

export function planImport(e: {
  companies: CompanyImport[];
  fiches: FicheImport[];
  dejaImportes: Set<string>;
  companyDuProfil: Map<string, string>;
}): PlanImport {
  const ficheDe = (companyId: string) =>
    e.fiches.find((f) => f.company_id === companyId) ?? e.fiches.find((f) => f.autres_company_ids.includes(companyId));

  // Un délégué (même identifiant de compte) peut figurer dans plusieurs entreprises.
  const occurrences = new Map<string, { company: CompanyImport; d: DelegueCgLink }[]>();
  for (const c of e.companies) for (const d of c.delegates ?? []) {
    if (!d?.id) continue;
    occurrences.set(d.id, [...(occurrences.get(d.id) ?? []), { company: c, d }]);
  }

  const plan: PlanImport = { delegues: [], dejaPresents: 0, rejetes: [], sansFiche: [] };
  const sansFiche = new Set<string>();
  for (const [id, occ] of occurrences) {
    if (e.dejaImportes.has(id)) {
      plan.dejaPresents++;
      continue;
    }
    const choisie = occ.find((o) => o.company.id === e.companyDuProfil.get(id)) ?? occ[0];
    const fiche = ficheDe(choisie.company.id);
    if (!fiche) {
      sansFiche.add(choisie.company.name);
      continue;
    }
    const nom = decouperNom(choisie.d.name);
    const { mandats, rejetes } = importerMandats(choisie.d);
    for (const texte of rejetes) plan.rejetes.push({ entreprise: choisie.company.name, texte });
    const autres = occ.filter((o) => o !== choisie).map((o) => o.company.name);
    const notes = [nom.aVerifier, autres.length ? `Aussi listé chez ${autres.join(", ")} dans CG Link` : null].filter(Boolean);
    plan.delegues.push({
      entreprise_id: fiche.id,
      cglink_user_id: id,
      prenom: nom.prenom,
      nom: nom.nom,
      email: choisie.d.email?.trim().toLowerCase() || null,
      telephone: choisie.d.phone?.trim() || null,
      a_verifier: notes.length ? notes.join(" ; ") : null,
      mandats: mandats.map((m) => ({ ...m, site_id: fiche.site_principal_id, debut: DEBUT_MANDATS_IMPORTES })),
    });
  }
  plan.sansFiche = [...sansFiche];
  return plan;
}
```

- [ ] **Step 4 : relancer** — Expected : PASS.

- [ ] **Step 5 : commit** — `git add lib/delegues/import.* && git commit -m "feat(delegues): pure import plan from CG Link"`

---

### Task 5 : Accès super admin et formulaire partagé

**Files :** Modify `lib/espace/acces.ts` ; Move `app/espace/entreprises/[cle]/ChampsEdition.tsx` →
`app/espace/_partage/ChampsEdition.tsx` (mettre à jour ses imports relatifs et ceux des panneaux Entreprises
et de `nouvelle/FormulaireNouvelle.tsx`) ; Move `libelleMandat` : `PanneauSites.tsx` importe celui de
`lib/delegues/mandats.ts` (supprimer sa copie locale et `ORGANES`).

**Interfaces :** Produces `estSuperAdmin(): Promise<boolean>` ; `exigerSuperAdmin(): Promise<User>`.

- [ ] **Step 1 : ajouter à `lib/espace/acces.ts`**

```ts
/** Réservé au SUPER_ADMIN par le rôle (app « Gestion délégués CG Link »), quelle que soit l'app donnée. */
export async function estSuperAdmin(): Promise<boolean> {
  return (await monProfil())?.role === "SUPER_ADMIN";
}

export async function exigerSuperAdmin(): Promise<User> {
  const user = await utilisateurConnecte();
  if (!user) redirect("/login?next=/espace");
  if (!(await estSuperAdmin())) redirect("/espace/sans-acces?app=delegues");
  return user;
}
```

- [ ] **Step 2 : déplacer `ChampsEdition.tsx`** avec `git mv`, corriger ses imports (`../../../../lib/dates` →
  `../../../lib/dates`, `../../../Chargement` → `../../Chargement`, `../../_partage/ui` → `./ui`), puis
  remplacer dans les fichiers de `app/espace/entreprises/` les imports `./ChampsEdition` /
  `../[cle]/ChampsEdition` par le bon chemin vers `_partage/ChampsEdition`.

- [ ] **Step 3 : `PanneauSites.tsx`** : supprimer `ORGANES` et `libelleMandat` locaux,
  `import { libelleMandat } from "../../../../lib/delegues/mandats";`. Le type `MandatAffiche` de
  `lib/entreprises/types.ts` passe `organe` en `Organe` (`import type { Organe } from "../delegues/types"`).

- [ ] **Step 4 : vérifier** — `npx tsc --noEmit` (0 erreur) ; `npx vitest run` (tout vert).

- [ ] **Step 5 : commit** — `git commit -am "refactor(espace): shared ChampsEdition, super admin guard, shared mandate label"` (ajouter les fichiers déplacés).

---

### Task 6 : Lectures et import côté serveur

**Files :** Create `lib/delegues/donnees-serveur.ts`, `lib/delegues/import-serveur.ts`

**Interfaces :**
- Consumes : `getSupabaseService`, `tousLesComptes` (`lib/espace/equipe-serveur.ts`), `planImport` (tâche 4),
  `etatCompte`, `mandatEnCours`, `libelleMandat`, types (tâche 3), `nomAffiche` (`lib/entreprises/regles.ts`).
- Produces :

```ts
// donnees-serveur.ts
export type LigneDelegue = { id: string; prenom: string | null; nom: string; entrepriseId: string; entrepriseNom: string;
  mandats: string[]; organes: Organe[]; compte: EtatCompte; aVerifier: boolean };
export type EntrepriseChoix = { id: string; nom: string };
export async function chargerListeDelegues(): Promise<{ ok: true; lignes: LigneDelegue[]; entreprises: EntrepriseChoix[] } | { ok: false; erreur: string }>;
export type CarteDelegue = { delegue: Delegue; entrepriseNom: string; mandats: Mandat[];
  sites: { id: string; nom: string; principal: boolean }[];
  unites: { id: string; site_id: string | null; libelle: string }[];   // suivies et actives
  compte: { etat: EtatCompte; invitedAt: number | null; derniereConnexion: string | null };
  journal: { id: string; created_at: string; phrase: string }[] };
export async function chargerCarte(id: string): Promise<CarteDelegue | null>;
export async function chargerAVerifier(): Promise<{ delegues: { id: string; nom: string; entreprise: string; raison: string }[];
  mandats: { id: string; delegueId: string; delegue: string; mandat: string; raison: string }[] }>;
export async function chargerJournal(page: number): Promise<{ lignes: { id: string; created_at: string; phrase: string; delegue: string | null; auteur: string | null }[]; total: number }>;
// import-serveur.ts
export type RapportImport = { crees: number; mandats: number; dejaPresents: number; rejetes: { entreprise: string; texte: string }[]; sansFiche: string[]; erreurs: number };
export async function executerImport(auteurId: string): Promise<RapportImport | null>;
```

- [ ] **Step 1 : `lib/delegues/import-serveur.ts`**

```ts
import { getSupabaseService } from "../supabase-service";
import { planImport, type CompanyImport, type FicheImport } from "./import";

/** Import des délégués de CG Link. SERVEUR UNIQUEMENT, après vérification du rôle SUPER_ADMIN. */

export type RapportImport = {
  crees: number; mandats: number; dejaPresents: number;
  rejetes: { entreprise: string; texte: string }[]; sansFiche: string[]; erreurs: number;
};

export async function executerImport(auteurId: string): Promise<RapportImport | null> {
  const db = getSupabaseService();
  if (!db) return null;
  const [companies, fiches, sites, deja] = await Promise.all([
    db.from("companies").select("id, name, delegates"),
    db.from("site_entreprises").select("id, company_id, autres_company_ids"),
    db.from("site_entreprise_sites").select("id, entreprise_id").eq("principal", true),
    db.from("site_delegues").select("cglink_user_id").not("cglink_user_id", "is", null),
  ]);
  if (companies.error || fiches.error || sites.error || deja.error) {
    console.error("[delegues] import, lecture :", companies.error?.code ?? fiches.error?.code ?? sites.error?.code ?? deja.error?.code);
    return null;
  }
  const principal = new Map(((sites.data ?? []) as { id: string; entreprise_id: string }[]).map((s) => [s.entreprise_id, s.id]));
  const listeCompanies = (companies.data ?? []) as CompanyImport[];
  // Profils CG Link des délégués présents dans plusieurs entreprises (pour choisir la bonne).
  const compte = new Map<string, number>();
  for (const c of listeCompanies) for (const d of c.delegates ?? []) compte.set(d.id, (compte.get(d.id) ?? 0) + 1);
  const multiples = [...compte].filter(([, n]) => n > 1).map(([id]) => id);
  const profils = multiples.length ? await db.from("profiles").select("id, company_id").in("id", multiples) : { data: [] };
  const plan = planImport({
    companies: listeCompanies,
    fiches: ((fiches.data ?? []) as Omit<FicheImport, "site_principal_id">[]).map((f) => ({ ...f, autres_company_ids: f.autres_company_ids ?? [], site_principal_id: principal.get(f.id) ?? null })),
    dejaImportes: new Set(((deja.data ?? []) as { cglink_user_id: string }[]).map((r) => r.cglink_user_id)),
    companyDuProfil: new Map(((profils.data ?? []) as { id: string; company_id: string | null }[]).filter((p) => p.company_id).map((p) => [p.id, p.company_id as string])),
  });

  const rapport: RapportImport = { crees: 0, mandats: 0, dejaPresents: plan.dejaPresents, rejetes: plan.rejetes, sansFiche: plan.sansFiche, erreurs: 0 };
  for (const d of plan.delegues) {
    const { mandats, ...delegue } = d;
    // ignoreDuplicates : un import lancé deux fois en même temps ne crée pas de doublon.
    const { data, error } = await db.from("site_delegues").upsert(delegue, { onConflict: "cglink_user_id", ignoreDuplicates: true }).select("id");
    if (error) {
      console.error("[delegues] import, délégué :", error.code);
      rapport.erreurs++;
      continue;
    }
    const id = (data ?? [])[0]?.id as string | undefined;
    if (!id) {
      rapport.dejaPresents++;
      continue;
    }
    rapport.crees++;
    if (mandats.length) {
      const r = await db.from("site_delegue_mandats").insert(mandats.map((m) => ({ ...m, delegue_id: id })));
      if (r.error) {
        console.error("[delegues] import, mandats :", r.error.code);
        rapport.erreurs++;
      } else rapport.mandats += mandats.length;
    }
  }
  await db.from("site_journal_delegues").insert({
    auteur_id: auteurId, action: "import",
    details: { crees: rapport.crees, mandats: rapport.mandats, rejetes: rapport.rejetes.length, deja: rapport.dejaPresents, erreurs: rapport.erreurs },
  });
  return rapport;
}
```

- [ ] **Step 2 : `lib/delegues/donnees-serveur.ts`**

```ts
import { getSupabaseService } from "../supabase-service";
import { tousLesComptes } from "../espace/equipe-serveur";
import { nomAffiche } from "../entreprises/regles";
import { etatCompte, phraseJournal } from "./delegue";
import { libelleMandat, mandatEnCours } from "./mandats";
import { COLONNES_DELEGUE, COLONNES_MANDAT, type Delegue, type DelegueCgLink, type EtatCompte, type Mandat, type Organe } from "./types";

/** Lectures de l'app Gestion délégués CG Link. SERVEUR UNIQUEMENT, service_role, après exigerSuperAdmin(). */

export type LigneDelegue = { id: string; prenom: string | null; nom: string; entrepriseId: string; entrepriseNom: string;
  mandats: string[]; organes: Organe[]; compte: EtatCompte; aVerifier: boolean };
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
  return { noms, entrees };
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
  const [{ data: delegues, error }, { data: mandats }, { noms, entrees }, cnx] = await Promise.all([
    db.from("site_delegues").select(COLONNES_DELEGUE).order("nom"),
    db.from("site_delegue_mandats").select(COLONNES_MANDAT),
    nomsEntreprises(),
    connexions(),
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
};

export async function chargerCarte(id: string): Promise<CarteDelegue | null> {
  const db = getSupabaseService();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: d } = await db.from("site_delegues").select(COLONNES_DELEGUE).eq("id", id).maybeSingle();
  if (!d) return null;
  const delegue = d as Delegue;
  const [{ data: mandats }, { data: sites }, { data: unites }, { data: journal }, { noms, entrees }, cnx] = await Promise.all([
    db.from("site_delegue_mandats").select(COLONNES_MANDAT).eq("delegue_id", id).order("fin", { nullsFirst: true }).order("organe"),
    db.from("site_entreprise_sites").select("id, nom, principal").eq("entreprise_id", delegue.entreprise_id).order("principal", { ascending: false }).order("nom"),
    db.from("site_entreprise_unites").select("id, site_id, rue, numero, localite").eq("entreprise_id", delegue.entreprise_id).eq("statut", "actif").eq("suivie", true).order("localite"),
    db.from("site_journal_delegues").select("id, created_at, action, details").eq("delegue_id", id).order("created_at", { ascending: false }).limit(20),
    nomsEntreprises(),
    delegue.cglink_user_id ? connexions() : Promise.resolve(new Map<string, string | null>()),
  ]);
  const entree = delegue.cglink_user_id ? entrees.get(delegue.cglink_user_id) : undefined;
  const derniereConnexion = delegue.cglink_user_id ? cnx.get(delegue.cglink_user_id) ?? null : null;
  return {
    delegue,
    entrepriseNom: noms.get(delegue.entreprise_id) ?? "",
    mandats: (mandats ?? []) as Mandat[],
    sites: (sites ?? []) as CarteDelegue["sites"],
    unites: ((unites ?? []) as { id: string; site_id: string | null; rue: string | null; numero: string | null; localite: string | null }[])
      .map((u) => ({ id: u.id, site_id: u.site_id, libelle: [u.rue, u.numero, u.localite && `— ${u.localite}`].filter(Boolean).join(" ") })),
    compte: { etat: etatCompte(delegue.cglink_user_id, entree, derniereConnexion), invitedAt: entree?.invitedAt ?? null, derniereConnexion },
    journal: ((journal ?? []) as { id: string; created_at: string; action: string; details: Record<string, unknown> }[])
      .map((j) => ({ id: j.id, created_at: j.created_at, phrase: phraseJournal(j.action, j.details ?? {}) })),
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
    mandats: ((ms ?? []) as (Mandat & { delegue: { prenom: string | null; nom: string } | null })[])
      .map((m) => ({ id: m.id, delegueId: m.delegue_id, delegue: nomDe(m.delegue), mandat: libelleMandat(m), raison: m.a_verifier ?? "" })),
  };
}

export async function chargerJournal(page: number) {
  const db = getSupabaseService()!;
  const parPage = 50;
  const { data, count } = await db.from("site_journal_delegues")
    .select("id, created_at, action, details, auteur_id, delegue:site_delegues(prenom, nom)", { count: "exact" })
    .order("created_at", { ascending: false }).range(page * parPage, page * parPage + parPage - 1);
  const lignes = ((data ?? []) as unknown as { id: string; created_at: string; action: string; details: Record<string, unknown>; auteur_id: string | null; delegue: { prenom: string | null; nom: string } | null }[]);
  const auteurs = [...new Set(lignes.map((l) => l.auteur_id).filter((x): x is string => Boolean(x)))];
  const { data: profils } = auteurs.length ? await db.from("profiles").select("id, name").in("id", auteurs) : { data: [] };
  const nomAuteur = new Map(((profils ?? []) as { id: string; name: string | null }[]).map((p) => [p.id, p.name]));
  return {
    total: count ?? 0,
    lignes: lignes.map((l) => ({
      id: l.id, created_at: l.created_at, phrase: phraseJournal(l.action, l.details ?? {}),
      delegue: l.delegue ? [l.delegue.prenom, l.delegue.nom].filter(Boolean).join(" ") : null,
      auteur: l.auteur_id ? nomAuteur.get(l.auteur_id) ?? null : null,
    })),
  };
}
```

Note : `site_journal_delegues.delegue_id` n'a pas de clé étrangère (le journal survit à la suppression) ;
la jointure `delegue:site_delegues(...)` exige une relation. **Si PostgREST la refuse** (erreur PGRST200),
remplacer la jointure par une seconde requête `site_delegues?id=in.(…)` comme pour les auteurs, et noter
la décision au registre.

- [ ] **Step 3 : vérifier** — `npx tsc --noEmit` — 0 erreur.

- [ ] **Step 4 : commit** — `git add lib/delegues && git commit -m "feat(delegues): server reads and CG Link import"`

---

### Task 7 : Squelette de l'app

**Files :** Create `app/espace/delegues/manifeste.ts`, `layout.tsx`, `page.tsx`, `CLAUDE.md` ;
Modify `app/espace/_noyau/registre.ts`.

- [ ] **Step 1 : manifeste**

```ts
import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseService } from "../../../lib/supabase-service";

/** App « Gestion délégués CG Link » : délégués, mandats, import CG Link. SUPER_ADMIN uniquement (layout). */
export const manifeste: ManifesteApp = {
  code: "delegues",
  sections: [
    { chemin: "liste", libelle: "Délégués", icone: "id-card", aussi: ["^/espace/delegues/[0-9a-f-]{36}"] },
    { chemin: "nouveau", libelle: "Nouveau délégué", icone: "plus" },
    { chemin: "a-verifier", libelle: "À vérifier", icone: "flag" },
    { chemin: "import", libelle: "Import CG Link", icone: "upload" },
    { chemin: "journal", libelle: "Journal", icone: "history" },
  ],
  badge: async () => {
    const db = getSupabaseService();
    if (!db) return null;
    const [{ count: d }, { count: m }] = await Promise.all([
      db.from("site_delegues").select("id", { count: "exact", head: true }).not("a_verifier", "is", null),
      db.from("site_delegue_mandats").select("id", { count: "exact", head: true }).not("a_verifier", "is", null),
    ]);
    const n = (d ?? 0) + (m ?? 0);
    return n > 0 ? `${n} à vérifier` : null;
  },
};
```

- [ ] **Step 2 : layout (rôle + app), page, renvoi**

```tsx
// layout.tsx
import GardeApp from "../_noyau/GardeApp";
import SansAcces from "../_noyau/SansAcces";
import { estSuperAdmin } from "../../../lib/espace/acces";

/** Réservée au SUPER_ADMIN par le rôle : donner l'app à un autre compte n'ouvre rien. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await estSuperAdmin())) return <SansAcces nomApp="Gestion délégués CG Link" />;
  return <GardeApp code="delegues">{children}</GardeApp>;
}
```

```tsx
// page.tsx
import { redirect } from "next/navigation";
import { routeSection } from "../_noyau/types";
import { manifeste } from "./manifeste";

export default function Page() {
  redirect(routeSection(manifeste.code, manifeste.sections[0].chemin));
}
```

`CLAUDE.md` : « Contexte : [docs/contexte/delegues.md](../../../docs/contexte/delegues.md). Spec section 7. »

Registre : `import { manifeste as delegues } from "../delegues/manifeste";` et
`MANIFESTES = [actions, scanNews, demarches, entreprises, delegues, parametres]`.

- [ ] **Step 3 : vérifier** — `npx tsc --noEmit`.

- [ ] **Step 4 : commit** — `git add app/espace/delegues app/espace/_noyau/registre.ts && git commit -m "feat(delegues): app skeleton, super admin only"`

---

### Task 8 : Actions serveur

**Files :** Create `app/espace/delegues/actions.ts`

**Interfaces :**
- Consumes : `estSuperAdmin`, `utilisateurConnecte` (`lib/espace/acces.ts`), `getSupabaseService`,
  `validerDelegue`, `uniteAutorisee`, `validerMandat`, `siteParDefaut`, `libelleMandat`, `executerImport`.
- Produces (toutes `async`) : `type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string }` ;
  `lancerImport(): Resultat<RapportImport>` ; `creerDelegue(champs: Record<string,string>): Resultat<{ id: string }>`
  (champs + `entreprise_id`) ; `enregistrerDelegue(id, champs): Resultat` ; `supprimerDelegue(id): Resultat` ;
  `ajouterMandat(delegueId, champs): Resultat` ; `enregistrerMandat(mandatId, champs): Resultat` ;
  `terminerMandat(mandatId, finFr: string): Resultat` ; `supprimerMandat(mandatId): Resultat` ;
  `confirmerDelegue(id): Resultat` ; `confirmerMandat(mandatId): Resultat`.

- [ ] **Step 1 : implémenter**

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estSuperAdmin, utilisateurConnecte } from "../../../lib/espace/acces";
import { getSupabaseService } from "../../../lib/supabase-service";
import { dateFrToIso } from "../../../lib/dates";
import { uniteAutorisee, validerDelegue } from "../../../lib/delegues/delegue";
import { libelleMandat, siteParDefaut, validerMandat } from "../../../lib/delegues/mandats";
import { executerImport, type RapportImport } from "../../../lib/delegues/import-serveur";
import { COLONNES_DELEGUE, COLONNES_MANDAT, type Delegue, type Mandat } from "../../../lib/delegues/types";

/**
 * Écritures de l'app Gestion délégués CG Link : rôle SUPER_ADMIN revérifié à chaque action, puis service_role
 * (les tables délégués n'ont aucune politique d'écriture). Chaque modification écrit une ligne de journal.
 * Rien n'est écrit dans CG Link (plan 2b).
 */

export type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string };
type Ctx = { db: SupabaseClient; auteur: string };

const REFUS = "Accès refusé. Reconnectez-vous.";
const ECHEC = "Enregistrement impossible. Rechargez la page puis réessayez.";

async function ctx(): Promise<Ctx | null> {
  const user = await utilisateurConnecte();
  const db = getSupabaseService();
  return user && db && (await estSuperAdmin()) ? { db, auteur: user.id } : null;
}

function rafraichir(delegueId?: string) {
  revalidatePath("/espace/delegues/liste");
  revalidatePath("/espace/delegues/a-verifier");
  revalidatePath("/espace/delegues/journal");
  if (delegueId) revalidatePath(`/espace/delegues/${delegueId}`);
}

async function journal(c: Ctx, action: string, delegue: Pick<Delegue, "id" | "entreprise_id"> | null, details: Record<string, unknown> = {}) {
  const { error } = await c.db.from("site_journal_delegues").insert({
    auteur_id: c.auteur, delegue_id: delegue?.id ?? null, entreprise_id: delegue?.entreprise_id ?? null, action, details,
  });
  if (error) console.error("[delegues] journal :", error.code);
}

async function lireDelegue(c: Ctx, id: string): Promise<Delegue | null> {
  const { data } = await c.db.from("site_delegues").select(COLONNES_DELEGUE).eq("id", id).maybeSingle();
  return (data as Delegue | null) ?? null;
}

async function unitesDe(c: Ctx, entrepriseId: string) {
  const { data } = await c.db.from("site_entreprise_unites").select("id, entreprise_id, statut, suivie, site_id").eq("entreprise_id", entrepriseId);
  return (data ?? []) as { id: string; entreprise_id: string; statut: string; suivie: boolean; site_id: string | null }[];
}

export async function lancerImport(): Promise<Resultat<RapportImport>> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const r = await executerImport(c.auteur);
  if (!r) return { ok: false, erreur: "L'import n'a pas pu lire CG Link. Réessayez dans un instant." };
  rafraichir();
  return { ok: true, donnees: r };
}

export async function creerDelegue(champs: Record<string, string>): Promise<Resultat<{ id: string }>> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const v = validerDelegue({ nom: "", ...champs });
  if (!v.ok) return v;
  const entrepriseId = (champs.entreprise_id ?? "").trim();
  const { data: fiche } = await c.db.from("site_entreprises").select("id").eq("id", entrepriseId).maybeSingle();
  if (!fiche) return { ok: false, erreur: "Choisissez l'entreprise du délégué." };
  if (!uniteAutorisee(v.valeurs.unite_id ?? null, entrepriseId, await unitesDe(c, entrepriseId))) {
    return { ok: false, erreur: "Cette unité n'est pas une unité suivie de l'entreprise." };
  }
  const { data, error } = await c.db.from("site_delegues").insert({ ...v.valeurs, entreprise_id: entrepriseId }).select("id").single();
  if (error || !data) return { ok: false, erreur: ECHEC };
  await journal(c, "creation", { id: data.id as string, entreprise_id: entrepriseId });
  rafraichir();
  return { ok: true, donnees: { id: data.id as string } };
}

export async function enregistrerDelegue(id: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  const v = validerDelegue(champs);
  if (!v.ok) return v;
  if ("unite_id" in v.valeurs && !uniteAutorisee(v.valeurs.unite_id ?? null, d.entreprise_id, await unitesDe(c, d.entreprise_id))) {
    return { ok: false, erreur: "Cette unité n'est pas une unité suivie de l'entreprise." };
  }
  const { error } = await c.db.from("site_delegues").update(v.valeurs).eq("id", id);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "modification", d, { champs: Object.keys(v.valeurs) });
  rafraichir(id);
  return { ok: true, message: "Modifications enregistrées." };
}

export async function supprimerDelegue(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  if (d.cglink_user_id) return { ok: false, erreur: "Ce délégué a un compte CG Link : il ne se supprime pas ici." };
  const { error } = await c.db.from("site_delegues").delete().eq("id", id);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "suppression", { id: d.id, entreprise_id: d.entreprise_id }, { nom: [d.prenom, d.nom].filter(Boolean).join(" ") });
  rafraichir();
  return { ok: true, message: "Délégué supprimé." };
}

export async function ajouterMandat(delegueId: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, delegueId);
  if (!d) return { ok: false, erreur: ECHEC };
  const v = validerMandat(champs);
  if (!v.ok) return v;
  const [unites, { data: sites }] = await Promise.all([
    unitesDe(c, d.entreprise_id),
    c.db.from("site_entreprise_sites").select("id, principal").eq("entreprise_id", d.entreprise_id),
  ]);
  const listeSites = (sites ?? []) as { id: string; principal: boolean }[];
  const siteId = v.valeurs.site_id ?? siteParDefaut(d.unite_id, unites, listeSites);
  if (siteId && !listeSites.some((s) => s.id === siteId)) return { ok: false, erreur: "Ce site n'appartient pas à l'entreprise du délégué." };
  const { error } = await c.db.from("site_delegue_mandats").insert({ ...v.valeurs, site_id: siteId, delegue_id: delegueId });
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "mandat_ajout", d, { mandat: libelleMandat(v.valeurs) });
  rafraichir(delegueId);
  return { ok: true, message: "Mandat ajouté." };
}

async function lireMandat(c: Ctx, id: string) {
  const { data } = await c.db.from("site_delegue_mandats").select(COLONNES_MANDAT).eq("id", id).maybeSingle();
  if (!data) return null;
  const m = data as Mandat;
  const d = await lireDelegue(c, m.delegue_id);
  return d ? { m, d } : null;
}

export async function enregistrerMandat(mandatId: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const lu = await lireMandat(c, mandatId);
  if (!lu) return { ok: false, erreur: ECHEC };
  const v = validerMandat(champs);
  if (!v.ok) return v;
  if (v.valeurs.site_id) {
    const { data: s } = await c.db.from("site_entreprise_sites").select("id").eq("id", v.valeurs.site_id).eq("entreprise_id", lu.d.entreprise_id).maybeSingle();
    if (!s) return { ok: false, erreur: "Ce site n'appartient pas à l'entreprise du délégué." };
  }
  const { error } = await c.db.from("site_delegue_mandats").update(v.valeurs).eq("id", mandatId);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "mandat_modification", lu.d, { mandat: libelleMandat(v.valeurs) });
  rafraichir(lu.d.id);
  return { ok: true, message: "Mandat enregistré." };
}

export async function terminerMandat(mandatId: string, finFr: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const lu = await lireMandat(c, mandatId);
  if (!lu) return { ok: false, erreur: ECHEC };
  const fin = dateFrToIso(finFr.trim());
  if (!fin) return { ok: false, erreur: "Date invalide. Format attendu : jj/mm/aaaa" };
  if (lu.m.debut && fin < lu.m.debut) return { ok: false, erreur: "La fin du mandat ne peut pas précéder son début." };
  const { error } = await c.db.from("site_delegue_mandats").update({ fin }).eq("id", mandatId);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "mandat_fin", lu.d, { mandat: libelleMandat(lu.m), fin });
  rafraichir(lu.d.id);
  return { ok: true, message: "Mandat terminé." };
}

export async function supprimerMandat(mandatId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const lu = await lireMandat(c, mandatId);
  if (!lu) return { ok: false, erreur: ECHEC };
  const { error } = await c.db.from("site_delegue_mandats").delete().eq("id", mandatId);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "mandat_suppression", lu.d, { mandat: libelleMandat(lu.m) });
  rafraichir(lu.d.id);
  return { ok: true, message: "Mandat supprimé." };
}

export async function confirmerDelegue(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  const { error } = await c.db.from("site_delegues").update({ a_verifier: null }).eq("id", id);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "verification", d, { raison: d.a_verifier });
  rafraichir(id);
  return { ok: true };
}

export async function confirmerMandat(mandatId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const lu = await lireMandat(c, mandatId);
  if (!lu) return { ok: false, erreur: ECHEC };
  const { error } = await c.db.from("site_delegue_mandats").update({ a_verifier: null }).eq("id", mandatId);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "verification", lu.d, { mandat: libelleMandat(lu.m), raison: lu.m.a_verifier });
  rafraichir(lu.d.id);
  return { ok: true };
}
```

- [ ] **Step 2 : vérifier** — `npx tsc --noEmit` — 0 erreur.

- [ ] **Step 3 : commit** — `git add app/espace/delegues/actions.ts && git commit -m "feat(delegues): server actions (service role after super admin check)"`

---

### Task 9 : Écrans Import et Liste

**Files :** Create `app/espace/delegues/import/page.tsx`, `import/BoutonImport.tsx`,
`liste/page.tsx`, `liste/ListeDelegues.tsx`

- [ ] **Step 1 : import (page + bouton)**

```tsx
// import/page.tsx
import type { Metadata } from "next";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { EnteteEcran, Panneau } from "../../_partage/ui";
import BoutonImport from "./BoutonImport";

export const metadata: Metadata = { title: "Import CG Link — Espace CG", robots: { index: false, follow: false } };

export default async function ImportPage() {
  await exigerSuperAdmin();
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="upload" titre="Importer les délégués de CG Link"
        description="Reprend les délégués de CG Link et leurs mandats (début : 13/05/2024). Un délégué déjà importé n'est ni recréé ni modifié : l'import peut être relancé." />
      <Panneau>
        <BoutonImport />
      </Panneau>
    </div>
  );
}
```

```tsx
// import/BoutonImport.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import type { RapportImport } from "../../../../lib/delegues/import-serveur";
import { lancerImport } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { Alerte, BTN_PRINCIPAL } from "../../_partage/ui";

export default function BoutonImport() {
  const [enCours, setEnCours] = useState(false);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [erreur, setErreur] = useState("");

  async function lancer() {
    setEnCours(true);
    setErreur("");
    try {
      const r = await lancerImport();
      if (!r.ok) setErreur(r.erreur);
      else setRapport(r.donnees ?? null);
    } catch {
      setErreur("L'import a été interrompu. Relancez-le : les délégués déjà importés ne seront pas recréés.");
    }
    setEnCours(false);
  }

  return (
    <div className="grid gap-4">
      <button type="button" onClick={lancer} disabled={enCours} className={`${BTN_PRINCIPAL} w-fit`}>
        {enCours ? <IconeChargement size={15} /> : <Upload size={15} aria-hidden />} Importer depuis CG Link
      </button>
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
      {rapport && (
        <Alerte ton={rapport.erreurs ? "attention" : "succes"} titre="Import terminé">
          <ul className="mt-1 list-disc pl-5">
            <li>{rapport.crees} délégué(s) créé(s), {rapport.mandats} mandat(s)</li>
            <li>{rapport.dejaPresents} déjà présent(s), non modifié(s)</li>
            {rapport.erreurs > 0 && <li>{rapport.erreurs} erreur(s) : relancez l'import</li>}
            {rapport.sansFiche.length > 0 && <li>Entreprises sans fiche (délégués non importés) : {rapport.sansFiche.join(", ")}</li>}
            {rapport.rejetes.length > 0 && (
              <li>Textes « Autre » non importés : {rapport.rejetes.map((r) => `${r.entreprise} : « ${r.texte} »`).join(" ; ")}</li>
            )}
          </ul>
          <p className="mt-2"><Link className="ecg-lien" href="/espace/delegues/a-verifier">Voir les éléments à vérifier</Link></p>
        </Alerte>
      )}
    </div>
  );
}
```

`import type { RapportImport }` depuis un fichier serveur est permis (effacé à la compilation).

- [ ] **Step 2 : liste (page + client)**

```tsx
// liste/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerListeDelegues } from "../../../../lib/delegues/donnees-serveur";
import { Alerte, BTN_PRINCIPAL, EnteteEcran } from "../../_partage/ui";
import ListeDelegues from "./ListeDelegues";

export const metadata: Metadata = { title: "Délégués — Espace CG", robots: { index: false, follow: false } };

export default async function ListePage() {
  await exigerSuperAdmin();
  const r = await chargerListeDelegues();
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="id-card" titre="Délégués"
        description={r.ok ? `${r.lignes.length} délégué${r.lignes.length > 1 ? "s" : ""}.` : undefined}
        actions={<Link href="/espace/delegues/nouveau" className={BTN_PRINCIPAL}><Plus size={18} aria-hidden /> Nouveau délégué</Link>} />
      {r.ok ? <ListeDelegues lignes={r.lignes} entreprises={r.entreprises} /> : <Alerte ton="erreur">{r.erreur}</Alerte>}
    </div>
  );
}
```

```tsx
// liste/ListeDelegues.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleSlash, Clock, Flag, Search, UserX } from "lucide-react";
import type { EntrepriseChoix, LigneDelegue } from "../../../../lib/delegues/donnees-serveur";
import { LIBELLES_COMPTE } from "../../../../lib/delegues/delegue";
import { LIBELLES_ORGANES } from "../../../../lib/delegues/mandats";
import { ORGANES, type EtatCompte } from "../../../../lib/delegues/types";
import { CHAMP, LIBELLE, Panneau, Statut, Vide } from "../../_partage/ui";

const ICONE_COMPTE = { actif: CircleCheck, invite: Clock, bloque: CircleSlash, sans_compte: UserX, introuvable: UserX };
const TON_COMPTE = { actif: "ok", invite: "attente", bloque: "erreur", sans_compte: undefined, introuvable: "erreur" } as const;
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ListeDelegues({ lignes, entreprises }: { lignes: LigneDelegue[]; entreprises: EntrepriseChoix[] }) {
  const [q, setQ] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [organe, setOrgane] = useState("");
  const [compte, setCompte] = useState("");
  const [aVerifier, setAVerifier] = useState(false);

  const visibles = useMemo(() => lignes.filter((l) =>
    (!q || sansAccents(`${l.prenom ?? ""} ${l.nom} ${l.entrepriseNom}`).includes(sansAccents(q.trim()))) &&
    (!entreprise || l.entrepriseId === entreprise) &&
    (!organe || l.organes.includes(organe as LigneDelegue["organes"][number])) &&
    (!compte || l.compte === compte) &&
    (!aVerifier || l.aVerifier)
  ), [lignes, q, entreprise, organe, compte, aVerifier]);

  return (
    <Panneau corps={false}>
      <div className="grid gap-3 px-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className={LIBELLE}>Rechercher</label>
          <div className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className={`${CHAMP} pl-9`} placeholder="Nom, entreprise…" autoComplete="off" />
          </div>
        </div>
        <div>
          <label htmlFor="entreprise" className={LIBELLE}>Entreprise</label>
          <select id="entreprise" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} className={CHAMP}>
            <option value="">Toutes</option>
            {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="organe" className={LIBELLE}>Mandat</label>
          <select id="organe" value={organe} onChange={(e) => setOrgane(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            {ORGANES.map((o) => <option key={o} value={o}>{LIBELLES_ORGANES[o]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="compte" className={LIBELLE}>Compte CG Link</label>
          <select id="compte" value={compte} onChange={(e) => setCompte(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            {(Object.keys(LIBELLES_COMPTE) as EtatCompte[]).map((k) => <option key={k} value={k}>{LIBELLES_COMPTE[k]}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-3">
          <input type="checkbox" className="h-5 w-5" checked={aVerifier} onChange={(e) => setAVerifier(e.target.checked)} />
          À vérifier seulement
        </label>
      </div>
      <p className="sr-only" aria-live="polite">{visibles.length} délégué(s) affiché(s)</p>
      {visibles.length === 0 ? (
        <div className="p-5"><Vide icone="id-card" titre="Aucun délégué ne correspond.">Modifiez la recherche ou les filtres, ou lancez l'import CG Link.</Vide></div>
      ) : (
        <div className="ecg-tableau-cadre mt-3">
          <table className="ecg-tableau">
            <thead><tr><th scope="col">Délégué</th><th scope="col">Entreprise</th><th scope="col">Mandats en cours</th><th scope="col">Compte CG Link</th></tr></thead>
            <tbody>
              {visibles.map((l) => {
                const Icone = ICONE_COMPTE[l.compte];
                return (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/espace/delegues/${l.id}`} className="ecg-lien font-semibold">{[l.prenom, l.nom].filter(Boolean).join(" ")}</Link>
                      {l.aVerifier && <div className="mt-1"><Statut ton="attente" icone={Flag}>À vérifier</Statut></div>}
                    </td>
                    <td>{l.entrepriseNom}</td>
                    <td>{l.mandats.join(" · ")}</td>
                    <td><Statut ton={TON_COMPTE[l.compte]} icone={Icone}>{LIBELLES_COMPTE[l.compte]}</Statut></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panneau>
  );
}
```

- [ ] **Step 3 : vérifier** — `npx tsc --noEmit`.

- [ ] **Step 4 : commit** — `git add app/espace/delegues/import app/espace/delegues/liste && git commit -m "feat(delegues): import screen and searchable list"`

---

### Task 10 : Carte d'identité et mandats

**Files :** Create `app/espace/delegues/[id]/page.tsx`, `[id]/PanneauIdentite.tsx`, `[id]/PanneauMandats.tsx`

- [ ] **Step 1 : page**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerCarte } from "../../../../lib/delegues/donnees-serveur";
import { LIBELLES_COMPTE } from "../../../../lib/delegues/delegue";
import { isoToDateFr } from "../../../../lib/dates";
import { Alerte, EnteteEcran, Panneau } from "../../_partage/ui";
import PanneauIdentite from "./PanneauIdentite";
import PanneauMandats from "./PanneauMandats";

export const metadata: Metadata = { title: "Délégué — Espace CG", robots: { index: false, follow: false } };

const dateHeure = (iso: string) => `${isoToDateFr(iso.slice(0, 10))} ${new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" })}`;

export default async function CartePage({ params }: { params: Promise<{ id: string }> }) {
  await exigerSuperAdmin();
  const { id } = await params;
  const carte = await chargerCarte(id);
  if (!carte) notFound();
  const { delegue: d, compte } = carte;
  const nom = [d.prenom, d.nom].filter(Boolean).join(" ");

  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="id-card" titre={nom} description={carte.entrepriseNom} />
      {d.a_verifier && <Alerte ton="attention" titre="À vérifier">{d.a_verifier}</Alerte>}
      <div className="flex flex-wrap gap-4">
        {d.email && <a className="ecg-lien inline-flex items-center gap-1" href={`mailto:${d.email}`}><Mail size={16} aria-hidden /> {d.email}</a>}
        {d.telephone && <a className="ecg-lien inline-flex items-center gap-1" href={`tel:${d.telephone.replace(/\s/g, "")}`}><Phone size={16} aria-hidden /> {d.telephone}</a>}
      </div>
      <PanneauIdentite carte={carte} />
      <PanneauMandats carte={carte} />
      <Panneau titre="Compte CG Link" sousTitre="Lecture seule : l'invitation et le blocage arrivent avec le plan 2b.">
        <p><b>{LIBELLES_COMPTE[compte.etat]}</b></p>
        {compte.invitedAt && <p className="text-sm">Invité le {isoToDateFr(new Date(compte.invitedAt).toISOString().slice(0, 10))}</p>}
        {compte.derniereConnexion && <p className="text-sm">Dernière connexion : {dateHeure(compte.derniereConnexion)}</p>}
      </Panneau>
      {carte.journal.length > 0 && (
        <Panneau titre="Historique">
          <ul className="grid gap-1 text-sm">
            {carte.journal.map((j) => <li key={j.id}><span className="ecg-texte-doux">{dateHeure(j.created_at)}</span> · {j.phrase}</li>)}
          </ul>
        </Panneau>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : `PanneauIdentite.tsx`** (identité, unité de rattachement, notes ; suppression si pas de compte)

```tsx
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
        valeurs={d}
        champs={[
          { nom: "prenom", libelle: "Prénom", largeur: "demi" },
          { nom: "nom", libelle: "Nom", largeur: "demi" },
          { nom: "email", libelle: "E-mail", type: "email", largeur: "demi" },
          { nom: "telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
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
```

- [ ] **Step 3 : `PanneauMandats.tsx`** (en cours, terminés repliés, ajout, modification, fin, suppression,
  confirmation « à vérifier »)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Flag, Pencil, Plus, Square, Trash2 } from "lucide-react";
import type { CarteDelegue } from "../../../../lib/delegues/donnees-serveur";
import { LIBELLES_ORGANES, libelleMandat, mandatEnCours } from "../../../../lib/delegues/mandats";
import { ORGANES, type Mandat } from "../../../../lib/delegues/types";
import { formatDateFr, isoToDateFr } from "../../../../lib/dates";
import { ajouterMandat, confirmerMandat, enregistrerMandat, supprimerMandat, terminerMandat } from "../actions";
import ChampsEdition, { type DefChamp } from "../../_partage/ChampsEdition";
import { BTN, BTN_PETIT, CHAMP, Panneau, Statut } from "../../_partage/ui";

function champsMandat(carte: CarteDelegue): DefChamp[] {
  return [
    { nom: "organe", libelle: "Organe", type: "choix", largeur: "tiers", options: ORGANES.map((o) => ({ valeur: o, libelle: LIBELLES_ORGANES[o] })) },
    { nom: "qualite", libelle: "Qualité", type: "choix", largeur: "tiers",
      options: [{ valeur: "", libelle: "—" }, { valeur: "effectif", libelle: "Effectif" }, { valeur: "suppleant", libelle: "Suppléant" }] },
    { nom: "site_id", libelle: "Site (UTE)", type: "choix", largeur: "tiers",
      options: [{ valeur: "", libelle: "Site de l'unité de rattachement" }, ...carte.sites.map((s) => ({ valeur: s.id, libelle: s.nom }))] },
    { nom: "libelle", libelle: "Libellé (Autre, Instances CG)", largeur: "demi" },
    { nom: "fonction", libelle: "Fonction", exemple: "Président, Secrétaire", largeur: "demi" },
    { nom: "debut", libelle: "Début", type: "date", largeur: "tiers" },
    { nom: "fin", libelle: "Fin", type: "date", largeur: "tiers" },
  ];
}

function LigneMandat({ carte, m }: { carte: CarteDelegue; m: Mandat }) {
  const router = useRouter();
  const [mode, setMode] = useState<"" | "modifier" | "terminer" | "supprimer">("");
  const [fin, setFin] = useState("");
  const [erreur, setErreur] = useState("");
  const site = carte.sites.find((s) => s.id === m.site_id)?.nom;

  async function faire(p: Promise<{ ok: true } | { ok: false; erreur: string }>) {
    setErreur("");
    const r = await p;
    if (!r.ok) return setErreur(r.erreur);
    setMode("");
    router.refresh();
  }

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <b>{libelleMandat(m)}</b>
        <span className="ecg-texte-doux text-sm">
          {[site, m.debut && `depuis le ${isoToDateFr(m.debut)}`, m.fin && `jusqu'au ${isoToDateFr(m.fin)}`].filter(Boolean).join(" · ")}
        </span>
        {m.a_verifier && (
          <>
            <Statut ton="attente" icone={Flag}>À vérifier</Statut>
            <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => faire(confirmerMandat(m.id))}><Check size={14} aria-hidden /> Confirmer</button>
          </>
        )}
        <span className="ml-auto flex gap-1">
          <button type="button" aria-label={`Modifier ${libelleMandat(m)}`} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} onClick={() => setMode(mode === "modifier" ? "" : "modifier")}><Pencil size={16} aria-hidden /></button>
          {!m.fin && <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => setMode("terminer")}><Square size={14} aria-hidden /> Terminer</button>}
          <button type="button" aria-label={`Supprimer ${libelleMandat(m)}`} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`} onClick={() => setMode("supprimer")}><Trash2 size={16} aria-hidden /></button>
        </span>
      </div>
      {m.a_verifier && <p className="ecg-texte-doux text-sm">{m.a_verifier}</p>}
      {mode === "terminer" && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="grid text-sm">Date de fin
            <input className={`${CHAMP} w-40`} inputMode="numeric" placeholder="jj/mm/aaaa" value={fin} onChange={(e) => setFin(formatDateFr(e.target.value))} />
          </label>
          <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => faire(terminerMandat(m.id, fin))}>Terminer le mandat</button>
          <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} onClick={() => setMode("")}>Annuler</button>
        </div>
      )}
      {mode === "supprimer" && (
        <span role="alertdialog" aria-label="Supprimer ce mandat ?" className="mt-2 flex flex-wrap items-center gap-2">
          <b className="text-sm">Supprimer ce mandat ? (Pour un mandat fini, préférez « Terminer ».)</b>
          <button type="button" autoFocus className={`${BTN} ${BTN_PETIT} ecg-btn-danger`} onClick={() => faire(supprimerMandat(m.id))}>Oui</button>
          <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => setMode("")}>Non</button>
        </span>
      )}
      {mode === "modifier" && (
        <div className="mt-2">
          <ChampsEdition id={`m-${m.id}`} valeurs={m} champs={champsMandat(carte)} enregistrer={(v) => enregistrerMandat(m.id, v)} onSucces={() => setMode("")} />
        </div>
      )}
      {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
    </li>
  );
}

export default function PanneauMandats({ carte }: { carte: CarteDelegue }) {
  const [ajout, setAjout] = useState(false);
  const jour = new Date().toISOString().slice(0, 10);
  const enCours = carte.mandats.filter((m) => mandatEnCours(m, jour));
  const finis = carte.mandats.filter((m) => !mandatEnCours(m, jour));

  return (
    <Panneau titre="Mandats" sousTitre={`${enCours.length} en cours`}
      actions={<button type="button" className={BTN} aria-expanded={ajout} onClick={() => setAjout(!ajout)}><Plus size={15} aria-hidden /> Ajouter un mandat</button>}>
      {ajout && (
        <div className="mb-4">
          <ChampsEdition id="nouveau-mandat" valeurs={{ organe: "ds", qualite: "effectif" }} champs={champsMandat(carte)}
            enregistrer={(v) => ajouterMandat(carte.delegue.id, v)} libelleBouton="Ajouter le mandat" onSucces={() => setAjout(false)} />
        </div>
      )}
      {enCours.length === 0 ? <p className="ecg-texte-doux">Aucun mandat en cours.</p> : (
        <ul className="ecg-lignes">{enCours.map((m) => <LigneMandat key={m.id} carte={carte} m={m} />)}</ul>
      )}
      {finis.length > 0 && (
        <details className="mt-3">
          <summary className="flex cursor-pointer items-center gap-1 font-semibold"><ChevronDown size={16} aria-hidden /> {finis.length} mandat(s) terminé(s)</summary>
          <ul className="ecg-lignes">{finis.map((m) => <LigneMandat key={m.id} carte={carte} m={m} />)}</ul>
        </details>
      )}
    </Panneau>
  );
}
```

`ChampsEdition` initialise ses valeurs à partir de `valeurs` : la valeur initiale `{ organe: "ds", qualite:
"effectif" }` rend le formulaire « modifié » seulement quand l'utilisateur change un champ. Pour qu'un ajout
avec les valeurs par défaut soit possible, `ChampsEdition` doit accepter une prop `toujoursActif?: boolean`
qui désactive la règle `disabled={!modifie}` ; l'ajouter (une ligne) et la passer ici et dans
`FormulaireNouveau`.

- [ ] **Step 4 : vérifier** — `npx tsc --noEmit`.

- [ ] **Step 5 : commit** — `git add "app/espace/delegues/[id]" app/espace/_partage/ChampsEdition.tsx && git commit -m "feat(delegues): identity card with establishment unit and mandates"`

---

### Task 11 : Nouveau délégué, À vérifier, Journal

**Files :** Create `nouveau/page.tsx`, `nouveau/FormulaireNouveau.tsx`, `a-verifier/page.tsx`,
`a-verifier/BoutonConfirmer.tsx`, `journal/page.tsx`

- [ ] **Step 1 : nouveau délégué**

```tsx
// nouveau/page.tsx
import type { Metadata } from "next";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerListeDelegues } from "../../../../lib/delegues/donnees-serveur";
import { EnteteEcran, Panneau } from "../../_partage/ui";
import FormulaireNouveau from "./FormulaireNouveau";

export const metadata: Metadata = { title: "Nouveau délégué — Espace CG", robots: { index: false, follow: false } };

export default async function NouveauPage() {
  await exigerSuperAdmin();
  const r = await chargerListeDelegues();
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="plus" titre="Nouveau délégué" description="Les mandats et l'unité de rattachement se complètent ensuite sur sa carte." />
      <Panneau><FormulaireNouveau entreprises={r.ok ? r.entreprises : []} /></Panneau>
    </div>
  );
}
```

```tsx
// nouveau/FormulaireNouveau.tsx
"use client";

import { useRouter } from "next/navigation";
import type { EntrepriseChoix } from "../../../../lib/delegues/donnees-serveur";
import { creerDelegue } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";

export default function FormulaireNouveau({ entreprises }: { entreprises: EntrepriseChoix[] }) {
  const router = useRouter();
  return (
    <ChampsEdition
      id="nouveau"
      valeurs={{}}
      toujoursActif
      champs={[
        { nom: "entreprise_id", libelle: "Entreprise", type: "choix", options: [{ valeur: "", libelle: "Choisir…" }, ...entreprises.map((e) => ({ valeur: e.id, libelle: e.nom }))] },
        { nom: "prenom", libelle: "Prénom", largeur: "demi" },
        { nom: "nom", libelle: "Nom", largeur: "demi" },
        { nom: "email", libelle: "E-mail", type: "email", largeur: "demi" },
        { nom: "telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
      ]}
      enregistrer={async (v) => {
        const r = await creerDelegue(v);
        return r.ok ? { ok: true, donnees: { cle: r.donnees?.id } } : r;
      }}
      libelleBouton="Créer le délégué"
      onSucces={(d) => d?.cle && router.push(`/espace/delegues/${d.cle}`)}
    />
  );
}
```

- [ ] **Step 2 : à vérifier**

```tsx
// a-verifier/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerAVerifier } from "../../../../lib/delegues/donnees-serveur";
import { EnteteEcran, Panneau, Vide } from "../../_partage/ui";
import BoutonConfirmer from "./BoutonConfirmer";

export const metadata: Metadata = { title: "À vérifier — Espace CG", robots: { index: false, follow: false } };

export default async function AVerifierPage() {
  await exigerSuperAdmin();
  const { delegues, mandats } = await chargerAVerifier();
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="flag" titre="À vérifier" description="Ce que l'import n'a pas pu trancher seul. Confirmez, ou corrigez sur la carte du délégué." />
      {delegues.length + mandats.length === 0 && <Vide icone="flag" titre="Rien à vérifier." />}
      {delegues.length > 0 && (
        <Panneau titre={`Délégués (${delegues.length})`} corps={false}>
          <ul className="ecg-lignes">
            {delegues.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link className="ecg-lien font-semibold" href={`/espace/delegues/${d.id}`}>{d.nom}</Link>
                <span className="ecg-texte-doux">{d.entreprise}</span>
                <span className="min-w-0 flex-1 text-sm">{d.raison}</span>
                <BoutonConfirmer type="delegue" id={d.id} />
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      {mandats.length > 0 && (
        <Panneau titre={`Mandats (${mandats.length})`} corps={false}>
          <ul className="ecg-lignes">
            {mandats.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link className="ecg-lien font-semibold" href={`/espace/delegues/${m.delegueId}`}>{m.delegue}</Link>
                <b>{m.mandat}</b>
                <span className="min-w-0 flex-1 text-sm">{m.raison}</span>
                <BoutonConfirmer type="mandat" id={m.id} />
              </li>
            ))}
          </ul>
        </Panneau>
      )}
    </div>
  );
}
```

```tsx
// a-verifier/BoutonConfirmer.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { confirmerDelegue, confirmerMandat } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { BTN, BTN_PETIT } from "../../_partage/ui";

export default function BoutonConfirmer({ type, id }: { type: "delegue" | "mandat"; id: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  async function confirmer() {
    setEnCours(true);
    const r = await (type === "delegue" ? confirmerDelegue(id) : confirmerMandat(id));
    setEnCours(false);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }
  return (
    <span className="flex items-center gap-2">
      <button type="button" onClick={confirmer} disabled={enCours} className={`${BTN} ${BTN_PETIT}`}>
        {enCours ? <IconeChargement size={14} /> : <Check size={14} aria-hidden />} C'est correct
      </button>
      {erreur && <span role="alert" className="ecg-erreur">{erreur}</span>}
    </span>
  );
}
```

- [ ] **Step 3 : journal**

```tsx
// journal/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerJournal } from "../../../../lib/delegues/donnees-serveur";
import { isoToDateFr } from "../../../../lib/dates";
import { BTN, EnteteEcran, Panneau, Vide } from "../../_partage/ui";

export const metadata: Metadata = { title: "Journal des délégués — Espace CG", robots: { index: false, follow: false } };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await exigerSuperAdmin();
  const page = Math.max(0, Number((await searchParams).page ?? 0) || 0);
  const { lignes, total } = await chargerJournal(page);
  const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="history" titre="Journal" description={`${total} opération(s) sur les délégués.`} />
      {lignes.length === 0 ? <Vide icone="history" titre="Aucune opération pour l'instant." /> : (
        <Panneau corps={false}>
          <ul className="ecg-lignes">
            {lignes.map((l) => (
              <li key={l.id} className="py-2 text-sm">
                <span className="ecg-texte-doux">{isoToDateFr(l.created_at.slice(0, 10))} {heure(l.created_at)}</span>
                {l.auteur && <> · {l.auteur}</>}{l.delegue && <> · <b>{l.delegue}</b></>} · {l.phrase}
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      <div className="flex gap-2">
        {page > 0 && <Link className={BTN} href={`?page=${page - 1}`}>Plus récent</Link>}
        {(page + 1) * 50 < total && <Link className={BTN} href={`?page=${page + 1}`}>Plus ancien</Link>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : vérifier** — `npx tsc --noEmit` ; `npx vitest run`.

- [ ] **Step 5 : commit** — `git add app/espace/delegues && git commit -m "feat(delegues): new delegate, to-check queue and journal"`

---

### Task 12 : Documentation, contrôles de fin

**Files :** Create `docs/contexte/delegues.md` ; Modify `CLAUDE.md` (carte, renvois, état), `app/espace/CLAUDE.md`
(routes `/espace/delegues/…`, réservée SUPER_ADMIN par le rôle), `docs/contexte/base-de-donnees.md`
(`site_delegues.unite_id`), `docs/contexte/journal.md` (ancien état).

- [ ] **Step 1 : rédiger `docs/contexte/delegues.md`** : rôle, accès (SUPER_ADMIN par le rôle, layout),
  routes (liste, nouveau, `<id>`, à vérifier, import, journal), règles d'import (noms, mandats DS/CE/CPPT,
  classement « Autre », début 13/05/2024, entreprises regroupées, délégué dans deux entreprises, relance sans
  doublon), unité de rattachement (suivie et active, site par défaut des mandats), écritures en service_role
  + journal, état du compte en lecture seule, plan 2b à venir (écritures CG Link, écarts) et son préalable
  (correctif `workers` / `profiles`).

- [ ] **Step 2 : `CLAUDE.md` et ramifications** (carte : ligne `docs/contexte/delegues.md` ; renvoi
  `app/espace/delegues/CLAUDE.md` ; état actuel ; ancien état en tête du journal).

- [ ] **Step 3 : contrôles** — `npx tsc --noEmit` (0 erreur) ; `npm test` (tout vert) ; `npm run build`
  (routes `/espace/delegues/…` listées) ; `next start` local : `/espace/delegues/liste` sans session → 307
  vers `/login`.

- [ ] **Step 4 : commit** — `git add docs CLAUDE.md app/espace/CLAUDE.md && git commit -m "docs(delegues): context document and CLAUDE.md map"`

- [ ] **Step 5 : liste de vérification pour Fred** (message de fin) : exécuter la migration ; tuile « Gestion
  délégués CG Link » visible pour un SUPER_ADMIN seulement ; lancer l'import (≈ 176 délégués, rapport) ;
  le relancer (0 créé) ; ouvrir TRIXXO (délégués de XLG HOME) et REMACLE (délégué « aussi chez MARLUX ») ;
  traiter un élément « à vérifier » ; choisir une unité de rattachement puis ajouter un mandat (site par
  défaut) ; terminer un mandat ; créer puis supprimer un délégué sans compte ; vérifier qu'un compte
  ADMIN_OP ne voit pas l'app.

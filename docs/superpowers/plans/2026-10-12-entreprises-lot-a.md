# App « Entreprises » (migration + lot A) : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** créer les tables des deux apps (entreprises et délégués) et livrer l'app « Entreprises » de l'Espace
CG : liste, fiche, sites (UTE), unités d'établissement, ONSS, personne de référence et bloc adresse, affiliés,
import BCE (une fiche ou toutes).

**Architecture :** une migration SQL idempotente crée 8 tables `site_*` (RLS par `site_a_app()`) et une
fonction de comptage des affiliés. Les règles pures (BCE, comparaison, bloc adresse, liste) vivent dans
`lib/bce/` et `lib/entreprises/`, testées avec Vitest. L'app vit dans `app/espace/entreprises/` : pages
serveur qui lisent (service_role après `exigerApp`), composants clients qui appellent des actions serveur
écrivant **avec la session** (la RLS s'applique).

**Tech Stack :** Next.js 16 (App Router, actions serveur), Supabase (`@supabase/ssr`, `@supabase/supabase-js`),
Tailwind 3 + styles `ecg-…` de l'Espace, `lucide-react`, Vitest.

**Spec :** [docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md](../specs/2026-10-12-entreprises-delegues-design.md)
(sections 5 et 6 ; le lot B, sections 7 et suivantes, aura son propre plan).

## Global Constraints

- Dates affichées **toujours `jj/mm/aaaa`** (`isoToDateFr()` de `lib/dates.ts`), en base ISO ; **jamais
  de `<input type="date">`**.
- Français, phrases courtes, voix active ; messages d'erreur : ce qui s'est passé + quoi faire, sans excuse.
- Aucun contenu inventé : une donnée inconnue reste absente (jamais « [À COMPLÉTER] »).
- Icônes `lucide-react` uniquement (jamais d'emoji) ; jamais la couleur seule (icône + texte) ; cibles ≥ 44 px ;
  focus visible ; `prefers-reduced-motion` respecté (règle globale `.ecg *` déjà en place).
- Écrans : `<div className="ecg-ecran">` + `EnteteEcran`, `Panneau`, `Alerte`, `Vide`, `Statut`, constantes
  `BTN…`, `CHAMP`, `LIBELLE` de `app/espace/_partage/ui.tsx` ; tableaux `ecg-tableau` dans `ecg-tableau-cadre`.
- Chargement toujours visible : `IconeChargement` de `app/Chargement.tsx`.
- Un composant client n'importe de `lib/` que des fichiers **sans dépendance serveur** (`import type` permis).
- Un `page.tsx` n'exporte que les noms prévus par Next.js.
- Lecture de `companies` / `workers` : côté serveur seulement, jamais depuis le navigateur.
- Chaque page appelle `exigerApp("entreprises")`, chaque action serveur `aApp("entreprises")`.
- Migration autorisée par Fred le 12/10/2026 ; **aucune écriture de test dans la base** en dehors de la
  migration elle-même et de la vérification anon (lecture).
- Branche `entreprises` ; commits fréquents ; **rien n'est poussé** sans l'accord de Fred.
- Code de l'app : `entreprises` ; couleur `#E69F00` ; icône `building` (à valider par Fred).

## Review Focus

1. **La BCE bloque ou ralentit les appels depuis Vercel** (adresse IP de centre de données) : on attend un
   message clair « La BCE n'a pas répondu… », jamais une page blanche ni un enregistrement partiel. Couvert
   par les tests d'erreur de `lireBce` (tâche 4).
2. **Numéro BCE saisi avec points, espaces, « BE »** ou avec 9 chiffres (zéro initial oublié) : on attend
   qu'il soit compris et normalisé. Tests de `normaliserNumeroBce` (tâche 2).
3. **Adresse BCE sans numéro, avec boîte vide « . » ou localité collée devant la rue** : on attend une
   adresse propre, sans « . » ni virgule parasite. Tests de `analyserAdresse` (tâche 3).
4. **Deux personnes ouvrent la même entreprise CG Link sans fiche et la modifient en même temps** : on
   attend une seule fiche, un seul site principal, des ONSS non dupliqués. `assurerFiche` utilise
   `upsert … ignoreDuplicates` et l'index unique (tâche 9) ; test de la fonction pure `onssACreer` (tâche 6).
5. **Suppression d'un site qui contient des unités, l'adresse postale et des ONSS** : on attend que tout
   retourne au site principal, et que le site principal ne puisse pas être supprimé. Test de
   `planSuppressionSite` (tâche 6).

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261012120000_site_entreprises_delegues.sql` | Tables, RLS, fonction affiliés, lignes `site_apps` / `site_app_roles` |
| `lib/bce/numero.ts` (+ test) | Normalisation et contrôle modulo 97 du n° d'entreprise, affichage `0850.076.920` |
| `lib/bce/analyse.ts` (+ test, fixtures) | HTML kbopub → entité, unités, adresses, dates (pur) |
| `lib/bce/lecture-serveur.ts` (+ test) | Appels kbopub (délai, pages), erreurs traduites |
| `lib/bce/comparaison.ts` (+ test) | Différences BCE ↔ fiche, application d'un choix (pur) |
| `lib/entreprises/types.ts` | Types partagés (aucune dépendance) |
| `lib/entreprises/regles.ts` (+ test) | Bloc adresse, ONSS de CG Link, écarts ONSS, liste, suppression d'un site, clé de fiche (pur) |
| `lib/entreprises/donnees-serveur.ts` | Lectures serveur (service_role + RPC affiliés en session) |
| `app/espace/_noyau/icones.ts` | + `building`, `id-card`, `map-pin` |
| `app/espace/_noyau/registre.ts` | + manifeste `entreprises` |
| `app/espace/entreprises/manifeste.ts`, `layout.tsx`, `page.tsx` | Squelette de l'app |
| `app/espace/entreprises/actions.ts` | Actions serveur (écritures en session) |
| `app/espace/entreprises/liste/page.tsx`, `ListeEntreprises.tsx` | Liste, recherche, filtres |
| `app/espace/entreprises/nouvelle/page.tsx`, `FormulaireNouvelle.tsx` | Fiche hors CG Link |
| `app/espace/entreprises/[cle]/page.tsx` | Fiche (serveur) |
| `app/espace/entreprises/[cle]/ChampsEdition.tsx` | Formulaire de champs réutilisé par tous les panneaux |
| `app/espace/entreprises/[cle]/PanneauIdentite.tsx`, `PanneauSiege.tsx`, `PanneauSites.tsx`, `PanneauUnites.tsx`, `PanneauOnss.tsx` | Panneaux modifiables |
| `app/espace/entreprises/[cle]/bce/page.tsx`, `ComparaisonBce.tsx` | Import BCE d'une fiche |
| `app/espace/entreprises/bce/page.tsx`, `ImportGroupe.tsx` | Import BCE de toutes les fiches |
| `docs/contexte/entreprises.md`, `CLAUDE.md`, `app/espace/CLAUDE.md`, `app/espace/entreprises/CLAUDE.md`, `docs/contexte/base-de-donnees.md` | Documentation |

---

### Task 1 : Migration (tables, RLS, affiliés, catalogue)

**Files :**
- Create : `supabase/migrations/20261012120000_site_entreprises_delegues.sql`

**Interfaces :**
- Produces : tables `site_entreprises`, `site_entreprise_sites`, `site_entreprise_unites`,
  `site_entreprise_onss`, `site_delegues`, `site_delegue_mandats`, `site_ecarts_ignores`,
  `site_journal_delegues` ; fonction `site_compter_affilies()` → `(company_id uuid, contract_type text,
  nombre bigint)` ; apps `entreprises` et `delegues` dans `site_apps`.

- [ ] **Step 1 : écrire la migration**

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- Apps « Entreprises » et « Gestion délégués CG Link » : tables, sécurité, catalogue.
-- Base CG Link (partagée) — tables préfixées site_. Migration autorisée par Fred le 12/10/2026.
-- Idempotente : peut être rejouée. Spec : docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md
--
-- Sécurité (RÈGLE D'OR : chaque table a sa serrure RLS) :
--   - tables entreprises : lecture / écriture si site_a_app('entreprises') (session de l'utilisateur) ;
--   - tables délégués : lecture si app entreprises ou delegues ; écriture UNIQUEMENT en service_role
--     (actions serveur réservées aux SUPER_ADMIN) ;
--   - anon (site public) n'a aucun droit.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.site_entreprises_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── Entreprises ─────────────────────────────────────────────────────────────
create table if not exists public.site_entreprises (
  id uuid primary key default gen_random_uuid(),
  company_id uuid unique references public.companies(id) on delete set null,
  nom text,
  numero_bce text unique,
  denomination_bce text,
  siege_rue text,
  siege_numero text,
  siege_boite text,
  siege_code_postal text,
  siege_localite text,
  ref_nom text,
  ref_fonction text,
  ref_email text,
  ref_telephone text,
  bce_importe_le timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_entreprises_nom_check
    check (company_id is not null or nullif(btrim(nom), '') is not null),
  constraint site_entreprises_bce_check
    check (numero_bce is null or numero_bce ~ '^[01][0-9]{9}$')
);
comment on table public.site_entreprises is
  'Fiches entreprises de l''Espace CG (app entreprises). company_id = lien CG Link (null = hors CG Link).';

create table if not exists public.site_entreprise_sites (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.site_entreprises(id) on delete cascade,
  nom text not null,
  principal boolean not null default false,
  unite_postale_id uuid,
  ref_nom text,
  ref_fonction text,
  ref_email text,
  ref_telephone text,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.site_entreprise_sites is
  'Sites d''exploitation = UTE des élections sociales. Un seul site principal par entreprise.';
create unique index if not exists site_entreprise_sites_principal_idx
  on public.site_entreprise_sites (entreprise_id) where principal;
create index if not exists site_entreprise_sites_entreprise_idx on public.site_entreprise_sites (entreprise_id);

create table if not exists public.site_entreprise_unites (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.site_entreprises(id) on delete cascade,
  site_id uuid references public.site_entreprise_sites(id) on delete set null,
  numero_ue text unique,
  denomination text,
  rue text,
  numero text,
  boite text,
  code_postal text,
  localite text,
  statut text not null default 'actif'
    constraint site_entreprise_unites_statut_check check (statut in ('actif', 'arrete')),
  date_debut date,
  origine text not null default 'manuel'
    constraint site_entreprise_unites_origine_check check (origine in ('bce', 'manuel')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_entreprise_unites_numero_check check (numero_ue is null or numero_ue ~ '^[2-8][0-9]{9}$')
);
comment on table public.site_entreprise_unites is 'Unités d''établissement (BCE ou encodées à la main).';
create index if not exists site_entreprise_unites_entreprise_idx on public.site_entreprise_unites (entreprise_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_entreprise_sites_unite_postale_fkey') then
    alter table public.site_entreprise_sites
      add constraint site_entreprise_sites_unite_postale_fkey
      foreign key (unite_postale_id) references public.site_entreprise_unites(id) on delete set null;
  end if;
end $$;

create table if not exists public.site_entreprise_onss (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.site_entreprises(id) on delete cascade,
  site_id uuid references public.site_entreprise_sites(id) on delete set null,
  numero text not null constraint site_entreprise_onss_numero_check check (numero ~ '^[0-9]+$'),
  libelle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_entreprise_onss_unique unique (entreprise_id, numero)
);

-- ── Délégués (écrits en service_role uniquement, lot B) ─────────────────────
create table if not exists public.site_delegues (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.site_entreprises(id) on delete restrict,
  cglink_user_id uuid unique,
  prenom text,
  nom text not null,
  email text,
  telephone text,
  notes text,
  a_verifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_delegues_entreprise_idx on public.site_delegues (entreprise_id);

create table if not exists public.site_delegue_mandats (
  id uuid primary key default gen_random_uuid(),
  delegue_id uuid not null references public.site_delegues(id) on delete cascade,
  site_id uuid references public.site_entreprise_sites(id) on delete set null,
  organe text not null
    constraint site_delegue_mandats_organe_check
    check (organe in ('ds', 'ce', 'cppt', 'cee', 'instances_cg', 'autre')),
  libelle text,
  qualite text constraint site_delegue_mandats_qualite_check check (qualite in ('effectif', 'suppleant')),
  fonction text,
  debut date,
  fin date,
  a_verifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_delegue_mandats_qualite_requise
    check (organe not in ('ds', 'ce', 'cppt') or qualite is not null),
  constraint site_delegue_mandats_libelle_requis
    check (organe not in ('autre', 'instances_cg') or nullif(btrim(libelle), '') is not null)
);
create index if not exists site_delegue_mandats_delegue_idx on public.site_delegue_mandats (delegue_id);

create table if not exists public.site_ecarts_ignores (
  id uuid primary key default gen_random_uuid(),
  cible text not null constraint site_ecarts_ignores_cible_check check (cible in ('delegue', 'entreprise')),
  cible_id uuid not null,
  champ text not null,
  valeur text not null,
  ignore_par uuid,
  created_at timestamptz not null default now(),
  constraint site_ecarts_ignores_unique unique (cible, cible_id, champ, valeur)
);

create table if not exists public.site_journal_delegues (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid,
  delegue_id uuid,
  entreprise_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists site_journal_delegues_created_idx on public.site_journal_delegues (created_at desc);

-- ── updated_at ──────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['site_entreprises', 'site_entreprise_sites', 'site_entreprise_unites',
                           'site_entreprise_onss', 'site_delegues', 'site_delegue_mandats'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.site_entreprises_touch()', t || '_touch', t);
  end loop;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  -- Tables entreprises : tout, si l'app entreprises est donnée.
  foreach t in array array['site_entreprises', 'site_entreprise_sites', 'site_entreprise_unites', 'site_entreprise_onss'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_app', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.site_a_app(''entreprises''))) with check ((select public.site_a_app(''entreprises'')))', t || '_app', t);
  end loop;

  -- Délégués et mandats : lecture pour les deux apps, aucune écriture (service_role seulement).
  foreach t in array array['site_delegues', 'site_delegue_mandats'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.site_a_app(''entreprises'')) or (select public.site_a_app(''delegues'')))', t || '_select', t);
  end loop;

  -- Écarts ignorés et journal : lecture app delegues, écriture service_role seulement.
  foreach t in array array['site_ecarts_ignores', 'site_journal_delegues'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.site_a_app(''delegues'')))', t || '_select', t);
  end loop;
end $$;

-- ── Affiliés actifs par entreprise et type de contrat (lu avec la session) ──
create or replace function public.site_compter_affilies()
returns table (company_id uuid, contract_type text, nombre bigint)
language sql stable security definer set search_path = public as $$
  select w.company_id, w.contract_type, count(*)::bigint
  from public.workers w
  where w.status = 'Actif'
    and ((select public.site_a_app('entreprises')) or (select public.site_a_app('delegues')))
  group by w.company_id, w.contract_type
$$;
revoke all on function public.site_compter_affilies() from public;
revoke all on function public.site_compter_affilies() from anon;
grant execute on function public.site_compter_affilies() to authenticated;

-- ── Catalogue des apps ──────────────────────────────────────────────────────
insert into public.site_apps (code, nom, description, icone, couleur, ordre, actif)
select 'entreprises', 'Entreprises', 'Fiches, BCE, sites, unités et bloc adresse', 'building', '#E69F00', 40, true
where not exists (select 1 from public.site_apps where code = 'entreprises');

insert into public.site_apps (code, nom, description, icone, couleur, ordre, actif)
select 'delegues', 'Gestion délégués CG Link', 'Délégués, mandats et comptes CG Link', 'id-card', '#CC79A7', 50, false
where not exists (select 1 from public.site_apps where code = 'delegues');

insert into public.site_app_roles (app_code, role)
select 'entreprises', r from unnest(array['ADMIN_OP', 'PERMANENT']) as r
where not exists (select 1 from public.site_app_roles where app_code = 'entreprises' and role = r);
```

Note : `delegues` est inséré **inactif** (`actif = false`) : son dossier n'existe pas avant le lot B ; le
plan du lot B l'activera.

- [ ] **Step 2 : appliquer la migration**

Trouver le projet : outil MCP `mcp__claude_ai_Supabase__list_projects` (référence attendue :
`twucrdfmqwkdfkbbnuvl`, région Europe, nom CG Link). Puis `mcp__claude_ai_Supabase__apply_migration` avec
`name: "site_entreprises_delegues"` et le contenu du fichier. Si l'outil MCP n'est pas disponible : demander
à Fred de coller le fichier dans Supabase › SQL Editor et d'exécuter.

Expected : succès sans erreur. En cas d'erreur sur `site_apps` (colonne absente), relire les colonnes avec
`select column_name from information_schema.columns where table_name = 'site_apps'` et corriger l'insert.

- [ ] **Step 3 : vérifier la serrure (anon) et la présence des tables**

```bash
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"\r'); KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2- | tr -d '"\r')
for t in site_entreprises site_entreprise_sites site_entreprise_unites site_entreprise_onss site_delegues site_delegue_mandats site_ecarts_ignores site_journal_delegues; do printf "%s " $t; curl -s -o /dev/null -w "%{http_code} " -D - "$URL/rest/v1/$t?select=id&limit=0" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: count=exact" | grep -i "content-range" || echo; done
curl -s -X POST "$URL/rest/v1/rpc/site_compter_affilies" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{}' | head -c 200; echo
```

Expected : chaque table → `401` ou `Content-Range: */0` ; la fonction → erreur de permission (42501).

- [ ] **Step 4 : commit**

```bash
git add supabase/migrations/20261012120000_site_entreprises_delegues.sql
git commit -m "feat(db): site tables for companies and delegates apps"
```

---

### Task 2 : N° d'entreprise BCE

**Files :**
- Create : `lib/bce/numero.ts`
- Test : `lib/bce/numero.test.ts`

**Interfaces :**
- Produces :
  - `normaliserNumeroBce(saisie: string): string | null` (10 chiffres valides, sinon null) ;
  - `formaterNumeroBce(n: string): string` (`0850.076.920`) ;
  - `formaterNumeroUe(n: string): string` (`2.235.300.266`) ;
  - `chiffres(s: string | null | undefined): string`.

- [ ] **Step 1 : tests**

```ts
import { describe, expect, it } from "vitest";
import { chiffres, formaterNumeroBce, formaterNumeroUe, normaliserNumeroBce } from "./numero";

describe("normaliserNumeroBce", () => {
  it("accepte les formats usuels", () => {
    for (const s of ["0850.076.920", "0850 076 920", "BE 0850.076.920", "be0850076920", "850076920", "0850076920"]) {
      expect(normaliserNumeroBce(s)).toBe("0850076920");
    }
  });
  it("refuse une clé de contrôle fausse", () => {
    expect(normaliserNumeroBce("0850.076.921")).toBeNull();
  });
  it("refuse une longueur impossible ou un premier chiffre autre que 0 ou 1", () => {
    expect(normaliserNumeroBce("12345")).toBeNull();
    expect(normaliserNumeroBce("2235300266")).toBeNull();
    expect(normaliserNumeroBce("")).toBeNull();
  });
  it("valide un numéro connu inexistant à la BCE mais bien formé", () => {
    expect(normaliserNumeroBce("0123.456.749")).toBe("0123456749");
  });
});

describe("formats", () => {
  it("affiche avec des points", () => {
    expect(formaterNumeroBce("0850076920")).toBe("0850.076.920");
    expect(formaterNumeroUe("2235300266")).toBe("2.235.300.266");
  });
  it("garde les seuls chiffres", () => {
    expect(chiffres("BE 0850.076-920")).toBe("0850076920");
    expect(chiffres(null)).toBe("");
  });
});
```

- [ ] **Step 2 : lancer, constater l'échec**

Run : `npx vitest run lib/bce/numero.test.ts` — Expected : FAIL (module introuvable).

- [ ] **Step 3 : implémenter**

```ts
/**
 * Numéro d'entreprise BCE : 10 chiffres, commence par 0 ou 1, les 2 derniers = 97 - (8 premiers mod 97).
 * Le numéro d'une unité d'établissement : 10 chiffres commençant par 2 à 8.
 * Fichier pur (aucune dépendance) : utilisable côté navigateur.
 */

export function chiffres(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export function normaliserNumeroBce(saisie: string): string | null {
  let n = chiffres(saisie);
  if (n.length === 9) n = `0${n}`;
  if (!/^[01]\d{9}$/.test(n)) return null;
  const cle = 97 - (Number(n.slice(0, 8)) % 97);
  return cle === Number(n.slice(8)) ? n : null;
}

export function formaterNumeroBce(n: string): string {
  return /^\d{10}$/.test(n) ? `${n.slice(0, 4)}.${n.slice(4, 7)}.${n.slice(7)}` : n;
}

export function formaterNumeroUe(n: string): string {
  return /^\d{10}$/.test(n) ? `${n.slice(0, 1)}.${n.slice(1, 4)}.${n.slice(4, 7)}.${n.slice(7)}` : n;
}
```

- [ ] **Step 4 : relancer** — `npx vitest run lib/bce/numero.test.ts` — Expected : PASS.

- [ ] **Step 5 : commit**

```bash
git add lib/bce/numero.ts lib/bce/numero.test.ts
git commit -m "feat(bce): enterprise number normalisation and check digit"
```

---

### Task 3 : Lecture des pages BCE (HTML → données)

**Files :**
- Create : `lib/bce/analyse.ts`
- Test : `lib/bce/analyse.test.ts`
- Fixtures (déjà enregistrées le 12/10/2026, à commiter) : `lib/bce/__fixtures__/accg-entite.html`,
  `accg-unites.html`, `colruyt-unites-p1.html`, `colruyt-unites-p2.html`, `inconnu-entite.html`

**Interfaces :**
- Produces (types exportés depuis `lib/bce/analyse.ts`) :

```ts
export type Adresse = { rue: string | null; numero: string | null; boite: string | null; code_postal: string | null; localite: string | null };
export type EntiteBce = { denomination: string | null; siege: Adresse };
export type UniteBce = Adresse & { numero_ue: string; statut: "actif" | "arrete"; date_debut: string | null; denomination: string | null };
export function analyserEntite(html: string): EntiteBce | "inconnu" | null; // null = page méconnaissable
export function analyserUnites(html: string): { unites: UniteBce[]; total: number; parPage: number } | null;
export function dateTexteVersIso(t: string): string | null;
export function analyserAdresse(celluleHtml: string): Adresse;
```

- [ ] **Step 1 : tests**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyserAdresse, analyserEntite, analyserUnites, dateTexteVersIso } from "./analyse";

const fixture = (f: string) => readFileSync(join(__dirname, "__fixtures__", f), "utf8");

describe("dateTexteVersIso", () => {
  it("convertit les dates en toutes lettres", () => {
    expect(dateTexteVersIso("1 janvier 2008")).toBe("2008-01-01");
    expect(dateTexteVersIso("25 octobre 1982")).toBe("1982-10-25");
    expect(dateTexteVersIso("1er février 2022")).toBe("2022-02-01");
    expect(dateTexteVersIso("19 août 2003")).toBe("2003-08-19");
    expect(dateTexteVersIso("3 décembre 1999")).toBe("1999-12-03");
  });
  it("renvoie null sinon", () => {
    expect(dateTexteVersIso("Pas de données")).toBeNull();
    expect(dateTexteVersIso("31 février 2022")).toBeNull();
  });
});

describe("analyserAdresse", () => {
  it("sépare rue et numéro", () => {
    expect(analyserAdresse("Rue Dewez&nbsp;\n 40/42<br/>5000&nbsp;\n Namur<br/>Depuis le 1 janvier 2008")).toEqual({
      rue: "Rue Dewez", numero: "40/42", boite: null, code_postal: "5000", localite: "Namur",
    });
  });
  it("retire la localité collée devant la rue", () => {
    expect(analyserAdresse("Libramont,Rue Fonteny Maroy&nbsp;13<br/>6800&nbsp;Libramont-Chevigny")).toMatchObject({
      rue: "Rue Fonteny Maroy", numero: "13", localite: "Libramont-Chevigny",
    });
    expect(analyserAdresse("Marche, Rue des Brasseurs&nbsp;13<br/>6900&nbsp;Marche-en-Famenne").rue).toBe("Rue des Brasseurs");
  });
  it("garde une virgule qui n'est pas une localité", () => {
    expect(analyserAdresse("Zoning Nord, Allée 3&nbsp;5<br/>6700&nbsp;Arlon").rue).toBe("Zoning Nord, Allée 3");
  });
  it("lit la boîte et ignore une boîte vide « . »", () => {
    expect(analyserAdresse("Edingensesteenweg&nbsp;\n196&nbsp;\nBoîte&nbsp;.<br/>1500&nbsp;Halle").boite).toBeNull();
    expect(analyserAdresse("Rue X&nbsp;5&nbsp;Boîte&nbsp;B2<br/>5000&nbsp;Namur").boite).toBe("B2");
  });
  it("supporte une rue sans numéro", () => {
    expect(analyserAdresse("Zoning industriel<br/>6900&nbsp;Marche-en-Famenne")).toMatchObject({ rue: "Zoning industriel", numero: null });
  });
});

describe("analyserEntite", () => {
  it("lit la dénomination et le siège", () => {
    expect(analyserEntite(fixture("accg-entite.html"))).toEqual({
      denomination: "CENTRALE GENERALE FGTB Namur-Luxembourg",
      siege: { rue: "Rue Fonteny Maroy", numero: "13", boite: null, code_postal: "6800", localite: "Libramont-Chevigny" },
    });
  });
  it("reconnaît un numéro inexistant", () => {
    expect(analyserEntite(fixture("inconnu-entite.html"))).toBe("inconnu");
  });
  it("renvoie null pour une page méconnaissable", () => {
    expect(analyserEntite("<html><body>Maintenance</body></html>")).toBeNull();
  });
});

describe("analyserUnites", () => {
  it("lit les 4 unités de l'ACCG", () => {
    const r = analyserUnites(fixture("accg-unites.html"))!;
    expect(r.total).toBe(4);
    expect(r.unites).toHaveLength(4);
    expect(r.unites[0]).toEqual({
      numero_ue: "2235300266", statut: "actif", date_debut: "2008-01-01",
      denomination: "CENTRALE GENERALE FGTB Namur-Luxembourg SASPJ",
      rue: "Rue Dewez", numero: "40/42", boite: null, code_postal: "5000", localite: "Namur",
    });
    expect(r.unites[3]).toMatchObject({ numero_ue: "2344397156", localite: "Arlon", rue: "Rue des Martyrs", numero: "80" });
  });
  it("lit une liste paginée", () => {
    const p1 = analyserUnites(fixture("colruyt-unites-p1.html"))!;
    const p2 = analyserUnites(fixture("colruyt-unites-p2.html"))!;
    expect(p1.total).toBe(38);
    expect(p1.parPage).toBe(20);
    expect(p1.unites).toHaveLength(20);
    expect(p2.unites).toHaveLength(18);
    expect(p1.unites[0]).toMatchObject({ numero_ue: "2102363449", rue: "Edingensesteenweg", numero: "196", boite: null, code_postal: "1500", localite: "Halle" });
  });
  it("renvoie null pour une page méconnaissable", () => {
    expect(analyserUnites("<html></html>")).toBeNull();
  });
});
```

- [ ] **Step 2 : lancer** — `npx vitest run lib/bce/analyse.test.ts` — Expected : FAIL.

- [ ] **Step 3 : implémenter**

```ts
/**
 * Lecture des pages publiques de la BCE (kbopub), en français. Fichier pur, sans dépendance :
 * expressions régulières sur le HTML (la structure est stable : tableaux à classes QL / RL, displaytag).
 * Si la BCE change sa page, les fonctions renvoient null et l'écran propose la saisie manuelle.
 */

export type Adresse = {
  rue: string | null;
  numero: string | null;
  boite: string | null;
  code_postal: string | null;
  localite: string | null;
};
export type EntiteBce = { denomination: string | null; siege: Adresse };
export type UniteBce = Adresse & {
  numero_ue: string;
  statut: "actif" | "arrete";
  date_debut: string | null;
  denomination: string | null;
};

const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const SEP = "\u0001"; // séparateur interne : remplace &nbsp; pour garder la frontière rue / numéro / boîte

function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function decoder(s: string): string {
  return s
    .replace(/&nbsp;| /g, SEP)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Texte lisible : balises retirées, séparateurs et blancs ramenés à un espace. */
function texte(html: string): string {
  return decoder(html.replace(/<[^>]*>/g, " ")).replace(new RegExp(SEP, "g"), " ").replace(/\s+/g, " ").trim();
}

export function dateTexteVersIso(t: string): string | null {
  const m = sansAccents(t.toLowerCase()).match(/(\d{1,2})(?:er)?\s+([a-z]+)\s+(\d{4})/);
  if (!m) return null;
  const j = Number(m[1]);
  const mo = MOIS[m[2]];
  const a = Number(m[3]);
  if (!mo) return null;
  const d = new Date(Date.UTC(a, mo - 1, j));
  if (d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null;
  return `${a}-${String(mo).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

function vide(s: string | undefined | null): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t && t !== "." ? t : null;
}

/**
 * Cellule d'adresse : « <rue>&nbsp;<n°>[&nbsp;Boîte&nbsp;<b>]<br/><CP>&nbsp;<localité>[<br/>Depuis le …] ».
 * La localité est parfois collée devant la rue (« Libramont,Rue … ») : retirée si la localité de l'adresse
 * commence par ce mot.
 */
export function analyserAdresse(celluleHtml: string): Adresse {
  const lignes = decoder(celluleHtml.replace(/<span[^>]*class="upd"[^>]*>[\s\S]*?<\/span>/g, ""))
    .split(/<br\s*\/?>/i)
    .map((l) => l.replace(/<[^>]*>/g, "").trim())
    .filter((l) => l && !/^depuis le/i.test(l.replace(new RegExp(SEP, "g"), " ").trim()));

  const morceaux = (lignes[0] ?? "").split(SEP).map((m) => m.replace(/\s+/g, " ").trim()).filter(Boolean);
  const iBoite = morceaux.findIndex((m) => /^bo[iî]te$/i.test(m));
  const boite = iBoite >= 0 ? vide(morceaux[iBoite + 1]) : null;
  const avantBoite = iBoite >= 0 ? morceaux.slice(0, iBoite) : morceaux;
  let rue = vide(avantBoite[0]);
  const numero = vide(avantBoite.slice(1).join(" "));

  const ville = (lignes[1] ?? "").split(SEP).map((m) => m.replace(/\s+/g, " ").trim()).filter(Boolean);
  const code_postal = vide(ville[0]);
  const localite = vide(ville.slice(1).join(" "));

  const collee = rue?.match(/^([^,]+),\s*(.+)$/);
  if (collee && localite && sansAccents(localite.toLowerCase()).startsWith(sansAccents(collee[1].trim().toLowerCase()))) {
    rue = collee[2].trim();
  }
  return { rue, numero, boite, code_postal, localite };
}

function cellule(html: string, libelle: string): string | null {
  const re = new RegExp(`${libelle}\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`, "i");
  return html.match(re)?.[1] ?? null;
}

export function analyserEntite(html: string): EntiteBce | "inconnu" | null {
  // L'apostrophe peut être brute, typographique ou encodée (&#39;).
  if (/n(?:'|’|&#39;)existe pas dans la BCE|Pas de données d(?:'|’|&#39;)entité trouvées/i.test(html)) return "inconnu";
  const denom = cellule(html, "Dénomination:");
  const siege = cellule(html, "Adresse du siège:");
  if (denom === null && siege === null) return null;
  return {
    denomination: denom ? vide(texte(denom.split(/<br\s*\/?>/i)[0])) : null,
    siege: siege ? analyserAdresse(siege) : { rue: null, numero: null, boite: null, code_postal: null, localite: null },
  };
}

export function analyserUnites(html: string): { unites: UniteBce[]; total: number; parPage: number } | null {
  const banniere = html.match(/(\d+)\s+unités? d(?:'|’|&#39;)établissement trouvées?(?:,\s*affichage de\s*(\d+)\s*à\s*(\d+))?/i);
  const corps = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!banniere || !corps) return null;
  const total = Number(banniere[1]);
  const parPage = banniere[2] ? Number(banniere[3]) - Number(banniere[2]) + 1 : total;

  const unites: UniteBce[] = [];
  for (const ligne of corps[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cases = [...ligne[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cases.length < 6) continue;
    const numero_ue = texte(cases[2]).replace(/\D/g, "");
    if (!/^\d{10}$/.test(numero_ue)) continue;
    unites.push({
      numero_ue,
      statut: /^actif/i.test(texte(cases[1])) ? "actif" : "arrete",
      date_debut: dateTexteVersIso(texte(cases[3])),
      denomination: vide(texte(cases[4])),
      ...analyserAdresse(cases[5]),
    });
  }
  return { unites, total, parPage: parPage > 0 ? parPage : 20 };
}
```

- [ ] **Step 4 : relancer** — `npx vitest run lib/bce/analyse.test.ts` — Expected : PASS. Si un test de
  fixture échoue, ouvrir la fixture concernée et ajuster l'expression régulière fautive (pas le test).

- [ ] **Step 5 : commit**

```bash
git add lib/bce/analyse.ts lib/bce/analyse.test.ts lib/bce/__fixtures__
git commit -m "feat(bce): parse kbopub entity and establishment unit pages"
```

---

### Task 4 : Appels à la BCE (serveur)

**Files :**
- Create : `lib/bce/lecture-serveur.ts`
- Test : `lib/bce/lecture-serveur.test.ts`

**Interfaces :**
- Consumes : `analyserEntite`, `analyserUnites`, types `EntiteBce`, `UniteBce` (tâche 3).
- Produces : `export type ResultatBce = { ok: true; entite: EntiteBce; unites: UniteBce[] } | { ok: false; erreur: string };`
  `export async function lireBce(numero: string, f?: typeof fetch): Promise<ResultatBce>` (`numero` = 10
  chiffres déjà normalisés) ; constantes `ERREUR_BCE_INJOIGNABLE`, `ERREUR_BCE_INCONNU`, `ERREUR_BCE_PAGE`.

- [ ] **Step 1 : tests (fetch simulé)**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ERREUR_BCE_INCONNU, ERREUR_BCE_INJOIGNABLE, ERREUR_BCE_PAGE, lireBce } from "./lecture-serveur";

const fixture = (f: string) => readFileSync(join(__dirname, "__fixtures__", f), "utf8");

function faux(pages: Record<string, string | Error | number>): typeof fetch {
  return (async (url: string | URL) => {
    const u = String(url);
    const cle = Object.keys(pages).find((k) => u.includes(k));
    const v = cle ? pages[cle] : 404;
    if (v instanceof Error) throw v;
    if (typeof v === "number") return new Response("", { status: v });
    return new Response(v, { status: 200 });
  }) as typeof fetch;
}

describe("lireBce", () => {
  it("lit l'entité et toutes les pages d'unités", async () => {
    const r = await lireBce("0400378485", faux({
      "zoeknummerform": fixture("accg-entite.html"),
      "page=2": fixture("colruyt-unites-p2.html"),
      "vestiginglijst": fixture("colruyt-unites-p1.html"),
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.unites).toHaveLength(38);
  });
  it("signale un numéro inconnu", async () => {
    const r = await lireBce("0123456749", faux({ zoeknummerform: fixture("inconnu-entite.html") }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_INCONNU });
  });
  it("signale une BCE injoignable (erreur réseau ou délai)", async () => {
    const r = await lireBce("0850076920", faux({ zoeknummerform: new Error("timeout") }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_INJOIGNABLE });
  });
  it("signale un statut HTTP d'erreur (blocage, maintenance)", async () => {
    const r = await lireBce("0850076920", faux({ zoeknummerform: 503 }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_INJOIGNABLE });
  });
  it("signale une page méconnaissable", async () => {
    const r = await lireBce("0850076920", faux({ zoeknummerform: "<html>autre</html>" }));
    expect(r).toEqual({ ok: false, erreur: ERREUR_BCE_PAGE });
  });
});
```

- [ ] **Step 2 : lancer** — `npx vitest run lib/bce/lecture-serveur.test.ts` — Expected : FAIL.

- [ ] **Step 3 : implémenter**

```ts
import { analyserEntite, analyserUnites, type EntiteBce, type UniteBce } from "./analyse";

/**
 * Lecture de la BCE publique (kbopub). SERVEUR UNIQUEMENT (appelé par les actions serveur de l'app
 * Entreprises, après vérification du droit). Une page à la fois, 15 s maximum par page, 20 pages au plus.
 */

const BASE = "https://kbopub.economie.fgov.be/kbopub";
const DELAI_MS = 15_000;
const PAGES_MAX = 20;

export const ERREUR_BCE_INJOIGNABLE =
  "La BCE n'a pas répondu. Réessayez plus tard ou encodez les données à la main.";
export const ERREUR_BCE_INCONNU = "Ce numéro n'existe pas à la BCE. Vérifiez le numéro d'entreprise.";
export const ERREUR_BCE_PAGE =
  "La page de la BCE a changé et n'a pas pu être lue. Encodez les données à la main.";

export type ResultatBce = { ok: true; entite: EntiteBce; unites: UniteBce[] } | { ok: false; erreur: string };

async function page(url: string, f: typeof fetch): Promise<string | null> {
  try {
    const r = await f(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Espace CG ACCG Nalux)", "Accept-Language": "fr" },
      signal: AbortSignal.timeout(DELAI_MS),
      cache: "no-store",
    });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

export async function lireBce(numero: string, f: typeof fetch = fetch): Promise<ResultatBce> {
  const html = await page(`${BASE}/zoeknummerform.html?nummer=${numero}&actionLu=Zoek&lang=fr`, f);
  if (html === null) return { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
  const entite = analyserEntite(html);
  if (entite === "inconnu") return { ok: false, erreur: ERREUR_BCE_INCONNU };
  if (entite === null) return { ok: false, erreur: ERREUR_BCE_PAGE };

  const sansZero = numero.replace(/^0/, "");
  const unites: UniteBce[] = [];
  for (let p = 1; p <= PAGES_MAX; p++) {
    const suffixe = p > 1 ? `&page=${p}` : "";
    const liste = await page(`${BASE}/vestiginglijst.html?ondernemingsnummer=${sansZero}&lang=fr${suffixe}`, f);
    if (liste === null) return { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
    const r = analyserUnites(liste);
    if (r === null) {
      // Une entreprise sans unité n'a pas de tableau : page 1 sans bannière = 0 unité.
      if (p === 1 && /0 unité|Aucune unité/i.test(liste)) break;
      return { ok: false, erreur: ERREUR_BCE_PAGE };
    }
    unites.push(...r.unites);
    if (unites.length >= r.total || r.unites.length === 0) break;
  }
  return { ok: true, entite, unites };
}
```

- [ ] **Step 4 : relancer** — Expected : PASS.

- [ ] **Step 5 : commit**

```bash
git add lib/bce/lecture-serveur.ts lib/bce/lecture-serveur.test.ts
git commit -m "feat(bce): fetch entity and paginated units with clear errors"
```

---

### Task 5 : Types partagés et comparaison BCE

**Files :**
- Create : `lib/entreprises/types.ts`, `lib/bce/comparaison.ts`
- Test : `lib/bce/comparaison.test.ts`

**Interfaces :**
- Produces (`lib/entreprises/types.ts`) :

```ts
export type Reference = { ref_nom: string | null; ref_fonction: string | null; ref_email: string | null; ref_telephone: string | null };
export type Entreprise = Reference & {
  id: string; company_id: string | null; nom: string | null; numero_bce: string | null; denomination_bce: string | null;
  siege_rue: string | null; siege_numero: string | null; siege_boite: string | null; siege_code_postal: string | null; siege_localite: string | null;
  bce_importe_le: string | null; notes: string | null;
};
export type Site = Reference & { id: string; entreprise_id: string; nom: string; principal: boolean; unite_postale_id: string | null; ordre: number };
export type Unite = { id: string; entreprise_id: string; site_id: string | null; numero_ue: string | null; denomination: string | null;
  rue: string | null; numero: string | null; boite: string | null; code_postal: string | null; localite: string | null;
  statut: "actif" | "arrete"; date_debut: string | null; origine: "bce" | "manuel" };
export type Onss = { id: string; entreprise_id: string; site_id: string | null; numero: string; libelle: string | null };
export type CompanyCgLink = { id: string; name: string; sector: string | null; onss: string | null;
  onss2: string | null; onss2_label: string | null; onss3: string | null; onss3_label: string | null; onss4: string | null; onss4_label: string | null };
export type MandatAffiche = { organe: string; qualite: string | null; libelle: string | null; fonction: string | null; site_id: string | null };
export type DelegueAffiche = { id: string; prenom: string | null; nom: string; email: string | null; telephone: string | null; mandats: MandatAffiche[] };
export const COLONNES_ENTREPRISE = "id, company_id, nom, numero_bce, denomination_bce, siege_rue, siege_numero, siege_boite, siege_code_postal, siege_localite, ref_nom, ref_fonction, ref_email, ref_telephone, bce_importe_le, notes";
export const COLONNES_SITE = "id, entreprise_id, nom, principal, unite_postale_id, ref_nom, ref_fonction, ref_email, ref_telephone, ordre";
export const COLONNES_UNITE = "id, entreprise_id, site_id, numero_ue, denomination, rue, numero, boite, code_postal, localite, statut, date_debut, origine";
export const COLONNES_ONSS = "id, entreprise_id, site_id, numero, libelle";
```

- Produces (`lib/bce/comparaison.ts`) :

```ts
export type Changement = { champ: string; libelle: string; avant: string | null; apres: string | null };
export type ComparaisonBce = {
  identite: Changement[];
  nouvelles: UniteBce[];
  modifiees: { id: string; numero_ue: string; changements: Changement[] }[];
  absentes: { id: string; numero_ue: string; adresse: string }[];
  inchangees: number;
};
export type ChoixBce = { identite: string[]; nouvelles: string[]; modifiees: string[] };
export function comparerBce(e: Entreprise, unites: Unite[], bce: { entite: EntiteBce; unites: UniteBce[] }): ComparaisonBce;
export function aucunChangement(c: ComparaisonBce): boolean;
export function choixParDefaut(c: ComparaisonBce): ChoixBce;
export function majEntrepriseDepuisBce(c: ComparaisonBce, choix: ChoixBce): Partial<Entreprise>;
export function majUnitesDepuisBce(c: ComparaisonBce, choix: ChoixBce, bce: UniteBce[]): { inserer: UniteBce[]; modifier: { id: string; maj: Partial<Unite> }[] };
```

- [ ] **Step 1 : écrire `lib/entreprises/types.ts`** (contenu exact du bloc ci-dessus, avec un commentaire
  d'en-tête « Types partagés de l'app Entreprises. Aucune dépendance : importables côté navigateur. »).

- [ ] **Step 2 : tests de la comparaison**

```ts
import { describe, expect, it } from "vitest";
import type { Entreprise, Unite } from "../entreprises/types";
import type { UniteBce } from "./analyse";
import { aucunChangement, choixParDefaut, comparerBce, majEntrepriseDepuisBce, majUnitesDepuisBce } from "./comparaison";

const E: Entreprise = {
  id: "e1", company_id: null, nom: "X", numero_bce: "0850076920", denomination_bce: "ANCIEN NOM",
  siege_rue: "Rue Fonteny Maroy", siege_numero: "13", siege_boite: null, siege_code_postal: "6800", siege_localite: "Libramont-Chevigny",
  ref_nom: null, ref_fonction: null, ref_email: null, ref_telephone: null, bce_importe_le: null, notes: null,
};
const ub = (n: string, extra: Partial<UniteBce> = {}): UniteBce => ({
  numero_ue: n, statut: "actif", date_debut: "2022-01-01", denomination: "D",
  rue: "Rue A", numero: "1", boite: null, code_postal: "5000", localite: "Namur", ...extra,
});
const u = (id: string, n: string, extra: Partial<Unite> = {}): Unite => ({
  id, entreprise_id: "e1", site_id: "s1", origine: "bce", ...ub(n), ...extra,
});
const entite = { denomination: "NOUVEAU NOM", siege: { rue: "Rue Fonteny Maroy", numero: "13", boite: null, code_postal: "6800", localite: "Libramont-Chevigny" } };

describe("comparerBce", () => {
  const c = comparerBce(E, [u("a", "2000000001"), u("b", "2000000002"), u("c", "2000000003")], {
    entite,
    unites: [ub("2000000001"), ub("2000000002", { localite: "Jambes", statut: "arrete" }), ub("2000000004")],
  });
  it("trouve la dénomination changée", () => {
    expect(c.identite).toEqual([{ champ: "denomination_bce", libelle: "Dénomination", avant: "ANCIEN NOM", apres: "NOUVEAU NOM" }]);
  });
  it("classe les unités", () => {
    expect(c.nouvelles.map((x) => x.numero_ue)).toEqual(["2000000004"]);
    expect(c.modifiees).toHaveLength(1);
    expect(c.modifiees[0].changements.map((x) => x.champ).sort()).toEqual(["localite", "statut"]);
    expect(c.absentes.map((x) => x.numero_ue)).toEqual(["2000000003"]);
    expect(c.inchangees).toBe(1);
    expect(aucunChangement(c)).toBe(false);
  });
  it("ne signale pas comme absente une unité manuelle ou déjà arrêtée", () => {
    const c2 = comparerBce(E, [u("m", "2000000009", { origine: "manuel" }), u("z", "2000000008", { statut: "arrete" })], { entite, unites: [] });
    expect(c2.absentes).toEqual([]);
  });
  it("applique seulement les cases cochées", () => {
    const choix = choixParDefaut(c);
    expect(majEntrepriseDepuisBce(c, choix)).toEqual({ denomination_bce: "NOUVEAU NOM" });
    const m = majUnitesDepuisBce(c, { ...choix, modifiees: [] }, [ub("2000000004")]);
    expect(m.inserer.map((x) => x.numero_ue)).toEqual(["2000000004"]);
    expect(m.modifier).toEqual([]);
    const m2 = majUnitesDepuisBce(c, choix, []);
    expect(m2.modifier).toEqual([{ id: "b", maj: { localite: "Jambes", statut: "arrete" } }]);
  });
  it("ne voit aucun changement sur des données identiques", () => {
    const c3 = comparerBce({ ...E, denomination_bce: "NOUVEAU NOM" }, [u("a", "2000000001")], { entite, unites: [ub("2000000001")] });
    expect(aucunChangement(c3)).toBe(true);
  });
});
```

- [ ] **Step 3 : lancer** — `npx vitest run lib/bce/comparaison.test.ts` — Expected : FAIL.

- [ ] **Step 4 : implémenter `lib/bce/comparaison.ts`**

```ts
import type { Entreprise, Unite } from "../entreprises/types";
import type { EntiteBce, UniteBce } from "./analyse";

/** Différences entre la BCE et une fiche, et application des cases cochées. Pur, sans dépendance. */

export type Changement = { champ: string; libelle: string; avant: string | null; apres: string | null };
export type ComparaisonBce = {
  identite: Changement[];
  nouvelles: UniteBce[];
  modifiees: { id: string; numero_ue: string; changements: Changement[] }[];
  absentes: { id: string; numero_ue: string; adresse: string }[];
  inchangees: number;
};
export type ChoixBce = { identite: string[]; nouvelles: string[]; modifiees: string[] };

const CHAMPS_IDENTITE: [keyof Entreprise, string, (b: EntiteBce) => string | null][] = [
  ["denomination_bce", "Dénomination", (b) => b.denomination],
  ["siege_rue", "Siège : rue", (b) => b.siege.rue],
  ["siege_numero", "Siège : numéro", (b) => b.siege.numero],
  ["siege_boite", "Siège : boîte", (b) => b.siege.boite],
  ["siege_code_postal", "Siège : code postal", (b) => b.siege.code_postal],
  ["siege_localite", "Siège : localité", (b) => b.siege.localite],
];

const CHAMPS_UNITE: [keyof UniteBce & keyof Unite, string][] = [
  ["denomination", "Dénomination"],
  ["rue", "Rue"],
  ["numero", "Numéro"],
  ["boite", "Boîte"],
  ["code_postal", "Code postal"],
  ["localite", "Localité"],
  ["statut", "Statut"],
  ["date_debut", "Date de début"],
];

const norm = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v).trim());

function adresseCourte(u: Unite): string {
  return [u.rue, u.numero, u.code_postal, u.localite].filter(Boolean).join(" ");
}

export function comparerBce(e: Entreprise, unites: Unite[], bce: { entite: EntiteBce; unites: UniteBce[] }): ComparaisonBce {
  const identite = CHAMPS_IDENTITE.flatMap(([champ, libelle, lire]) => {
    const avant = norm(e[champ]);
    const apres = norm(lire(bce.entite));
    return apres !== null && avant !== apres ? [{ champ, libelle, avant, apres }] : [];
  });

  const parNumero = new Map(unites.filter((u) => u.numero_ue).map((u) => [u.numero_ue as string, u]));
  const vusBce = new Set(bce.unites.map((b) => b.numero_ue));
  const nouvelles: UniteBce[] = [];
  const modifiees: ComparaisonBce["modifiees"] = [];
  let inchangees = 0;

  for (const b of bce.unites) {
    const ici = parNumero.get(b.numero_ue);
    if (!ici) {
      nouvelles.push(b);
      continue;
    }
    const changements = CHAMPS_UNITE.flatMap(([champ, libelle]) => {
      const avant = norm(ici[champ]);
      const apres = norm(b[champ]);
      return avant !== apres ? [{ champ, libelle, avant, apres }] : [];
    });
    if (changements.length) modifiees.push({ id: ici.id, numero_ue: b.numero_ue, changements });
    else inchangees++;
  }

  const absentes = unites
    .filter((u) => u.origine === "bce" && u.statut === "actif" && u.numero_ue && !vusBce.has(u.numero_ue))
    .map((u) => ({ id: u.id, numero_ue: u.numero_ue as string, adresse: adresseCourte(u) }));

  return { identite, nouvelles, modifiees, absentes, inchangees };
}

export function aucunChangement(c: ComparaisonBce): boolean {
  return !c.identite.length && !c.nouvelles.length && !c.modifiees.length && !c.absentes.length;
}

export function choixParDefaut(c: ComparaisonBce): ChoixBce {
  return {
    identite: c.identite.map((x) => x.champ),
    nouvelles: c.nouvelles.map((x) => x.numero_ue),
    modifiees: c.modifiees.map((x) => x.numero_ue),
  };
}

export function majEntrepriseDepuisBce(c: ComparaisonBce, choix: ChoixBce): Partial<Entreprise> {
  const garder = new Set(choix.identite);
  return Object.fromEntries(c.identite.filter((x) => garder.has(x.champ)).map((x) => [x.champ, x.apres]));
}

export function majUnitesDepuisBce(
  c: ComparaisonBce,
  choix: ChoixBce,
  bce: UniteBce[]
): { inserer: UniteBce[]; modifier: { id: string; maj: Partial<Unite> }[] } {
  const nouvelles = new Set(choix.nouvelles);
  const modifiees = new Set(choix.modifiees);
  return {
    inserer: bce.filter((b) => nouvelles.has(b.numero_ue) && c.nouvelles.some((n) => n.numero_ue === b.numero_ue)),
    modifier: c.modifiees
      .filter((m) => modifiees.has(m.numero_ue))
      .map((m) => ({ id: m.id, maj: Object.fromEntries(m.changements.map((x) => [x.champ, x.apres])) as Partial<Unite> })),
  };
}
```

- [ ] **Step 5 : relancer** — Expected : PASS.

- [ ] **Step 6 : commit**

```bash
git add lib/entreprises/types.ts lib/bce/comparaison.ts lib/bce/comparaison.test.ts
git commit -m "feat(entreprises): shared types and BCE comparison"
```

---

### Task 6 : Règles de l'app (bloc adresse, ONSS, liste, sites)

**Files :**
- Create : `lib/entreprises/regles.ts`
- Test : `lib/entreprises/regles.test.ts`

**Interfaces :**
- Consumes : types de `lib/entreprises/types.ts` ; `chiffres` de `lib/bce/numero.ts`.
- Produces :

```ts
export const REF_DEFAUT = "Service Ressources Humaines";
export type BlocAdresse = { lignes: string[]; incomplet: boolean };
export function nomAffiche(e: Pick<Entreprise, "nom"> | null, company: Pick<CompanyCgLink, "name"> | null): string;
export function blocAdresse(e: Entreprise, nomCgLink: string | null, site?: Site | null, unites?: Unite[]): BlocAdresse;
export function onssDeCompany(c: CompanyCgLink): { numero: string; libelle: string | null }[];
export function onssACreer(cglink: { numero: string; libelle: string | null }[], existants: Pick<Onss, "numero">[]): { numero: string; libelle: string | null }[];
export type EcartsOnss = { manquantsIci: { numero: string; libelle: string | null }[]; absentsCgLink: Onss[] };
export function ecartsOnss(cglink: { numero: string; libelle: string | null }[], ici: Onss[], ignores: string[]): EcartsOnss;
export type Cle = { type: "fiche"; id: string } | { type: "company"; id: string };
export function lireCle(cle: string): Cle | null;
export function cleDe(ficheId: string | null, companyId: string | null): string;
export function planSuppressionSite(site: Site, principal: Site | undefined): { ok: true; versSite: string } | { ok: false; erreur: string };
export type LigneListe = { cle: string; nom: string; denomination: string | null; secteur: string | null; numeroBce: string | null;
  localites: string[]; onss: string[]; affilies: number; sites: number; delegues: number; horsCgLink: boolean; bceManquant: boolean; ecartsOnss: boolean };
export function construireListe(entrees: {
  companies: CompanyCgLink[]; fiches: Entreprise[]; sites: Pick<Site, "entreprise_id">[];
  unites: Pick<Unite, "entreprise_id" | "localite" | "statut">[]; onss: Onss[]; ignores: { cible_id: string; valeur: string }[];
  affilies: Map<string, number>; delegues: Map<string, number>;
}): LigneListe[];
export function correspond(l: LigneListe, recherche: string): boolean;
```

- [ ] **Step 1 : tests**

```ts
import { describe, expect, it } from "vitest";
import type { CompanyCgLink, Entreprise, Onss, Site, Unite } from "./types";
import {
  blocAdresse, cleDe, construireListe, correspond, ecartsOnss, lireCle, nomAffiche,
  onssACreer, onssDeCompany, planSuppressionSite, REF_DEFAUT,
} from "./regles";

const E: Entreprise = {
  id: "e1", company_id: "c1", nom: null, numero_bce: "0850076920", denomination_bce: "ACME SA",
  siege_rue: "Rue Dewez", siege_numero: "40", siege_boite: "2", siege_code_postal: "5000", siege_localite: "Namur",
  ref_nom: null, ref_fonction: null, ref_email: null, ref_telephone: null, bce_importe_le: null, notes: null,
};
const S: Site = { id: "s2", entreprise_id: "e1", nom: "Usine", principal: false, unite_postale_id: "u1",
  ref_nom: "Mme Martin", ref_fonction: "DRH", ref_email: null, ref_telephone: null, ordre: 1 };
const U: Unite = { id: "u1", entreprise_id: "e1", site_id: "s2", numero_ue: "2000000001", denomination: null,
  rue: "Zoning Nord", numero: "5", boite: null, code_postal: "6700", localite: "Arlon", statut: "actif", date_debut: null, origine: "bce" };
const C: CompanyCgLink = { id: "c1", name: "Acme", sector: "Construction", onss: "123-4567-89", onss2: "222", onss2_label: "Site B",
  onss3: null, onss3_label: null, onss4: "", onss4_label: null };

describe("blocAdresse", () => {
  it("utilise le service RH et le siège par défaut", () => {
    expect(blocAdresse(E, "Acme")).toEqual({
      lignes: [`À l'attention de ${REF_DEFAUT}`, "ACME SA", "Rue Dewez 40 bte 2", "5000 Namur"],
      incomplet: false,
    });
  });
  it("ajoute la fonction quand un nom est donné", () => {
    expect(blocAdresse({ ...E, ref_nom: "M. Dupont", ref_fonction: "Directeur" }, null).lignes.slice(0, 2))
      .toEqual(["À l'attention de M. Dupont", "Directeur"]);
  });
  it("prend la personne et l'adresse postale du site", () => {
    expect(blocAdresse(E, "Acme", S, [U]).lignes).toEqual(["À l'attention de Mme Martin", "DRH", "ACME SA", "Zoning Nord 5", "6700 Arlon"]);
  });
  it("retombe sur l'entreprise si le site n'a rien de propre", () => {
    const vide = { ...S, ref_nom: null, ref_fonction: null, unite_postale_id: null };
    expect(blocAdresse(E, "Acme", vide, [U]).lignes[0]).toBe(`À l'attention de ${REF_DEFAUT}`);
    expect(blocAdresse(E, "Acme", vide, [U]).lignes.at(-1)).toBe("5000 Namur");
  });
  it("signale une adresse incomplète sans inventer de texte", () => {
    const r = blocAdresse({ ...E, siege_rue: null, denomination_bce: null }, "Acme");
    expect(r.incomplet).toBe(true);
    expect(r.lignes).toEqual([`À l'attention de ${REF_DEFAUT}`, "Acme", "5000 Namur"]);
  });
});

describe("noms et clés", () => {
  it("affiche le nom usuel, sinon celui de CG Link", () => {
    expect(nomAffiche({ nom: "Perso" }, { name: "CG" })).toBe("Perso");
    expect(nomAffiche({ nom: null }, { name: "CG" })).toBe("CG");
    expect(nomAffiche(null, null)).toBe("Sans nom");
  });
  it("lit et construit les clés de fiche", () => {
    expect(lireCle("c-3f2a1e4b-0000-4000-8000-000000000001")).toEqual({ type: "company", id: "3f2a1e4b-0000-4000-8000-000000000001" });
    expect(lireCle("3f2a1e4b-0000-4000-8000-000000000001")).toEqual({ type: "fiche", id: "3f2a1e4b-0000-4000-8000-000000000001" });
    expect(lireCle("n'importe quoi")).toBeNull();
    expect(cleDe(null, "abc")).toBe("c-abc");
    expect(cleDe("f1", "abc")).toBe("f1");
  });
});

describe("ONSS", () => {
  it("reprend les numéros de CG Link, chiffres seuls, sans vides", () => {
    expect(onssDeCompany(C)).toEqual([{ numero: "123456789", libelle: null }, { numero: "222", libelle: "Site B" }]);
  });
  it("ne recrée pas un numéro existant (double ouverture simultanée)", () => {
    expect(onssACreer(onssDeCompany(C), [{ numero: "123456789" }])).toEqual([{ numero: "222", libelle: "Site B" }]);
  });
  it("calcule les écarts en tenant compte des valeurs ignorées", () => {
    const ici: Onss[] = [{ id: "o1", entreprise_id: "e1", site_id: null, numero: "999", libelle: null }];
    const r = ecartsOnss(onssDeCompany(C), ici, ["222"]);
    expect(r.manquantsIci).toEqual([{ numero: "123456789", libelle: null }]);
    expect(r.absentsCgLink.map((o) => o.numero)).toEqual(["999"]);
  });
});

describe("planSuppressionSite", () => {
  const P: Site = { ...S, id: "s1", principal: true, nom: "Site principal" };
  it("renvoie vers le site principal", () => {
    expect(planSuppressionSite(S, P)).toEqual({ ok: true, versSite: "s1" });
  });
  it("refuse de supprimer le site principal", () => {
    expect(planSuppressionSite(P, P).ok).toBe(false);
  });
  it("refuse si aucun site principal n'existe", () => {
    expect(planSuppressionSite(S, undefined).ok).toBe(false);
  });
});

describe("construireListe", () => {
  const liste = construireListe({
    companies: [C, { ...C, id: "c2", name: "Beta", onss: null, onss2: null }],
    fiches: [E, { ...E, id: "e2", company_id: null, nom: "Gamma", numero_bce: null }],
    sites: [{ entreprise_id: "e1" }, { entreprise_id: "e1" }],
    unites: [{ entreprise_id: "e1", localite: "Arlon", statut: "actif" }, { entreprise_id: "e1", localite: "Namur", statut: "arrete" }],
    onss: [{ id: "o1", entreprise_id: "e1", site_id: null, numero: "123456789", libelle: null }],
    ignores: [],
    affilies: new Map([["c1", 42]]),
    delegues: new Map([["e1", 3]]),
  });
  it("fusionne CG Link et les fiches, triées par nom", () => {
    expect(liste.map((l) => l.nom)).toEqual(["Acme", "Beta", "Gamma"]);
  });
  it("calcule les compteurs et les états", () => {
    const acme = liste[0];
    expect(acme).toMatchObject({ cle: "e1", affilies: 42, sites: 2, delegues: 3, localites: ["Arlon"], horsCgLink: false, bceManquant: false, ecartsOnss: true });
    expect(liste[1]).toMatchObject({ cle: "c-c2", sites: 0, bceManquant: true, ecartsOnss: false });
    expect(liste[2]).toMatchObject({ cle: "e2", horsCgLink: true, bceManquant: true });
  });
  it("recherche par nom, n° BCE (avec ou sans points), ONSS et localité", () => {
    expect(correspond(liste[0], "acm")).toBe(true);
    expect(correspond(liste[0], "0850.076")).toBe(true);
    expect(correspond(liste[0], "123456")).toBe(true);
    expect(correspond(liste[0], "arlon")).toBe(true);
    expect(correspond(liste[0], "zzz")).toBe(false);
  });
});
```

- [ ] **Step 2 : lancer** — `npx vitest run lib/entreprises/regles.test.ts` — Expected : FAIL.

- [ ] **Step 3 : implémenter**

```ts
import { chiffres } from "../bce/numero";
import type { CompanyCgLink, Entreprise, Onss, Site, Unite } from "./types";

/** Règles pures de l'app Entreprises (aucune dépendance serveur : importables côté navigateur). */

export const REF_DEFAUT = "Service Ressources Humaines";
export type BlocAdresse = { lignes: string[]; incomplet: boolean };

export function nomAffiche(e: Pick<Entreprise, "nom"> | null, company: Pick<CompanyCgLink, "name"> | null): string {
  return e?.nom?.trim() || company?.name?.trim() || "Sans nom";
}

type AdresseLignes = { rue: string | null; numero: string | null; boite: string | null; code_postal: string | null; localite: string | null };

function lignesAdresse(a: AdresseLignes): { lignes: string[]; incomplet: boolean } {
  // Sans rue, pas de ligne de rue (jamais un numéro ou une boîte isolés).
  const rue = a.rue ? `${[a.rue, a.numero].filter(Boolean).join(" ")}${a.boite ? ` bte ${a.boite}` : ""}` : "";
  const ville = [a.code_postal, a.localite].filter(Boolean).join(" ");
  return {
    lignes: [rue, ville].filter(Boolean),
    incomplet: !a.rue || !a.code_postal || !a.localite,
  };
}

export function blocAdresse(e: Entreprise, nomCgLink: string | null, site?: Site | null, unites: Unite[] = []): BlocAdresse {
  const ref = site?.ref_nom?.trim() ? site : e;
  const nomRef = ref.ref_nom?.trim();
  const tete = [`À l'attention de ${nomRef || REF_DEFAUT}`];
  if (nomRef && ref.ref_fonction?.trim()) tete.push(ref.ref_fonction.trim());
  const nom = e.denomination_bce?.trim() || e.nom?.trim() || nomCgLink?.trim();
  if (nom) tete.push(nom);

  const postale = site?.unite_postale_id ? unites.find((u) => u.id === site.unite_postale_id) : undefined;
  const adr = postale
    ? lignesAdresse(postale)
    : lignesAdresse({ rue: e.siege_rue, numero: e.siege_numero, boite: e.siege_boite, code_postal: e.siege_code_postal, localite: e.siege_localite });
  return { lignes: [...tete, ...adr.lignes], incomplet: adr.incomplet || !nom };
}

export function onssDeCompany(c: CompanyCgLink): { numero: string; libelle: string | null }[] {
  const brut: [string | null, string | null][] = [
    [c.onss, null], [c.onss2, c.onss2_label], [c.onss3, c.onss3_label], [c.onss4, c.onss4_label],
  ];
  const vus = new Set<string>();
  return brut.flatMap(([n, l]) => {
    const numero = chiffres(n);
    if (!numero || vus.has(numero)) return [];
    vus.add(numero);
    return [{ numero, libelle: l?.trim() || null }];
  });
}

export function onssACreer(cglink: { numero: string; libelle: string | null }[], existants: Pick<Onss, "numero">[]) {
  const deja = new Set(existants.map((o) => o.numero));
  return cglink.filter((o) => !deja.has(o.numero));
}

export type EcartsOnss = { manquantsIci: { numero: string; libelle: string | null }[]; absentsCgLink: Onss[] };

export function ecartsOnss(cglink: { numero: string; libelle: string | null }[], ici: Onss[], ignores: string[]): EcartsOnss {
  const ign = new Set(ignores);
  const numerosCg = new Set(cglink.map((o) => o.numero));
  return {
    manquantsIci: onssACreer(cglink, ici).filter((o) => !ign.has(o.numero)),
    absentsCgLink: cglink.length ? ici.filter((o) => !numerosCg.has(o.numero) && !ign.has(o.numero)) : [],
  };
}

export type Cle = { type: "fiche"; id: string } | { type: "company"; id: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lireCle(cle: string): Cle | null {
  if (cle.startsWith("c-") && UUID.test(cle.slice(2))) return { type: "company", id: cle.slice(2) };
  return UUID.test(cle) ? { type: "fiche", id: cle } : null;
}

export function cleDe(ficheId: string | null, companyId: string | null): string {
  return ficheId ?? `c-${companyId}`;
}

export function planSuppressionSite(site: Site, principal: Site | undefined) {
  if (site.principal) return { ok: false as const, erreur: "Le site principal ne peut pas être supprimé." };
  if (!principal) return { ok: false as const, erreur: "Aucun site principal : rechargez la page." };
  return { ok: true as const, versSite: principal.id };
}

export type LigneListe = {
  cle: string; nom: string; denomination: string | null; secteur: string | null; numeroBce: string | null;
  localites: string[]; onss: string[]; affilies: number; sites: number; delegues: number;
  horsCgLink: boolean; bceManquant: boolean; ecartsOnss: boolean;
};

export function construireListe(entrees: {
  companies: CompanyCgLink[];
  fiches: Entreprise[];
  sites: Pick<Site, "entreprise_id">[];
  unites: Pick<Unite, "entreprise_id" | "localite" | "statut">[];
  onss: Onss[];
  ignores: { cible_id: string; valeur: string }[];
  affilies: Map<string, number>;
  delegues: Map<string, number>;
}): LigneListe[] {
  const ficheDeCompany = new Map(entrees.fiches.filter((f) => f.company_id).map((f) => [f.company_id as string, f]));
  const compte = <T,>(l: T[], cle: (x: T) => string) => l.reduce((m, x) => m.set(cle(x), (m.get(cle(x)) ?? 0) + 1), new Map<string, number>());
  const nbSites = compte(entrees.sites, (s) => s.entreprise_id);

  function ligne(f: Entreprise | undefined, c: CompanyCgLink | undefined): LigneListe {
    const onssIci = f ? entrees.onss.filter((o) => o.entreprise_id === f.id) : [];
    const ign = f ? entrees.ignores.filter((i) => i.cible_id === f.id).map((i) => i.valeur) : [];
    const onssCg = c ? onssDeCompany(c) : [];
    const e = f && c ? ecartsOnss(onssCg, onssIci, ign) : null;
    const localites = f
      ? [...new Set(entrees.unites.filter((u) => u.entreprise_id === f.id && u.statut === "actif" && u.localite).map((u) => u.localite as string))]
      : [];
    return {
      cle: cleDe(f?.id ?? null, c?.id ?? null),
      nom: nomAffiche(f ?? null, c ?? null),
      denomination: f?.denomination_bce ?? null,
      secteur: c?.sector ?? null,
      numeroBce: f?.numero_bce ?? null,
      localites,
      onss: f ? onssIci.map((o) => o.numero) : onssCg.map((o) => o.numero),
      affilies: c ? entrees.affilies.get(c.id) ?? 0 : 0,
      sites: f ? nbSites.get(f.id) ?? 0 : 0,
      delegues: f ? entrees.delegues.get(f.id) ?? 0 : 0,
      horsCgLink: !c,
      bceManquant: !f?.numero_bce,
      ecartsOnss: Boolean(e && (e.manquantsIci.length || e.absentsCgLink.length)),
    };
  }

  const lignes = [
    ...entrees.companies.map((c) => ligne(ficheDeCompany.get(c.id), c)),
    ...entrees.fiches.filter((f) => !f.company_id).map((f) => ligne(f, undefined)),
  ];
  return lignes.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
}

function sansAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function correspond(l: LigneListe, recherche: string): boolean {
  const q = sansAccents(recherche.trim());
  if (!q) return true;
  const qChiffres = chiffres(q);
  const textes = [l.nom, l.denomination ?? "", l.secteur ?? "", ...l.localites].map(sansAccents);
  if (textes.some((t) => t.includes(q))) return true;
  return qChiffres.length >= 3 && [l.numeroBce ?? "", ...l.onss].some((n) => n.includes(qChiffres));
}
```

- [ ] **Step 4 : relancer** — Expected : PASS.

- [ ] **Step 5 : commit**

```bash
git add lib/entreprises/regles.ts lib/entreprises/regles.test.ts
git commit -m "feat(entreprises): address block, ONSS gaps, list building rules"
```

---

### Task 7 : Lectures serveur

**Files :**
- Create : `lib/entreprises/donnees-serveur.ts`

**Interfaces :**
- Consumes : `getSupabaseService` (`lib/supabase-service.ts`), `getSupabaseServer` (`lib/supabase-server.ts`),
  types et `COLONNES_*` (tâche 5), `construireListe` (tâche 6).
- Produces :

```ts
export const COLONNES_COMPANY = "id, name, sector, onss, onss2, onss2_label, onss3, onss3_label, onss4, onss4_label";
export type Affilies = { total: number; parContrat: { type: string; nombre: number }[] };
export function estTableAbsente(code: string | undefined): boolean;
export async function affiliesParCompany(): Promise<Map<string, Affilies>>;
export async function chargerListe(): Promise<{ ok: true; lignes: LigneListe[]; secteurs: string[] } | { ok: false; tablesAbsentes: boolean }>;
export type Fiche = { cle: string; fiche: Entreprise | null; company: CompanyCgLink | null; sites: Site[]; unites: Unite[];
  onss: Onss[]; onssIgnores: string[]; delegues: DelegueAffiche[]; affilies: Affilies | null; companiesLibres: { id: string; name: string }[] };
export async function chargerFiche(cle: string): Promise<{ ok: true; fiche: Fiche } | { ok: false; raison: "introuvable" | "tables" | "erreur" }>;
```

- [ ] **Step 1 : implémenter**

```ts
import { getSupabaseServer } from "../supabase-server";
import { getSupabaseService } from "../supabase-service";
import { construireListe, lireCle, type LigneListe } from "./regles";
import {
  COLONNES_ENTREPRISE, COLONNES_ONSS, COLONNES_SITE, COLONNES_UNITE,
  type CompanyCgLink, type DelegueAffiche, type Entreprise, type Onss, type Site, type Unite,
} from "./types";

/**
 * Lectures de l'app Entreprises. SERVEUR UNIQUEMENT, après exigerApp("entreprises").
 * companies et les tables site_ sont lues en service_role (on ne dépend pas des règles RLS de CG Link) ;
 * les affiliés passent par la fonction site_compter_affilies() avec la session (elle vérifie l'app).
 */

export const COLONNES_COMPANY = "id, name, sector, onss, onss2, onss2_label, onss3, onss3_label, onss4, onss4_label";
export type Affilies = { total: number; parContrat: { type: string; nombre: number }[] };

export function estTableAbsente(code: string | undefined): boolean {
  return code === "42P01" || code === "PGRST205";
}

export async function affiliesParCompany(): Promise<Map<string, Affilies>> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("site_compter_affilies");
  const m = new Map<string, Affilies>();
  if (error) {
    console.error("[entreprises] affiliés :", error.code);
    return m;
  }
  for (const r of (data ?? []) as { company_id: string; contract_type: string | null; nombre: number }[]) {
    const a = m.get(r.company_id) ?? { total: 0, parContrat: [] };
    a.total += Number(r.nombre);
    a.parContrat.push({ type: r.contract_type ?? "Non précisé", nombre: Number(r.nombre) });
    m.set(r.company_id, a);
  }
  for (const a of m.values()) a.parContrat.sort((x, y) => y.nombre - x.nombre);
  return m;
}

export async function chargerListe() {
  const db = getSupabaseService();
  if (!db) return { ok: false as const, tablesAbsentes: false };
  const [companies, fiches, sites, unites, onss, ignores, delegues, affilies] = await Promise.all([
    db.from("companies").select(COLONNES_COMPANY),
    db.from("site_entreprises").select(COLONNES_ENTREPRISE),
    db.from("site_entreprise_sites").select("entreprise_id"),
    db.from("site_entreprise_unites").select("entreprise_id, localite, statut"),
    db.from("site_entreprise_onss").select(COLONNES_ONSS),
    db.from("site_ecarts_ignores").select("cible_id, valeur").eq("cible", "entreprise").eq("champ", "onss"),
    db.from("site_delegues").select("entreprise_id"),
    affiliesParCompany(),
  ]);
  const erreur = [companies, fiches, sites, unites, onss, ignores, delegues].find((r) => r.error)?.error;
  if (erreur) {
    console.error("[entreprises] liste :", erreur.code);
    return { ok: false as const, tablesAbsentes: estTableAbsente(erreur.code) };
  }
  const nbDelegues = new Map<string, number>();
  for (const d of (delegues.data ?? []) as { entreprise_id: string }[]) nbDelegues.set(d.entreprise_id, (nbDelegues.get(d.entreprise_id) ?? 0) + 1);
  const lignes: LigneListe[] = construireListe({
    companies: (companies.data ?? []) as CompanyCgLink[],
    fiches: (fiches.data ?? []) as Entreprise[],
    sites: (sites.data ?? []) as { entreprise_id: string }[],
    unites: (unites.data ?? []) as Pick<Unite, "entreprise_id" | "localite" | "statut">[],
    onss: (onss.data ?? []) as Onss[],
    ignores: (ignores.data ?? []) as { cible_id: string; valeur: string }[],
    affilies: new Map([...affilies].map(([k, v]) => [k, v.total])),
    delegues: nbDelegues,
  });
  const secteurs = [...new Set(lignes.map((l) => l.secteur).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, "fr"));
  return { ok: true as const, lignes, secteurs };
}

export type Fiche = {
  cle: string;
  fiche: Entreprise | null;
  company: CompanyCgLink | null;
  sites: Site[];
  unites: Unite[];
  onss: Onss[];
  onssIgnores: string[];
  delegues: DelegueAffiche[];
  affilies: Affilies | null;
  companiesLibres: { id: string; name: string }[];
};

export async function chargerFiche(cle: string) {
  const c = lireCle(cle);
  const db = getSupabaseService();
  if (!c || !db) return { ok: false as const, raison: "introuvable" as const };

  const ficheQ = c.type === "fiche"
    ? await db.from("site_entreprises").select(COLONNES_ENTREPRISE).eq("id", c.id).maybeSingle()
    : await db.from("site_entreprises").select(COLONNES_ENTREPRISE).eq("company_id", c.id).maybeSingle();
  if (ficheQ.error) return { ok: false as const, raison: estTableAbsente(ficheQ.error.code) ? ("tables" as const) : ("erreur" as const) };
  const fiche = (ficheQ.data ?? null) as Entreprise | null;
  if (c.type === "fiche" && !fiche) return { ok: false as const, raison: "introuvable" as const };

  const companyId = fiche?.company_id ?? (c.type === "company" ? c.id : null);
  const companyQ = companyId ? await db.from("companies").select(COLONNES_COMPANY).eq("id", companyId).maybeSingle() : null;
  const company = (companyQ?.data ?? null) as CompanyCgLink | null;
  if (c.type === "company" && !company) return { ok: false as const, raison: "introuvable" as const };

  const id = fiche?.id ?? "00000000-0000-0000-0000-000000000000";
  const [sites, unites, onss, ignores, delegues, mandats, libres, affilies] = await Promise.all([
    db.from("site_entreprise_sites").select(COLONNES_SITE).eq("entreprise_id", id).order("principal", { ascending: false }).order("ordre").order("nom"),
    db.from("site_entreprise_unites").select(COLONNES_UNITE).eq("entreprise_id", id).order("statut").order("localite"),
    db.from("site_entreprise_onss").select(COLONNES_ONSS).eq("entreprise_id", id).order("numero"),
    db.from("site_ecarts_ignores").select("valeur").eq("cible", "entreprise").eq("cible_id", id).eq("champ", "onss"),
    db.from("site_delegues").select("id, prenom, nom, email, telephone").eq("entreprise_id", id).order("nom"),
    db.from("site_delegue_mandats").select("delegue_id, organe, qualite, libelle, fonction, site_id, fin"),
    fiche && !fiche.company_id ? db.from("companies").select("id, name").order("name") : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    company ? affiliesParCompany() : Promise.resolve(new Map<string, Affilies>()),
  ]);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const mandatsEnCours = ((mandats.data ?? []) as (DelegueAffiche["mandats"][number] & { delegue_id: string; fin: string | null })[])
    .filter((m) => !m.fin || m.fin >= aujourdhui);
  const listeDelegues: DelegueAffiche[] = ((delegues.data ?? []) as Omit<DelegueAffiche, "mandats">[]).map((d) => ({
    ...d,
    mandats: mandatsEnCours.filter((m) => m.delegue_id === d.id).map(({ organe, qualite, libelle, fonction, site_id }) => ({ organe, qualite, libelle, fonction, site_id })),
  }));

  // Entreprises CG Link déjà reliées à une fiche : exclues du choix « Relier à CG Link ».
  let companiesLibres: { id: string; name: string }[] = [];
  if (fiche && !fiche.company_id) {
    const { data: reliees } = await db.from("site_entreprises").select("company_id").not("company_id", "is", null);
    const prises = new Set(((reliees ?? []) as { company_id: string }[]).map((r) => r.company_id));
    companiesLibres = ((libres.data ?? []) as { id: string; name: string }[]).filter((x) => !prises.has(x.id));
  }

  return {
    ok: true as const,
    fiche: {
      cle, fiche, company,
      sites: (sites.data ?? []) as Site[],
      unites: (unites.data ?? []) as Unite[],
      onss: (onss.data ?? []) as Onss[],
      onssIgnores: ((ignores.data ?? []) as { valeur: string }[]).map((i) => i.valeur),
      delegues: listeDelegues,
      affilies: company ? affilies.get(company.id) ?? { total: 0, parContrat: [] } : null,
      companiesLibres,
    } satisfies Fiche,
  };
}
```

Note : la requête des mandats lit tous les mandats (au plus quelques centaines) puis filtre en mémoire, plus
simple qu'une jointure ; si la volumétrie grossit, filtrer par `delegue_id in (…)`.

- [ ] **Step 2 : vérifier les types** — Run : `npx tsc --noEmit` — Expected : aucune erreur dans
  `lib/entreprises/`.

- [ ] **Step 3 : commit**

```bash
git add lib/entreprises/donnees-serveur.ts
git commit -m "feat(entreprises): server reads for list and company card"
```

---

### Task 8 : Squelette de l'app et liste

**Files :**
- Modify : `app/espace/_noyau/icones.ts` (ajouter `Building2`, `IdCard`, `MapPin`)
- Modify : `app/espace/_noyau/registre.ts` (import + `MANIFESTES`)
- Create : `app/espace/entreprises/manifeste.ts`, `layout.tsx`, `page.tsx`, `CLAUDE.md`
- Create : `app/espace/entreprises/liste/page.tsx`, `app/espace/entreprises/liste/ListeEntreprises.tsx`

**Interfaces :**
- Consumes : `chargerListe` (tâche 7), `correspond`, `LigneListe` (tâche 6), `formaterNumeroBce` (tâche 2).
- Produces : route `/espace/entreprises/liste` ; manifeste `entreprises` avec sections `liste`,
  `nouvelle`, `bce`.

- [ ] **Step 1 : icônes** — dans `icones.ts`, ajouter `Building2, IdCard, MapPin` à l'import de
  `lucide-react` (ordre alphabétique) et à `ICONES` :

```ts
  building: Building2,
  "id-card": IdCard,
  "map-pin": MapPin,
```

- [ ] **Step 2 : manifeste, garde, page d'accueil**

`app/espace/entreprises/manifeste.ts` :

```ts
import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseService } from "../../../lib/supabase-service";

/** App « Entreprises » : fiches, BCE, sites (UTE), unités d'établissement, ONSS, bloc adresse. */
export const manifeste: ManifesteApp = {
  code: "entreprises",
  sections: [
    { chemin: "liste", libelle: "Entreprises", icone: "building", aussi: ["^/espace/entreprises/(?!nouvelle|bce$)[^/]+"] },
    { chemin: "nouvelle", libelle: "Nouvelle entreprise", icone: "plus" },
    { chemin: "bce", libelle: "Import BCE", icone: "upload" },
  ],
  // Fiches CG Link sans n° BCE : entreprises CG Link moins celles dont la fiche porte un numéro.
  badge: async () => {
    const db = getSupabaseService();
    if (!db) return null;
    const [{ count: total }, { count: avecBce }] = await Promise.all([
      db.from("companies").select("id", { count: "exact", head: true }),
      db.from("site_entreprises").select("id", { count: "exact", head: true }).not("company_id", "is", null).not("numero_bce", "is", null),
    ]);
    const n = (total ?? 0) - (avecBce ?? 0);
    return n > 0 ? `${n} à compléter` : null;
  },
};
```

Vérifier dans `app/espace/_noyau/CadreEspace.tsx` comment `aussi` est interprété (expression régulière sur
le chemin) et ajuster le motif si la convention diffère (ex. sans `^`).

`app/espace/entreprises/layout.tsx` :

```tsx
import GardeApp from "../_noyau/GardeApp";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <GardeApp code="entreprises">{children}</GardeApp>;
}
```

`app/espace/entreprises/page.tsx` :

```tsx
import { redirect } from "next/navigation";
import { routeSection } from "../_noyau/types";
import { manifeste } from "./manifeste";

/** L'app s'ouvre sur sa première section. */
export default function Page() {
  redirect(routeSection(manifeste.code, manifeste.sections[0].chemin));
}
```

`app/espace/entreprises/CLAUDE.md` :

```md
# App Entreprises : renvoi

Contexte complet : [docs/contexte/entreprises.md](../../../docs/contexte/entreprises.md)
(fiches, BCE, sites = UTE, unités, ONSS, bloc adresse, affiliés, règles d'accès).
Spec : [docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md](../../../docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md).
```

Dans `registre.ts` : `import { manifeste as entreprises } from "../entreprises/manifeste";` puis
`export const MANIFESTES: ManifesteApp[] = [actions, scanNews, demarches, entreprises, parametres];`.

- [ ] **Step 3 : page de liste (serveur)**

`app/espace/entreprises/liste/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { exigerApp } from "../../../../lib/espace/acces";
import { chargerListe } from "../../../../lib/entreprises/donnees-serveur";
import { Alerte, BTN, BTN_PRINCIPAL, EnteteEcran } from "../../_partage/ui";
import ListeEntreprises from "./ListeEntreprises";

export const metadata: Metadata = { title: "Entreprises — Espace CG", robots: { index: false, follow: false } };

export default async function ListePage() {
  await exigerApp("entreprises");
  const r = await chargerListe();

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="building"
        titre="Entreprises"
        description={r.ok ? `${r.lignes.length} entreprise${r.lignes.length > 1 ? "s" : ""}, dont ${r.lignes.filter((l) => l.horsCgLink).length} hors CG Link.` : undefined}
        actions={
          <>
            <Link href="/espace/entreprises/bce" className={BTN}>
              <Upload size={18} aria-hidden /> Import BCE
            </Link>
            <Link href="/espace/entreprises/nouvelle" className={BTN_PRINCIPAL}>
              <Plus size={18} aria-hidden /> Nouvelle entreprise
            </Link>
          </>
        }
      />
      {r.ok ? (
        <ListeEntreprises lignes={r.lignes} secteurs={r.secteurs} />
      ) : (
        <Alerte ton="erreur" titre="Liste indisponible">
          {r.tablesAbsentes
            ? "Les tables de l'app ne sont pas encore créées (migration 20261012120000)."
            : "La base n'a pas répondu. Rechargez la page dans un instant."}
        </Alerte>
      )}
    </div>
  );
}
```

- [ ] **Step 4 : liste (client) avec recherche et filtres**

`app/espace/entreprises/liste/ListeEntreprises.tsx` :

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, Link2Off, Search, TriangleAlert } from "lucide-react";
import { formaterNumeroBce } from "../../../../lib/bce/numero";
import { correspond, type LigneListe } from "../../../../lib/entreprises/regles";
import { CHAMP, LIBELLE, ONGLET, Panneau, Statut, Vide } from "../../_partage/ui";

type Filtre = "toutes" | "bce" | "hors" | "ecarts";
const FILTRES: { code: Filtre; libelle: string; garde: (l: LigneListe) => boolean }[] = [
  { code: "toutes", libelle: "Toutes", garde: () => true },
  { code: "bce", libelle: "BCE non renseignée", garde: (l) => l.bceManquant },
  { code: "hors", libelle: "Hors CG Link", garde: (l) => l.horsCgLink },
  { code: "ecarts", libelle: "Écarts CG Link", garde: (l) => l.ecartsOnss },
];

export default function ListeEntreprises({ lignes, secteurs }: { lignes: LigneListe[]; secteurs: string[] }) {
  const [recherche, setRecherche] = useState("");
  const [secteur, setSecteur] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const visibles = useMemo(() => {
    const garde = FILTRES.find((f) => f.code === filtre)!.garde;
    return lignes.filter((l) => garde(l) && (!secteur || l.secteur === secteur) && correspond(l, recherche));
  }, [lignes, filtre, secteur, recherche]);

  return (
    <Panneau corps={false}>
      <div className="flex flex-wrap items-end gap-3 px-5 pt-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="recherche" className={LIBELLE}>Rechercher</label>
          <div className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="recherche" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom, n° BCE, ONSS, localité…" className={`${CHAMP} pl-9`} autoComplete="off" spellCheck={false} />
          </div>
        </div>
        <div>
          <label htmlFor="secteur" className={LIBELLE}>Secteur</label>
          <select id="secteur" value={secteur} onChange={(e) => setSecteur(e.target.value)} className={CHAMP}>
            <option value="">Tous les secteurs</option>
            {secteurs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-3" role="group" aria-label="Filtrer">
        {FILTRES.map((f) => (
          <button key={f.code} type="button" aria-pressed={filtre === f.code} onClick={() => setFiltre(f.code)} className={ONGLET}>
            {f.libelle} ({lignes.filter(f.garde).length})
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{visibles.length} entreprise{visibles.length > 1 ? "s" : ""} affichée{visibles.length > 1 ? "s" : ""}</p>

      {visibles.length === 0 ? (
        <div className="px-5 pb-5"><Vide icone="building" titre="Aucune entreprise ne correspond.">Modifiez la recherche ou les filtres.</Vide></div>
      ) : (
        <div className="ecg-tableau-cadre">
          <table className="ecg-tableau">
            <thead>
              <tr>
                <th scope="col">Entreprise</th>
                <th scope="col">Secteur</th>
                <th scope="col" className="text-right">Affiliés</th>
                <th scope="col" className="text-right">Sites</th>
                <th scope="col" className="text-right">Délégués</th>
                <th scope="col">État</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => (
                <tr key={l.cle}>
                  <td>
                    <Link href={`/espace/entreprises/${l.cle}`} className="font-semibold ecg-lien">{l.nom}</Link>
                    {(l.denomination || l.numeroBce) && (
                      <div className="ecg-texte-doux text-sm">
                        {[l.denomination, l.numeroBce && formaterNumeroBce(l.numeroBce)].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td>{l.secteur ?? ""}</td>
                  <td className="text-right tabular-nums">{l.horsCgLink ? "" : l.affilies}</td>
                  <td className="text-right tabular-nums">{l.sites || ""}</td>
                  <td className="text-right tabular-nums">{l.delegues || ""}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {l.bceManquant && <Statut ton="attente" icone={CircleAlert}>BCE non renseignée</Statut>}
                      {l.horsCgLink && <Statut ton="info" icone={Link2Off}>Hors CG Link</Statut>}
                      {l.ecartsOnss && <Statut ton="attente" icone={TriangleAlert}>Écarts CG Link</Statut>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panneau>
  );
}
```

- [ ] **Step 5 : vérifier** — `npx tsc --noEmit` (Expected : 0 erreur), puis `npm run dev` et ouvrir
  `/espace/entreprises/liste` connecté en SUPER_ADMIN si une session est disponible ; sinon vérifier au
  moins que `/espace/entreprises/liste` sans session redirige vers `/login`.

- [ ] **Step 6 : commit**

```bash
git add app/espace/_noyau/icones.ts app/espace/_noyau/registre.ts app/espace/entreprises
git commit -m "feat(entreprises): app skeleton and searchable company list"
```

---

### Task 9 : Actions serveur

**Files :**
- Create : `app/espace/entreprises/actions.ts`

**Interfaces :**
- Consumes : `aApp` (`lib/espace/acces.ts`), `getSupabaseServer`, `getSupabaseService`, `lireCle`,
  `onssDeCompany`, `onssACreer`, `planSuppressionSite` (tâche 6), `normaliserNumeroBce`, `chiffres` (tâche 2),
  `lireBce` (tâche 4), `comparerBce`, `majEntrepriseDepuisBce`, `majUnitesDepuisBce` (tâche 5),
  `dateFrToIso` (`lib/dates.ts`), `COLONNES_*` (tâche 5), `COLONNES_COMPANY` (tâche 7).
- Produces (toutes `async`, retour `Resultat` sauf mention) :

```ts
export type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string };
export type Champs = Record<string, string>;
assurerFiche(cle: string): Promise<Resultat<{ id: string; cle: string }>>
enregistrerEntreprise(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>>   // nom, numero_bce, notes, siege_*, ref_*
creerEntreprise(champs: Champs): Promise<Resultat<{ cle: string }>>                       // nom, numero_bce
relierCgLink(ficheId: string, companyId: string): Promise<Resultat>
ajouterSite(cle: string, nom: string): Promise<Resultat<{ cle: string }>>
enregistrerSite(siteId: string, champs: Champs): Promise<Resultat>                      // nom, unite_postale_id, ref_*
supprimerSite(siteId: string): Promise<Resultat>
ajouterUnite(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>>          // denomination, rue, numero, boite, code_postal, localite, date_debut (jj/mm/aaaa), site_id
enregistrerUnite(uniteId: string, champs: Champs): Promise<Resultat>                     // mêmes champs + statut
supprimerUnite(uniteId: string): Promise<Resultat>                                       // manuelles seulement
ajouterOnss(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>>           // numero, libelle, site_id
enregistrerOnss(onssId: string, champs: Champs): Promise<Resultat>
supprimerOnss(onssId: string): Promise<Resultat>
ignorerOnss(ficheId: string, numero: string): Promise<Resultat>
comparerAvecBce(cle: string): Promise<Resultat<{ comparaison: ComparaisonBce; denomination: string | null }>>
appliquerBce(cle: string, choix: ChoixBce): Promise<Resultat<{ cle: string }>>
```

- [ ] **Step 1 : implémenter**

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aApp } from "../../../lib/espace/acces";
import { getSupabaseServer } from "../../../lib/supabase-server";
import { getSupabaseService } from "../../../lib/supabase-service";
import { dateFrToIso } from "../../../lib/dates";
import { chiffres, normaliserNumeroBce } from "../../../lib/bce/numero";
import { lireBce } from "../../../lib/bce/lecture-serveur";
import {
  comparerBce, majEntrepriseDepuisBce, majUnitesDepuisBce, type ChoixBce, type ComparaisonBce,
} from "../../../lib/bce/comparaison";
import { lireCle, onssACreer, onssDeCompany, planSuppressionSite } from "../../../lib/entreprises/regles";
import { COLONNES_COMPANY } from "../../../lib/entreprises/donnees-serveur";
import { COLONNES_ENTREPRISE, COLONNES_SITE, COLONNES_UNITE, type CompanyCgLink, type Entreprise, type Site, type Unite } from "../../../lib/entreprises/types";

/**
 * Écritures de l'app Entreprises. Chaque action revérifie le droit (aApp), puis écrit avec la SESSION de la
 * personne (getSupabaseServer) : la RLS site_a_app('entreprises') s'applique. Seules exceptions, en
 * service_role : lecture de companies (CG Link) et écriture de site_ecarts_ignores (aucune politique d'écriture).
 */

export type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string };
export type Champs = Record<string, string>;

const REFUS = "Accès refusé. Reconnectez-vous.";
const ECHEC = "Enregistrement impossible. Votre session a peut-être expiré : reconnectez-vous puis réessayez.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHAMPS_ENTREPRISE = ["nom", "numero_bce", "notes", "siege_rue", "siege_numero", "siege_boite", "siege_code_postal",
  "siege_localite", "ref_nom", "ref_fonction", "ref_email", "ref_telephone"] as const;
const CHAMPS_SITE = ["nom", "unite_postale_id", "ref_nom", "ref_fonction", "ref_email", "ref_telephone"] as const;
const CHAMPS_UNITE = ["denomination", "rue", "numero", "boite", "code_postal", "localite", "date_debut", "site_id", "statut"] as const;

async function session(): Promise<SupabaseClient | null> {
  return (await aApp("entreprises")) ? await getSupabaseServer() : null;
}

function rafraichir(cle?: string) {
  revalidatePath("/espace/entreprises/liste");
  if (cle) revalidatePath(`/espace/entreprises/${cle}`);
}

const texte = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t ? t : null;
};

/** Ne garde que les champs permis, convertis et validés. */
function nettoyer(champs: Champs, permis: readonly string[]): { ok: true; valeurs: Record<string, string | null> } | { ok: false; erreur: string } {
  const valeurs: Record<string, string | null> = {};
  for (const k of permis) {
    if (!(k in champs)) continue;
    let v = texte(champs[k]);
    if (k === "numero_bce" && v) {
      const n = normaliserNumeroBce(v);
      if (!n) return { ok: false, erreur: "Numéro d'entreprise invalide. Exemple : 0850.076.920" };
      v = n;
    }
    if (k === "ref_email" && v && !EMAIL.test(v)) return { ok: false, erreur: "Adresse e-mail invalide. Exemple : prenom.nom@entreprise.be" };
    if (k === "date_debut" && v) {
      const iso = dateFrToIso(v);
      if (!iso) return { ok: false, erreur: "Date invalide. Format attendu : jj/mm/aaaa" };
      v = iso;
    }
    if (k === "statut" && v && v !== "actif" && v !== "arrete") return { ok: false, erreur: "Statut inconnu." };
    valeurs[k] = v;
  }
  return { ok: true, valeurs };
}

function messageErreur(code: string | undefined): string {
  if (code === "23505") return "Ce numéro existe déjà sur une autre fiche.";
  if (code === "23514") return "Une donnée ne respecte pas le format attendu. Vérifiez les champs.";
  return ECHEC;
}

/**
 * Fiche d'une entreprise CG Link créée à la première modification (idempotent) : fiche, site principal,
 * ONSS repris de CG Link. Deux ouvertures simultanées ne créent ni doublon de fiche ni doublon d'ONSS.
 */
async function ficheDeCle(db: SupabaseClient, cle: string): Promise<{ id: string; cle: string } | null> {
  const c = lireCle(cle);
  if (!c) return null;
  if (c.type === "fiche") return { id: c.id, cle };

  const service = getSupabaseService();
  if (!service) return null;
  const { data: company } = await service.from("companies").select(COLONNES_COMPANY).eq("id", c.id).maybeSingle();
  if (!company) return null;

  await db.from("site_entreprises").upsert({ company_id: c.id }, { onConflict: "company_id", ignoreDuplicates: true });
  const { data: fiche } = await db.from("site_entreprises").select("id").eq("company_id", c.id).maybeSingle();
  if (!fiche) return null;
  const id = fiche.id as string;

  const { data: principal } = await db.from("site_entreprise_sites").select("id").eq("entreprise_id", id).eq("principal", true).maybeSingle();
  if (!principal) {
    const { error } = await db.from("site_entreprise_sites").insert({ entreprise_id: id, nom: "Site principal", principal: true });
    if (error && error.code !== "23505") console.error("[entreprises] site principal :", error.code);
  }
  const { data: existants } = await db.from("site_entreprise_onss").select("numero").eq("entreprise_id", id);
  const aCreer = onssACreer(onssDeCompany(company as CompanyCgLink), (existants ?? []) as { numero: string }[]);
  if (aCreer.length) {
    await db.from("site_entreprise_onss").upsert(
      aCreer.map((o) => ({ entreprise_id: id, numero: o.numero, libelle: o.libelle })),
      { onConflict: "entreprise_id,numero", ignoreDuplicates: true }
    );
  }
  return { id, cle: id };
}

export async function assurerFiche(cle: string): Promise<Resultat<{ id: string; cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  rafraichir(cle);
  return { ok: true, donnees: f };
}

export async function enregistrerEntreprise(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, CHAMPS_ENTREPRISE);
  if (!n.ok) return n;
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  const { data, error } = await db.from("site_entreprises").update(n.valeurs).eq("id", f.id).select("id");
  if (error || !data?.length) return { ok: false, erreur: messageErreur(error?.code) };
  rafraichir(f.cle);
  return { ok: true, donnees: { cle: f.cle }, message: "Modifications enregistrées." };
}

export async function creerEntreprise(champs: Champs): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, ["nom", "numero_bce"]);
  if (!n.ok) return n;
  if (!n.valeurs.nom) return { ok: false, erreur: "Indiquez le nom de l'entreprise." };
  const { data, error } = await db.from("site_entreprises").insert(n.valeurs).select("id").single();
  if (error || !data) return { ok: false, erreur: messageErreur(error?.code) };
  const id = data.id as string;
  await db.from("site_entreprise_sites").insert({ entreprise_id: id, nom: "Site principal", principal: true });
  rafraichir();
  return { ok: true, donnees: { cle: id } };
}

export async function relierCgLink(ficheId: string, companyId: string): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const { data, error } = await db.from("site_entreprises").update({ company_id: companyId }).eq("id", ficheId).is("company_id", null).select("id");
  if (error || !data?.length) {
    return { ok: false, erreur: error?.code === "23505" ? "Cette entreprise CG Link est déjà reliée à une autre fiche." : ECHEC };
  }
  rafraichir(ficheId);
  return { ok: true, message: "Fiche reliée à CG Link." };
}

export async function ajouterSite(cle: string, nom: string): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  if (!nom.trim()) return { ok: false, erreur: "Indiquez le nom du site." };
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  const { error } = await db.from("site_entreprise_sites").insert({ entreprise_id: f.id, nom: nom.trim(), ordre: 1 });
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(f.cle);
  return { ok: true, donnees: { cle: f.cle } };
}

export async function enregistrerSite(siteId: string, champs: Champs): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, CHAMPS_SITE);
  if (!n.ok) return n;
  if ("nom" in n.valeurs && !n.valeurs.nom) return { ok: false, erreur: "Indiquez le nom du site." };
  const { data, error } = await db.from("site_entreprise_sites").update(n.valeurs).eq("id", siteId).select("entreprise_id");
  if (error || !data?.length) return { ok: false, erreur: messageErreur(error?.code) };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "Site enregistré." };
}

export async function supprimerSite(siteId: string): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const { data: site } = await db.from("site_entreprise_sites").select(COLONNES_SITE).eq("id", siteId).maybeSingle();
  if (!site) return { ok: false, erreur: ECHEC };
  const { data: principal } = await db.from("site_entreprise_sites").select(COLONNES_SITE)
    .eq("entreprise_id", (site as Site).entreprise_id).eq("principal", true).maybeSingle();
  const plan = planSuppressionSite(site as Site, (principal ?? undefined) as Site | undefined);
  if (!plan.ok) return plan;
  const [u, o] = await Promise.all([
    db.from("site_entreprise_unites").update({ site_id: plan.versSite }).eq("site_id", siteId),
    db.from("site_entreprise_onss").update({ site_id: plan.versSite }).eq("site_id", siteId),
  ]);
  if (u.error || o.error) return { ok: false, erreur: ECHEC };
  const { error } = await db.from("site_entreprise_sites").delete().eq("id", siteId);
  if (error) return { ok: false, erreur: ECHEC };
  rafraichir((site as Site).entreprise_id);
  return { ok: true, message: "Site supprimé : ses unités et ONSS sont revenus au site principal." };
}

export async function ajouterUnite(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, CHAMPS_UNITE);
  if (!n.ok) return n;
  if (!n.valeurs.rue || !n.valeurs.localite) return { ok: false, erreur: "Indiquez au moins la rue et la localité." };
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  let siteId = n.valeurs.site_id;
  if (!siteId) {
    const { data: p } = await db.from("site_entreprise_sites").select("id").eq("entreprise_id", f.id).eq("principal", true).maybeSingle();
    siteId = (p?.id as string | undefined) ?? null;
  }
  const { error } = await db.from("site_entreprise_unites").insert({ ...n.valeurs, site_id: siteId, entreprise_id: f.id, origine: "manuel" });
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(f.cle);
  return { ok: true, donnees: { cle: f.cle } };
}

export async function enregistrerUnite(uniteId: string, champs: Champs): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, CHAMPS_UNITE);
  if (!n.ok) return n;
  const { data, error } = await db.from("site_entreprise_unites").update(n.valeurs).eq("id", uniteId).select("entreprise_id");
  if (error || !data?.length) return { ok: false, erreur: messageErreur(error?.code) };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "Unité enregistrée." };
}

export async function supprimerUnite(uniteId: string): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const { data, error } = await db.from("site_entreprise_unites").delete().eq("id", uniteId).eq("origine", "manuel").select("entreprise_id");
  if (error) return { ok: false, erreur: ECHEC };
  if (!data?.length) return { ok: false, erreur: "Une unité reprise de la BCE ne se supprime pas : marquez-la « arrêtée »." };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "Unité supprimée." };
}

export async function ajouterOnss(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const numero = chiffres(champs.numero);
  if (!numero) return { ok: false, erreur: "Indiquez le numéro ONSS (chiffres)." };
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  const { error } = await db.from("site_entreprise_onss").insert({
    entreprise_id: f.id, numero, libelle: texte(champs.libelle), site_id: texte(champs.site_id),
  });
  if (error) return { ok: false, erreur: error.code === "23505" ? "Ce numéro ONSS figure déjà sur la fiche." : ECHEC };
  rafraichir(f.cle);
  return { ok: true, donnees: { cle: f.cle } };
}

export async function enregistrerOnss(onssId: string, champs: Champs): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const maj: Record<string, string | null> = {};
  if ("numero" in champs) {
    const numero = chiffres(champs.numero);
    if (!numero) return { ok: false, erreur: "Indiquez le numéro ONSS (chiffres)." };
    maj.numero = numero;
  }
  if ("libelle" in champs) maj.libelle = texte(champs.libelle);
  if ("site_id" in champs) maj.site_id = texte(champs.site_id);
  const { data, error } = await db.from("site_entreprise_onss").update(maj).eq("id", onssId).select("entreprise_id");
  if (error || !data?.length) return { ok: false, erreur: error?.code === "23505" ? "Ce numéro ONSS figure déjà sur la fiche." : ECHEC };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "ONSS enregistré." };
}

export async function supprimerOnss(onssId: string): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const { data, error } = await db.from("site_entreprise_onss").delete().eq("id", onssId).select("entreprise_id");
  if (error || !data?.length) return { ok: false, erreur: ECHEC };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "ONSS supprimé." };
}

export async function ignorerOnss(ficheId: string, numero: string): Promise<Resultat> {
  const user = await aApp("entreprises");
  const service = getSupabaseService();
  if (!user || !service) return { ok: false, erreur: REFUS };
  const { error } = await service.from("site_ecarts_ignores").upsert(
    { cible: "entreprise", cible_id: ficheId, champ: "onss", valeur: chiffres(numero), ignore_par: user.id },
    { onConflict: "cible,cible_id,champ,valeur", ignoreDuplicates: true }
  );
  if (error) return { ok: false, erreur: ECHEC };
  rafraichir(ficheId);
  return { ok: true, message: "Écart ignoré." };
}

/** Données actuelles de la fiche pour la comparaison BCE. */
async function etatFiche(db: SupabaseClient, cle: string) {
  const f = await ficheDeCle(db, cle);
  if (!f) return null;
  const [{ data: e }, { data: u }] = await Promise.all([
    db.from("site_entreprises").select(COLONNES_ENTREPRISE).eq("id", f.id).single(),
    db.from("site_entreprise_unites").select(COLONNES_UNITE).eq("entreprise_id", f.id),
  ]);
  return e ? { f, entreprise: e as Entreprise, unites: (u ?? []) as Unite[] } : null;
}

export async function comparerAvecBce(cle: string): Promise<Resultat<{ comparaison: ComparaisonBce; denomination: string | null }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const etat = await etatFiche(db, cle);
  if (!etat) return { ok: false, erreur: ECHEC };
  if (!etat.entreprise.numero_bce) return { ok: false, erreur: "Indiquez d'abord le numéro d'entreprise BCE de la fiche." };
  const bce = await lireBce(etat.entreprise.numero_bce);
  if (!bce.ok) return bce;
  return { ok: true, donnees: { comparaison: comparerBce(etat.entreprise, etat.unites, bce), denomination: bce.entite.denomination } };
}

/** Relit la BCE (on ne fait pas confiance aux données renvoyées par le navigateur), puis applique les cases cochées. */
export async function appliquerBce(cle: string, choix: ChoixBce): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const etat = await etatFiche(db, cle);
  if (!etat?.entreprise.numero_bce) return { ok: false, erreur: ECHEC };
  const bce = await lireBce(etat.entreprise.numero_bce);
  if (!bce.ok) return bce;
  const comparaison = comparerBce(etat.entreprise, etat.unites, bce);
  const majE = majEntrepriseDepuisBce(comparaison, choix);
  const majU = majUnitesDepuisBce(comparaison, choix, bce.unites);

  const { data: principal } = await db.from("site_entreprise_sites").select("id").eq("entreprise_id", etat.f.id).eq("principal", true).maybeSingle();
  if (majU.inserer.length) {
    const { error } = await db.from("site_entreprise_unites").insert(
      majU.inserer.map((u) => ({ ...u, entreprise_id: etat.f.id, site_id: (principal?.id as string | undefined) ?? null, origine: "bce" }))
    );
    if (error) return { ok: false, erreur: messageErreur(error.code) };
  }
  for (const m of majU.modifier) {
    const { error } = await db.from("site_entreprise_unites").update(m.maj).eq("id", m.id);
    if (error) return { ok: false, erreur: messageErreur(error.code) };
  }
  const { error } = await db.from("site_entreprises").update({ ...majE, bce_importe_le: new Date().toISOString() }).eq("id", etat.f.id);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(etat.f.cle);
  return { ok: true, donnees: { cle: etat.f.cle }, message: "Données de la BCE enregistrées." };
}
```

- [ ] **Step 2 : vérifier les types** — `npx tsc --noEmit` — Expected : 0 erreur.

- [ ] **Step 3 : commit**

```bash
git add app/espace/entreprises/actions.ts
git commit -m "feat(entreprises): server actions with session writes and BCE apply"
```

---

### Task 10 : Fiche — page et panneaux Identité / Siège

**Files :**
- Create : `app/espace/entreprises/[cle]/page.tsx`, `ChampsEdition.tsx`, `PanneauIdentite.tsx`, `PanneauSiege.tsx`

**Interfaces :**
- Consumes : `chargerFiche`, `Fiche` (tâche 7), actions de la tâche 9, `blocAdresse`, `nomAffiche`
  (tâche 6), `formaterNumeroBce` (tâche 2).
- Produces : `ChampsEdition` (props ci-dessous), réutilisé par les tâches 11 et 12 :

```ts
export type DefChamp = { nom: string; libelle: string; type?: "texte" | "email" | "tel" | "zone" | "date" | "choix";
  options?: { valeur: string; libelle: string }[]; aide?: string; exemple?: string; largeur?: "plein" | "demi" | "tiers" };
export default function ChampsEdition(props: { id: string; champs: DefChamp[]; valeurs: Record<string, unknown>;
  enregistrer: (valeurs: Record<string, string>) => Promise<{ ok: true; message?: string; donnees?: { cle?: string } } | { ok: false; erreur: string }>;
  libelleBouton?: string; onSucces?: (donnees?: { cle?: string }) => void }): JSX.Element;
```

- [ ] **Step 1 : `ChampsEdition.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { formatDateFr, isoToDateFr } from "../../../../lib/dates";
import { IconeChargement } from "../../../Chargement";
import { AIDE, BTN_PRINCIPAL, CHAMP, LIBELLE } from "../../_partage/ui";

export type DefChamp = {
  nom: string;
  libelle: string;
  type?: "texte" | "email" | "tel" | "zone" | "date" | "choix";
  options?: { valeur: string; libelle: string }[];
  aide?: string;
  exemple?: string;
  largeur?: "plein" | "demi" | "tiers";
};

type Retour = { ok: true; message?: string; donnees?: { cle?: string } } | { ok: false; erreur: string };

const LARGEUR = { plein: "sm:col-span-6", demi: "sm:col-span-3", tiers: "sm:col-span-2" };

/** Formulaire de champs d'un panneau : enregistre via une action serveur puis rafraîchit la page. */
export default function ChampsEdition({
  id, champs, valeurs, enregistrer, libelleBouton = "Enregistrer", onSucces,
}: {
  id: string;
  champs: DefChamp[];
  valeurs: Record<string, unknown>;
  enregistrer: (valeurs: Record<string, string>) => Promise<Retour>;
  libelleBouton?: string;
  onSucces?: (donnees?: { cle?: string }) => void;
}) {
  const router = useRouter();
  // Les valeurs peuvent venir d'une ligne complète (booléens, nombres) : seuls les champs listés sont repris, en texte.
  const initial: Record<string, string> = Object.fromEntries(
    champs.map((c) => {
      const v = valeurs[c.nom];
      if (v === null || v === undefined) return [c.nom, ""];
      return [c.nom, c.type === "date" && typeof v === "string" ? isoToDateFr(v) : String(v)];
    })
  );
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [enCours, setEnCours] = useState(false);
  const [retour, setRetour] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);
  const modifie = champs.some((c) => form[c.nom] !== initial[c.nom]);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setRetour(null);
    const r = await enregistrer(form);
    setEnCours(false);
    if (!r.ok) {
      setRetour({ ton: "erreur", texte: r.erreur });
      return;
    }
    setRetour({ ton: "ok", texte: r.message ?? "Enregistré." });
    onSucces?.(r.donnees);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="grid gap-3 sm:grid-cols-6">
      {champs.map((c) => {
        const idChamp = `${id}-${c.nom}`;
        const commun = {
          id: idChamp,
          name: c.nom,
          value: form[c.nom] ?? "",
          className: CHAMP,
          "aria-describedby": c.aide ? `${idChamp}-aide` : undefined,
        };
        return (
          <div key={c.nom} className={LARGEUR[c.largeur ?? "plein"]}>
            <label htmlFor={idChamp} className={LIBELLE}>{c.libelle}</label>
            {c.type === "zone" ? (
              <textarea {...commun} rows={3} onChange={(e) => setForm({ ...form, [c.nom]: e.target.value })} />
            ) : c.type === "choix" ? (
              <select {...commun} onChange={(e) => setForm({ ...form, [c.nom]: e.target.value })}>
                {c.options?.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
              </select>
            ) : (
              <input
                {...commun}
                type={c.type === "email" ? "email" : c.type === "tel" ? "tel" : "text"}
                inputMode={c.type === "date" ? "numeric" : c.type === "tel" ? "tel" : c.type === "email" ? "email" : undefined}
                autoComplete="off"
                spellCheck={c.type === "email" ? false : undefined}
                placeholder={c.exemple ? `${c.exemple}…` : c.type === "date" ? "jj/mm/aaaa" : undefined}
                onChange={(e) => setForm({ ...form, [c.nom]: c.type === "date" ? formatDateFr(e.target.value) : e.target.value })}
              />
            )}
            {c.aide && <p id={`${idChamp}-aide`} className={AIDE}>{c.aide}</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button type="submit" disabled={enCours || !modifie} className={BTN_PRINCIPAL}>
          {enCours ? <IconeChargement size={15} /> : <Save size={15} aria-hidden />} {libelleBouton}
        </button>
        {retour && (
          <p role={retour.ton === "erreur" ? "alert" : "status"} className={retour.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>
            {retour.texte}
          </p>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2 : `PanneauIdentite.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { formaterNumeroBce } from "../../../../lib/bce/numero";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { enregistrerEntreprise, relierCgLink } from "../actions";
import { BTN, CHAMP, LIBELLE, Panneau } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import ChampsEdition from "./ChampsEdition";

export default function PanneauIdentite({ fiche }: { fiche: Fiche }) {
  const router = useRouter();
  const e = fiche.fiche;
  const [cible, setCible] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function relier() {
    if (!e || !cible) return;
    setEnCours(true);
    setErreur("");
    const r = await relierCgLink(e.id, cible);
    setEnCours(false);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  return (
    <Panneau titre="Identité" sousTitre={fiche.company ? `Secteur : ${fiche.company.sector ?? "non renseigné"} (CG Link)` : "Entreprise hors CG Link"}>
      {e?.numero_bce && (
        <p className="mb-3 text-sm">
          <a className="ecg-lien inline-flex items-center gap-1" target="_blank" rel="noreferrer"
            href={`https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${e.numero_bce}&actionLu=Zoek&lang=fr`}>
            Voir {formaterNumeroBce(e.numero_bce)} à la BCE <ExternalLink size={14} aria-hidden />
          </a>
        </p>
      )}
      <ChampsEdition
        id="identite"
        valeurs={{
          nom: e?.nom ?? null,
          numero_bce: e?.numero_bce ? formaterNumeroBce(e.numero_bce) : null,
          notes: e?.notes ?? null,
        }}
        champs={[
          { nom: "nom", libelle: fiche.company ? `Nom usuel (sinon « ${fiche.company.name} »)` : "Nom de l'entreprise", largeur: "demi" },
          { nom: "numero_bce", libelle: "N° d'entreprise BCE", exemple: "0850.076.920", largeur: "demi" },
          { nom: "notes", libelle: "Notes internes", type: "zone" },
        ]}
        enregistrer={(v) => enregistrerEntreprise(fiche.cle, v)}
        onSucces={(d) => d?.cle && d.cle !== fiche.cle && router.replace(`/espace/entreprises/${d.cle}`)}
      />
      {e && !e.company_id && fiche.companiesLibres.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <label htmlFor="relier" className={LIBELLE}>Relier à une entreprise CG Link</label>
          <div className="flex flex-wrap gap-2">
            <select id="relier" value={cible} onChange={(ev) => setCible(ev.target.value)} className={`${CHAMP} w-auto flex-1`}>
              <option value="">Choisir une entreprise…</option>
              {fiche.companiesLibres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" onClick={relier} disabled={!cible || enCours} className={BTN}>
              {enCours ? <IconeChargement size={15} /> : <Link2 size={15} aria-hidden />} Relier
            </button>
          </div>
          {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
        </div>
      )}
    </Panneau>
  );
}
```

- [ ] **Step 3 : `PanneauSiege.tsx`** (siège + personne de référence + aperçu du bloc adresse)

```tsx
"use client";

import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { blocAdresse, REF_DEFAUT } from "../../../../lib/entreprises/regles";
import type { Entreprise } from "../../../../lib/entreprises/types";
import { enregistrerEntreprise } from "../actions";
import { Panneau, Statut } from "../../_partage/ui";
import ChampsEdition from "./ChampsEdition";

const VIDE: Entreprise = {
  id: "", company_id: null, nom: null, numero_bce: null, denomination_bce: null, siege_rue: null, siege_numero: null,
  siege_boite: null, siege_code_postal: null, siege_localite: null, ref_nom: null, ref_fonction: null, ref_email: null,
  ref_telephone: null, bce_importe_le: null, notes: null,
};

export function ApercuBloc({ lignes, incomplet }: { lignes: string[]; incomplet: boolean }) {
  return (
    <figure className="rounded-lg border bg-white p-4">
      <figcaption className="ecg-libelle mb-2">Bloc adresse d'un courrier</figcaption>
      <address className="not-italic leading-relaxed">
        {lignes.map((l, i) => <div key={i}>{l}</div>)}
      </address>
      {incomplet && <div className="mt-2"><Statut ton="attente" icone={TriangleAlert}>Adresse incomplète</Statut></div>}
    </figure>
  );
}

export default function PanneauSiege({ fiche }: { fiche: Fiche }) {
  const router = useRouter();
  const e = fiche.fiche ?? VIDE;
  const bloc = blocAdresse(e, fiche.company?.name ?? null);

  return (
    <Panneau titre="Siège social et personne de référence" sousTitre={`Sans nom, les courriers portent « ${REF_DEFAUT} ».`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <ChampsEdition
          id="siege"
          valeurs={e}
          champs={[
            { nom: "siege_rue", libelle: "Rue", largeur: "demi" },
            { nom: "siege_numero", libelle: "Numéro", largeur: "tiers" },
            { nom: "siege_boite", libelle: "Boîte", largeur: "tiers" },
            { nom: "siege_code_postal", libelle: "Code postal", largeur: "tiers" },
            { nom: "siege_localite", libelle: "Localité", largeur: "demi" },
            { nom: "ref_nom", libelle: "Personne de référence", exemple: "Mme Anne Martin", largeur: "demi" },
            { nom: "ref_fonction", libelle: "Fonction", exemple: "Directrice des ressources humaines", largeur: "demi" },
            { nom: "ref_email", libelle: "E-mail", type: "email", largeur: "demi" },
            { nom: "ref_telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
          ]}
          enregistrer={(v) => enregistrerEntreprise(fiche.cle, v)}
          onSucces={(d) => d?.cle && d.cle !== fiche.cle && router.replace(`/espace/entreprises/${d.cle}`)}
        />
        <ApercuBloc {...bloc} />
      </div>
    </Panneau>
  );
}
```

- [ ] **Step 4 : `page.tsx` de la fiche** (les panneaux Sites, Unités, ONSS sont importés ici et créés à
  la tâche 11 ; pour que cette tâche compile seule, créer d'abord ces trois fichiers avec un composant qui
  renvoie `null`, remplacés à la tâche 11)

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Upload, Users } from "lucide-react";
import { exigerApp, monProfil } from "../../../../lib/espace/acces";
import { chargerFiche } from "../../../../lib/entreprises/donnees-serveur";
import { nomAffiche } from "../../../../lib/entreprises/regles";
import { isoToDateFr } from "../../../../lib/dates";
import { Alerte, BTN, EnteteEcran, Panneau } from "../../_partage/ui";
import PanneauIdentite from "./PanneauIdentite";
import PanneauSiege from "./PanneauSiege";
import PanneauSites from "./PanneauSites";
import PanneauUnites from "./PanneauUnites";
import PanneauOnss from "./PanneauOnss";

export const metadata: Metadata = { title: "Entreprise — Espace CG", robots: { index: false, follow: false } };

export default async function FichePage({ params }: { params: Promise<{ cle: string }> }) {
  await exigerApp("entreprises");
  const { cle } = await params;
  const [r, profil] = await Promise.all([chargerFiche(cle), monProfil()]);
  if (!r.ok && r.raison === "introuvable") notFound();
  if (!r.ok) {
    return (
      <div className="ecg-ecran">
        <Alerte ton="erreur" titre="Fiche indisponible">
          {r.raison === "tables" ? "Les tables de l'app ne sont pas encore créées (migration 20261012120000)." : "La base n'a pas répondu. Rechargez la page."}
        </Alerte>
      </div>
    );
  }
  const f = r.fiche;
  const nom = nomAffiche(f.fiche, f.company);
  const superAdmin = profil?.role === "SUPER_ADMIN";

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="building"
        titre={nom}
        description={f.fiche?.denomination_bce ?? (f.fiche?.bce_importe_le ? undefined : "Dénomination BCE non importée.")}
        actions={
          <Link href={`/espace/entreprises/${cle}/bce`} className={BTN}>
            <Upload size={18} aria-hidden /> Importer depuis la BCE
          </Link>
        }
      />
      {f.fiche?.bce_importe_le && (
        <p className="ecg-texte-doux text-sm">Dernier import BCE : {isoToDateFr(f.fiche.bce_importe_le.slice(0, 10))}</p>
      )}
      <PanneauIdentite fiche={f} />
      <PanneauSiege fiche={f} />
      <PanneauSites fiche={f} superAdmin={superAdmin} />
      <PanneauUnites fiche={f} />
      <PanneauOnss fiche={f} />
      {f.affilies && (
        <Panneau titre="Affiliés" sousTitre="Affiliés actifs dans CG Link, lus à l'ouverture de la page.">
          <p className="flex items-center gap-2 text-2xl font-bold">
            <Users size={22} aria-hidden /> {f.affilies.total}
          </p>
          {f.affilies.parContrat.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {f.affilies.parContrat.map((p) => <li key={p.type}>{p.type} : <b>{p.nombre}</b></li>)}
            </ul>
          )}
        </Panneau>
      )}
    </div>
  );
}
```

Fichiers provisoires (remplacés tâche 11), par exemple `PanneauSites.tsx` :

```tsx
"use client";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
export default function PanneauSites(_: { fiche: Fiche; superAdmin: boolean }) {
  return null;
}
```

(idem `PanneauUnites` et `PanneauOnss` avec la prop `{ fiche: Fiche }`).

Attention : `donnees-serveur.ts` importe des modules serveur ; les composants clients n'en importent que
`import type { Fiche }` (sans risque).

- [ ] **Step 5 : vérifier** — `npx tsc --noEmit` (0 erreur) ; `npm run dev`, ouvrir une fiche si une session
  est disponible.

- [ ] **Step 6 : commit**

```bash
git add "app/espace/entreprises/[cle]"
git commit -m "feat(entreprises): company card with identity, head office and address block"
```

---

### Task 11 : Fiche — Sites, Unités, ONSS

**Files :**
- Modify (remplacer les versions provisoires) : `app/espace/entreprises/[cle]/PanneauSites.tsx`,
  `PanneauUnites.tsx`, `PanneauOnss.tsx`

**Interfaces :**
- Consumes : `ChampsEdition`, `ApercuBloc` (tâche 10) ; actions `ajouterSite`, `enregistrerSite`,
  `supprimerSite`, `ajouterUnite`, `enregistrerUnite`, `supprimerUnite`, `ajouterOnss`, `enregistrerOnss`,
  `supprimerOnss`, `ignorerOnss` (tâche 9) ; `blocAdresse`, `ecartsOnss`, `onssDeCompany` (tâche 6) ;
  `formaterNumeroUe` (tâche 2) ; `Confirmation` de `app/espace/_partage/Fenetres.tsx` (lire sa signature avant
  usage).

- [ ] **Step 1 : `PanneauSites.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Trash2, UserRound } from "lucide-react";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { blocAdresse } from "../../../../lib/entreprises/regles";
import type { Site } from "../../../../lib/entreprises/types";
import { ajouterSite, enregistrerSite, supprimerSite } from "../actions";
import { BTN, BTN_PETIT, CHAMP, LIBELLE, Panneau, Statut } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import ChampsEdition from "./ChampsEdition";
import { ApercuBloc } from "./PanneauSiege";

const ORGANES: Record<string, string> = { ds: "DS", ce: "CE", cppt: "CPPT", cee: "CEE", instances_cg: "Instances CG", autre: "Autre" };

function libelleMandat(m: { organe: string; qualite: string | null; libelle: string | null; fonction: string | null }) {
  const q = m.qualite === "effectif" ? " eff." : m.qualite === "suppleant" ? " supp." : "";
  const base = m.organe === "autre" || m.organe === "instances_cg" ? m.libelle ?? ORGANES[m.organe] : `${ORGANES[m.organe]}${q}`;
  return m.fonction ? `${base} (${m.fonction})` : base;
}

function CarteSite({ fiche, site, superAdmin }: { fiche: Fiche; site: Site; superAdmin: boolean }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const unites = fiche.unites.filter((u) => u.site_id === site.id);
  const onss = fiche.onss.filter((o) => o.site_id === site.id);
  const delegues = fiche.delegues
    .map((d) => ({ ...d, mandats: d.mandats.filter((m) => m.site_id === site.id) }))
    .filter((d) => d.mandats.length);
  const bloc = fiche.fiche ? blocAdresse(fiche.fiche, fiche.company?.name ?? null, site, fiche.unites) : null;

  async function supprimer() {
    setEnCours(true);
    const r = await supprimerSite(site.id);
    setEnCours(false);
    setConfirmer(false);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  return (
    <article className="rounded-xl border bg-white p-4" aria-labelledby={`site-${site.id}`}>
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <MapPin size={18} aria-hidden />
        <h3 id={`site-${site.id}`} className="text-lg font-bold">{site.nom}</h3>
        {site.principal && <Statut ton="info" icone={MapPin}>Site principal</Statut>}
        <span className="ecg-texte-doux text-sm">
          {unites.length} unité{unites.length > 1 ? "s" : ""} · {onss.length} ONSS · {delegues.length} délégué{delegues.length > 1 ? "s" : ""}
        </span>
        {!site.principal && (
          confirmer ? (
            <span role="alertdialog" aria-label={`Supprimer le site ${site.nom} ?`} className="ml-auto flex items-center gap-2">
              <b className="text-sm">Supprimer ? Ses unités et ONSS reviennent au site principal.</b>
              <button type="button" autoFocus onClick={supprimer} disabled={enCours} className={`${BTN} ${BTN_PETIT} ecg-btn-danger`}>
                {enCours && <IconeChargement size={14} />} Oui
              </button>
              <button type="button" onClick={() => setConfirmer(false)} className={`${BTN} ${BTN_PETIT}`}>Non</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmer(true)} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger ml-auto`}
              aria-label={`Supprimer le site ${site.nom}`}>
              <Trash2 size={16} aria-hidden />
            </button>
          )
        )}
      </header>
      {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <ChampsEdition
          id={`site-${site.id}`}
          valeurs={site}
          champs={[
            { nom: "nom", libelle: "Nom du site (UTE)", largeur: "demi" },
            {
              nom: "unite_postale_id", libelle: "Adresse postale", type: "choix", largeur: "demi",
              options: [{ valeur: "", libelle: "Siège social" }, ...fiche.unites.filter((u) => u.statut === "actif").map((u) => ({
                valeur: u.id, libelle: [u.rue, u.numero, u.localite].filter(Boolean).join(" "),
              }))],
            },
            { nom: "ref_nom", libelle: "Personne de référence du site", aide: "Vide : celle de l'entreprise.", largeur: "demi" },
            { nom: "ref_fonction", libelle: "Fonction", largeur: "demi" },
            { nom: "ref_email", libelle: "E-mail", type: "email", largeur: "demi" },
            { nom: "ref_telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
          ]}
          enregistrer={(v) => enregistrerSite(site.id, v)}
        />
        {bloc && <ApercuBloc {...bloc} />}
      </div>

      <div className="mt-4">
        <h4 className="ecg-libelle">Délégués et mandats en cours</h4>
        {delegues.length === 0 ? (
          <p className="ecg-texte-doux text-sm">Aucun délégué rattaché à ce site.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {delegues.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <UserRound size={15} aria-hidden />
                <b>{[d.prenom, d.nom].filter(Boolean).join(" ")}</b>
                <span>{d.mandats.map(libelleMandat).join(" · ")}</span>
                {superAdmin && <a href={`/espace/delegues/${d.id}`} className="ecg-lien">Gérer</a>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export default function PanneauSites({ fiche, superAdmin }: { fiche: Fiche; superAdmin: boolean }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function ajouter() {
    setEnCours(true);
    setErreur("");
    const r = await ajouterSite(fiche.cle, nom);
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    setNom("");
    if (r.donnees?.cle && r.donnees.cle !== fiche.cle) router.replace(`/espace/entreprises/${r.donnees.cle}`);
    else router.refresh();
  }

  return (
    <Panneau titre="Sites d'exploitation (UTE)" sousTitre="Chaque unité d'établissement appartient à un site ; les mandats se rattachent au site.">
      <div className="grid gap-4">
        {fiche.sites.length === 0 && <p className="ecg-texte-doux">Le site principal sera créé à la première modification.</p>}
        {fiche.sites.map((s) => <CarteSite key={s.id} fiche={fiche} site={s} superAdmin={superAdmin} />)}
        {fiche.delegues.some((d) => d.mandats.some((m) => !m.site_id)) && (
          <p className="ecg-texte-doux text-sm">Certains mandats ne sont rattachés à aucun site.</p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="nouveau-site" className={LIBELLE}>Ajouter un site</label>
            <input id="nouveau-site" value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP} placeholder="Usine de Marche…" autoComplete="off" />
          </div>
          <button type="button" onClick={ajouter} disabled={!nom.trim() || enCours} className={BTN}>
            {enCours ? <IconeChargement size={15} /> : <Plus size={15} aria-hidden />} Ajouter
          </button>
        </div>
        {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
      </div>
    </Panneau>
  );
}
```

- [ ] **Step 2 : `PanneauUnites.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { formaterNumeroUe } from "../../../../lib/bce/numero";
import { isoToDateFr } from "../../../../lib/dates";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import type { Unite } from "../../../../lib/entreprises/types";
import { ajouterUnite, enregistrerUnite, supprimerUnite } from "../actions";
import { BTN, BTN_PETIT, CHAMP, Panneau, Vide } from "../../_partage/ui";
import ChampsEdition, { type DefChamp } from "./ChampsEdition";

function champsUnite(fiche: Fiche, avecStatut: boolean): DefChamp[] {
  return [
    { nom: "denomination", libelle: "Dénomination", largeur: "plein" },
    { nom: "rue", libelle: "Rue", largeur: "demi" },
    { nom: "numero", libelle: "Numéro", largeur: "tiers" },
    { nom: "boite", libelle: "Boîte", largeur: "tiers" },
    { nom: "code_postal", libelle: "Code postal", largeur: "tiers" },
    { nom: "localite", libelle: "Localité", largeur: "demi" },
    { nom: "date_debut", libelle: "Date de début", type: "date", largeur: "tiers" },
    { nom: "site_id", libelle: "Site", type: "choix", largeur: "demi", options: fiche.sites.map((s) => ({ valeur: s.id, libelle: s.nom })) },
    ...(avecStatut ? [{ nom: "statut", libelle: "Statut", type: "choix" as const, largeur: "tiers" as const,
      options: [{ valeur: "actif", libelle: "Active" }, { valeur: "arrete", libelle: "Arrêtée" }] }] : []),
  ];
}

function LigneUnite({ fiche, u }: { fiche: Fiche; u: Unite }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState("");

  async function rattacher(siteId: string) {
    const r = await enregistrerUnite(u.id, { site_id: siteId });
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }
  async function supprimer() {
    const r = await supprimerUnite(u.id);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  return (
    <>
      <tr>
        <td className="tabular-nums">{u.numero_ue ? formaterNumeroUe(u.numero_ue) : "Sans n°"}</td>
        <td>
          {[u.rue, u.numero, u.boite && `bte ${u.boite}`].filter(Boolean).join(" ")}
          <div className="ecg-texte-doux text-sm">{[u.code_postal, u.localite].filter(Boolean).join(" ")}</div>
        </td>
        <td>{u.date_debut ? isoToDateFr(u.date_debut) : ""}</td>
        <td>
          <label className="sr-only" htmlFor={`site-u-${u.id}`}>Site de l'unité {u.numero_ue ?? u.rue}</label>
          <select id={`site-u-${u.id}`} value={u.site_id ?? ""} onChange={(e) => rattacher(e.target.value)} className={`${CHAMP} w-auto`}>
            <option value="" disabled>Choisir…</option>
            {fiche.sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </td>
        <td className="whitespace-nowrap">
          <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`}
            aria-label={`Modifier l'unité ${u.numero_ue ?? u.rue}`}>
            <Pencil size={16} aria-hidden />
          </button>
          {u.origine === "manuel" && (
            <button type="button" onClick={supprimer} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`}
              aria-label={`Supprimer l'unité ${u.rue ?? ""}`}>
              <Trash2 size={16} aria-hidden />
            </button>
          )}
        </td>
      </tr>
      {erreur && <tr><td colSpan={5}><p role="alert" className="ecg-erreur">{erreur}</p></td></tr>}
      {ouvert && (
        <tr>
          <td colSpan={5}>
            <ChampsEdition id={`u-${u.id}`} valeurs={u} champs={champsUnite(fiche, true)} enregistrer={(v) => enregistrerUnite(u.id, v)} onSucces={() => setOuvert(false)} />
          </td>
        </tr>
      )}
    </>
  );
}

function Tableau({ fiche, unites }: { fiche: Fiche; unites: Unite[] }) {
  return (
    <div className="ecg-tableau-cadre">
      <table className="ecg-tableau">
        <thead>
          <tr><th scope="col">N° d'unité</th><th scope="col">Adresse</th><th scope="col">Début</th><th scope="col">Site</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>{unites.map((u) => <LigneUnite key={u.id} fiche={fiche} u={u} />)}</tbody>
      </table>
    </div>
  );
}

export default function PanneauUnites({ fiche }: { fiche: Fiche }) {
  const [ajout, setAjout] = useState(false);
  const actives = fiche.unites.filter((u) => u.statut === "actif");
  const arretees = fiche.unites.filter((u) => u.statut === "arrete");
  const principal = fiche.sites.find((s) => s.principal);

  return (
    <Panneau
      titre="Unités d'établissement"
      sousTitre={`${actives.length} active${actives.length > 1 ? "s" : ""}`}
      corps={false}
      actions={<button type="button" onClick={() => setAjout(!ajout)} aria-expanded={ajout} className={BTN}><Plus size={15} aria-hidden /> Ajouter à la main</button>}
    >
      {ajout && (
        <div className="px-5 py-4">
          <ChampsEdition id="nouvelle-unite" valeurs={{ site_id: principal?.id ?? "" }} champs={champsUnite(fiche, false)}
            enregistrer={(v) => ajouterUnite(fiche.cle, v)} libelleBouton="Ajouter l'unité" onSucces={() => setAjout(false)} />
        </div>
      )}
      {actives.length === 0 && !ajout ? (
        <div className="px-5 pb-5"><Vide icone="map-pin" titre="Aucune unité d'établissement.">Importez-les depuis la BCE ou ajoutez-les à la main.</Vide></div>
      ) : (
        actives.length > 0 && <Tableau fiche={fiche} unites={actives} />
      )}
      {arretees.length > 0 && (
        <details className="px-5 py-3">
          <summary className="flex cursor-pointer items-center gap-1 font-semibold">
            <ChevronDown size={16} aria-hidden /> {arretees.length} unité{arretees.length > 1 ? "s" : ""} arrêtée{arretees.length > 1 ? "s" : ""}
          </summary>
          <Tableau fiche={fiche} unites={arretees} />
        </details>
      )}
    </Panneau>
  );
}
```

- [ ] **Step 3 : `PanneauOnss.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Trash2, TriangleAlert } from "lucide-react";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { ecartsOnss, onssDeCompany } from "../../../../lib/entreprises/regles";
import { ajouterOnss, enregistrerOnss, ignorerOnss, supprimerOnss } from "../actions";
import { Alerte, BTN, BTN_PETIT, CHAMP, Panneau } from "../../_partage/ui";
import ChampsEdition from "./ChampsEdition";

export default function PanneauOnss({ fiche }: { fiche: Fiche }) {
  const router = useRouter();
  const [erreur, setErreur] = useState("");
  const ecarts = fiche.company && fiche.fiche ? ecartsOnss(onssDeCompany(fiche.company), fiche.onss, fiche.onssIgnores) : null;
  const sites = fiche.sites.map((s) => ({ valeur: s.id, libelle: s.nom }));

  async function faire(p: Promise<{ ok: true } | { ok: false; erreur: string }>) {
    setErreur("");
    const r = await p;
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  return (
    <Panneau titre="Numéros ONSS" corps={false}>
      {ecarts && (ecarts.manquantsIci.length > 0 || ecarts.absentsCgLink.length > 0) && (
        <div className="px-5 pt-4">
          <Alerte ton="attention" icone={TriangleAlert} titre="Écarts avec CG Link">
            <ul className="mt-1 grid gap-2">
              {ecarts.manquantsIci.map((o) => (
                <li key={o.numero} className="flex flex-wrap items-center gap-2">
                  Dans CG Link mais pas ici : <b>{o.numero}</b>{o.libelle && ` (${o.libelle})`}
                  <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => faire(ajouterOnss(fiche.cle, { numero: o.numero, libelle: o.libelle ?? "" }))}>Reprendre</button>
                  <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} onClick={() => faire(ignorerOnss(fiche.fiche!.id, o.numero))}>
                    <EyeOff size={14} aria-hidden /> Ignorer
                  </button>
                </li>
              ))}
              {ecarts.absentsCgLink.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2">
                  Ici mais pas dans CG Link : <b>{o.numero}</b>
                  <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} onClick={() => faire(ignorerOnss(fiche.fiche!.id, o.numero))}>
                    <EyeOff size={14} aria-hidden /> Ignorer
                  </button>
                </li>
              ))}
            </ul>
          </Alerte>
        </div>
      )}
      {erreur && <p role="alert" className="ecg-erreur px-5">{erreur}</p>}
      <ul className="ecg-lignes">
        {fiche.onss.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
            <b className="tabular-nums">{o.numero}</b>
            <span className="min-w-0 flex-1">{o.libelle ?? ""}</span>
            <label className="sr-only" htmlFor={`onss-site-${o.id}`}>Site de l'ONSS {o.numero}</label>
            <select id={`onss-site-${o.id}`} value={o.site_id ?? ""} className={`${CHAMP} w-auto`}
              onChange={(e) => faire(enregistrerOnss(o.id, { site_id: e.target.value }))}>
              <option value="">Tous les sites</option>
              {sites.map((s) => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
            </select>
            <button type="button" aria-label={`Supprimer l'ONSS ${o.numero}`} className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`}
              onClick={() => faire(supprimerOnss(o.id))}>
              <Trash2 size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="ecg-panneau-pied block">
        <ChampsEdition
          id="nouvel-onss"
          valeurs={{}}
          champs={[
            { nom: "numero", libelle: "Ajouter un n° ONSS", exemple: "123456789", largeur: "tiers" },
            { nom: "libelle", libelle: "Libellé", exemple: "Site de Marche", largeur: "tiers" },
            { nom: "site_id", libelle: "Site", type: "choix", largeur: "tiers", options: [{ valeur: "", libelle: "Tous les sites" }, ...sites] },
          ]}
          enregistrer={(v) => ajouterOnss(fiche.cle, v)}
          libelleBouton="Ajouter"
          onSucces={(d) => d?.cle && d.cle !== fiche.cle && router.replace(`/espace/entreprises/${d.cle}`)}
        />
      </div>
    </Panneau>
  );
}
```

- [ ] **Step 4 : vérifier** — `npx tsc --noEmit` (0 erreur) ; `npm test` (tous verts).

- [ ] **Step 5 : commit**

```bash
git add "app/espace/entreprises/[cle]"
git commit -m "feat(entreprises): sites, establishment units and ONSS panels"
```

---

### Task 12 : Nouvelle entreprise

**Files :**
- Create : `app/espace/entreprises/nouvelle/page.tsx`, `app/espace/entreprises/nouvelle/FormulaireNouvelle.tsx`

**Interfaces :**
- Consumes : `creerEntreprise` (tâche 9), `ChampsEdition` (tâche 10).

- [ ] **Step 1 : page**

```tsx
import type { Metadata } from "next";
import { exigerApp } from "../../../../lib/espace/acces";
import { EnteteEcran, Panneau } from "../../_partage/ui";
import FormulaireNouvelle from "./FormulaireNouvelle";

export const metadata: Metadata = { title: "Nouvelle entreprise — Espace CG", robots: { index: false, follow: false } };

export default async function NouvellePage() {
  await exigerApp("entreprises");
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="plus" titre="Nouvelle entreprise"
        description="Pour une entreprise absente de CG Link. Les entreprises de CG Link sont déjà dans la liste." />
      <Panneau>
        <FormulaireNouvelle />
      </Panneau>
    </div>
  );
}
```

- [ ] **Step 2 : formulaire**

```tsx
"use client";

import { useRouter } from "next/navigation";
import ChampsEdition from "../[cle]/ChampsEdition";
import { creerEntreprise } from "../actions";

export default function FormulaireNouvelle() {
  const router = useRouter();
  return (
    <ChampsEdition
      id="nouvelle"
      valeurs={{}}
      champs={[
        { nom: "nom", libelle: "Nom de l'entreprise", largeur: "demi" },
        { nom: "numero_bce", libelle: "N° d'entreprise BCE (facultatif)", exemple: "0850.076.920", largeur: "demi",
          aide: "Avec le numéro, vous pourrez importer la dénomination et les unités depuis la BCE." },
      ]}
      enregistrer={creerEntreprise}
      libelleBouton="Créer la fiche"
      onSucces={(d) => d?.cle && router.push(`/espace/entreprises/${d.cle}`)}
    />
  );
}
```

- [ ] **Step 3 : vérifier** — `npx tsc --noEmit` — 0 erreur.

- [ ] **Step 4 : commit**

```bash
git add app/espace/entreprises/nouvelle
git commit -m "feat(entreprises): create a company card outside CG Link"
```

---

### Task 13 : Import BCE (une fiche, puis toutes)

**Files :**
- Create : `app/espace/entreprises/[cle]/bce/page.tsx`, `app/espace/entreprises/[cle]/bce/ComparaisonBce.tsx`
- Create : `app/espace/entreprises/bce/page.tsx`, `app/espace/entreprises/bce/ImportGroupe.tsx`

**Interfaces :**
- Consumes : `comparerAvecBce`, `appliquerBce` (tâche 9), `choixParDefaut`, `aucunChangement`,
  types `ComparaisonBce`, `ChoixBce` (tâche 5), `chargerListe` (tâche 7), `formaterNumeroUe`,
  `formaterNumeroBce` (tâche 2), `isoToDateFr`.

- [ ] **Step 1 : page d'une fiche**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigerApp } from "../../../../../lib/espace/acces";
import { lireCle } from "../../../../../lib/entreprises/regles";
import { EnteteEcran } from "../../../_partage/ui";
import ComparaisonBce from "./ComparaisonBce";

export const metadata: Metadata = { title: "Import BCE — Espace CG", robots: { index: false, follow: false } };

export default async function BcePage({ params }: { params: Promise<{ cle: string }> }) {
  await exigerApp("entreprises");
  const { cle } = await params;
  if (!lireCle(cle)) notFound();
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="upload" titre="Importer depuis la BCE"
        description="Comparez les données de la BCE avec la fiche, puis cochez ce qu'il faut enregistrer. Rien n'est supprimé." />
      <ComparaisonBce cle={cle} />
    </div>
  );
}
```

- [ ] **Step 2 : comparaison (client)** — lance `comparerAvecBce` au montage, affiche les différences en
  cases à cocher, enregistre avec `appliquerBce`.

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { formaterNumeroUe } from "../../../../../lib/bce/numero";
import { aucunChangement, choixParDefaut, type ChoixBce, type ComparaisonBce as Comparaison } from "../../../../../lib/bce/comparaison";
import { isoToDateFr } from "../../../../../lib/dates";
import { appliquerBce, comparerAvecBce } from "../../actions";
import { EcranChargement, IconeChargement } from "../../../../Chargement";
import { Alerte, BTN, BTN_PRINCIPAL, Panneau } from "../../../_partage/ui";

const valeur = (champ: string, v: string | null) =>
  v === null ? "vide" : champ === "date_debut" ? isoToDateFr(v) : champ === "statut" ? (v === "actif" ? "active" : "arrêtée") : v;

export default function ComparaisonBce({ cle }: { cle: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<{ c: Comparaison } | { erreur: string } | null>(null);
  const [choix, setChoix] = useState<ChoixBce>({ identite: [], nouvelles: [], modifiees: [] });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;
    comparerAvecBce(cle).then((r) => {
      if (!actif) return;
      if (!r.ok || !r.donnees) setEtat({ erreur: r.ok ? "Réponse vide." : r.erreur });
      else {
        setEtat({ c: r.donnees.comparaison });
        setChoix(choixParDefaut(r.donnees.comparaison));
      }
    });
    return () => { actif = false; };
  }, [cle]);

  const retour = (
    <Link href={`/espace/entreprises/${cle}`} className={BTN}><ArrowLeft size={16} aria-hidden /> Retour à la fiche</Link>
  );
  if (!etat) return <EcranChargement message="Lecture de la BCE…" />;
  if ("erreur" in etat) return <><Alerte ton="erreur" titre="Import impossible">{etat.erreur}</Alerte>{retour}</>;
  const c = etat.c;
  if (aucunChangement(c)) return <><Alerte ton="succes">La fiche est à jour avec la BCE ({c.inchangees} unité{c.inchangees > 1 ? "s" : ""} identique{c.inchangees > 1 ? "s" : ""}).</Alerte>{retour}</>;

  const bascule = (cleChoix: keyof ChoixBce, v: string) =>
    setChoix((x) => ({ ...x, [cleChoix]: x[cleChoix].includes(v) ? x[cleChoix].filter((y) => y !== v) : [...x[cleChoix], v] }));

  async function enregistrer() {
    setEnCours(true);
    setErreur("");
    const r = await appliquerBce(cle, choix);
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    router.push(`/espace/entreprises/${r.donnees?.cle ?? cle}`);
    router.refresh();
  }

  return (
    <>
      {c.identite.length > 0 && (
        <Panneau titre="Identité et siège">
          <ul className="grid gap-2">
            {c.identite.map((x) => (
              <li key={x.champ}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 h-5 w-5" checked={choix.identite.includes(x.champ)} onChange={() => bascule("identite", x.champ)} />
                  <span><b>{x.libelle}</b> : {valeur(x.champ, x.avant)} → <b>{valeur(x.champ, x.apres)}</b></span>
                </label>
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      {c.nouvelles.length > 0 && (
        <Panneau titre={`Nouvelles unités (${c.nouvelles.length})`} sousTitre="Ajoutées au site principal ; vous pourrez les rattacher à un autre site.">
          <ul className="grid gap-2">
            {c.nouvelles.map((u) => (
              <li key={u.numero_ue}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 h-5 w-5" checked={choix.nouvelles.includes(u.numero_ue)} onChange={() => bascule("nouvelles", u.numero_ue)} />
                  <span>
                    <b>{formaterNumeroUe(u.numero_ue)}</b> · {[u.rue, u.numero, u.boite && `bte ${u.boite}`, u.code_postal, u.localite].filter(Boolean).join(" ")}
                    {u.statut === "arrete" && " · arrêtée"}{u.date_debut && ` · depuis le ${isoToDateFr(u.date_debut)}`}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      {c.modifiees.length > 0 && (
        <Panneau titre={`Unités modifiées (${c.modifiees.length})`}>
          <ul className="grid gap-3">
            {c.modifiees.map((m) => (
              <li key={m.numero_ue}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 h-5 w-5" checked={choix.modifiees.includes(m.numero_ue)} onChange={() => bascule("modifiees", m.numero_ue)} />
                  <span>
                    <b>{formaterNumeroUe(m.numero_ue)}</b>
                    <ul className="text-sm">{m.changements.map((x) => <li key={x.champ}>{x.libelle} : {valeur(x.champ, x.avant)} → <b>{valeur(x.champ, x.apres)}</b></li>)}</ul>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      {c.absentes.length > 0 && (
        <Alerte ton="attention" titre="Unités absentes de la BCE">
          {c.absentes.map((a) => `${formaterNumeroUe(a.numero_ue)} (${a.adresse})`).join(" ; ")}. Elles restent sur la fiche :
          marquez-les « arrêtées » si elles n'existent plus.
        </Alerte>
      )}
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={enregistrer} disabled={enCours} className={BTN_PRINCIPAL}>
          {enCours ? <IconeChargement size={15} /> : <Save size={15} aria-hidden />} Enregistrer la sélection
        </button>
        {retour}
      </div>
    </>
  );
}
```

Vérifier la signature d'`EcranChargement` dans `app/Chargement.tsx` (prop du message) et l'adapter.

- [ ] **Step 3 : import groupé — page**

```tsx
import type { Metadata } from "next";
import { exigerApp } from "../../../../lib/espace/acces";
import { chargerListe } from "../../../../lib/entreprises/donnees-serveur";
import { Alerte, EnteteEcran } from "../../_partage/ui";
import ImportGroupe from "./ImportGroupe";

export const metadata: Metadata = { title: "Import BCE — Espace CG", robots: { index: false, follow: false } };

export default async function ImportBcePage() {
  await exigerApp("entreprises");
  const r = await chargerListe();
  const fiches = r.ok ? r.lignes.filter((l) => l.numeroBce).map((l) => ({ cle: l.cle, nom: l.nom })) : [];
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="upload" titre="Import BCE de toutes les fiches"
        description="Les fiches qui ont un n° d'entreprise sont comparées une à une avec la BCE (2 secondes entre deux). Rien n'est enregistré sans votre validation." />
      {r.ok ? <ImportGroupe fiches={fiches} sansNumero={r.lignes.length - fiches.length} /> : <Alerte ton="erreur">La liste n'a pas pu être lue. Rechargez la page.</Alerte>}
    </div>
  );
}
```

- [ ] **Step 4 : import groupé — client**

```tsx
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleAlert, Play, Square, TriangleAlert } from "lucide-react";
import { aucunChangement } from "../../../../lib/bce/comparaison";
import { comparerAvecBce } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { Alerte, BTN, BTN_PRINCIPAL, Panneau, Statut } from "../../_partage/ui";

type Etat = { cle: string; nom: string; statut: "attente" | "encours" | "ajour" | "changements" | "erreur"; detail?: string };
const PAUSE_MS = 2000;

export default function ImportGroupe({ fiches, sansNumero }: { fiches: { cle: string; nom: string }[]; sansNumero: number }) {
  const [etats, setEtats] = useState<Etat[]>(fiches.map((f) => ({ ...f, statut: "attente" })));
  const [enCours, setEnCours] = useState(false);
  const arret = useRef(false);

  async function lancer() {
    setEnCours(true);
    arret.current = false;
    for (let i = 0; i < fiches.length && !arret.current; i++) {
      setEtats((e) => e.map((x, j) => (j === i ? { ...x, statut: "encours" } : x)));
      const r = await comparerAvecBce(fiches[i].cle);
      const suivant: Etat = !r.ok || !r.donnees
        ? { ...fiches[i], statut: "erreur", detail: r.ok ? "Réponse vide." : r.erreur }
        : aucunChangement(r.donnees.comparaison)
          ? { ...fiches[i], statut: "ajour" }
          : {
              ...fiches[i], statut: "changements",
              detail: `${r.donnees.comparaison.identite.length + r.donnees.comparaison.nouvelles.length + r.donnees.comparaison.modifiees.length + r.donnees.comparaison.absentes.length} changement(s) à valider`,
            };
      setEtats((e) => e.map((x, j) => (j === i ? suivant : x)));
      if (i < fiches.length - 1) await new Promise((res) => setTimeout(res, PAUSE_MS));
    }
    setEnCours(false);
  }

  return (
    <>
      {sansNumero > 0 && <Alerte ton="info">{sansNumero} fiche{sansNumero > 1 ? "s n'ont" : " n'a"} pas de n° d'entreprise et ne {sansNumero > 1 ? "sont" : "est"} pas comparée{sansNumero > 1 ? "s" : ""}.</Alerte>}
      <div className="flex gap-2">
        {enCours ? (
          <button type="button" onClick={() => (arret.current = true)} className={BTN}><Square size={15} aria-hidden /> Arrêter après la fiche en cours</button>
        ) : (
          <button type="button" onClick={lancer} disabled={!fiches.length} className={BTN_PRINCIPAL}><Play size={15} aria-hidden /> Comparer {fiches.length} fiche{fiches.length > 1 ? "s" : ""}</button>
        )}
      </div>
      <Panneau corps={false}>
        <ul className="ecg-lignes" aria-live="polite">
          {etats.map((e) => (
            <li key={e.cle} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 font-semibold">{e.nom}</span>
              {e.statut === "encours" && <span className="inline-flex items-center gap-1"><IconeChargement size={14} /> Lecture…</span>}
              {e.statut === "ajour" && <Statut ton="ok" icone={CircleCheck}>À jour</Statut>}
              {e.statut === "changements" && (
                <>
                  <Statut ton="attente" icone={TriangleAlert}>{e.detail}</Statut>
                  <Link className="ecg-lien" href={`/espace/entreprises/${e.cle}/bce`}>Valider</Link>
                </>
              )}
              {e.statut === "erreur" && <Statut ton="erreur" icone={CircleAlert}>{e.detail}</Statut>}
            </li>
          ))}
        </ul>
      </Panneau>
    </>
  );
}
```

- [ ] **Step 5 : vérifier** — `npx tsc --noEmit` ; `npm test` ; `npm run dev` puis, si une session est
  disponible, importer la BCE d'une fiche réelle.

- [ ] **Step 6 : commit**

```bash
git add "app/espace/entreprises/[cle]/bce" app/espace/entreprises/bce
git commit -m "feat(entreprises): BCE import with review, single and batch"
```

---

### Task 14 : Documentation et contrôles de fin

**Files :**
- Create : `docs/contexte/entreprises.md`
- Modify : `CLAUDE.md` (carte des documents, état actuel), `app/espace/CLAUDE.md` (routes, couleur, apps),
  `docs/contexte/base-de-donnees.md` (nouvelles tables), `docs/contexte/journal.md` (ancien état en tête)

- [ ] **Step 1 : `docs/contexte/entreprises.md`** — rédiger (en français, dates `jj/mm/aaaa`) :
  rôle de l'app, accès (SUPER_ADMIN, ADMIN_OP, PERMANENT ; délégués exclus), routes (tableau des 6 routes de
  la spec 6.1), sources (nom et affiliés lus en direct dans CG Link ; ONSS repris puis écarts), import BCE
  (adresses kbopub, pages de 20, pièges : dates en lettres, localité collée, boîte « . » ; délai 15 s ;
  2 s entre deux fiches), bloc adresse (règles 6.4 et fonction `blocAdresse()`), fiche créée à la première
  modification (`ficheDeCle`), tables et règles RLS (copie de la spec 5.1–5.2), fonction
  `site_compter_affilies()`, migration `20261012120000` appliquée le 12/10/2026, écritures en session.

- [ ] **Step 2 : `CLAUDE.md`** — ajouter à la carte :
  `| [docs/contexte/entreprises.md](docs/contexte/entreprises.md) | App Entreprises : fiches, BCE, sites (UTE), unités, ONSS, bloc adresse |` ;
  ajouter `app/espace/entreprises/CLAUDE.md` aux renvois ; déplacer l'« État actuel » en tête de
  `docs/contexte/journal.md` et écrire le nouvel état (lot A livré sur `entreprises`, non poussé ; à faire
  par Fred : parcourir l'app connecté, valider couleurs et icônes, correctif `workers` côté CG Link ;
  ensuite plan du lot B).

- [ ] **Step 3 : `app/espace/CLAUDE.md`** — ajouter les routes `/espace/entreprises/…` au tableau, la
  couleur `#E69F00` à la liste des exceptions de couleur, et la ligne `entreprises → ADMIN_OP, PERMANENT`
  dans « Au 08/10/2026 » (avec la date du 12/10/2026).

- [ ] **Step 4 : `docs/contexte/base-de-donnees.md`** — section « Entreprises et délégués (12/10/2026) »
  avec le tableau des 8 tables (Objet / Rôle / Accès) et la fonction `site_compter_affilies()`.

- [ ] **Step 5 : contrôles de fin**

Run : `npx tsc --noEmit` — Expected : 0 erreur.
Run : `npm test` — Expected : tous les tests passent (anciens + nouveaux).
Run : `npm run build` — Expected : build réussi, routes `/espace/entreprises/…` listées.

- [ ] **Step 6 : commit**

```bash
git add docs CLAUDE.md app/espace/CLAUDE.md
git commit -m "docs(entreprises): context document and CLAUDE.md map"
```

- [ ] **Step 7 : liste de vérification pour Fred** (dans le message de fin, pas dans un fichier) :
  1. ouvrir l'Espace : tuile « Entreprises » (orange, icône bâtiment), badge « N à compléter » ;
  2. liste : recherche par nom, n° BCE, ONSS, localité ; filtres ;
  3. ouvrir une entreprise CG Link, saisir son n° BCE → fiche créée, site principal, ONSS repris ;
  4. « Importer depuis la BCE » → comparaison → enregistrer → unités visibles, dénomination et siège remplis ;
  5. créer un 2ᵉ site, y rattacher une unité, choisir son adresse postale et une personne de référence →
     aperçu du bloc adresse ;
  6. supprimer ce site → unités revenues au site principal ;
  7. import groupé sur quelques fiches ;
  8. avec un compte PERMANENT : l'app est visible et modifiable ; avec un compte DELEGATE : l'app est absente.
```

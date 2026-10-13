# Projet — Site & outil de com ACCG Nalux

> **Fichier de contexte partagé.** À garder à la racine du projet `web_affiliations`,
> à relire et à mettre à jour au fil de l'avancement. Il sert de mémoire commune
> entre Fred, Claude (sur claude.ai), Claude Code et l'assistant de Cursor.
>
> Dernière mise à jour : **13/10/2026**

---

## Carte des documents (ce fichier a des ramifications)

**Ce fichier est le tronc commun : il ne contient que l'essentiel.** Depuis le 12/10/2026, le détail de
chaque domaine vit dans des documents séparés, listés ci-dessous. **Avant de travailler sur un domaine,
lire son document.** Claude.ai et Cursor ne les chargent pas tout seuls : les ouvrir (ou les joindre à la
conversation sur claude.ai) quand le sujet les concerne. Claude Code charge tout seul `app/espace/CLAUDE.md`
et les petits `CLAUDE.md` de renvoi des apps quand il travaille dans ces dossiers.

| Document | Contenu |
|---|---|
| [docs/contexte/site-public.md](docs/contexte/site-public.md) | Pages publiques et leurs routes, navigation, bandeau, consentement aux cookies, grille des démarches |
| [app/espace/CLAUDE.md](app/espace/CLAUDE.md) | **Espace CG** (back-office en apps) : droits, protection, style des écrans, Comptes & accès, finition, routes de l'Espace et API réservées, ajouter une app |
| [docs/contexte/scan-news-et-publications.md](docs/contexte/scan-news-et-publications.md) | Blog (Actualités), Scan News (veille RSS, Check IA, conférence de rédaction), rédaction assistée par IA, On vous explique, déclinaison réseaux |
| [docs/contexte/assistant-cg.md](docs/contexte/assistant-cg.md) | Assistant CG (chatbot d'aiguillage) : règles, parcours, confidentialité |
| [docs/contexte/base-de-donnees.md](docs/contexte/base-de-donnees.md) | Tables `site_*` et `web_*`, colonnes, mobilisations, règles métier des actions, back-office des demandes, envois automatiques |
| [docs/contexte/design.md](docs/contexte/design.md) | Direction D en détail : palette et contrastes, composants, pied de page, logos, PDF, formulaires, chargement |
| [docs/contexte/feuille-de-route.md](docs/contexte/feuille-de-route.md) | Les phases (0, 1, 4) et les idées à venir |
| [docs/contexte/entreprises.md](docs/contexte/entreprises.md) | App **Entreprises** : fiches, import BCE, sites (UTE), unités d'établissement, ONSS, bloc adresse, affiliés |
| [docs/contexte/delegues.md](docs/contexte/delegues.md) | App **Gestion délégués CG Link** (SUPER_ADMIN ; permanents limités à leurs entreprises, sans les comptes CG Link) : import CG Link, cartes d'identité, mandats, unité de rattachement, à vérifier, journal |
| [docs/contexte/permanents.md](docs/contexte/permanents.md) | App **Accès permanents** : périmètre du permanent (CG Link), tableau de bord, fiches de suivi (IA, PDF), rapport de congrès, historique des entreprises |
| [docs/contexte/liberations.md](docs/contexte/liberations.md) | App **Libérations** : cahier des charges des 4 lots (demande, courriers, QR code du jour J, frais, archive), décisions de Fred, lot 1 (droits, parcours, routes, tables) |
| [docs/contexte/journal.md](docs/contexte/journal.md) | Anciens « État au… » (historique, du plus récent au plus ancien) |

Renvois chargés automatiquement par Claude Code (quelques lignes chacun, ils pointent vers le bon document) :
`app/espace/actions/CLAUDE.md`, `app/espace/scan-news/CLAUDE.md`, `app/espace/demarches/CLAUDE.md`,
`app/espace/entreprises/CLAUDE.md`, `app/espace/delegues/CLAUDE.md`, `app/espace/permanents/CLAUDE.md`,
`app/espace/liberations/CLAUDE.md`, `supabase/CLAUDE.md`.

### Mettre à jour ce fichier et ses ramifications

**Quand Fred demande de « mettre à jour CLAUDE.md », mettre à jour le ou les bons documents**, pas
seulement celui-ci :
- un changement dans un domaine → son document (voir la carte ci-dessus) ;
- une règle transversale (sécurité, conventions, architecture, rappels techniques) → ce fichier ;
- l'avancement → section « État actuel » ci-dessous ; l'ancien état part en tête de
  [docs/contexte/journal.md](docs/contexte/journal.md) ;
- un nouveau document → l'ajouter à la carte ci-dessus.
Garder ce fichier court : le détail va dans les ramifications.

---

## Vision

Transformer l'app `web_affiliations` en **site complet de l'ACCG Nalux** : vitrine
publique + démarches existantes + suivi des actions syndicales + blog d'analyses
+ publication sur les réseaux. Objectif : sortir la com syndicale de sa léthargie
et automatiser ce qui peut l'être — **avec Fred toujours dans la boucle de
validation** (rien ne se publie sans son OK, pour éviter toute désinformation).

---

## Architecture (décidée)

- **`web_affiliations`** (app Vercel, Next.js) = le **socle du nouveau site**. On
  l'étend, on ne la remplace pas. Elle garde ses démarches (affiliation, mandat
  SEPA, documents C1/C3.2, calcul de préavis), exposées sur le site.
- **CG Link** = app Vercel **distincte** (outil interne réservé aux délégués,
  permanents et administratifs). Reste séparée — on n'y touche pas côté
  fonctionnel.
- **Base de données** : une **seule** base Supabase, celle du projet **CG Link**
  (région Europe), partagée par les deux apps par économie d'abonnement.
  `web_affiliations` y est déjà branché. Les comptes (Supabase Auth) sont ceux de
  CG Link ; le rôle se lit dans `profiles.role`.
- **Nommage des tables** : préfixe **`site_`** pour les tables du nouveau site
  (comme `web_` pour web_affiliations, et les noms nus pour CG Link).
- **RÈGLE D'OR sécurité** : toutes les apps partagent les mêmes clés d'accès à la
  base. Ce qui protège chaque table, c'est sa **serrure (RLS)**. Le site public ne
  doit **jamais** pouvoir lire les tables sensibles (travailleurs, etc.). Chaque
  nouvelle table = RLS activé + politiques d'accès précises.
- **Pages publiques = vues `*_public` uniquement** (jamais les tables `site_*`
  directement) : elles ne renvoient que les actions publiées et les colonnes
  autorisées.
- Le 2ᵉ projet Supabase `accg-nalux-site` (créé le 22/09/2026) s'est révélé être un
  **doublon** → à supprimer.

**Le site public** (pages, navigation, cookies) : voir [docs/contexte/site-public.md](docs/contexte/site-public.md).
**La gestion** (actions, articles, Scan News, demandes, paramètres, comptes) vit dans l'**Espace CG**
(`/espace/<app>/…`, back-office en apps, droits par app en base) : voir [app/espace/CLAUDE.md](app/espace/CLAUDE.md).

---

## Règles d'or du design (résumé ; le détail est dans [docs/contexte/design.md](docs/contexte/design.md))
- **Palette stricte** : `#E32119` rouge, `#931510` bordeaux, `#222222` charbon, `#FFFFFF` blanc, `#7C90A0`
  ardoise (Tailwind `militant-*`). Vert et bleu réservés à la CSC et à Synova, sauf exceptions listées
  (Espace CG : couleurs d'app et statuts).
- **Pas de grands fonds noirs** (connotation extrême droite) : charbon pour le texte et les détails ;
  exceptions voulues : pied de page du site, rail de l'Espace CG.
- **Typographie** : Barlow (texte), Barlow Condensed (titres, chiffres), auto-hébergées.
- **Accessibilité** : contraste AA, focus visible, cibles ≥ 44 px, jamais la couleur seule, icônes
  `lucide-react` (jamais d'emoji), `prefers-reduced-motion` toujours respecté.
- **Chargement toujours visible** avec `app/Chargement.tsx` (`IconeChargement`, `EcranChargement`).

---

## Sécurité base de données — correctifs déjà appliqués côté Supabase (invisibles depuis le code)

Appliqués directement dans la base CG Link, sans migration dans ce dépôt (seule
exception : la migration des envois, voir [docs/contexte/base-de-donnees.md](docs/contexte/base-de-donnees.md), demandée par Fred).
**Ne pas créer de migration** sans demande explicite de Fred.

- **Rôles dans `profiles`** : le trigger `trg_site_protect_profiles_role` (fonction
  `site_protect_profiles_role`) empêche tout utilisateur connecté qui n'est pas
  `SUPER_ADMIN` de changer un rôle dans `profiles`. Vérifié par test : la promotion
  abusive est bloquée. **Ne pas re-signaler comme faille ouverte.**
- **Vues `*_public`** : lecture seule pour `anon` et `authenticated` (droits
  d'écriture révoqués, seul `SELECT` reste accordé).
- **Tables `site_*` et buckets suivent les apps** (modifié directement en base le 12/10/2026, déclaré par
  Fred) : les politiques RLS utilisent `site_a_app()` (apps `actions`, `scan-news`, `demarches`) ; l'app
  `parametres` reste réservée à SUPER_ADMIN. Même règle pour les buckets `action-photos`, `blog-images` et
  `notes-sources`. Donner une app à un rôle (Apps par rôle, ou exception dans Comptes & accès) ouvre donc
  aussi ses tables. Détail table par table : [docs/contexte/base-de-donnees.md](docs/contexte/base-de-donnees.md).
- **Lecture de `web_c1`, `web_c3_2` et `web_mandats_sepa`** : réservée à l'app `demarches` (12/10/2026,
  directement en base) ; l'ancienne politique `auth_select` (tout compte connecté, délégués compris) est
  neutralisée (`false`). Les écritures des formulaires publics (clé publique) sont inchangées.
- **Bucket `action-photos`** : la policy `site_actions_photos_select` (SELECT réservé
  aux super admins, puis à l'app `actions` depuis le 12/10/2026) **existe déjà** côté base, en plus d'INSERT / UPDATE / DELETE.
  Elle permet `remove` et `move` (suppression et réordonnancement des photos).
  **Ne plus la redemander.**
- **Reste à faire** (non critique, à planifier) : resserrer les politiques
  d'écriture globales sur `profiles`. Un utilisateur connecté peut encore modifier
  ou supprimer d'autres fiches que la sienne.

---

## Problèmes connus

- La table profiles a des règles RLS trop permissives (ALL à true pour tout utilisateur connecté) : n'importe quel connecté peut modifier ou supprimer un profil. Le rôle est protégé par le trigger site_protect_profiles_role. À corriger en coordination avec CG Link, ne pas toucher sans validation.

---

## État actuel (13/10/2026, Libérations lot 1)
- **Une seule branche de travail : `suivi-actions`**, **poussée le 13/10/2026 à la demande de Fred** (mise en
  production) avec le lot 1 des Libérations.
- **Nouvelle app Libérations** (code `liberations`, découpée en 4 lots) : cahier des charges complet et
  décisions de Fred dans [docs/contexte/liberations.md](docs/contexte/liberations.md). **Lot 1 écrit** : demande
  (formulaire, dates, lieu, prise en charge, participants = délégués, pièces jointes), liste par statut, fiche
  du dossier (ce qui manque avant les courriers, « Compléter » la carte d'un délégué), parcours brouillon →
  demande → en traitement → annulé / archivé, Paramètres (lieux, taux kilométrique daté).
- **App Délégués** : registre national et genre ajoutés à la carte (saisis à la main).
- **Migration `20261013130000_site_liberations.sql`** exécutée par Fred le 13/10/2026 (vérifié : 8 tables,
  5 lieux, app et rôles PERMANENT / ADMIN_OP, colonnes `registre_national` et `genre`, bucket privé, clé
  publique refusée sur les 8 tables).
- **Vérifié** : 857 tests, types, build. **Pas encore vérifié dans le navigateur.**
- **À faire par Fred** : 1. tester le lot 1 avec un compte permanent et un compte ADMIN_OP ; 2. ajouter le
  taux kilométrique réel dans Paramètres ; 3. préparer le **lot 2 (courriers)** : textes de la lettre à
  l'employeur pour chacun des 4 types, phrase quand la CG fédérale paie la perte de salaire, modèles actuels de
  l'attestation de perte de salaire et de la fiche de paiement, fonction de chaque permanent et téléphone des
  admins, adresse d'expédition des e-mails aux employeurs ; 4. points ouverts des états précédents : voir
  [docs/contexte/journal.md](docs/contexte/journal.md).

Historique des états précédents : [docs/contexte/journal.md](docs/contexte/journal.md).

---

## Conventions

### Dates
- **Format : toujours `jj/mm/aaaa`** (ex. `24/09/2026`), partout : interface,
  saisie, e-mails, PDF, courriers et ce fichier. Pas de mois en toutes lettres, pas
  d'année sur 2 chiffres. Côté code : `formatDateFr()`, `isoToDateFr()` et
  `dateFrToIso()` dans `lib/dates.ts`. En base, les dates restent au format ISO
  (`aaaa-mm-jj`).
- **Jamais de `<input type="date">`** : le navigateur l'affiche dans la langue de
  l'ordinateur (souvent `mm/dd/yyyy`). Utiliser un champ texte `jj/mm/aaaa` avec
  `formatDateFr()` à la frappe et `dateFrToIso()` à l'enregistrement.
- Les axes de graphiques ou de frises utilisent des numéros de mois (`01`…`12`,
  `mm/aaaa`), jamais les noms.

### Rédaction
- Français, phrases courtes, voix active. Les messages d'erreur disent ce qui s'est
  passé et comment réagir, sans s'excuser.
- Pas de contenu inventé sur le site : une donnée inconnue reste absente (pas de
  « [À COMPLÉTER] » visible en production).

### Variables d'environnement (Vercel Production + Preview **et** `.env.local` — en place depuis le 28/09/2026)
- `SUPABASE_SERVICE_ROLE_KEY` (ramassage ; jamais préfixée `NEXT_PUBLIC_`).
- `CRON_SECRET` (chaîne aléatoire ≥ 16 caractères).
- `ANTHROPIC_API_KEY` (rédaction assistée **et** déclinaison réseaux ; jamais
  préfixée `NEXT_PUBLIC_`, jamais importée dans un composant client). Configurée
  et fonctionnelle : appels réels réussis le 28/09/2026 depuis `.env.local`.
- `SITE_URL` (facultative, serveur) : adresse publique du site pour le lien des
  posts réseaux (ex. `https://accg-nalux.com`). **Pas encore définie.**

## Rappels techniques
- Stack : Next.js 16 (App Router, Node 24), Supabase, Vercel, Resend (envoi
  d'e-mails), Tailwind 3, `@react-pdf/renderer`, Vitest, Tiptap (éditeur),
  `sanitize-html`, `fast-xml-parser` (flux RSS), `motion` (animations de `/pourquoi-s-affilier`, `motion/react`), `@anthropic-ai/sdk` + `zod`
  (rédaction assistée, déclinaison réseaux et vulgarisation, serveur uniquement ;
  erreurs de l'API traduites par `lib/anthropic-erreurs.ts`), `mammoth` (.docx) et
  `unpdf` (.pdf) pour l'extraction des notes FGTB, serveur uniquement.
- Le `.env.local` de `web_affiliations` pointe **déjà** vers CG Link — ne pas le
  modifier. Les clés restent dans `.env.local` (jamais dans ce fichier ni sur GitHub).
- **Next.js 16** : le middleware s'appelle `proxy.ts` (verrou de `/espace`).
- **Clients Supabase** (`lib/supabase.ts`, `lib/supabase-server.ts`) :
  `getSupabase()` = public sans session (vues publiques, anciens formulaires) ;
  `getSupabaseAuth()` = navigateur avec session en cookies (`@supabase/ssr`,
  écritures admin) ; `getSupabaseServer()` / `getSuperAdmin()` = côté serveur.
- **Piège Next.js** : une fonction exportée d'un fichier `"use client"` ne peut pas
  être appelée depuis un composant serveur. Les utilitaires partagés vont dans
  `lib/` (ex. `titreAction`, `ancreUne` dans `lib/actions.ts`).
- **Polices** : `next/font/local` exige des chemins écrits en toutes lettres (pas
  de variable). Google Fonts n'est pas joignable depuis le poste de dev (proxy
  réseau) → polices auto-hébergées.
- **PDF (`@react-pdf/renderer`)** : généré dans le navigateur ; polices en `.woff`
  dans `public/fonts/` ; les éléments `fixed` positionnés avec `bottom` sortent de
  la page → les placer avec `top` (A4 = 842 pt de haut) ; un élément `absolute`
  **sans** `fixed` placé avec `top` sur un document de plusieurs pages fait tourner
  la génération sans fin → toujours `fixed` pour un pied de page ; les emojis et
  symboles (⚠…) sont retirés (absents des polices).
- **Images** : photos du bucket servies via `next/image` (domaine Supabase
  autorisé dans `next.config.ts`). Pages publiques revalidées toutes les 60 s.
- **Pièges rencontrés (blog, veille, IA)** :
  - un `page.tsx` ne peut exporter que les noms prévus par Next.js (pas de
    constante ni de composant en plus) → les mettre dans `lib/` ou un fichier
    voisin ;
  - un composant client ne doit importer de `lib/` que des fichiers **sans
    dépendance serveur** (sinon `sanitize-html`, `zod`, `fast-xml-parser`
    partent dans le navigateur) : `import type` est sans risque, les constantes
    partagées vont dans un petit fichier dédié (`lib/redaction-limites.ts`,
    `lib/veille.ts`) ;
  - champ fichier : copier `input.files[0]` **avant** `input.value = ""` (vider
    le champ vide aussi sa `FileList` dans Chrome et Edge) ;
  - Tiptap : `immediatelyRender: false` (rendu serveur) ; l'éditeur ne relit sa
    valeur qu'à sa création → changer sa `key` pour recharger un contenu ;
  - Supabase : le schéma n'est pas lisible avec la clé publique ; les colonnes
    ont été relevées par sondage en lecture seule (`select=<col>&limit=0`).
    **Aucune écriture de test dans la base.**
- **Tests** : `npm test` (Vitest, fichiers `lib/**/*.test.ts`).
- **Git** : travailler sur la branche de la fonctionnalité (actuellement
  `suivi-actions`), jamais directement sur `main`, rien déployer sans l'accord de
  Fred.

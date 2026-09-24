# Projet — Site & outil de com ACCG Nalux

> **Fichier de contexte partagé.** À garder à la racine du projet `web_affiliations`,
> à relire et à mettre à jour au fil de l'avancement. Il sert de mémoire commune
> entre Fred, Claude (sur claude.ai) et l'assistant de Cursor.
>
> Dernière mise à jour : **24/09/2026**

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
  SEPA, documents C1/C3.2, calcul de préavis), qui seront exposées sur le site.
- **CG Link** = app Vercel **distincte** (outil interne réservé aux délégués,
  permanents et administratifs). Reste séparée — on n'y touche pas côté
  fonctionnel.
- **Base de données** : une **seule** base Supabase, celle du projet **CG Link**
  (région Europe), partagée par les deux apps par économie d'abonnement.
  `web_affiliations` y est déjà branché.
- **Nommage des tables** : préfixe **`site_`** pour les tables du nouveau site
  (comme `web_` pour web_affiliations, et les noms nus pour CG Link).
- **RÈGLE D'OR sécurité** : toutes les apps partagent les mêmes clés d'accès à la
  base. Ce qui protège chaque table, c'est sa **serrure (RLS)**. Le site public ne
  doit **jamais** pouvoir lire les tables sensibles (travailleurs, etc.). Chaque
  nouvelle table = RLS activé + politiques d'accès précises.
- Le 2ᵉ projet Supabase `accg-nalux-site` (créé le 22/09/2026) s'est révélé être un
  **doublon** → à supprimer.

---

## Base de données — tables du site

Créées le **24/09/2026** dans la base CG Link :

| Table | Rôle | Accès |
|---|---|---|
| `site_secteurs` | Liste modifiable des secteurs (11 pré-remplis) | Lecture publique |
| `site_actions` | Les actions syndicales (suivi + rapport de congrès) | Verrouillée |
| `site_photos` | Photos rattachées à chaque action | Verrouillée |

### Colonnes de `site_actions`
`date_action`, `ville`, `type_action`, `secteur_id` (→ `site_secteurs`),
`front_commun` + `front_commun_csc` + `front_commun_synova`, `entreprise`,
`deplacement_bus` + `deplacement_train`, `description`, `participants_total`,
`participants_centrale`, `created_at`.

### Règles métier
- **Type d'action** : grève générale · manifestation nationale · manifestation ·
  piquet en entreprise · action · autre (à préciser).
- **Secteur** : liste modifiable — Fred peut ajouter un secteur, qui devient alors
  réutilisable.
- **Front commun** : oui / non ; si oui, cases **CSC** et **Synova** (nouveau nom
  de la CGSLB).
- **Déplacement organisé** : bus et/ou train.
- **Participants** : on stocke des **nombres** uniquement, pas de noms (plus simple
  côté RGPD).

---

## Sécurité base de données — correctifs déjà appliqués côté Supabase (invisibles depuis le code)

Appliqués directement dans la base CG Link : aucune migration dans ce dépôt.

- **Rôles dans `profiles`** : le trigger `trg_site_protect_profiles_role` (fonction
  `site_protect_profiles_role`) empêche tout utilisateur connecté qui n'est pas
  `SUPER_ADMIN` de changer un rôle dans `profiles`. Vérifié par test : la promotion
  abusive est bloquée. **Ne pas re-signaler comme faille ouverte.**
- **Vue `site_actions_public`** : lecture seule pour `anon` et `authenticated`
  (droits d'écriture révoqués, seul `SELECT` reste accordé).
- **Reste à faire** (non critique, à planifier) : resserrer les politiques
  d'écriture globales sur `profiles`. Un utilisateur connecté peut encore modifier
  ou supprimer d'autres fiches que la sienne.

---

## Les phases

### Phase 0 — Fondations
- [x] Base de données prête (tables `site_*` dans CG Link)
- [ ] Supprimer le projet Supabase doublon `accg-nalux-site`
- [ ] Créer la partie publique du site (accueil, présentation, coordonnées)
- [ ] Rebrancher le domaine `accg-nalux.com` (quitter e-monsite) — plus tard

### Phase 1 — Suivi des actions *(en cours)*
- [x] Tables créées
- [x] Connexion `/login` (Supabase Auth, identifiants CG Link) + verrou
      `SUPER_ADMIN` sur `/suivi-actions` (`proxy.ts` + vérification dans la page)
- [x] Formulaire d'encodage (champs `info_web`, `visible_public`, `type_action_autre`)
- [ ] Photos des actions
- [ ] Vue liste / tableau de bord des actions
- [ ] Générateur du rapport d'activité pour le congrès (tous les 4 ans)

### Phase 2 — Veille + blog
- Veille quotidienne sur des sources belges fiables → recoupement → résumé + liens
  sources → **Fred valide et corrige** → article de blog.
- Table `site_articles` à créer.
- Droit d'auteur : résumer avec nos propres mots, citer et lier la source, jamais
  recopier.

### Phase 3 — Publication réseaux
- Décliner chaque article validé par réseau (court/punchy pour Insta-TikTok, plus
  détaillé pour Facebook…).
- Passer par un **outil-pont** (Ayrshare / Metricool / Buffer — à choisir) plutôt
  que coder chaque réseau.
- Fred valide chaque post avant publication. Pas de copier/coller manuel.

### Phase 4 — Plus-values *(plus tard)*
- **Générateur de visuels** : gabarits auto aux formats réseaux, dans la charte
  (automatisation de gabarits, pas génération IA — Fred garde la main).
- **Outils vidéo** : transcription/sous-titres auto + découpe de vidéos longues en
  extraits courts (TikTok/Reels).
- **Mémoire de la centrale** : base consultable des CCT, accords sectoriels,
  précédents.
- **Assistant-aiguilleur IA** : comprend la demande, répond au pratique simple,
  oriente vers le bon service — ne donne **jamais** de conseil juridique en
  autonomie.
- Autres idées évoquées : calculateurs publics comme produits d'appel, newsletter
  automatique, alerte-mobilisation ciblée, espace affilié, tableau de bord réseaux.

---

## État au 24/09/2026
- Base + tables du suivi des actions : **prêtes** dans CG Link.
- À faire par Fred : **supprimer** le projet Supabase `accg-nalux-site` (dashboard).
- Prochaine étape ensemble : **construire le formulaire d'encodage** des actions
  dans `web_affiliations`.

---

## Conventions
- **Format de date : toujours `jj/mm/aaaa`** (ex. `24/09/2026`), partout : interface,
  saisie, e-mails, PDF, courriers et ce fichier. Pas de mois en toutes lettres, pas
  d'année sur 2 chiffres. Côté code : `formatDateFr()`, `isoToDateFr()` et
  `dateFrToIso()` dans `lib/dates.ts`. En base, les dates restent au format ISO
  (`aaaa-mm-jj`).
- **Jamais de `<input type="date">`** : le navigateur l'affiche dans la langue de
  l'ordinateur (souvent `mm/dd/yyyy`). Utiliser un champ texte `jj/mm/aaaa` avec
  `formatDateFr()` à la frappe et `dateFrToIso()` à l'enregistrement.

## Rappels techniques
- Stack : Next.js (Node 24), Supabase, Vercel, Resend (envoi d'e-mails).
- Le `.env.local` de `web_affiliations` pointe **déjà** vers CG Link — ne pas le
  modifier.
- Les clés d'accès restent dans `.env.local` (jamais dans ce fichier ni sur GitHub).

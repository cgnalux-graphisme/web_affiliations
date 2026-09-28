# Projet — Site & outil de com ACCG Nalux

> **Fichier de contexte partagé.** À garder à la racine du projet `web_affiliations`,
> à relire et à mettre à jour au fil de l'avancement. Il sert de mémoire commune
> entre Fred, Claude (sur claude.ai), Claude Code et l'assistant de Cursor.
>
> Dernière mise à jour : **28/09/2026**

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

### Plan du site (routes)

| Route | Accès | Rôle |
|---|---|---|
| `/` | public | Accueil : ouverture, dernière action publiée, démarches, nos actions |
| `/actions` | public | Vitrine des actions publiées (frise + « unes ») |
| `/blog` | public | Actualités : dernier article en grand + articles précédents |
| `/blog/<slug>` | public | Un article : encart « En bref », chapô, image, contenu, sources |
| `/demarches` | public | Toutes les démarches en ligne (tuiles, l'affiliation en tête) |
| `/contact` | public | Nos 4 bureaux : adresses, téléphones, horaires (été en juillet-août), statut « ouvert maintenant » |
| `/affiliation`, `/mandat-sepa`, `/formulaire-c1`, `/formulaire-c3-2`, `/preavis`, `/parcours-transfert` | public | Formulaires existants |
| `/login` | public | Connexion (identifiants CG Link) |
| `/suivi-actions` | SUPER_ADMIN | Liste de toutes les actions (publiées ou non) |
| `/suivi-actions/nouvelle` | SUPER_ADMIN | Encoder une action |
| `/suivi-actions/<id>/modifier` | SUPER_ADMIN | Modifier / supprimer une action |
| `/suivi-actions/rapport` | SUPER_ADMIN | Rapport d'activité PDF (congrès) |
| `/suivi-actions/articles` | SUPER_ADMIN | Liste des articles (brouillons et publiés) : modifier, publier / dépublier, supprimer |
| `/suivi-actions/articles/nouveau` | SUPER_ADMIN | Écrire un article |
| `/suivi-actions/articles/<id>/modifier` · `/apercu` | SUPER_ADMIN | Modifier / supprimer ; aperçu tel que sur le site (brouillon compris) |
| `/suivi-actions/veille` | SUPER_ADMIN | Articles ramassés par la veille : filtres, ignorer, rédiger un article, rafraîchir |
| `/suivi-actions/sources` | SUPER_ADMIN | Flux RSS de la veille : ajouter, modifier, activer / désactiver, supprimer |
| `/api/veille/ramasser` | cron ou SUPER_ADMIN | Ramassage des flux (GET = Vercel Cron chaque jour à 6 h UTC, POST = bouton) |

Navigation publique : Accueil · Nos actions · Actualités · Démarches en ligne ·
Contact + bouton « S'affilier ». Les formulaires sont **regroupés** sous « Démarches en
ligne » (pas un onglet par formulaire). Rubriques à venir : Actualités (blog),
« Trouver votre contact » (permanent et juriste par secteur / commission
paritaire). La gestion des articles vit sous `/suivi-actions/articles` pour
profiter du même verrou super admin (proxy + layout + chaque page).

**L'affiliation est la démarche la plus importante** : grande tuile bordeaux en
tête de la grille des démarches (`app/TuilesDemarches.tsx`) et bouton
« S'affilier » dans la barre de navigation.

---

## Base de données — tables du site

Créées le **24/09/2026** dans la base CG Link :

| Objet | Rôle | Accès |
|---|---|---|
| `site_secteurs` | Liste modifiable des secteurs (11 pré-remplis) | Lecture publique, ajout super admin |
| `site_actions` | Les actions syndicales (suivi + rapport de congrès) | Super admin (lecture/écriture) |
| `site_photos` | Photos rattachées à chaque action (`action_id`, `url`, `legende`) | Super admin |
| `site_videos` | Vidéos YouTube d'une action (`action_id`, `url`, `titre`) | Super admin |
| `site_actions_public` | Vue : actions publiées, colonnes autorisées (l'entreprise seulement pour un piquet) | Lecture publique |
| `site_photos_public` / `site_videos_public` | Vues : photos / vidéos des actions publiées | Lecture publique |
| Bucket `action-photos` | Fichiers photo (public en lecture) | Écriture super admin |

`site_photos` et `site_videos` → `site_actions` en `ON DELETE CASCADE`.

Blog (créés côté Supabase avant le 28/09/2026, aucune migration dans le dépôt) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_articles` | Articles du blog | Super admin (lecture/écriture) |
| `site_articles_public` | Vue : articles publiés (sans `statut`, `created_at`, `updated_at`) | Lecture publique |
| Bucket `blog-images` | Images de couverture (public en lecture) | Écriture super admin |

Veille (créés côté Supabase avant le 28/09/2026) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_sources` | Flux RSS suivis : `nom`, `url_flux`, `actif` | Super admin |
| `site_veille` | Articles ramassés : `source_id`, `source_nom`, `titre`, `resume`, `lien` (**index unique**), `date_publication`, `statut` (`nouveau` / `traite` / `ignore`) | Super admin ; écriture du ramassage en service_role |

### Colonnes de `site_articles`
`titre`, `slug` (adresse `/blog/<slug>`), `chapo` (accroche), `points_cles`
(encart « En bref », **texte, une ligne par point**), `contenu` (**HTML** produit
par l'éditeur Tiptap), `image_couverture` (URL publique du bucket), `sources`
(**texte, un lien par ligne**, libellé facultatif avant le lien :
« Le Soir – https://… »), `statut` (`brouillon` / `publie`), `date_publication`
(timestamptz), `created_at`, `updated_at`. Types relevés par sondage de l'API
(pas d'accès au schéma) : si la base contraint `statut` à d'autres valeurs,
adapter `STATUT_*` dans `lib/articles.ts`.

### Colonnes de `site_actions`
`nom` (titre court de la une), `date_action`, `ville`, `type_action` +
`type_action_autre` (détail si « autre »), `secteur_id` (→ `site_secteurs`),
`front_commun` + `front_commun_csc` + `front_commun_synova`, `entreprise`,
`deplacement_bus` + `deplacement_train`, `description` (interne), `info_web`
(texte public), `visible_public` (publication sur le site), `participants_total`,
`participants_centrale`, `created_at`.

### Règles métier
- **Type d'action** : grève générale · manifestation nationale · manifestation ·
  piquet en entreprise · action · autre (à préciser dans `type_action_autre`).
- **Titre d'une action** : son `nom`, sinon son type (`titreAction()` dans
  `lib/actions.ts`).
- **Secteur** : liste modifiable — Fred peut ajouter un secteur, qui devient alors
  réutilisable.
- **Front commun** : oui / non ; si oui, cases **CSC** et **Synova** (nouveau nom
  de la CGSLB). Couleurs d'identité : **CSC = vert** (`#1E8C45`), **Synova = bleu**
  (`#1F5FAD`) — valeurs approximatives, à remplacer par les codes officiels si
  disponibles. Ne jamais utiliser de vert ni de bleu pour autre chose.
- **Déplacement organisé** : bus et/ou train.
- **Participants** : on stocke des **nombres** uniquement, pas de noms (plus simple
  côté RGPD).
- **Publication** : une action n'apparaît sur le site que si `visible_public` est
  coché. La `description` reste interne ; le site affiche `info_web`.
- **Photos** : l'ordre est porté par le nom du fichier
  (`<action_id>/<rang>-<uuid>.jpg`, rang `00` = photo principale) ; les pages
  trient par URL (`lib/photos.ts`). Réduites à 2000 px en JPEG avant envoi.
  Changer l'ordre = renommer le fichier (`move`) puis mettre à jour l'URL.
- **Vidéos** : liens YouTube validés et normalisés
  (`https://www.youtube.com/watch?v=<id>`, `lib/youtube.ts`) ; lecteur
  youtube-nocookie chargé au clic seulement.
- **Suppression d'une action** : fichiers photo du bucket d'abord, puis la ligne
  `site_actions`. Si l'effacement des fichiers échoue réellement, l'action est
  conservée (pas de photos orphelines en ligne).

---

## Sécurité base de données — correctifs déjà appliqués côté Supabase (invisibles depuis le code)

Appliqués directement dans la base CG Link : aucune migration dans ce dépôt.
**Ne pas créer de migration** sans demande explicite de Fred.

- **Rôles dans `profiles`** : le trigger `trg_site_protect_profiles_role` (fonction
  `site_protect_profiles_role`) empêche tout utilisateur connecté qui n'est pas
  `SUPER_ADMIN` de changer un rôle dans `profiles`. Vérifié par test : la promotion
  abusive est bloquée. **Ne pas re-signaler comme faille ouverte.**
- **Vues `*_public`** : lecture seule pour `anon` et `authenticated` (droits
  d'écriture révoqués, seul `SELECT` reste accordé).
- **Écriture sur `site_*`** : réservée aux super admins via `site_is_super_admin()`.
- **Bucket `action-photos`** : la policy `site_actions_photos_select` (SELECT réservé
  aux super admins) **existe déjà** côté base, en plus d'INSERT / UPDATE / DELETE.
  Elle permet `remove` et `move` (suppression et réordonnancement des photos).
  **Ne plus la redemander.**
- **Reste à faire** (non critique, à planifier) : resserrer les politiques
  d'écriture globales sur `profiles`. Un utilisateur connecté peut encore modifier
  ou supprimer d'autres fiches que la sienne.

---

## Les phases

### Phase 0 — Fondations
- [x] Base de données prête (tables `site_*` dans CG Link)
- [ ] Supprimer le projet Supabase doublon `accg-nalux-site`
- [~] Partie publique du site : accueil, `/demarches`, `/actions`, `/contact`
      faits ; **manquent** présentation, mentions légales, vie privée
- [ ] « Trouver votre contact » → voir Phase 4, lié à l'assistant-aiguilleur
- [x] Refonte graphique « direction D » (éditorial + modulaire, sans fond noir) —
      voir Conventions > Design
- [ ] Rebrancher le domaine `accg-nalux.com` (quitter e-monsite) — plus tard

### Phase 1 — Suivi des actions *(fonctionnel sur la branche `suivi-actions`)*
- [x] Tables, vues et bucket
- [x] Connexion `/login` (Supabase Auth) + verrou `SUPER_ADMIN` (proxy + layout +
      chaque page)
- [x] Formulaire d'encodage et de modification (`FormulaireAction`) : nom, date,
      type (+ détail), secteur, front commun, entreprise, déplacement, description,
      participants, photos, vidéos, info web, publication
- [x] Liste de gestion, modification, suppression
- [x] Vitrine `/actions` : frise chronologique (une ligne = une année, curseurs
      d'année, clic = défilement vers la une `#une-<id>`), unes avec photos
      (galerie + agrandissement) et vidéos
- [x] Rapport d'activité (congrès) en PDF : période au choix, toutes les actions,
      bilan en chiffres, graphiques, chronologie détaillée avec photo principale

### Phase 2 — Veille + blog
- [x] **Veille RSS (sans IA)** — 28/09/2026 : sources gérées dans l'admin ;
      `lib/veille-flux.ts` lit RSS 2.0 / Atom / RDF (50 items max par flux,
      résumé sans HTML, 600 caractères) ; `lib/veille-ramassage.ts` insère en
      `upsert … ignoreDuplicates` sur `lien` avec la clé **service_role**
      (`lib/supabase-service.ts`, serveur uniquement). Route protégée par
      `CRON_SECRET` (en-tête `Authorization: Bearer`) ou session super admin.
      Cron `vercel.json` : `0 6 * * *`, une fois par jour à 6 h UTC (7 h ou 8 h à
      Bruxelles selon la saison) — compatible plan Hobby, qui n'accepte qu'une
      exécution par jour et peut la décaler dans l'heure. Ramassage manuel à tout
      moment : bouton « Rafraîchir maintenant ». « Rédiger un article » passe l'item
      en `traite` et ouvre `/suivi-actions/articles/nouveau?veille=<id>`
      (titre + lien pré-remplis dans les sources).
- Variables d'environnement requises (Vercel **et** `.env.local` pour tester en
  local) : `SUPABASE_SERVICE_ROLE_KEY` (jamais préfixée `NEXT_PUBLIC_`),
  `CRON_SECRET` (chaîne aléatoire d'au moins 16 caractères).
- [x] **Blog (structure, sans IA)** — 28/09/2026 : gestion admin (liste, éditeur
      riche, image de couverture, sources, brouillon / publié, date, aperçu),
      pages `/blog` et `/blog/<slug>`, lien « Actualités ». Contenu HTML nettoyé
      à l'affichage (`lib/articles-html.ts`, `sanitize-html`). Temps de lecture :
      220 mots/min (`tempsLecture()`). Date future = article programmé (les pages
      publiques filtrent `date_publication <= maintenant`). Image de couverture :
      `<article_id>/couverture-<uuid>.jpg`, réduite comme les photos d'actions ;
      suppression d'un article = image d'abord, puis la ligne.
- Veille quotidienne sur des sources belges fiables → recoupement → résumé + liens
  sources → **Fred valide et corrige** → article de blog.
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
  (automatisation de gabarits, pas génération IA — Fred garde la main). La
  direction « L'Affiche » (aplats rouges, typographie poster) des maquettes du
  25/09/2026 peut servir de base pour ces visuels.
- **Outils vidéo** : transcription/sous-titres auto + découpe de vidéos longues en
  extraits courts (TikTok/Reels).
- **Mémoire de la centrale** : base consultable des CCT, accords sectoriels,
  précédents.
- **Assistant-aiguilleur IA** : comprend la demande, répond au pratique simple,
  oriente vers le bon service — ne donne **jamais** de conseil juridique en
  autonomie. **Lié à « Trouver votre contact »** : l'assistant s'appuie sur le même
  annuaire pour orienter vers le bon permanent ou le service juridique.
- **« Trouver votre contact »** (nouvelle branche du site, idée retenue le
  25/09/2026). Aujourd'hui sur l'ancien site : choix de la province puis de la
  commission paritaire (CP) → permanent(s) + service juridique 1re ligne ; données
  écrites dans le code, e-mails personnels visibles. Pistes :
  1. **Annuaire en base** (table `site_contacts` : province, CP, permanent(s),
     service juridique), modifiable depuis l'espace admin — plus de modification
     de code quand l'équipe change ;
  2. **Une seule recherche** : métier, secteur, entreprise ou n° de CP (ex.
     « maçon » → CP 124 Construction), en réutilisant le catalogue officiel des CP
     déjà présent pour le calcul de préavis (`lib/preavis`) + synonymes ;
  3. aide **« Je ne connais pas ma CP »** (où la trouver sur la fiche de paie ou le
     contrat) ;
  4. **province déduite du code postal**, avec le bureau le plus proche, ses
     horaires et son statut « ouvert » (`lib/bureaux.ts`) ;
  5. **contact sans exposer les e-mails** : formulaire « Écrire à mon permanent »
     routé par Resend (anti-spam, RGPD, traçabilité) ; téléphones des bureaux
     visibles ;
  6. **liens partageables** (`/contact/trouver?cp=124`) pour tracts et QR codes ;
  7. **lien avec l'affiliation** : afficher « Votre permanent » en fin de
     formulaire et dans l'e-mail de confirmation (CP et adresse déjà connues) ;
  8. **statistiques** des recherches sans résultat (trous de couverture ou de
     vocabulaire).
  Démarrage suggéré : 1, 2, 4, 5 ; les noms et e-mails des permanents viennent de
  l'ancien site (données personnelles : ne pas les publier en clair).
- Autres idées évoquées : calculateurs publics comme produits d'appel, newsletter
  automatique, alerte-mobilisation ciblée, espace affilié, tableau de bord réseaux.

---

## État au 25/09/2026
- Tout le travail est sur la branche **`suivi-actions`** : rien sur `main`, rien
  déployé. À relire puis fusionner quand Fred valide.
- À faire par Fred : **supprimer** le projet Supabase `accg-nalux-site`
  (dashboard).
- Bureaux (`lib/bureaux.ts`) repris de l'ancien site le 25/09/2026 : Libramont
  (siège), Namur, Arlon, Marche-en-Famenne. À tenir à jour à chaque changement
  d'horaire ; le statut « ouvert » est calculé à l'heure de Bruxelles.
- PDF **Affiliation** et **Mandat SEPA** passés à la charte du site (proposition
  « Registre » du 25/09/2026). Les PDF **C1, C3.2 et Calcul de préavis ne doivent
  pas être modifiés**.
- Blog en place le 28/09/2026 (branche `suivi-actions`) ; branche poussée sur
  GitHub pour un déploiement de prévisualisation Vercel (pas de production).
- Pistes suivantes : « Trouver votre contact » (phase 4, avec l'assistant),
  veille automatique (phase 2), derniers articles sur l'accueil, mentions légales.

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

### Design — « direction D » (mélange éditorial A + modulaire C)
Maquettes de référence : page de maquettes claude.ai « Propositions design ACCG
Nalux » (rangée D pour le site, rangée « PDF » pour les documents) :
https://claude.ai/artifact/Gcfj9m7DxfpyLAB1yBL18c
- **Palette stricte** : `#E32119` rouge, `#AA0F33` bordeaux, `#222222` charbon,
  `#FFFFFF` blanc, `#7C90A0` ardoise. Dans le code : couleurs Tailwind
  `militant-rouge`, `militant-bordeaux`, `militant-charbon`, `militant-ardoise`.
- **Limiter les fonds noirs** : le noir est politiquement associé à l'extrême
  droite, que la centrale combat. Le charbon sert au texte, aux filets et aux petits
  détails (survol de bouton, puce), **jamais aux grandes surfaces** (barres,
  bandeaux, pieds de page, grands blocs, barres latérales). Surfaces fortes :
  **bordeaux** avec texte blanc ; sinon fond blanc et filets épais. Emplacements
  photo vides : ardoise.
- **Lisibilité** : texte courant en charbon sur fond clair ; ardoise réservé aux
  filets, bordures et textes d'exemple (placeholder) — trop pâle pour du petit
  texte sur blanc ; rouge `#E32119` uniquement en grand texte (dates, chiffres,
  année) ou en filet / aplat ; texte blanc sur bouton → fond bordeaux (le blanc sur
  rouge vif n'est lisible qu'en grand).
- **Typographie** : Barlow (texte) et Barlow Condensed (titres, dates, chiffres),
  auto-hébergées (`app/fonts.ts`, paquets `@fontsource`), appliquées à tout le
  site. Grands titres de page et de section : Barlow Condensed extra-gras en
  majuscules, posés sur un **filet charbon de 6 px**.
- **Composants** : tuiles blanches arrondies (16 px) à fin contour ardoise ; tuile
  mise en avant en bordeaux ; bouton principal bordeaux (survol charbon), bouton
  secondaire contour charbon ; badges en contour ; lien actif souligné de rouge ;
  filet rouge de 4 px sous la barre de navigation et au-dessus du pied de page.
  Icônes : `lucide-react` (jamais d'emoji comme icône).
- **Logos** (`public/`) : `logo-cg-rouge.png` sur fond blanc (usage principal),
  `logo-cg-blanc.png` sur fond bordeaux (connexion, couverture du rapport PDF),
  `logo-cg-noir.png` réservé à l'impression noir et blanc — pas sur le site.
- **Documents PDF** (affiliation, mandat SEPA, rapport) : charte « Registre » —
  page blanche, logo rouge en tête, titre en majuscules condensées sur filet
  charbon, sections numérotées en rouge sur filet, lignes libellé / valeur sur
  filets ardoise, encadrés en bordeaux, pied de page avec filet rouge. Polices
  Barlow via `enregistrerPolicesPdf()` (`lib/pdf/charte.ts`). **Ne jamais supprimer
  une mention légale** (surtout le mandat SEPA : texte de domiciliation, créancier,
  ICS, RGPD, certification de signature). Les PDF officiels C1 / C3.2 et le
  courrier de préavis ne suivent pas cette charte.
- **Adresses e-mail** : contact général `cg.nalux@accg.be` (site, page Contact) ;
  administration `admin.nalux@accg.be` (PDF affiliation et SEPA, envois
  automatiques). `cg.namurluxembourg@accg.be` est obsolète.
- **Graphiques** (rapport PDF…) : couleurs libres, à valider (daltonisme,
  contraste), **hors vert et bleu** réservés à la CSC et à Synova. Camembert des
  types : `#222222` `#E32119` `#7C90A0` `#B8720F` `#AA0F33` `#9C6FB3`.
- **Couche de compatibilité** (`tailwind.config.ts`) : les anciennes classes
  `red-*`, `gray-*`, `slate-*`, `blue-*`, `green-*`, `emerald-*`, `amber-*` des
  anciens formulaires sont **remappées sur la palette** (teintes claires → blanc,
  bordures → ardoise, soutenues → bordeaux ou charbon, jamais de grand fond
  noir). Pour tout **nouveau** code, utiliser les couleurs `militant-*`.
- **Motion** : animations sobres, une seule à l'ouverture d'un écran au maximum ;
  toujours respecter `prefers-reduced-motion`.
- **Accessibilité** : vrais `<button>` / `<a>` / `<label>`, focus visible,
  cibles tactiles ≥ 44 px, `aria-label` sur les boutons-icônes.

### Rédaction
- Français, phrases courtes, voix active. Les messages d'erreur disent ce qui s'est
  passé et comment réagir, sans s'excuser.
- Pas de contenu inventé sur le site : une donnée inconnue reste absente (pas de
  « [À COMPLÉTER] » visible en production).

## Rappels techniques
- Stack : Next.js 16 (App Router, Node 24), Supabase, Vercel, Resend (envoi
  d'e-mails), Tailwind 3, `@react-pdf/renderer`, Vitest, Tiptap (éditeur),
  `sanitize-html`, `fast-xml-parser` (flux RSS).
- Le `.env.local` de `web_affiliations` pointe **déjà** vers CG Link — ne pas le
  modifier. Les clés restent dans `.env.local` (jamais dans ce fichier ni sur GitHub).
- **Next.js 16** : le middleware s'appelle `proxy.ts` (verrou de `/suivi-actions`).
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
- **Tests** : `npm test` (Vitest, fichiers `lib/**/*.test.ts`).
- **Git** : travailler sur la branche de la fonctionnalité (actuellement
  `suivi-actions`), jamais directement sur `main`, rien déployer sans l'accord de
  Fred.

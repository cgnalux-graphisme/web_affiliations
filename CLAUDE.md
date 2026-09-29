# Projet — Site & outil de com ACCG Nalux

> **Fichier de contexte partagé.** À garder à la racine du projet `web_affiliations`,
> à relire et à mettre à jour au fil de l'avancement. Il sert de mémoire commune
> entre Fred, Claude (sur claude.ai), Claude Code et l'assistant de Cursor.
>
> Dernière mise à jour : **29/09/2026**

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
| `/` | public | Accueil (29/09/2026) : 1. ouverture = **mobilisation mise en avant** si la vue `site_accueil_mobilisation` renvoie une ligne (titre, date, lieu, chapô, image, compte à rebours, « Je m'inscris », « Pourquoi on se mobilise »), sinon l'ouverture habituelle ; 2. 4 dernières publications (pastilles) ; 3. démarches ; 4. 3 dernières actions passées (photos) |
| `/mobilisation/<slug>` | public | Page campagne de la mobilisation mise en avant (seulement elle, via la vue ; sinon 404) : en-tête bordeaux, compte à rebours, pourquoi, « Ce qu'on demande », « Comment y aller », « Je m'inscris » répété (+ barre fixe sur mobile), partage par le visiteur |
| `/actions` | public | Vitrine des actions publiées (frise + « unes ») |
| `/actualites` | public | **Page unifiée** (29/09/2026) : articles du blog **et** explications mélangés, du plus récent au plus ancien (le plus récent en grand) ; pastille de rubrique sur chaque photo ; sélecteur à segments « Tout · Actualités · On vous explique » filtré dans le navigateur (`?rubrique=actualites` / `on-vous-explique` pré-applique le filtre) |
| `/blog`, `/on-vous-explique` | public | Redirigées (308, `next.config.ts`) vers `/actualites?rubrique=…` |
| `/blog/<slug>` | public | Un article : pastille « Actualité », encart « En bref », chapô, image, contenu, sources |
| `/on-vous-explique/<slug>` | public | Une explication : même mise en page, pastille « On vous explique » |
| `/demarches` | public | Toutes les démarches en ligne (tuiles, l'affiliation en tête) |
| `/contact` | public | (29/09/2026) **Nos bureaux** (4 bureaux de `lib/bureaux.ts` : bascule année / été, statut « ouvert maintenant » + « Ferme à… / Ouvre… » (`prochainChangement()`), résumé « En ce moment », Appeler, Itinéraire, **cartes Google Maps affichées directement si le visiteur a accepté les cookies**, sinon plan décoratif + « Afficher les cartes » (= accepter), en niveaux de gris) · **Nous joindre** (e-mail + copier, WhatsApp, réseaux de `app/ReseauxSociaux.tsx`) · **formulaire de contact** |
| `/api/contact` | public | Formulaire de contact (POST `{ nom, email, sujet, message, site_web }`) → un e-mail Resend vers `cg.nalux@accg.be`, « Répondre à » = le visiteur. Validation `lib/contact.ts` (partagée navigateur / serveur) ; champ piège `site_web` rempli = réponse « succès » sans envoi ; **rien d'enregistré**, contenu jamais journalisé |
| `/mentions-legales`, `/vie-privee`, `/cookies` | public | Pages légales (29/09/2026 ; politique cookies réécrite et vie privée complétée — formulaire de contact, Google Maps — le même jour) : texte repris **tel quel** de `PAGES-LEGALES.md` (sans ses notes internes « à faire valider »), mise en page commune `app/PageLegale.tsx`. **Validés par Fred le 29/09/2026** (une relecture par le juridique / DPO de la FGTB reste conseillée). Modifier le texte = modifier `PAGES-LEGALES.md` **et** la page |
| `/affiliation`, `/mandat-sepa`, `/formulaire-c1`, `/formulaire-c3-2`, `/preavis`, `/parcours-transfert` | public | Formulaires existants |
| `/login` | public | Connexion (identifiants CG Link) |
| `/suivi-actions` | SUPER_ADMIN | **Tableau de bord** : une tuile par domaine (Scan News, Démarches affiliés, Actions syndicales, Publications) avec les chiffres clés ; chaque tuile ouvre sa section |
| `/suivi-actions/actions` | SUPER_ADMIN | Liste de toutes les actions (publiées ou non) — avant le 28/09/2026, elle était à `/suivi-actions` |
| `/suivi-actions/nouvelle` | SUPER_ADMIN | Encoder une action |
| `/suivi-actions/<id>/modifier` | SUPER_ADMIN | Modifier / supprimer une action |
| `/suivi-actions/rapport` | SUPER_ADMIN | Rapport d'activité PDF (congrès) |
| `/suivi-actions/demandes` | SUPER_ADMIN | Back-office des demandes : historique des formulaires par type (onglets), recherche, dates, tri, pagination |
| `/suivi-actions/demandes/<type>/<id>` | SUPER_ADMIN | Une demande : toutes ses informations, signature, « Régénérer le PDF » + « Télécharger » |
| `/suivi-actions/articles` | SUPER_ADMIN | Liste des articles (brouillons et publiés) : modifier, publier / dépublier, supprimer |
| `/suivi-actions/articles/nouveau` | SUPER_ADMIN | Écrire un article ; `?veille=<id>` pré-remplit depuis la veille et affiche le panneau de rédaction assistée |
| `/suivi-actions/articles/<id>/modifier` · `/apercu` | SUPER_ADMIN | Modifier / supprimer ; aperçu tel que sur le site (brouillon compris) |
| `/suivi-actions/explications` | SUPER_ADMIN | Liste des explications (« On vous explique ») : modifier, publier / dépublier, réseaux, supprimer |
| `/suivi-actions/explications/nouvelle` | SUPER_ADMIN | Importer une note FGTB (.docx / .pdf) à vulgariser → formulaire d'article pré-rempli (categorie `explication`) |
| `/suivi-actions/articles/<id>/reseaux` | SUPER_ADMIN | Déclinaison d'un article publié en posts Facebook, Instagram, TikTok, YouTube : générer, modifier, enregistrer, copier |
| `/suivi-actions/veille` | SUPER_ADMIN | **Scan News › Le fil** : articles ramassés (résumé du flux en entier) : filtres pertinence / statut / source, ignorer, rédiger un article, brouillon IA, rafraîchir |
| `/suivi-actions/sources` | SUPER_ADMIN | Flux RSS de la veille : ajouter, modifier, activer / désactiver, supprimer |
| `/suivi-actions/themes` | SUPER_ADMIN | Mots-clés de pertinence de la veille : ajouter, activer / désactiver, supprimer |
| `/suivi-actions/mobilisations` · `/nouvelle` · `/<id>/modifier` · `/<id>/apercu` | SUPER_ADMIN | Mobilisations (manifs, grèves à venir) : créer, modifier, supprimer, interrupteur « mise en avant » (une seule à la fois), aperçu de la page campagne, « pourquoi » rédigé par l'IA |
| `/suivi-actions/parametres-site` | SUPER_ADMIN | Paramètres du site : interrupteur « Afficher le bloc mobilisation sur l'accueil » (`site_parametres`, clé `accueil_mobilisation`, `on` / `off`) |
| `/api/mobilisations/analyse` | SUPER_ADMIN | Textes collés (articles, tracts, communiqués) → tous les champs d'une nouvelle mobilisation proposés par Claude Sonnet 5 (POST `{ textes }`), rien n'est enregistré |
| `/api/mobilisations/pourquoi` | SUPER_ADMIN | « Pourquoi on se mobilise » rédigé par Claude Sonnet 5 depuis les points de Fred (POST `{ points, titre?, date?, lieu?, revendications? }`), rien n'est enregistré |
| `/suivi-actions/parametres` | SUPER_ADMIN | Paramètres : adresses internes qui reçoivent chaque envoi automatique des formulaires (ajouter, activer / désactiver, supprimer) |
| `/api/admin/demandes` | SUPER_ADMIN | Liste d'un type de demande (GET `?type=&q=&du=&au=&tri=&page=`) — clé service_role |
| `/api/admin/demandes/<type>/<id>` · `/pdf` · `/liees` · `/envois` | SUPER_ADMIN | Détail complet d'une demande ; PDF C1 / C3.2 rempli côté serveur ; demandes de la même personne ; historique des e-mails |
| `/api/image-distante` | SUPER_ADMIN | Télécharge une image glissée depuis une autre page web (POST `{ url }`) |
| `/api/redaction/lisibilite` | SUPER_ADMIN | L'IA peut-elle lire l'article ? Vérification gratuite du `robots.txt` du média (GET `?veilleId=`) |
| `/api/redaction/brouillon` | SUPER_ADMIN | Brouillon d'article proposé par Claude Sonnet 5 (POST `{ veilleId, lire, extrait?, consignes? }`) |
| `/api/redaction/note` | SUPER_ADMIN | Note FGTB (multipart, champ `fichier`) → texte extrait, vulgarisé par Claude Sonnet 5, fichier archivé dans `notes-sources` |
| `/api/reseaux/declinaison` | SUPER_ADMIN | Posts réseaux proposés par Claude Sonnet 5 (POST `{ articleId, reseau? }` ; sans `reseau` = les 4) |
| `/api/veille/ramasser` | cron ou SUPER_ADMIN | Ramassage des flux (GET = Vercel Cron chaque jour à 6 h UTC, POST = bouton) |

**Consentement aux cookies** (29/09/2026, demande de Fred : cartes affichées directement) : pop-up à
l'ouverture du site (`app/ConsentementCookies.tsx`, dans le layout), non bloquant, en bas à gauche,
**réduit au strict minimum** (Fred, 29/09/2026) : une phrase + « En savoir plus », « Refuser » et
« Tout accepter » (valide toutes les catégories d'un coup), même bouton bordeaux pour les deux. Une
seule catégorie soumise à l'accord : **cartes Google Maps**. Choix dans le stockage local
(`accg-consentement`, `lib/consentement.ts`), valable 6 mois, redemandé si `VERSION_CONSENTEMENT`
change (à augmenter si une catégorie est ajoutée). Rouvert par « Gérer les cookies » (pied de page,
bouton de `/cookies`, `app/BoutonReglagesCookies.tsx`). Masqué dans l'admin et sur `/login`.
Hook `useConsentement()` (`app/useConsentement.ts`). **Rien de tiers ne se charge avant l'accord.**
Tout nouveau service tiers (statistiques, carte, widget) = passer par ce consentement et mettre à
jour la politique cookies.

Navigation publique (ordre du 29/09/2026) : Accueil · Actualités (une seule entrée
pour le blog et « On vous explique », active aussi sur `/blog/…` et
`/on-vous-explique/…`) · Nos actions · Démarches en ligne · Contact + bouton
« S'affilier ». **Bandeau d'alerte** (`app/BandeauMobilisation.tsx`, dans le
layout) au-dessus de la navigation de toutes les pages publiques quand la vue
`site_accueil_mobilisation` renvoie une ligne ; refermable (mémorisé pour la
session, par mobilisation) ; masqué dans l'espace admin, sur `/login` et sur la
page campagne. Les formulaires sont **regroupés** sous « Démarches en
ligne » (pas un onglet par formulaire). Rubrique à venir : « Trouver votre
contact » (permanent et juriste par secteur / commission paritaire). Toute la
gestion (actions, articles, Scan News, demandes, paramètres) vit sous
`/suivi-actions/…` pour profiter du même verrou super admin (proxy + layout +
chaque page).

**Menu de l'espace admin** (`app/suivi-actions/MenuAdmin.tsx`, refonte du
28/09/2026) : Tableau de bord, puis sections titrées — **Actions syndicales**
(Toutes les actions · Nouvelle action · Rapport d'activité), **Publications**
(Articles · Écrire un article · On vous explique · Importer une note), **Scan News** (Le fil · Sources · Thématiques),
**Démarches affiliés** (Demandes) — « Mobilisations » est dans Actions syndicales —
et, séparés en pied : Paramètres du site, Paramètres des envois,
compte connecté, Se déconnecter. Mobile : bouton « Menu ». Lien actif = barre
rouge sur un rail ardoise.

**Nom « Scan News »** (ex-« veille ») partout à l'écran : **Scan News** = la
section ; **Le fil** = son écran de consultation des articles ramassés. Les
écrans de la section portent le repère « Scan News » au-dessus de leur titre
(`RepereSection.tsx`). Le code, les tables (`site_veille`…) et les adresses
(`/suivi-actions/veille`, `/api/veille/ramasser`) gardent « veille ».

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
| `site_articles` | Articles du blog **et** explications (« On vous explique »), distingués par `categorie` | Super admin (lecture/écriture) |
| `site_articles_public` | Vue : articles publiés (sans `statut`, `created_at`, `updated_at`), **avec `categorie`** | Lecture publique |
| Bucket `blog-images` | Images de couverture (public en lecture) | Écriture super admin |
| Bucket `notes-sources` | **Privé** : notes FGTB d'origine des explications (traçabilité interne) | Lecture et écriture **côté serveur uniquement** (service_role) |

`categorie` et `document_source` ajoutés par Fred avant le 29/09/2026 (aucune
migration dans le dépôt) : `categorie` = `article` (défaut, blog) ou `explication`
(On vous explique) ; `document_source` = chemin de la note dans `notes-sources`
(`<aaaa>/<uuid>-<nom>.docx|pdf`).

Veille (créés côté Supabase avant le 28/09/2026) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_sources` | Flux RSS suivis : `nom`, `url_flux`, `actif` | Super admin |
| `site_themes` | Mots-clés de pertinence : `mot_cle`, `actif` (pré-remplie) | Super admin |
| `site_veille` | Articles ramassés : `source_id`, `source_nom`, `titre`, `resume`, `lien` (**index unique**), `date_publication`, `statut` (`nouveau` / `traite` / `ignore`) | Super admin ; écriture du ramassage en service_role |

Mobilisations (créés par Fred avant le 29/09/2026, aucune migration dans le dépôt ;
colonnes relevées par l'OpenAPI de PostgREST) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_mobilisations` | `titre`, `slug`, `date_evenement` (timestamptz ; saisie `jj/mm/aaaa` + `hh:mm` à l'heure de Bruxelles, `versHorodatage()`), `lieu`, `chapo`, `image_hero` (bucket `blog-images`, `mobilisations/<id>/hero-<uuid>.jpg`), `pourquoi` (texte, paragraphes séparés par une ligne vide), `revendications` et `infos_pratiques` (une ligne par élément ; « Libellé : détail » met le libellé en gras), `lien_inscription` (formulaire FGTB fédérale, http(s)), `actif` (défaut false), `created_at`, `updated_at` | Super admin |
| `site_parametres` | `cle` (clé primaire), `valeur`, `updated_at` ; `accueil_mobilisation` = `on` / `off` | Super admin |
| `site_accueil_mobilisation` | Vue : **une ligne seulement si** l'interrupteur est sur `on` **et** qu'une mobilisation est active (colonnes publiques) | Lecture publique |

**Règle** : bloc d'accueil, bandeau et page campagne ne s'affichent **que** si la
vue renvoie une ligne (`chargerMobilisationActive()`, `lib/mobilisations-public.ts`,
jamais la table). Sinon, ouverture habituelle et aucun bandeau : jamais de bloc
vide. Activer une mobilisation désactive les autres (côté code). Après tout
changement : `revalidatePath("/", "layout")` ; le layout a `revalidate = 60`
(toutes les pages publiques sont donc régénérées au plus toutes les minutes).
Compte à rebours calculé dans le navigateur seulement (`CompteARebours.tsx`) ;
« C'est aujourd'hui. » le jour J, rien après. Partage : partage natif du
téléphone + Facebook, WhatsApp, X, e-mail, copier le lien (`liensPartage()`),
icônes monochromes (pas de bleu ni de vert de marque) ; aucune publication depuis
nos comptes. « Pourquoi » par l'IA (`lib/mobilisation-ia.ts`) : texte percutant
pour convaincre même les réticents, aucun fait / chiffre / revendication / action
absent des points de Fred, chiffres absents signalés (`nombresAbsents()`), rappel
« à relire, corriger et valider ».

**Point 0 « Partir de textes existants »** (création seulement, demande de Fred du
29/09/2026) : Fred colle des textes trouvés un peu partout (articles, tract,
communiqué, 60 000 caractères max, `ANALYSE_MAX`) ; `/api/mobilisations/analyse`
(Claude Sonnet 5, sortie structurée, ~20 s, ~1 c.) pré-remplit titre, date, heure,
lieu, chapô, pourquoi, revendications, infos pratiques et lien d'inscription.
L'image et la mise en avant restent manuelles ; confirmation avant d'écraser des
champs remplis ; rien n'est enregistré avant « Enregistrer ». **Garde-fous côté
code** (`construireAnalyse()`) : date / heure gardées seulement si valides ; lien
d'inscription gardé **seulement s'il figure tel quel dans les textes** ; chiffres
absents des textes signalés ; passages repris mot pour mot (≥ 8 mots,
`contientReprise()`) signalés ; puis mois en toutes lettres convertis
(`datesEnChiffres()`, « 14 octobre » → « 14/10/2026 », après les contrôles pour
éviter les fausses alertes). Essai réel du 29/09/2026 sur des textes fictifs :
tous les champs remplis, chiffre de presse non confirmé écarté par l'IA, reprise
signalée.

Réseaux sociaux (créé côté Supabase avant le 28/09/2026) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_publications_reseaux` | Posts déclinés d'un article : `article_id` (→ `site_articles`), `reseau` (`facebook` / `instagram` / `tiktok` / `youtube`), `contenu`, `statut` (défaut `brouillon`, non utilisé par le code), `created_at`, `updated_at` | Super admin |

Colonnes relevées par l'OpenAPI de PostgREST ; aucune contrainte d'unicité visible sur (`article_id`, `reseau`) : le code met à jour la ligne la plus récente, sinon en insère une. YouTube : titre sur la 1re ligne, ligne vide, puis description (`composerYoutube()` / `lireYoutube()`, `lib/reseaux.ts`). Si la base contraint `reseau` à d'autres valeurs, adapter `RESEAUX`.

### Colonnes de `site_articles`
`titre`, `slug` (adresse `/blog/<slug>` ou `/on-vous-explique/<slug>` selon
`categorie`), `chapo` (accroche), `points_cles`
(encart « En bref », **texte, une ligne par point**), `contenu` (**HTML** produit
par l'éditeur Tiptap), `image_couverture` (URL publique du bucket), `sources`
(**texte, un lien par ligne**, libellé facultatif avant le lien :
« Le Soir – https://… » ; pour une explication, une ligne peut être une simple
référence sans lien), `statut` (`brouillon` / `publie`), `date_publication`
(timestamptz), `created_at`, `updated_at`, `categorie` (`article` / `explication`),
`document_source` (note FGTB archivée). Types relevés par sondage de l'API
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

### Tables des formulaires publics (back-office des demandes)

Tables `web_*` écrites par les formulaires avec la clé publique, **jamais lisibles
par elle** (vérifié le 28/09/2026 : 0 ligne renvoyée à `anon`). **Ne pas les
modifier, pas de migration.**

| Table | Formulaire | Contenu |
|---|---|---|
| `web_affiliations` | `FormulaireWebIndependant` | Colonnes à plat (identité, adresse, situation, transfert, cotisation, IBAN, mentions, signature) ; colonne `status` (défaut `en_attente`) jamais utilisée par la centrale : **masquée** dans le back-office (choix de Fred, 28/09/2026) |
| `web_mandats_sepa` | `FormulaireChangementCompte` | Mandat SEPA **et** changement de compte, distingués par `type_demande` (`nouveau_mandat` / `changement_compte` ; vide = compté comme nouveau mandat) |
| `web_c1`, `web_c3_2` | `FormulaireC1`, `FormulaireC32` | `nom`, `prenom`, `niss`, `email` + le formulaire complet dans `data` (jsonb) |

**Back-office des demandes** (28/09/2026) — données personnelles (NISS, IBAN,
signature) :
- Lecture **uniquement** par les routes `/api/admin/demandes…` : session
  SUPER_ADMIN vérifiée, puis clé **service_role** (`lib/demandes-serveur.ts`,
  serveur uniquement). Réponses `Cache-Control: private, no-store`, aucune
  donnée de demande journalisée. La liste ne renvoie que date, nom, prénom,
  e-mail ; le reste seulement dans le détail. Rien n'est jamais écrit.
- Recherche : chaque mot doit figurer dans le nom, le prénom ou l'e-mail
  (caractères de filtre PostgREST retirés, `motsRecherche()`) ; dates
  `jj/mm/aaaa` à l'heure de Bruxelles ; 25 lignes par page ; une page hors
  limites renvoie la dernière.
- **PDF régénérés avec le code existant, mise en page inchangée** :
  affiliation et mandat SEPA / changement de compte **dans le navigateur**
  (`genererPdfAffiliationEnregistree()` et `genererPdfMandatEnregistre()`,
  exportées des formulaires ; ligne en base → données du formulaire, **datées
  du jour de la demande** via l'option `dateDocument`) ; C1 et C3.2 **sur le
  serveur**, en appelant tels quels les handlers `POST` de `/api/fill-c1` et
  `/api/fill-c3-2` avec `data`. L'IP n'est pas conservée pour
  l'affiliation (elle n'apparaît pas dans son PDF).
- **Parcours de transfert** (`/parcours-transfert`) : pas de table à lui. Chaque
  étape enregistre dans la table de son formulaire (`web_affiliations`, `web_c1`,
  `web_c3_2`) et **rien ne relie les 3 lignes** (pas d'identifiant de parcours) :
  un dossier de parcours apparaît donc éclaté dans 3 onglets.
  Palliatif (28/09/2026) : encadré « Autres demandes de la même personne » dans
  la fiche (`/api/admin/demandes/<type>/<id>/liees`, `lib/demandes-liees.ts`) —
  même NISS (11 chiffres ; l'affiliation le garde au format `99.99.99-999.99`)
  ou même e-mail, jamais le nom seul ; « même dossier probable » si moins de
  24 h d'écart. Déduction : à vérifier avant de rapprocher.
- Libellés et sections du détail : `lib/demandes-affichage.ts` ; une colonne
  ajoutée plus tard en base apparaît dans « Autres informations ».

### Envois automatiques : paramètres et historique (28/09/2026)

Migration **demandée par Fred** le 28/09/2026 :
`supabase/migrations/20260928120000_site_destinataires_envois_mails.sql`
(première migration du dépôt, idempotente), **exécutée par Fred le 28/09/2026**
(vérifié : 9 adresses en place, `anon` refusé sur les deux tables). Si la table
devenait illisible, les envois repartiraient vers `DESTINATAIRES_DEFAUT`
(`lib/envois.ts`).

| Objet | Rôle | Accès |
|---|---|---|
| `site_destinataires` | Adresses internes par envoi : `envoi` (`affiliation`, `sepa`, `changement`, `c1`, `c32`, `parcours_onem`), `email` (minuscules, unique par envoi), `actif` ; pré-remplie avec les adresses du code au 28/09/2026 | Super admin (lecture / écriture) ; lue par les routes d'envoi en service_role |
| `site_envois_mails` | Journal : une ligne par demande et par destinataire (`demande_type`, `demande_id`, `envoi` ou `copie_personnelle`, `destinataire`, `sujet`, `statut` `envoye` / `echec`, `resend_id`, `erreur`) | Lecture super admin ; écriture **uniquement** en service_role (aucune politique d'écriture) |

- Routes d'envoi (`/api/send-*`) : `destinatairesInternes()` puis
  `envoyerEtJournaliser()` (`lib/envois-serveur.ts`). Le **demandeur reçoit
  toujours sa copie** ; seules les adresses internes se règlent. Toutes les
  adresses internes désactivées = seul le demandeur reçoit (avertissement à
  l'écran). Le journal ne fait jamais échouer un envoi ; une référence de
  demande n'est journalisée que si la demande existe.
- `sendIsolatedEmail()` renvoie aussi `envois` (résultat par destinataire).
- Rattachement mail → demande : les formulaires choisissent l'`id` de la ligne
  dans le navigateur (`insererDemande()`, `lib/insertion-demande.ts`, la clé
  publique ne peut pas relire la ligne) et le passent à l'envoi (`demandeId`,
  ou `demande` sur chaque document de `LivraisonFormulaires`, parcours compris).
  Si la base refuse l'`id` fourni (erreur 42501), la demande est enregistrée
  sans lui (pas d'historique, mais le formulaire marche).
- L'historique ne couvre que les demandes reçues après la mise en ligne.
- Les adresses citées **dans le texte** des mails (`ADMIN_EMAIL` des routes)
  restent dans le code : ce sont des contacts, pas des destinataires.

---

## Sécurité base de données — correctifs déjà appliqués côté Supabase (invisibles depuis le code)

Appliqués directement dans la base CG Link, sans migration dans ce dépôt (seule
exception : la migration des envois, voir plus haut, demandée par Fred).
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
- [~] Partie publique du site : accueil, `/demarches`, `/actions`, `/actualites`
      (blog + « On vous explique »), `/contact` et pages légales (validées par Fred) faits ; **manque** la présentation
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

### Phase 2 — Veille + blog *(fonctionnel sur `suivi-actions`, 28/09/2026)*
Principe : veille sur des sources belges fiables → tri → brouillon (à la main ou
avec l'IA) → **Fred vérifie, corrige et valide** → publication. Droit d'auteur :
reformuler, citer et lier la source, jamais recopier.

#### Blog (Actualités)
- [x] Gestion admin : liste (brouillons et publiés), éditeur riche Tiptap (gras,
      sous-titres, listes, liens, citations), image de couverture, sources,
      brouillon / publié, date `jj/mm/aaaa`, aperçu, suppression.
- [x] Pages `/blog` et `/blog/<slug>` (encart « En bref » sous le titre, temps de
      lecture), lien « Actualités » dans la navigation et le pied de page.
- Contenu HTML **nettoyé à l'affichage** (`lib/articles-html.ts`,
  `sanitize-html`). Temps de lecture : 220 mots/min (`tempsLecture()`). Date
  future = article programmé (les pages publiques filtrent
  `date_publication <= maintenant`).
- **Image de couverture** : `<article_id>/couverture-<uuid>.jpg` dans
  `blog-images`, réduite comme les photos d'actions. Choix par bouton ou
  **glisser-déposer** (fichier de l'ordinateur ou image tirée d'une autre page
  web). Une image web n'arrive que sous forme d'adresse : `/api/image-distante`
  la télécharge côté serveur (super admin, http(s), **adresses publiques
  uniquement, chaque redirection revérifiée** — `lib/adresse-publique.ts`,
  protection contre les requêtes vers le réseau interne —, images ≤ 20 Mo).
  Rappel affiché : photo de la centrale ou banque libre ; une photo de presse est
  protégée. Suppression d'un article = image d'abord, puis la ligne.

#### Veille RSS (sans IA)
- [x] Écran **Sources** : nom + URL du flux + actif / inactif.
- [x] **Ramassage** : `lib/veille-flux.ts` lit RSS 2.0 / Atom / RDF (50 items max
      par flux, résumé sans HTML, 5 000 caractères max) ; `lib/veille-ramassage.ts`
      insère en `upsert … ignoreDuplicates` sur `lien` avec la clé **service_role**
      (`lib/supabase-service.ts`, serveur uniquement). Route protégée par
      `CRON_SECRET` (en-tête `Authorization: Bearer`) ou session super admin.
      Cron `vercel.json` : `0 6 * * *` (6 h UTC = 7 h ou 8 h à Bruxelles), compatible
      plan Hobby (une exécution par jour, décalable dans l'heure) ; en plus,
      bouton « Rafraîchir maintenant ». Le cron ne tourne qu'en production.
- [x] Écran **Veille** : les « nouveau » d'abord, filtres statut / source, résumé
      du flux **en entier**, lien vers l'article d'origine, « Ignorer »,
      « Remettre à trier », « Rédiger un article » (item → `traite`, formulaire
      pré-rempli : titre + lien dans les sources), « Brouillon IA ».
- [x] **Thématiques / pertinence par mots-clés** : écran Thématiques
      (`site_themes`) ; Veille filtrée par défaut sur « Pertinents »
      (`?pertinence=tous` pour tout voir), compteur « X pertinents sur Y »,
      mots-clés retenus affichés. Règle (`lib/themes.ts`) : au moins un mot-clé
      actif dans le titre ou le résumé, insensible à la casse et aux accents, le
      mot-clé doit **commencer un mot** (« salaire » → « salaires », mais « cp »
      ↛ « capacité »). Filtre d'affichage uniquement : rien n'est effacé.
- **Longueur des résumés = celle du flux** : la RTBF
  (`highlight_rtbf_info.xml`) n'envoie qu'environ 120 caractères terminés par
  « ... », sans `content:encoded` ; Le Soir envoie plus. Les items ramassés avant
  le 28/09/2026 ont un résumé coupé à 600 caractères (le ramassage ne réécrit
  jamais une ligne). Le **ramassage** ne lit jamais la page de l'article ; seule
  la rédaction assistée la lit, sur demande.
- Une modale « Aperçu » a été essayée puis retirée le 28/09/2026 (n'apportait
  rien de plus que la liste) : **ne pas la reproposer**.

#### Rédaction assistée par IA
- [x] Modèle **`claude-sonnet-5`** (choix de Fred), appel **uniquement serveur**
      (`app/api/redaction/brouillon`, SDK `@anthropic-ai/sdk`, sortie structurée
      `zod`, réflexion adaptative, effort `medium`). La route reçoit l'id de
      l'item et relit titre / résumé / lien en base. Coût indicatif : 1 à 3 c.
      par brouillon, 5 à 10 c. avec lecture de l'article.
- [x] **Tunnel en 5 étapes** (panneau IA du formulaire d'article ouvert depuis la
      veille ; « Brouillon IA » l'ouvre avec le focus sur le panneau, rien ne
      démarre sans clic) :
      1. **Lisibilité par l'IA**, vérifiée gratuitement à l'ouverture
         (`/api/redaction/lisibilite`, `lib/robots.ts`) : règles du `robots.txt`
         du média pour le robot **`Claude-User`** d'Anthropic (RTBF l'autorise,
         RTL l'interdit, Le Soir ne se laisse pas vérifier). « Non » est fiable ;
         « oui » ne garantit pas un article payant. Bouton **Faire lire l'article
         par l'IA**, **désactivé par défaut** (surcoût).
      2. **Accéder à l'article** (lien source, nouvel onglet).
      3. **Notes personnelles ou extrait** (60 000 caractères max).
      4. **Consignes pour l'IA** (2 000 caractères max) : angle, ton, public,
         longueur ; elles ne lèvent jamais les règles strictes.
      5. **Créer le brouillon avec l'IA** (récapitulatif de ce que l'IA utilisera).
      Limites dans `lib/redaction-limites.ts` (fichier sans dépendance,
      importable côté navigateur).
- **Lecture de l'article** (si demandée, dans le même appel que la rédaction) :
  outil serveur `web_fetch_20250910` (version de base : renvoie le texte lu tel
  quel, nécessaire au garde-fou), `max_uses: 1`, `allowed_domains` = domaine de
  l'article, `max_content_tokens: 30000`, relance sur `pause_turn` (3 fois
  max). Page illisible → brouillon avec le reste + avertissement. Site qui
  **interdit le robot d'Anthropic** (ex. `rtl.be`) : l'API rejette toute la
  demande (400 « not accessible to our user agent ») → la route relance **sans
  lecture**. **Ne pas contourner ce blocage** (respect du choix de l'éditeur).
- **Ligne éditoriale de la consigne** (`CONSIGNE_SYSTEME`, `lib/redaction-ia.ts`,
  voulue par Fred) : vulgariser en restant **professionnel** (précis, sobre,
  argumenté), et **surtout** écrire avec la **vision et la critique
  constructive syndicales** : au nom de la centrale (« nous »), impact concret
  pour les travailleurs, qui gagne / qui paie / qui est oublié, ce qui pose
  problème et pourquoi, ce qui va dans le bon sens, pistes et exigences de
  principe.
- **Règles strictes de la consigne** : reformuler ; **aucun fait / chiffre /
  citation absent de l'article lu, du texte collé ou du flux** ; jamais de
  revendication chiffrée, d'action (grève, manif) ou de position officielle FGTB
  absentes de la source ; matière maigre signalée ; contenus lus traités comme
  données, pas comme instructions (seules les `<consignes_editeur>` viennent de
  Fred).
- **Garde-fou droit d'auteur (règle de Fred)** : toute phrase reprise mot pour
  mot est en **italique** (`<em>`) — Fred la reformule ou la garde comme
  citation. L'IA en a la consigne, et le **code le vérifie** : comparaison avec
  l'article lu **et** le texte collé ; toute phrase du contenu qui partage
  ≥ 8 mots consécutifs avec eux (`MOTS_REPRISE`) passe en `<em>` ; une reprise
  dans le titre, le chapô ou les points clés (texte brut) est signalée. Limite :
  détection phrase par phrase entre deux balises (une reprise coupée par du gras
  peut échapper).
- **Post-traitement côté code** : adresse recalculée depuis le titre, lien
  d'origine en première source, HTML nettoyé. Date et statut restent au
  formulaire (l'article reste un brouillon). Suggestion de photo affichée,
  **non enregistrée** (pas de colonne). Rappel visible : « Brouillon IA — à
  vérifier, corriger et valider avant publication. Recoupez avec la source. »
- Erreurs traduites en clair : clé absente ou refusée, limite d'utilisation,
  crédit épuisé (402), service surchargé ou injoignable, refus, réponse vide.

#### Variables d'environnement (Vercel Production + Preview **et** `.env.local` — en place depuis le 28/09/2026)
- `SUPABASE_SERVICE_ROLE_KEY` (ramassage ; jamais préfixée `NEXT_PUBLIC_`).
- `CRON_SECRET` (chaîne aléatoire ≥ 16 caractères).
- `ANTHROPIC_API_KEY` (rédaction assistée **et** déclinaison réseaux ; jamais
  préfixée `NEXT_PUBLIC_`, jamais importée dans un composant client). Configurée
  et fonctionnelle : appels réels réussis le 28/09/2026 depuis `.env.local`.
- `SITE_URL` (facultative, serveur) : adresse publique du site pour le lien des
  posts réseaux (ex. `https://accg-nalux.com`). **Pas encore définie.**

#### On vous explique (vulgarisation des notes FGTB, 29/09/2026)
- Rubrique **sœur du blog** : même table, même formulaire, mêmes pages
  (aperçu, réseaux, suppression), distinguée par `categorie = 'explication'`.
  **Côté admin, séparation stricte** : l'écran Articles ne lit que
  `categorie = 'article'`, l'écran « On vous explique » que `explication`.
  **Côté public (29/09/2026, demande de Fred)** : une seule liste `/actualites`
  (`chargerPublications()`, `app/actualites/`) ; les pages de détail restent par
  rubrique (`chargerArticle(slug, categorie)`, `lib/articles-public.ts`).
  **Pastille** (`Pastille`, `app/blog/CartesArticles.tsx`) en haut à gauche de la
  photo et en tête de la page de détail : « Actualité » fond rouge `#E32119`,
  « On vous explique » fond bordeaux `#931510`, texte blanc — le texte est
  toujours présent (la couleur n'est qu'un renfort). Filtre : sélecteur à
  segments (aplat rouge qui glisse, fondu de la liste au changement d'onglet
  seulement), **jamais de `<select>` ni de cases à cocher** ; l'adresse suit le
  filtre (`history.replaceState`). Filtres et adresses : `FILTRES_PUBLICATIONS`,
  `filtreDepuisParam()`, `cheminActualites()` (`lib/articles.ts`). Libellés et chemins par rubrique :
  `RUBRIQUES`, `cheminPublic()`, `categorieDe()` (`lib/articles.ts`). Liste
  admin partagée : `app/suivi-actions/articles/ListePublications.tsx`.
- **Import** (`PanneauNote.tsx` dans le formulaire, nouvelle explication
  seulement) : .docx ou .pdf, **4 Mo max** (limite des requêtes vers une
  fonction Vercel : 4,5 Mo). Extraction **côté serveur** (`lib/notes-extraction.ts`) :
  type vérifié par la signature du fichier (« PK » / « %PDF »), `.docx` via
  **mammoth**, `.pdf` via **unpdf** (conçu pour le serverless) ; `.doc`
  refusé avec consigne ; PDF scanné (< 300 caractères) refusé ; 150 000
  caractères max.
- **Vulgarisation** (`lib/vulgarisation-ia.ts`, `/api/redaction/note`) : Claude
  Sonnet 5, sortie structurée `zod`, réflexion adaptative, effort `high`
  (~15 s et quelques centimes pour une note courte). Structure imposée :
  titre, chapô (1-2 phrases), « En bref » (3-4 puces), 4 sous-titres `<h2>` —
  « De quoi s'agit-il ? », « Ce qui est proposé ou ce qui change », « La
  position de la FGTB », « Ce que ça change concrètement pour vous » —, sources =
  « Note FGTB <référence> ». Consigne : langage grand public, **chaque sigle ou
  terme technique expliqué** (CNT, CCE, CCT, commission paritaire, 2e pilier…),
  **position FGTB restituée telle qu'écrite** (ni inventée, ni adoucie, ni
  durcie, ni nuancée), aucun fait / chiffre / opinion absent de la note, ton
  engagé mais pédagogique, note maigre ou ambiguë signalée.
- **Garde-fous côté code** : référence de note gardée seulement si elle figure
  dans le texte ; sous-titres manquants signalés ; **tout nombre du texte
  produit absent de la note est signalé** (« Chiffres absents de la note, à
  vérifier ») ; liens retirés, HTML nettoyé, adresse depuis le titre. Date et
  statut restent au formulaire (brouillon). Rappel visible : « Vulgarisation IA
  — vérifier la fidélité à la note FGTB avant publication. »
- **Suggestion de photo** (29/09/2026, demandée par Fred) : l'IA décrit la photo de
  couverture idéale (scène concrète, prise par la centrale ou banque libre, jamais
  de photo de presse ni de personne réelle identifiable) ; affichée au-dessus de
  la zone image comme pour un brouillon d'article, **non enregistrée**.
- **Archive** : la note d'origine est déposée dans `notes-sources` (service_role)
  et son chemin enregistré dans `document_source` ; la page Modifier affiche un
  lien de téléchargement temporaire (1 h). Un échec d'archivage n'empêche pas
  d'utiliser la vulgarisation (message affiché). Supprimer une explication ne
  supprime pas sa note archivée.
- **Sources** : pour une explication, une ligne peut être une simple référence
  sans lien (`lireReferences()`) ; le blog exige toujours un lien par ligne.
- La déclinaison réseaux fonctionne aussi pour une explication (lien vers
  `/on-vous-explique/<slug>`). Le tableau de bord (tuile Publications) compte
  les articles et, à part, les explications.

### Phase 3 — Publication réseaux
- [x] **Déclinaison par l'IA** (28/09/2026, `suivi-actions`) : depuis un article
      **publié** (bouton « Réseaux » de la liste, bandeau de la page Modifier),
      `/suivi-actions/articles/<id>/reseaux`. Claude Sonnet 5, serveur uniquement
      (`app/api/reseaux/declinaison`, `lib/reseaux-ia.ts`, sortie structurée `zod`,
      réflexion adaptative, effort `medium`, ~1 c. et 15 s pour les 4). Source =
      titre + chapô + points clés + contenu + lien de l'article. Consigne : fidélité
      stricte à l'article validé (aucun ajout, chiffres et nuances conservés), ton
      militant mais factuel, longueur et style propres à chaque réseau.
      **Post-traitement côté code** : Facebook et description YouTube = seul le lien
      de l'article (ajouté s'il manque) ; Instagram et TikTok = aucun lien,
      « Lien en bio » garanti sur Instagram. Écran : 4 cartes côte à côte, chacune
      éditable, compteur de caractères (limites : Facebook 63 206, Instagram 2 200 +
      30 hashtags, TikTok 4 000, YouTube titre 100 / description 5 000), Copier,
      Enregistrer (écriture navigateur, RLS super admin), Régénérer (une seule
      version) ; confirmation avant de remplacer une version, alerte en quittant
      avec des modifications non enregistrées. **Aucune publication automatique** :
      Fred copie-colle.
- Lien des posts : `SITE_URL` (ex. `https://accg-nalux.com`, variable facultative,
  serveur) sinon l'adresse par laquelle l'admin consulte le site (la preview
  donnerait un lien de preview : définir `SITE_URL` avant usage réel).
- [ ] **Brancher la déclinaison aux futurs outils de génération** (visuels et
      vidéo, phase 4) : un post = son texte (`site_publications_reseaux`) + son
      visuel ou son extrait vidéo au format du réseau, préparés ensemble depuis
      l'écran `/suivi-actions/articles/<id>/reseaux`.
- [ ] **Publication en 1 clic** (à étudier) : envoyer un post validé vers le
      réseau depuis ce même écran, via un **outil-pont** (Ayrshare / Metricool /
      Buffer — à choisir) plutôt que coder chaque réseau. À vérifier : coût,
      réseaux couverts (TikTok, YouTube), comptes de la centrale, programmation.
      `site_publications_reseaux.statut` (défaut `brouillon`) pourra alors suivre
      l'état (validé, publié).
- Fred valide chaque post avant publication. D'ici là : copier / coller.

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

## État au 29/09/2026
- Tout le travail est sur la branche **`suivi-actions`** : rien sur `main`, rien
  déployé. À relire puis fusionner quand Fred valide.
- Migration des envois exécutée le 28/09/2026. À tester par Fred : un envoi
  réel (SEPA, C1) doit apparaître dans l'historique de la demande.
- À faire par Fred : **supprimer** le projet Supabase `accg-nalux-site`
  (dashboard).
- Bureaux (`lib/bureaux.ts`) repris de l'ancien site le 25/09/2026 : Libramont
  (siège), Namur, Arlon, Marche-en-Famenne. À tenir à jour à chaque changement
  d'horaire ; le statut « ouvert » est calculé à l'heure de Bruxelles.
- PDF **Affiliation** et **Mandat SEPA** passés à la charte du site (proposition
  « Registre » du 25/09/2026). Les PDF **C1, C3.2 et Calcul de préavis ne doivent
  pas être modifiés**.
- **En place sur `suivi-actions`, commité et poussé sur GitHub le 29/09/2026**
  (déploiement de prévisualisation Vercel) : blog, Scan News (ex-veille RSS :
  sources, ramassage quotidien, thématiques), **rédaction assistée par IA**
  (tunnel en 5 étapes, garde-fou droit d'auteur), **déclinaison réseaux**
  (Facebook, Instagram, TikTok, YouTube, sans publication automatique),
  **back-office des demandes** (PDF régénérés, demandes liées, historique des
  e-mails), **paramètres des envois**, **refonte de l'espace admin** (tableau de
  bord, menu par sections), rubrique **« On vous explique »** (vulgarisation des
  notes FGTB, suggestion de photo) et **indicateur de chargement** unique. Rien
  sur `main`, rien en production.
- `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` et `ANTHROPIC_API_KEY` sont
  **configurées** dans `.env.local` (vérifié le 28/09/2026 ; la clé Anthropic
  répond, testée sur la déclinaison réseaux) **et ajoutées dans Vercel par Fred le
  28/09/2026** (déclaré par Fred, non vérifiable depuis Claude Code sans accès
  Vercel). Une variable ajoutée ou modifiée dans Vercel ne s'applique qu'aux
  **déploiements suivants** : redéployer la preview si besoin.
- Le 28/09/2026 : **back-office des demandes** (`/suivi-actions/demandes`) sur
  `suivi-actions` : 238 affiliations, 20 mandats SEPA, 11 changements de compte,
  29 C1 et 27 C3.2 à cette date.
- Le 29/09/2026 : rubrique **« On vous explique »** (import de notes FGTB .docx /
  .pdf, vulgarisation par Claude Sonnet 5, pages publiques) sur `suivi-actions`.
  Vérifié : extraction réelle .docx et .pdf (tests), vulgarisation d'une note
  fictive par l'API. **Pas encore testé** : l'archivage réel dans
  `notes-sources` et une note FGTB réelle.
- Avant un usage réel de la déclinaison réseaux : définir `SITE_URL` dans
  Vercel, sinon les posts générés depuis la preview pointent vers la preview.
- **Le 29/09/2026 après-midi, sur `suivi-actions`, poussé sur GitHub** :
  - **Page unifiée `/actualites`** (blog + « On vous explique », pastilles,
    sélecteur à segments) ; `/blog` et `/on-vous-explique` redirigés ; menu :
    Accueil · Actualités · Nos actions · Démarches en ligne · Contact.
  - **Mobilisations** : admin (liste, formulaire, aperçu, « pourquoi » et point 0
    « Partir de textes existants » par l'IA), **Paramètres du site**
    (interrupteur de l'accueil), bloc d'accueil avec compte à rebours, page
    campagne `/mobilisation/<slug>`, bandeau d'alerte sur tout le site. Image hero
    affichée entière à sa proportion naturelle. Fred a créé et activé une
    première mobilisation (« Ligne rouge », 09/10/2026) : enregistrement,
    image et interrupteur fonctionnent.
  - **Accueil réordonné** : mobilisation ou ouverture habituelle · 4 dernières
    publications · démarches · dernières actions passées.
  - **Pages légales** `/mentions-legales`, `/vie-privee`, `/cookies` (texte de
    `PAGES-LEGALES.md`) — **validées par Fred le 29/09/2026** (relecture
    juridique / DPO FGTB conseillée).
  - **Page Contact refaite** (bureaux, cartes, canaux, formulaire Resend) et
    **pop-up de consentement aux cookies** (cartes Google Maps).
  - **Pied de page refait** sur fond charbon (seule exception à la règle des fonds
    sombres), logo blanc, bouton « S'affilier », réseaux sociaux.
  - **Bordeaux `#931510`** partout (site, PDF, rapport) et **nouveau
    `logo-cg-rouge.png`**.
- Pistes suivantes : brancher la déclinaison aux futurs outils de visuels et de
  vidéo, publication en 1 clic (phase 3, outil-pont, à étudier), images
  (génération / gabarits, plus tard), page de présentation de la centrale,
  « Trouver votre contact » (phase 4, avec l'assistant), relecture juridique
  des pages légales (conseillée).

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
- **Palette stricte** : `#E32119` rouge, `#931510` bordeaux, `#222222` charbon,
  `#FFFFFF` blanc, `#7C90A0` ardoise. Dans le code : couleurs Tailwind
  `militant-rouge`, `militant-bordeaux`, `militant-charbon`, `militant-ardoise`.
  Bordeaux = `#931510` depuis le 29/09/2026 (demande de Fred).
  Contrastes vérifiés : blanc sur bordeaux **8,9:1** (AAA, avant 7,4:1) ; bordeaux
  sur blanc 8,9:1 ; rouge / bordeaux 1,9:1 (pastilles « Actualité » / « On vous
  explique » : le texte les distingue) ; filet blanc 35 % sur bordeaux 2,2:1
  (décoratif). Seul recul : charbon / bordeaux 1,8:1 (avant 2,1:1) → ne jamais
  distinguer une information par ces deux seules couleurs (survol bordeaux →
  charbon des boutons = simple renfort, le texte reste blanc ; camembert du
  rapport : filets blancs entre les parts + légende).
- **Limiter les fonds noirs** : le noir est politiquement associé à l'extrême
  droite, que la centrale combat. Le charbon sert au texte, aux filets et aux petits
  détails (survol de bouton, puce), **jamais aux grandes surfaces** (barres,
  bandeaux, grands blocs, barres latérales). Surfaces fortes :
  **bordeaux** avec texte blanc ; sinon fond blanc et filets épais. Emplacements
  photo vides : ardoise. **Seule exception : le pied de page**, en charbon
  (demande explicite de Fred du 29/09/2026, pour ancrer le bas de page).
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
  filet rouge de 4 px sous la barre de navigation, 3 px au-dessus du pied de page.
  **Pied de page** (`app/PiedDePage.tsx`, refait le 29/09/2026) : **fond charbon**,
  texte blanc, secondaires en ardoise (4,8:1), **logo blanc**. 4 colonnes alignées
  en haut (identité : bureaux de Libramont et Namur côte à côte, e-mail, WhatsApp ·
  Le site · Démarches · bouton rouge « S'affilier » puis Suivez-nous : Facebook,
  Instagram, YouTube, TikTok en icônes rondes monochromes, jamais aux couleurs des
  marques, remplies de rouge au survol) + barre du bas en ardoise (© 2026 · Mentions
  légales · Vie privée · Cookies · Espace admin). **Liens : le texte reste blanc au
  survol** (rouge sur charbon = 3,4:1, trop faible pour du petit texte) ; le rouge
  vient par un soulignement qui se trace (`.pied-lien-texte`). Colonnes en cascade
  à l'entrée à l'écran (`RevelationPied.tsx`, une fois, rien en mouvement réduit ni
  si le pied de page est déjà visible). Mobile : identité, puis « Le site » et
  « Démarches » côte à côte, puis bouton et réseaux. Page campagne mobile : marge
  basse sous la barre fixe « Je m'inscris » (`.barre-inscription-mobile`) ; en
  développement seulement, marge basse pour l'indicateur flottant de Next.js.
  Icônes : `lucide-react` (jamais d'emoji comme icône).
- **Logos** (`public/`) : `logo-cg-rouge.png` sur fond blanc (usage principal),
  `logo-cg-blanc.png` sur fond bordeaux ou charbon (connexion, couverture du rapport PDF, pied de page),
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
  types : `#222222` `#E32119` `#7C90A0` `#B8720F` `#931510` `#9C6FB3`.
- **Couche de compatibilité** (`tailwind.config.ts`) : les anciennes classes
  `red-*`, `gray-*`, `slate-*`, `blue-*`, `green-*`, `emerald-*`, `amber-*` des
  anciens formulaires sont **remappées sur la palette** (teintes claires → blanc,
  bordures → ardoise, soutenues → bordeaux ou charbon, jamais de grand fond
  noir). Pour tout **nouveau** code, utiliser les couleurs `militant-*`.
- **Motion** : animations sobres, une seule à l'ouverture d'un écran au maximum ;
  toujours respecter `prefers-reduced-motion`.
- **Chargement : toujours visible** (règle de Fred, 29/09/2026). Indicateur
  unique du site, inspiré d'un cercle « loop out » (l'arc s'allonge, fait le
  tour puis se rétracte) : `app/Chargement.tsx`, animations `.chargement-*`
  dans `app/globals.css` (en mouvement réduit : arc fixe + texte).
  `IconeChargement` = petite icône dans un bouton ou devant un texte « … en
  cours » (couleur du texte : blanc sur bouton bordeaux, `text-militant-rouge`
  ailleurs) ; `EcranChargement` = grand cercle rouge + arc bordeaux intérieur
  avec un texte, pour une attente longue (IA, première liste, fiche). **Pas
  d'écran de chargement entre deux pages** (pas de `loading.tsx`, choix de Fred
  du 29/09/2026). **Ne plus utiliser `Loader2` ni
  `animate-spin`** : tout nouveau chargement passe par ces deux composants, avec
  un texte qui dit ce qui se passe.
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
  `sanitize-html`, `fast-xml-parser` (flux RSS), `@anthropic-ai/sdk` + `zod`
  (rédaction assistée, déclinaison réseaux et vulgarisation, serveur uniquement ;
  erreurs de l'API traduites par `lib/anthropic-erreurs.ts`), `mammoth` (.docx) et
  `unpdf` (.pdf) pour l'extraction des notes FGTB, serveur uniquement.
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
